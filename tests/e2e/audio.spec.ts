import { expect, test } from "@playwright/test";
import { manifest, screenSizes, setupViewer } from "../support/utils";

for (const screenSize of screenSizes) {
  test.describe(`Rendering (${screenSize.label})`, () => {
    test.use({
      viewport: { width: screenSize.width, height: screenSize.height },
    });
    test.beforeEach(({ page }) =>
      setupViewer(page, { manifestUrl: manifest("audio-v3") }),
    );

    test("Should render an Openseadragon viewer", async ({ page }) => {
      await expect(page.locator("#viewer")).toHaveAttribute(
        "data-loaded",
        "true",
      );
    });

    test("Should load and unload an audio element when navigating annotations", async ({
      page,
    }) => {
      const next = page.locator("#storiiies-viewer-0__next");
      // There could be several audio elements, so no ID to select by
      const audio = page.locator("#viewer audio");

      await next.click();
      await expect(audio).toHaveCount(1);
      await next.click();
      await expect(audio).toHaveCount(0);
    });
  });
}
