import { loadManifest, Manifest, Canvas, AnnotationPage } from "manifesto.js";
import OpenSeadragon from "openseadragon";
interface IStoriiiesViewerConfig {
  container: Element | HTMLElement | string | null;
  manifestUrl: string;
}

type ControlButtons = {
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
};

export default class StoriiiesViewer {
  private containerElement: HTMLElement | null;
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
  public infoAreaElement!: HTMLElement;
  public infoTextElement!: HTMLElement;
  public controlButtonElements!: ControlButtons;

  constructor(config: IStoriiiesViewerConfig) {
    this.instanceId = document.querySelectorAll(".storiiies-viewer").length;

    // Normalise the config container
    if (typeof config.container === "string") {
      this.containerElement = document.querySelector(config.container);
    } else {
      // Minor wrinkle around if the container is an Element or HTMLElement
      // It should be safe to cast it to HTMLElement
      this.containerElement = config.container as HTMLElement;
    }

    this.manifestUrl = config.manifestUrl;

    if (!this.containerElement || !this.manifestUrl) {
      throw new Error("Missing required config");
    }

    this.containerElement?.classList.add("storiiies-viewer");

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
      element: this.containerElement ?? undefined,
      tileSources: [this.canvases[this._activeCanvasIndex].imageServiceIds[0]],
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
    const lowerBound = this.label ? -1 : 0;
    const upperBound = this.activeCanvasAnnotations.length - 1;

    if (index < lowerBound || index > upperBound) return;

    this._activeAnnotationIndex = index;

    if (this.infoTextElement) {
      if (this._activeAnnotationIndex >= 0) {
        this.infoTextElement.innerText =
          this.activeCanvasAnnotations[index]["body"]["value"];
      } else {
        this.infoTextElement.innerText = this.label;
      }
    }
  }

  /**
   * Create area for label, annotations and controls
   */
  private insertInfoArea() {
    const infoAreaEl = document.createElement("div");
    const prevButtonEl = document.createElement("button");
    const infoTextEl = document.createElement("p");
    prevButtonEl.classList.add("storiiies-viewer__nav-button");
    prevButtonEl.innerText = "Previous";

    // TODO: At least re-look at how I'm doing this
    const nextButtonEl = prevButtonEl.cloneNode() as HTMLButtonElement;
    nextButtonEl.innerText = "Next";

    [prevButtonEl, nextButtonEl].forEach((button) => {
      button.addEventListener("click", (e) => {
        if ((e.target as HTMLButtonElement).innerText === "Previous") {
          this.activeAnnotationIndex = this._activeAnnotationIndex - 1;
        } else {
          this.activeAnnotationIndex = this._activeAnnotationIndex + 1;
        }
      });
    });

    infoTextEl.classList.add("storiiies-viewer__info-text");
    infoTextEl.innerText = this.label;
    infoAreaEl.insertAdjacentElement("beforeend", infoTextEl);

    infoAreaEl.append(prevButtonEl, nextButtonEl);

    this.containerElement?.insertAdjacentElement("beforeend", infoAreaEl);
    infoAreaEl.classList.add("storiiies-viewer__info-area");

    this.infoAreaElement = infoAreaEl;
    this.infoTextElement = infoTextEl;
    this.controlButtonElements = {
      prev: prevButtonEl,
      next: nextButtonEl,
    };
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
