import { expect, type Page } from "@playwright/test";
import type StoriiiesViewer from "../../src/StoriiiesViewer";
import type { StoriiiesViewerConfig } from "../../src/StoriiiesViewer";

declare global {
  interface Window {
    StoriiiesViewer: typeof StoriiiesViewer;
    storiiiesViewerInstance: StoriiiesViewer;
  }
}

export const manifest = (name: string) =>
  `http://localhost:43110/manifests/${name}/manifest.json`;

/**
 * Opens the test page and constructs a viewer in it\
 * Config must be serialisable, so pass the container as a selector. An undefined key is dropped,
 * which is how the error tests omit required config
 */
export async function setupViewer(
  page: Page,
  config: Partial<StoriiiesViewerConfig>,
) {
  await page.goto("index.html");
  await page.evaluate(
    (config) => {
      window.storiiiesViewerInstance = new window.StoriiiesViewer(
        config as StoriiiesViewerConfig,
      );
    },
    { container: "#viewer", ...config },
  );
}

/** Asserts the viewport's target centre, in image coordinates, is the centre of an `x,y,w,h` region */
export async function expectCentre(page: Page, region: string) {
  const [x, y, width, height] = region.split(",").map(Number);
  const actual = await page.evaluate(() => {
    const { viewport } = window.storiiiesViewerInstance.viewer;
    const point = viewport.viewportToImageCoordinates(viewport.getCenter());
    return { x: point.x, y: point.y };
  });
  expect(actual.x).toBeCloseTo(x + width / 2, 6);
  expect(actual.y).toBeCloseTo(y + height / 2, 6);
}

export type ScreenSize = {
  label: string;
  width: number;
  height: number;
};

export const screenSizes: Array<ScreenSize> = [
  { label: "Mobile", width: 320, height: 480 },
  { label: "Desktop", width: 1920, height: 1080 },
];
