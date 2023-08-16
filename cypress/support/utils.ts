import StoriiiesViewer from "../../src";
import OpenSeadragon from "openseadragon";

declare global {
  interface Window {
    StoriiiesViewer: typeof StoriiiesViewer;
    storiiiesViewerInstance: StoriiiesViewer;
  }
}

export function getExpectedCentre(region: string) {
  const [x, y, width, height] = region.split(",").map(Number);
  return new OpenSeadragon.Point(x + width / 2, y + height / 2);
}

export function getActualCentre(viewer: OpenSeadragon.Viewer) {
  return viewer.viewport.viewportToImageCoordinates(
    viewer.viewport.getCenter(),
  );
}

export function assertWithinAcceptableRange(
  expected: number,
  actual: number,
  acceptableRange = 0.0000001,
) {
  expect(expected).to.be.within(
    actual - acceptableRange,
    actual + acceptableRange,
  );
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
