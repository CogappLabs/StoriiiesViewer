import { expect, type Page, test } from "@playwright/test";
import { manifest, setupViewer } from "../support/utils";

const expectStatus = (page: Page, code: RegExp) =>
  expect(page.locator("#viewer")).toHaveAttribute("data-status", code);

/** Collects errors the viewer throws asynchronously, after the constructor has returned */
function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test.describe("Errors", () => {
  for (const status of [404, 500]) {
    test(`Should error if the manifest request fails with ${status}`, async ({
      page,
    }) => {
      const errors = collectPageErrors(page);
      await page.route("**/manifests/standard-v3/manifest.json", (route) =>
        route.fulfill({ status }),
      );
      await setupViewer(page, { manifestUrl: manifest("standard-v3") });

      await expectStatus(page, /manifest-err/);
      await expect
        .poll(() => errors)
        .toContain(
          "Storiiies Viewer: Encountered a problem loading the manifest",
        );
    });
  }

  test("Should error if the manifest is invalid", async ({ page }) => {
    const errors = collectPageErrors(page);
    await setupViewer(page, { manifestUrl: manifest("not-a-manifest") });

    await expectStatus(page, /bad-manifest/);
    await expect
      .poll(() => errors)
      .toContain("Storiiies Viewer: Could not parse the manifest");
  });

  test("Should error if the provided container doesn't exist", async ({
    page,
  }) => {
    await expect(
      setupViewer(page, {
        container: "#not-a-real-container",
        manifestUrl: manifest("standard-v3"),
      }),
    ).rejects.toThrow("Storiiies Viewer: Container element not found");
  });

  // The missing container is reported before the missing config
  test("Should error if no container is provided", async ({ page }) => {
    await expect(
      setupViewer(page, {
        container: undefined,
        manifestUrl: manifest("standard-v3"),
      }),
    ).rejects.toThrow("Storiiies Viewer: Container element not found");
  });

  test("Should error if no manifest is provided", async ({ page }) => {
    await expect(setupViewer(page, {})).rejects.toThrow(
      "Storiiies Viewer: Missing required config",
    );
  });

  test("Should error if the fetched custom POI SVG is not valid SVG", async ({
    page,
  }) => {
    await page.route("**/custom-poi.svg", (route) =>
      route.fulfill({ body: "<div>Not an SVG</div>" }),
    );
    await setupViewer(page, {
      manifestUrl: manifest("points-of-interest-v3"),
      pointOfInterestSvgUrl: "/custom-poi.svg",
    });

    await expectStatus(page, /poi-svg-invalid/);
  });
});

test.describe("Warnings", () => {
  test("Should warn if the manifest looks like it isn't supported", async ({
    page,
  }) => {
    await setupViewer(page, { manifestUrl: manifest("standard-v2") });
    await expectStatus(page, /unkn-version/);
  });

  test("Should warn if the manifest doesn't contain a label", async ({
    page,
  }) => {
    await setupViewer(page, { manifestUrl: manifest("no-label-v3") });
    await expectStatus(page, /no-label/);
  });

  test("Should warn if the manifest contains external annotation pages", async ({
    page,
  }) => {
    await setupViewer(page, {
      manifestUrl: manifest("external-annotation-pages-v3"),
    });
    await expectStatus(page, /no-ext-anno/);
  });

  test("Should warn if the custom POI SVG fails to fetch", async ({ page }) => {
    await page.route("**/custom-poi.svg", (route) =>
      route.fulfill({ status: 404 }),
    );
    await setupViewer(page, {
      manifestUrl: manifest("points-of-interest-v3"),
      pointOfInterestSvgUrl: "/custom-poi.svg",
    });

    await expectStatus(page, /poi-svg-err/);
  });
});
