import { expect, test } from "@playwright/test";
import { manifest, setupViewer } from "../support/utils";

const getViewport = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const { viewport } = window.storiiiesViewerInstance.viewer;
    const { x, y } = viewport.getCenter();
    return { zoom: viewport.getZoom(), x, y };
  });

test.describe("OpenSeadragon Disable Zoom & Pan", () => {
  test.beforeEach(async ({ page }) => {
    await setupViewer(page, {
      manifestUrl: manifest("standard-v3"),
      disablePanAndZoom: true,
    });
    await expect(page.locator("#viewer")).toHaveAttribute(
      "data-loaded",
      "true",
    );
  });

  test("should prevent zooming when clicking on the OpenSeadragon canvas", async ({
    page,
  }) => {
    const before = await getViewport(page);
    await page.locator(".openseadragon-canvas").click({ force: true });
    expect((await getViewport(page)).zoom).toBe(before.zoom);
  });

  test("should prevent panning when pressing arrow keys on the OpenSeadragon canvas", async ({
    page,
  }) => {
    const before = await getViewport(page);
    await page.locator(".openseadragon-canvas").focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");

    const after = await getViewport(page);
    expect(after.x).toBeCloseTo(before.x, 3);
    expect(after.y).toBeCloseTo(before.y, 3);
  });
});
