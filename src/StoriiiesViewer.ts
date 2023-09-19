import {
  loadManifest,
  Manifest,
  Canvas,
  AnnotationPage,
  Annotation,
} from "manifesto.js";
import DOMPurify from "dompurify";
import OpenSeadragon from "openseadragon";

import { sanitiseHTML } from "./utils";

import arrowIcon from "./images/arrow.svg?raw";
import showIcon from "./images/eye.svg?raw";
import hideIcon from "./images/hide.svg?raw";

/**
 * Config object used when instantiating a new StoriiiesViewer
 * @property {HTMLElement | Element | string | null} container - The container element where StoriiiesViewer should be mounted. Must exist in the page
 * @property {string} manifestUrl - The URL for the IIIF manifest to be loaded into StoriiiesViewer
 */
export interface StoriiiesViewerConfig {
  container: HTMLElement | Element | string | null;
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
  #_activeAnnotationIndex: number = -1;
  #_activeCanvasIndex: number = 0;
  #_showInfoArea: boolean = true;
  #annotationIndexFloor: number = -1;
  #prefersReducedMotion!: boolean;
  #statusCodes: statusCodes = {
    "bad-config": ["error", "Missing required config"],
    "manifest-err": ["error", "Encountered a problem loading the manifest"],
    "bad-manifest": ["error", "Could not parse the manifest"],
    "bad-container": ["error", "Container element not found"],
    "unkn-version": [
      "warn",
      "Unsupported IIIF Presentation API version detected",
    ],
    "no-label": [
      "warn",
      "Manifest doesn't contain a label. This is required by the IIIF Presentation API",
    ],
    "no-ext-anno": ["warn", "External annotationPages are not supported"],
  };
  static #instanceCounter: number = 0;
  /** The normalised reference to the container where this instance is mounted
   * @readonly
   */
  public containerElement: HTMLElement | null = null;
  /** The URL for the IIIF manifest loaded into this instance */
  public manifestUrl: string;
  /** ID used for creating id attributes that shouldn't clash, or referencing a particular instance of StoriiiesViewer
   * @readonly
   */
  public instanceId: number;
  /** The IIIF manifest loaded into this instance */
  public manifest!: Manifest;
  /** The label retrieved from the manifest */
  public label: string = "";
  /** The summary retrieved from the manifest */
  public summary!: string;
  /** The required statement label and value retrieved from the manifest */
  public requiredStatement!: {
    label: string;
    value: string;
  };
  /** The canvases retrieved from the manifest */
  public canvases!: Canvas[];
  /** The annotationPages retrieved from the manifest */
  public annotationPages: AnnotationPage[] = [];
  /** The annotations for the current canvas */
  public activeCanvasAnnotations: Array<Annotation> = [];
  /** A reference to the OpenSeadragon viewer */
  public viewer!: OpenSeadragon.Viewer;
  /** A reference to the info-area HTML element
   * @readonly
   */
  public infoAreaElement!: HTMLElement;
  /** A reference to the info-text-area HTML element
   * @readonly
   */
  public infoTextElement!: HTMLElement;
  /** References to the navigation control button HTML elements
   * @readonly
   */
  public controlButtonElements!: ControlButtons;
  /** A reference to the info-toggle HTML element
   * @readonly
   */
  public infoToggleElement!: HTMLElement;
  /** DOMPurify configuration */
  public DOMPurifyConfig: DOMPurify.Config = {
    ALLOWED_TAGS: [
      "a",
      "b",
      "br",
      "em",
      "i",
      "p",
      "small",
      "span",
      "strong",
      "sub",
      "sup",
    ],
    ALLOWED_ATTR: ["href"],
  };

  constructor(config: StoriiiesViewerConfig) {
    // Normalise the config container
    if (typeof config.container === "string") {
      this.containerElement = document.querySelector(config.container);
      // Allow non-HTMLElements to be fall through as null
      // (e.g. SVG is instanceof Element, but not HTMLElement)
    } else if (config.container instanceof HTMLElement) {
      this.containerElement = config.container;
    }

    // Throw if the container element can't be found (or it's not an HTMLElement)
    if (this.containerElement === null) {
      this.#logger("bad-container", true);
    }

    this.manifestUrl = config.manifestUrl;

    // Throw if the required config is missing and halt instantiation
    if (!this.containerElement || !this.manifestUrl) {
      this.#logger("bad-config", true);
    }

    // Increment the instance ID if the config is valid
    this.instanceId = StoriiiesViewer.#instanceCounter++;

    this.#prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    this.#initManifest().then(() => {
      // Should only get styles if manifest can load
      this.containerElement?.classList.add("storiiies-viewer");
      this.#initViewer();
      this.#insertInfoAndControls();
    });
  }

  /**
   * Log a message to the console, or throw an exception
   */
  #logger(code: string, withException: boolean = false) {
    const [level, message] = this.#statusCodes[code];
    const statuses = new Set(this.containerElement?.dataset.status?.split(","));

    // Primarily for use in the test suites
    if (this.containerElement) {
      statuses.add(code);
      this.containerElement.dataset.status = [...statuses].join(",");
    }

    if (withException) {
      throw new Error(`Storiiies Viewer: ${message}`);
    }

    console[level](`Storiiies Viewer: ${message}`);
  }

  /**
   * Load the manifest and extract the label, canvases and annotation pages
   */
  async #initManifest() {
    const rawManifest = await loadManifest(this.manifestUrl).catch(() => {
      this.#logger("manifest-err", true);
    });

    this.manifest = new Manifest(rawManifest);
    this.canvases = this.manifest.getSequenceByIndex(0)?.getCanvases();

    // A valid manifest must have at least one canvas
    // Assume "not a manifest" and throw an error
    if (!this?.canvases?.length) {
      this.#logger("bad-manifest", true);
    }

    // Warn about unsupported manifest versions
    if (
      this.manifest.context !== "http://iiif.io/api/presentation/3/context.json"
    ) {
      this.#logger("unkn-version");
    }

    this.label = this.manifest.getLabel().getValue() || "";

    // At the time of writing, a manifest.getSummary() doesn't exist
    this.summary = this.manifest.getProperty("summary")?.en[0] || "";
    let requiredStatementLabel;
    let requiredStatementValue;

    try {
      requiredStatementLabel = this.manifest
        ?.getRequiredStatement()
        ?.getLabel();
    } catch (e) {
      // Ignore
    }
    try {
      requiredStatementValue = this.manifest
        ?.getRequiredStatement()
        ?.getValue();
    } catch (e) {
      // Ignore
    }

    this.requiredStatement = {
      label: requiredStatementLabel || "",
      value: requiredStatementValue || "",
    };

    // It's worth noting display of a title slide is predicated on the presence of a label in the manifest
    // In lieu of a label, set the active annotation to 0 to show the first annotation
    if (!this.label) {
      this.activeAnnotationIndex = 0;
      this.#annotationIndexFloor = 0;

      // But should also warn that this is invalid
      this.#logger("no-label");
    }

    this.annotationPages = this.#getAnnotationPages();
    this.activeCanvasAnnotations = this.#getActiveCanvasAnnotations();
  }

  /**
   * Initialize the viewer
   */
  #initViewer() {
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
  #updateViewer() {
    // Show whole image when showing the label
    if (
      this.label &&
      this.activeAnnotationIndex === this.#annotationIndexFloor
    ) {
      this.viewer.viewport.goHome(this.#prefersReducedMotion);
      return;
    }

    const target =
      this.#getActiveCanvasAnnotations()[
        this.activeAnnotationIndex
      ].getTarget() || "";
    const region = this.#getRegion(target);

    if (region) {
      this.viewer.viewport.fitBoundsWithConstraints(
        region,
        this.#prefersReducedMotion,
      );
    } else {
      this.viewer.viewport.goHome(this.#prefersReducedMotion);
    }
  }

  /**
   * Get the active canvas index\
   * Used to determine which canvas is currently active
   */
  get activeCanvasIndex(): number {
    return this.#_activeCanvasIndex;
  }

  /**
   * Set the active canvas index and perform any necessary updates\
   * Used to navigate between canvases
   */
  set activeCanvasIndex(index: number) {
    this.#_activeCanvasIndex = index;
    this.activeAnnotationIndex = this.#annotationIndexFloor;
  }

  /**
   * Get the active annotation index\
   * Used to determine which annotation is currently active
   */
  get activeAnnotationIndex(): number {
    return this.#_activeAnnotationIndex;
  }

  /**
   * Set the active annotation index and perform any necessary updates\
   * Used to navigate between annotations
   */
  set activeAnnotationIndex(index: number) {
    // Lower bound can only be -1 if there is a label
    const lowerBound = this.#annotationIndexFloor;
    const upperBound = this.activeCanvasAnnotations.length - 1;
    let infoTextElementMarkup;

    // Ignore out of bounds values
    if (index < lowerBound || index > upperBound) return;

    this.#_activeAnnotationIndex = index;

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

    // Determine rendering method for info text area
    if (this.activeAnnotationIndex === this.#annotationIndexFloor) {
      infoTextElementMarkup = this.#creatTitleSlideMarkup();
    } else {
      infoTextElementMarkup = this.#createAnnotationSlideMarkup();
    }

    this.infoTextElement.innerHTML = infoTextElementMarkup;

    this.#updateViewer();
  }

  /**
   * Get the showInfoArea value\
   * Used to determine whether the info area is visible
   */
  get showInfoArea(): boolean {
    return this.#_showInfoArea;
  }

  /**
   * Set the showInfoArea value and perform any necessary updates\
   * Used to toggle the info area visibility
   */
  set showInfoArea(value: boolean) {
    this.#_showInfoArea = value;
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
  #insertInfoAndControls() {
    const infoAreaEl = document.createElement("div");
    const prevButtonEl = document.createElement("button");
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
    infoAreaEl.append(prevButtonEl, nextButtonEl);

    // Text element
    infoAreaEl.insertAdjacentHTML(
      "beforeend",
      `
      <div id="storiiies-viewer-${this.instanceId}__info-text" class="storiiies-viewer__info-text" tabindex="0">
      </div>
    `,
    );
    const infoTextEl = infoAreaEl.querySelector(
      ".storiiies-viewer__info-text",
    ) as HTMLElement;

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
    this.activeAnnotationIndex = this.#annotationIndexFloor;
  }

  /**
   * Generate HTML markup for the title slide
   */
  #creatTitleSlideMarkup(): string {
    // Despite HTML not always being expected, we'll still need to sanitise it
    const labelHTML = this.label.replace(/(?:\r\n|\r|\n)/g, "<br/>");
    const summaryHTML = this.summary;
    let requiredStatementHTML = "";

    requiredStatementHTML = requiredStatementHTML.concat(
      this.requiredStatement.label &&
        `<strong>${this.requiredStatement.label}:</strong> `,
      this.requiredStatement.value && `${this.requiredStatement.value}`,
    );

    return sanitiseHTML(
      `<div>
        <h1 class="storiiies-viewer__text-section">${labelHTML}</h1>
        <div class="storiiies-viewer__text-section">${summaryHTML}</div>
        <div class="storiiies-viewer__text-section">${requiredStatementHTML}</div>
      </div>`,
      // Use augmented config to allow for more tags
      {
        ...this.DOMPurifyConfig,
        ALLOWED_TAGS: this.DOMPurifyConfig.ALLOWED_TAGS?.concat(
          "h1",
          "div",
          "strong",
        ),
        ALLOWED_ATTR: this.DOMPurifyConfig.ALLOWED_ATTR?.concat("class"),
      },
    );
  }

  /**
   * Generate HTML markup for an annotation slide
   */
  #createAnnotationSlideMarkup(): string {
    // Have to use getProperty here as there is no getValue() method
    let value = this.activeCanvasAnnotations[this.activeAnnotationIndex]
      .getBody()[0]
      .getProperty("value");
    const format =
      this.activeCanvasAnnotations[this.activeAnnotationIndex]
        .getBody()[0]
        .getFormat() || "text/plain";

    // Replace newlines with break tags for plain text
    if (format === "text/plain") {
      value = value.replace(/(?:\r\n|\r|\n)/g, "<br/>");
    }

    return sanitiseHTML(value, this.DOMPurifyConfig);
  }

  /**
   * Retrieves the annotationPages for the manifest
   * (Temporary solution)
   */
  #getAnnotationPages(): Array<AnnotationPage> {
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
              this.#logger("no-ext-anno");
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
  #getActiveCanvasAnnotations(): Array<Annotation> {
    // The current canvas might not have any annotations
    return this.annotationPages[this.activeCanvasIndex]?.getItems() || [];
  }

  /**
   * Get the region from the URL as a Rect relative to the viewport of this instance's viewer
   */
  #getRegion(url?: string): OpenSeadragon.Rect | null {
    const regex = /#xywh=(\d+),(\d+),(\d+),(\d+)/;
    const match = url?.match(regex);

    if (match) {
      const [, x, y, w, h] = match.map(Number);
      return this.viewer.viewport.imageToViewportRectangle(x, y, w, h);
    }

    return null;
  }
}
