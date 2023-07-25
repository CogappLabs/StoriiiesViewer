import { loadManifest, Manifest, Canvas, AnnotationPage } from "manifesto.js";
import OpenSeadragon from "openseadragon";
interface IStoriiiesViewerConfig {
  container: Element | HTMLElement | string | null;
  manifestUrl: string;
}

export default class StoriiiesViewer {
  private containerEl: HTMLElement | null;
  private manifestUrl: string;
  public manifest!: Manifest;
  public label: string = "";
  public canvases!: Canvas[];
  public activeAnnotation: number = -1;
  public annotationPages: AnnotationPage[] = [];
  public instanceId: number;
  public viewer!: OpenSeadragon.Viewer;
  public infoArea!: HTMLElement;

  constructor(config: IStoriiiesViewerConfig) {
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

    this.initManifest().then(() => {
      this.initViewer();
      this.insertInfoArea();
    });
  }

  /**
   * Load the manifest and extract the label, canvases and annotation pages
   */
  private async initManifest() {
    const rawManifest = await loadManifest(this.manifestUrl);
    this.manifest = new Manifest(rawManifest);

    this.containerEl?.classList.add("storiiies-viewer");

    this.label = this.manifest.getLabel().getValue() || "";

    // In lieu of a label, set the active annotation to 0 to show the first annotation
    if (!this.label) {
      this.activeAnnotation = 0;
    }

    this.canvases = this.manifest.getSequenceByIndex(0).getCanvases();
    this.annotationPages = this.getAnnotationPages();
  }

  /**
   * Initialize the viewer
   */
  private initViewer() {
    this.viewer = OpenSeadragon({
      element: this.containerEl ?? undefined,
      tileSources: [this.canvases[0].imageServiceIds[0]],
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
      `<p class="storiiies-viewer__description" id="storiiies-viewer-${this.instanceId}-description">Drag with your mouse or the arrow keys, and zoom with scroll or <kbd aria-label="plus">+</kbd> and <kbd aria-label="minus">-</kbd></p>`,
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
    this.containerEl?.insertAdjacentElement("beforeend", this.infoArea);
    this.infoArea.classList.add("storiiies-viewer__info-area");
    this.infoArea.innerText = this.label ?? "";
  }

  /**
   * Retrieves the annotationPages for the manifest
   * (Temporary solution)
   */
  public getAnnotationPages(): Array<AnnotationPage> {
    const annotationPages: Array<AnnotationPage> = [];

    if (this.canvases.length) {
      this.canvases.forEach((canvas) => {
        const annotations: Array<unknown> | undefined =
          canvas.getProperty("annotations");
        if (annotations) {
          annotationPages.push(
            ...annotations.map((annotationPage) => {
              return new AnnotationPage(annotationPage, this.manifest.options);
            }),
          );
        }
        return [];
      });
    }
    return annotationPages;
  }
}
