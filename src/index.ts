import { loadManifest, Manifest, Canvas, AnnotationPage } from "manifesto.js";
import OpenSeadragon from "openseadragon";
interface IStoriiiesViewerConfig {
  container: Element | HTMLElement | string | null;
  manifestUrl: string;
}

export default class StoriiiesViewer {
  private containerEl: HTMLElement | null;
  private manifestUrl: string;
  private _activeAnnotationIndex: number = -1;
  private _activeCanvasIndex: number = 0;
  public manifest!: Manifest;
  public label: string = "";
  public canvases!: Canvas[];
  public annotationPages: AnnotationPage[] = [];
  public activeCanvasAnnotations: Array<{ body: { value: string } }> = [];
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
      this.activeAnnotationIndex = 0;
    }

    this.canvases = this.manifest.getSequenceByIndex(0).getCanvases();
    this.annotationPages = this.getAnnotationPages();
    this.activeCanvasAnnotations = this.getActiveCanvasAnnotations();
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
   * Set the active annotation index and perform any necessary updates
   */
  set activeAnnotationIndex(index: number) {
    const textEl = this.infoArea?.querySelector(
      ".storiiies-viewer__info-text",
    ) as HTMLElement;

    const lowerBound = this.label ? -1 : 0;
    const upperBound = this.activeCanvasAnnotations.length - 1;

    if (index < lowerBound || index > upperBound) return;

    this._activeAnnotationIndex = index;

    if (textEl) {
      if (this._activeAnnotationIndex >= 0) {
        textEl.innerText = this.activeCanvasAnnotations[index]["body"]["value"];
      } else {
        textEl.innerText = this.label;
      }
    }
  }

  /**
   * Create area for label, annotations and controls
   */
  private insertInfoArea() {
    const infoArea = document.createElement("div");
    const prevButton = document.createElement("button");
    prevButton.classList.add("storiiies-viewer__nav-button");
    prevButton.innerText = "Previous";

    // TODO: At least re-look at how I'm doing this
    const nextButton = prevButton.cloneNode() as HTMLButtonElement;
    nextButton.innerText = "Next";

    [prevButton, nextButton].forEach((button) => {
      button.addEventListener("click", (e) => {
        if ((e.target as HTMLButtonElement).innerText === "Previous") {
          this.activeAnnotationIndex = this._activeAnnotationIndex - 1;
        } else {
          this.activeAnnotationIndex = this._activeAnnotationIndex + 1;
        }
      });
    });

    infoArea.insertAdjacentHTML(
      "beforeend",
      `<p class="storiiies-viewer__info-text">${this.label}</p>`,
    );
    infoArea.append(prevButton, nextButton);

    this.containerEl?.insertAdjacentElement("beforeend", infoArea);
    infoArea.classList.add("storiiies-viewer__info-area");

    this.infoArea = infoArea;
  }

  /**
   * Retrieves the annotationPages for the manifest
   * TODO: Annotations aren't constructed as Annotation type
   * TODO: AnnotationBody isn't constructed as AnnotationBody type
   * TODO: When refactoring this we might either need to define temporary types for the raw data or allow use of "any" types
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

  /**
   * Get the annotations for the current canvas
   */
  // TODO: Return Annotation type
  public getActiveCanvasAnnotations(): Array<{ body: { value: string } }> {
    return this.annotationPages[this._activeCanvasIndex].__jsonld.items;
  }
}
