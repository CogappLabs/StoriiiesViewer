import { loadManifest, Manifest } from "manifesto.js";
import OpenSeadragon from "openseadragon";
interface StoriiiesViewerConfig {
  container: Element | HTMLElement | string | null;
  manifestUrl: string;
}

export default class StoriiiesViewer {
  private containerEl: HTMLElement | null;
  private manifestUrl: string = "";
  public infoJson: string = "";
  public label: string | null = "";
  public instanceId: number;
  public viewer!: OpenSeadragon.Viewer;
  public infoArea!: HTMLElement;

  constructor(config: StoriiiesViewerConfig) {
    this.instanceId = document.querySelectorAll(".storiiies-viewer").length;

    // Normalise the config container
    if (typeof config.container === "string") {
      this.containerEl = document.querySelector(config.container);
    } else {
      // Minor wrinkle around if the container is an Element or HTMLElement
      // It should be safe to cast it to HTMLElement
      this.containerEl = config.container as HTMLElement;
    }

    this.manifestUrl = config.manifestUrl;

    if (!this.containerEl || !this.manifestUrl) {
      throw new Error("Missing required config");
    }

    this.initViewer().then(() => {
      this.insertInfoArea();
    });
  }

  /**
   * Initialize the viewer
   */
  private async initViewer() {
    const rawManifest = await loadManifest(this.manifestUrl);
    const manifest = new Manifest(rawManifest);

    this.containerEl?.classList.add("storiiies-viewer");

    this.label = manifest.getLabel().getValue();

    this.infoJson = manifest
      .getSequenceByIndex(0)
      .getCanvasByIndex(0).imageServiceIds[0];

    // Temporary styles to allow viewer to show
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
    this.viewer.canvas.ariaLabel = "Storiiies viewer";
    this.viewer.canvas.role = "application";
    this.viewer.element.insertAdjacentHTML(
      "afterbegin",
      `<p style="display:none;" id="storiiies-viewer-${this.instanceId}-description">Drag with your mouse or the arrorw keys, and zoom with scroll or <kbd aria-label="plus">+</kbd> and <kbd aria-label="minus">-</kbd></p>`,
    );
    this.viewer.canvas.setAttribute(
      "aria-describedby",
      `storiiies-viewer-${this.instanceId}-description`,
    );
  }

  /**
   * Create area for label, annotations and controls
   */
  private insertInfoArea() {
    this.infoArea = document.createElement("div");
    this.viewer?.element.insertAdjacentElement("afterend", this.infoArea);
    this.infoArea.classList.add("info-area");
    this.infoArea.innerText = this.label ?? "";
  }
}
