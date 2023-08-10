import {
  loadManifest,
  Manifest,
  Canvas,
  AnnotationPage,
  Annotation,
} from "manifesto.js";

import arrowIcon from "./images/arrow.svg?raw";
import showIcon from "./images/eye.svg?raw";
import hideIcon from "./images/hide.svg?raw";

import OpenSeadragon from "openseadragon";
interface IStoriiiesViewerConfig {
  container: Element | HTMLElement | string | null;
  manifestUrl: string;
}

type ControlButtons = {
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
};

type statusCodes = {
  [key: string]: ["warn" | "error", string];
};

type RawAnnotationPage = {
  id: string;
  type: string;
  items: Array<RawAnnotation>;
};

type RawAnnotation = {
  id: string;
  type: string;
  motivation: string;
  body: RawAnnotationBody;
  target: string;
};

type RawAnnotationBody = {
  type: string;
  value: string;
  language: string;
  format: string;
};

export default class StoriiiesViewer {
  private containerElement: HTMLElement | null;
  private manifestUrl: string;
  private _activeAnnotationIndex: number = -1;
  private _activeCanvasIndex: number = 0;
  private _showInfoArea: boolean = true;
  private annotationIndexFloor: number = -1;
  private prefersReducedMotion!: boolean;
  private instanceId: number;
  private statusCodes: statusCodes = {
    "bad-config": ["error", "Missing required config"],
    "manifest-err": ["error", "Encountered a problem loading the manifest"],
    "bad-manifest": ["error", "Could not parse the manifest"],
    "bad-container": ["error", "Container element not found"],
    "unkn-manifest": ["warn", "Manifest version not supported"],
    "no-ext-anno": ["warn", "External annotationPages are not supported"],
    "no-label": [
      "warn",
      "Manifest doesn't contain a label. This is required by the IIIF Presentation API",
    ],
    "unkn-version": [
      "warn",
      "Unsupported IIIF Presentation API version detected",
    ],
  };
  public manifest!: Manifest;
  public label: string = "";
  public canvases!: Canvas[];
  public annotationPages: AnnotationPage[] = [];
  public activeCanvasAnnotations: Array<Annotation> = [];
  public viewer!: OpenSeadragon.Viewer;
  public infoAreaElement!: HTMLElement;
  public infoTextElement!: HTMLElement;
  public controlButtonElements!: ControlButtons;
  public infoToggleElement!: HTMLElement;

  constructor(config: IStoriiiesViewerConfig) {
    this.instanceId = document.querySelectorAll(".storiiies-viewer").length;

    this.prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Normalise the config container
    if (typeof config.container === "string") {
      this.containerElement = document.querySelector(config.container);
    } else {
      // Minor wrinkle around if the container is an Element or HTMLElement
      // It should be safe to cast it to HTMLElement
      this.containerElement = config.container as HTMLElement;
    }

    this.manifestUrl = config.manifestUrl;

    // Throw if the required config is missing and halt instantiation
    if (!this.containerElement || !this.manifestUrl) {
      this.logger("bad-config", true);
    }

    // TODO: Remove — Debug code
    for (const code of Object.keys(this.statusCodes)) {
      this.logger(code);
    }

    this.initManifest().then(() => {
      // Should only get styles if manifest can load
      this.containerElement?.classList.add("storiiies-viewer");
      this.initViewer();
      this.insertInfoAndControls();
    });
  }

  /**
   * Log a message to the console, or throw an exception
   * TODO: Update to remove duplicates
   */
  private logger(code: string, withException: boolean = false) {
    const [level, message] = this.statusCodes[code];
    const currentStatus = this.containerElement?.dataset.status;

    // Primarily for use in the test suites
    if (this.containerElement) {
      this.containerElement.dataset.status =
        currentStatus?.concat(`,${code}`) || code;
    }

    if (withException) {
      throw new Error(`Storiiies Viewer: ${message}`);
    }

    console[level](`Storiiies Viewer: ${message}`);
  }

  /**
   * Load the manifest and extract the label, canvases and annotation pages
   */
  private async initManifest() {
    const rawManifest = await loadManifest(this.manifestUrl).catch(() => {
      this.logger("manifest-err", true);
    });

    this.manifest = new Manifest(rawManifest);

    // A manifest with no "items" aka "sequences" at the top level is invalid
    // Assume "not a manifest" and throw an error
    if (!this.manifest.items.length) {
      this.logger("bad-manifest", true);
    }

    this.canvases = this.manifest.getSequenceByIndex(0).getCanvases();

    // Warn about unsupported manifest versions
    if (
      this.manifest.context !== "http://iiif.io/api/presentation/3/context.json"
    ) {
      this.logger("unkn-version");
    }

    this.label = this.manifest.getLabel().getValue() || "";

    // In lieu of a label, set the active annotation to 0 to show the first annotation
    if (!this.label) {
      this.activeAnnotationIndex = 0;
      this.annotationIndexFloor = 0;

      // But should also warn that this is invalid
      this.logger("no-label");
    }

    this.annotationPages = this.getAnnotationPages();
    this.activeCanvasAnnotations = this.getActiveCanvasAnnotations();
  }

  /**
   * Initialize the viewer
   */
  private initViewer() {
    const osdContainer = document.createElement("div");
    osdContainer.id = `storiiies-viewer-${this.instanceId}__osd-container`;
    osdContainer.classList.add("storiiies-viewer__osd-container");
    this.containerElement?.insertAdjacentElement("afterbegin", osdContainer);
    this.viewer = OpenSeadragon({
      element: osdContainer,
      tileSources: [this.canvases[this.activeCanvasIndex].imageServiceIds[0]],
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
      `<p class="storiiies-viewer__description" id="storiiies-viewer-${this.instanceId}__description">Drag with your mouse or the arrow keys, and zoom with scroll or <kbd aria-label="plus">+</kbd> and <kbd aria-label="minus">-</kbd></p>`,
    );
    this.viewer.canvas.setAttribute(
      "aria-describedby",
      `storiiies-viewer-${this.instanceId}__description`,
    );

    // After the image has loaded
    this.viewer.addHandler("open", () => {
      if (this.containerElement) {
        this.containerElement.dataset.loaded = "true";
      }
    });
  }

  /**
   * Update the viewer
   */
  private updateViewer() {
    // Show whole image when showing the label
    if (
      this.label &&
      this.activeAnnotationIndex === this.annotationIndexFloor
    ) {
      this.viewer.viewport.goHome(this.prefersReducedMotion);
      return;
    }

    const target =
      this.getActiveCanvasAnnotations()[
        this.activeAnnotationIndex
      ].getTarget() || "";
    const region = this.getRegion(target);

    if (region) {
      this.viewer.viewport.fitBoundsWithConstraints(
        region,
        this.prefersReducedMotion,
      );
    } else {
      this.viewer.viewport.goHome(this.prefersReducedMotion);
    }
  }

  /**
   * Get the active canvas index
   */
  get activeCanvasIndex(): number {
    return this._activeCanvasIndex;
  }

  /**
   * Set the active canvas index and perform any necessary updates
   */
  set activeCanvasIndex(index: number) {
    this._activeCanvasIndex = index;
    this.activeAnnotationIndex = this.annotationIndexFloor;
  }

  /**
   * Get the active annotation index
   */
  get activeAnnotationIndex(): number {
    return this._activeAnnotationIndex;
  }

  /**
   * Set the active annotation index and perform any necessary updates
   */
  set activeAnnotationIndex(index: number) {
    // Lower bound can only be -1 if there is a label
    const lowerBound = this.annotationIndexFloor;
    const upperBound = this.activeCanvasAnnotations.length - 1;

    // Ignore out of bounds values
    if (index < lowerBound || index > upperBound) return;

    this._activeAnnotationIndex = index;

    // Reset button states
    this.controlButtonElements.prev.disabled = false;
    this.controlButtonElements.next.disabled = false;

    // Disable buttons
    if (index === lowerBound) {
      this.controlButtonElements.prev.disabled = true;
    }
    if (index === upperBound) {
      this.controlButtonElements.next.disabled = true;
    }

    // Info text to be label or annotation
    if (this.infoTextElement) {
      if (this.activeAnnotationIndex >= 0) {
        // Have to use getProperty here as there is no getValue() method
        this.infoTextElement.innerText = this.activeCanvasAnnotations[index]
          .getBody()[0]
          .getProperty("value");
      } else {
        this.infoTextElement.innerText = this.label;
      }
    }

    this.updateViewer();
  }

  /**
   * Get the showInfoArea value
   */
  get showInfoArea(): boolean {
    return this._showInfoArea;
  }

  /**
   * Set the showInfoArea value and perform any necessary updates
   */
  set showInfoArea(value: boolean) {
    this._showInfoArea = value;
    this.containerElement?.classList.toggle(
      "storiiies-viewer--info-hidden",
      !value,
    );
    this.infoToggleElement.ariaLabel = `${value ? "Hide" : "Show"} annotations`;
    this.infoToggleElement.innerHTML = `
      <span class="storiiies-viewer__button-icon" inert>
        ${value ? hideIcon : showIcon}
      </span>
    `;
    this.infoToggleElement.ariaExpanded = `${value}`;
    this.infoAreaElement.inert = !value;
    this.infoAreaElement.classList.toggle(
      "storiiies-viewer__info-area--hidden",
      !value,
    );
  }

  /**
   * Create area for label, annotations and controls
   */
  private insertInfoAndControls() {
    const infoAreaEl = document.createElement("div");
    const prevButtonEl = document.createElement("button");
    const infoTextEl = document.createElement("p");
    const infoToggleEl = document.createElement("button");

    // Navigation buttons
    prevButtonEl.id = `storiiies-viewer-${this.instanceId}__previous`;
    prevButtonEl.classList.add("storiiies-viewer__icon-button");
    prevButtonEl.ariaLabel = "Previous";
    prevButtonEl.innerHTML = `
      <span class="storiiies-viewer__button-icon" inert>
        ${arrowIcon}
      </span>
    `;

    const nextButtonEl = prevButtonEl.cloneNode() as HTMLButtonElement;
    nextButtonEl.id = `storiiies-viewer-${this.instanceId}__next`;
    nextButtonEl.ariaLabel = "Next";
    nextButtonEl.innerHTML = `
      <span class="storiiies-viewer__button-icon" inert>
        ${arrowIcon}
      </span>
    `;

    prevButtonEl.classList.add("storiiies-viewer__previous");
    nextButtonEl.classList.add("storiiies-viewer__next");

    [prevButtonEl, nextButtonEl].forEach((button) => {
      button.addEventListener("click", (e) => {
        if ((e.target as HTMLButtonElement).ariaLabel === "Previous") {
          this.activeAnnotationIndex = this.activeAnnotationIndex - 1;
        } else {
          this.activeAnnotationIndex = this.activeAnnotationIndex + 1;
        }
      });
    });

    // Text element
    infoTextEl.id = `storiiies-viewer-${this.instanceId}__info-text`;
    infoTextEl.classList.add("storiiies-viewer__info-text");
    infoTextEl.innerText = this.label;
    infoAreaEl.append(prevButtonEl, nextButtonEl);
    infoAreaEl.insertAdjacentElement("beforeend", infoTextEl);

    // Toggle button
    infoToggleEl.id = `storiiies-viewer-${this.instanceId}__info-toggle`;
    infoToggleEl.classList.add(
      "storiiies-viewer__icon-button",
      "storiiies-viewer__info-toggle",
    );
    infoToggleEl.setAttribute(
      "aria-controls",
      `storiiies-viewer-${this.instanceId}__info-area`,
    );
    infoToggleEl.addEventListener("click", () => {
      this.showInfoArea = !this.showInfoArea;
    });

    // Info area container
    infoAreaEl.id = `storiiies-viewer-${this.instanceId}__info-area`;
    this.containerElement?.insertAdjacentElement("beforeend", infoAreaEl);
    infoAreaEl.insertAdjacentElement("beforebegin", infoToggleEl);
    infoAreaEl.classList.add("storiiies-viewer__info-area");

    // Register elements
    this.infoAreaElement = infoAreaEl;
    this.infoTextElement = infoTextEl;
    this.controlButtonElements = {
      prev: prevButtonEl,
      next: nextButtonEl,
    };
    this.infoToggleElement = infoToggleEl;

    // Initialise values, let the setters handle the rest
    this.showInfoArea = true;
    this.activeAnnotationIndex = this.annotationIndexFloor;
  }

  /**
   * Retrieves the annotationPages for the manifest
   * (Temporary solution)
   */
  public getAnnotationPages(): Array<AnnotationPage> {
    const annotationPages: Array<AnnotationPage> = [];

    if (this.canvases.length) {
      this.canvases.forEach((canvas) => {
        // "getProperty" ejects and results in raw JSON
        // We need to instantiate each level with the appropriate constructor
        const rawAnnotationPages: Array<RawAnnotationPage> =
          canvas.getProperty("annotations") || [];

        annotationPages.push(
          ...rawAnnotationPages.flatMap((rawAnnotationPage) => {
            const rawAnnotations: Array<RawAnnotation> | undefined =
              rawAnnotationPage.items;

            // Remove page if annotations aren't embedded
            if (!rawAnnotations) {
              this.logger("no-ext-anno");
              return [];
            }

            return new AnnotationPage(
              {
                ...rawAnnotationPage,
                items: rawAnnotations.map((rawAnnotation) => {
                  return new Annotation(rawAnnotation, this.manifest.options);
                }),
                type: rawAnnotationPage.type,
              },
              this.manifest.options,
            );
          }),
        );
        return [];
      });
    }
    return annotationPages;
  }

  /**
   * Get the annotations for the current canvas
   */
  public getActiveCanvasAnnotations(): Array<Annotation> {
    // The current canvas might not have any annotations
    return this.annotationPages[this.activeCanvasIndex]?.getItems() || [];
  }

  /**
   * Get the region from the URL
   */
  public getRegion(url?: string): OpenSeadragon.Rect | null {
    const regex = /#xywh=(\d+),(\d+),(\d+),(\d+)/;
    const match = url?.match(regex);

    if (match) {
      const [, x, y, w, h] = match.map(Number);
      return this.viewer.viewport.imageToViewportRectangle(x, y, w, h);
    }

    return null;
  }
}
