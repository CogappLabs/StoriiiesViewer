import { expect, type Page, test } from "@playwright/test";
import {
  expectCentre,
  manifest,
  type ScreenSize,
  screenSizes,
  setupViewer,
} from "../support/utils";

const poi = (page: Page, index: number) =>
  page.locator(
    `#storiiies-viewer-0__osd-container > .openseadragon-container button.storiiies-viewer__poi-marker[data-poi-index='${index}']`,
  );
const activePois = (page: Page) =>
  page.locator(
    "#storiiies-viewer-0__osd-container .storiiies-viewer___poi-marker--active",
  );
const ACTIVE = /storiiies-viewer___poi-marker--active/;

/** Expected viewport centres by viewer width; wider viewers offset the centre to clear the info area */
const pois: Array<{
  index: number;
  text: string;
  centres: Record<number | "default", string>;
}> = [
  {
    index: 0,
    text: "This point marks the centre of the image.",
    centres: {
      1920: "654,1024,0,0",
      720: "828,1024,0,0",
      default: "1024,1024,0,0",
    },
  },
  {
    index: 2,
    text: "This point marks the top left quadrant of the image.",
    centres: {
      1920: "142,512,0,0",
      720: "316,512,0,0",
      default: "512,512,0,0",
    },
  },
  {
    index: 3,
    text: "This point marks the top right quadrant of the image.",
    centres: {
      1920: "1166,512,0,0",
      720: "1340,512,0,0",
      default: "1536,512,0,0",
    },
  },
  {
    index: 4,
    text: "This point marks the bottom right quadrant of the image.",
    centres: {
      1920: "1166,1536,0,0",
      720: "1340,1536,0,0",
      default: "1536,1536,0,0",
    },
  },
  {
    index: 5,
    text: "This point marks the bottom left quadrant of the image.",
    centres: {
      1920: "142,1536,0,0",
      720: "316,1536,0,0",
      default: "512,1536,0,0",
    },
  },
];

function rendering(screenSize: ScreenSize) {
  test.describe(screenSize.label, () => {
    test.use({
      viewport: { width: screenSize.width, height: screenSize.height },
    });

    test.describe("Basic rendering", () => {
      test.beforeEach(async ({ page }) => {
        await setupViewer(page, {
          manifestUrl: manifest("points-of-interest-v3"),
        });
        await expect(page.locator("#viewer")).toHaveAttribute(
          "data-loaded",
          "true",
        );
      });

      test("Should render an Openseadragon viewer", async ({ page }) => {
        await expect(page.locator("#viewer")).toHaveAttribute(
          "data-loaded",
          "true",
        );
      });

      test("Should render points of interest on the canvas", async ({
        page,
      }) => {
        for (const { index } of pois) {
          await expect(poi(page, index)).toHaveCount(1);
        }
      });

      test("Should navigate to a point of interest when clicked", async ({
        page,
      }) => {
        for (const { index, text, centres } of pois) {
          // Dispatched rather than clicked: on small screens the info area covers some markers
          await poi(page, index).dispatchEvent("click");
          await expect(poi(page, index)).toHaveClass(ACTIVE);
          await expect(activePois(page)).toHaveCount(1);
          await expect(
            page.locator("#storiiies-viewer-0__info-text"),
          ).toContainText(text);
          await expectCentre(
            page,
            centres[screenSize.width] ?? centres.default,
          );
        }
      });

      test("Should activate the correct point of interest pin when navigating via the info panel", async ({
        page,
      }) => {
        for (let i = 0; i < 5; i++) {
          await page.locator("#storiiies-viewer-0__next").click();
        }
        await expect(poi(page, 4)).toHaveClass(ACTIVE);
        await expect(activePois(page)).toHaveCount(1);
        await expect(
          page.locator("#storiiies-viewer-0__info-text"),
        ).toContainText(
          "This point marks the bottom right quadrant of the image.",
        );
      });

      test("Shouldn't show any active point of interest when showing a non-POI slide", async ({
        page,
      }) => {
        await poi(page, 0).dispatchEvent("click");
        await page.locator("#storiiies-viewer-0__next").click();
        await expect(poi(page, 0)).not.toHaveClass(ACTIVE);
        await expect(activePois(page)).toHaveCount(0);
      });
    });

    test.describe("POI icon rendering", () => {
      const setup = (page: Page, pointOfInterestSvgUrl?: string) =>
        setupViewer(page, {
          manifestUrl: manifest("points-of-interest-v3"),
          pointOfInterestSvgUrl,
        });

      test("Should render default POI SVG if no SVG URL is provided", async ({
        page,
      }) => {
        await setup(page);
        await expect(poi(page, 0).locator("svg")).toHaveCount(1);
        await expect(poi(page, 0).locator("svg")).not.toHaveId("test-icon");
      });

      test("Should sanitize and render custom POI SVG", async ({ page }) => {
        await setup(page, "/images/icons/eye.svg");
        const svg = poi(page, 0).locator("svg");
        await expect(svg).toHaveId("test-icon");
        await expect(svg).not.toHaveAttribute("onclick");
      });

      test("Fallback to default icon if custom SVG is missing", async ({
        page,
      }) => {
        await setup(page, "/missing-icon.svg");
        await expect(poi(page, 0).locator("svg")).toHaveCount(1);
        await expect(poi(page, 0).locator("svg")).not.toHaveId("test-icon");
      });
    });
  });
}

for (const screenSize of [
  ...screenSizes,
  {
    label:
      "Small enough that the infoArea can intrude on the centre of the viewer",
    width: 720,
    height: 1440,
  },
]) {
  rendering(screenSize);
}
