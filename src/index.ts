import { loadManifest, Manifest } from "manifesto.js";
import OpenSeadragon from "openseadragon";
interface StoriiiesViewerConfig {
  container: HTMLElement | string | null;
  manifestUrl: string;
}

export default class StoriiiesViewer {
  private containerEl: HTMLElement | null;
  private manifestUrl: string = "";
  public infoJson: string | null = "";
  public label: string | null = "";
  public viewer: OpenSeadragon.Viewer | null = null;

  constructor(config: StoriiiesViewerConfig) {
    // Normalise the config container
    if (typeof config.container === "string") {
      this.containerEl = document.querySelector(config.container);
    } else {
      this.containerEl = config.container;
    }
    this.manifestUrl = config.manifestUrl;
    this.init();
  }

  /**
   * Initialize the viewer
   */
  private async init() {
    const rawManifest = await loadManifest(this.manifestUrl);
    const manifest = new Manifest(rawManifest);

    this.label = manifest.getLabel().getValue();

    this.infoJson = manifest
      .getSequenceByIndex(0)
      .getCanvases()[0]
      .getImages()[0]
      .getResource()
      .getServices()[0]
      .getInfoUri();

    if (this.containerEl) {
      this.containerEl.style.height = "80vh";
      this.containerEl.style.width = "80vw";
    }

    this.viewer = OpenSeadragon({
      element: this.containerEl ?? undefined,
      tileSources: [this.infoJson],
      crossOriginPolicy: "Anonymous",
      showSequenceControl: false,
      showHomeControl: false,
      showZoomControl: false,
      showFullPageControl: false,
      visibilityRatio: 0.3,
    });
  }
}
