import "./css/styles.css";
import type { Config } from "dompurify";
import DOMPurify from "dompurify";
import {
  Annotation,
  AnnotationPage,
  Canvas,
  loadManifest,
  Manifest,
} from "manifesto.js";
import OpenSeadragon from "openseadragon";
import arrowIcon from "./images/arrow.svg?raw";
import showIcon from "./images/eye.svg?raw";
import hideIcon from "./images/hide.svg?raw";
import poiIcon from "./images/poi.svg?raw";
import restartIcon from "./images/restart.svg?raw";
import { IIIFSaysThisIsHTML, nl2br, sanitiseHTML } from "./utils";

/**
 * Config object used when instantiating a new StoriiiesViewer
 * @property {HTMLElement | Element | string | null} container - The container element where StoriiiesViewer should be mounted. Must exist in the page
 * @property {string} manifestUrl - The URL for the IIIF manifest to be loaded into StoriiiesViewer
 * @property {boolean} showCreditSlide - Whether to show the final credit slide (default: true)
 * @property {boolean} disablePanAndZoom - Whether to disable user panning and zooming (default: false)
 */
export interface StoriiiesViewerConfig {
  container: HTMLElement | Element | string | null;
  manifestUrl: string;
  showCreditSlide?: boolean;
  disablePanAndZoom?: boolean;
  pointOfInterestSvgUrl?: string;
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

type PointOfInterestTarget = {
  type: string;
  source?: string;
  selector: {
    type: "PointSelector";
    x: number;
    y: number;
  };
};

export default class StoriiiesViewer {
  /** Index pointing to the annotation from the annotationPage, currently being viewed\
   * The active annotationPage is treated as being the same as activeCanvasIndex
   */
  #_activeAnnotationIndex: number = -1;
  /** Index pointing to the canvas from the manifest currently being viewed\
   * This value is also used to infer the active annotationPage
   */
  #_activeCanvasIndex: number = 0;
  /** Visibility flag for the infoArea element */
  #_showInfoArea: boolean = true;
  /** Lowermost number of slides considering factors such as a title slide */
  #annotationIndexFloor: number = -1;
  /** Uppermost number of slides considering factors such as credits */
  #annotationIndexCeiling!: number;
  /** Cached user preference on reduced-motion */
  #prefersReducedMotion!: boolean;
  /** Error codes and their levels and user facing log messages */
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
    "poi-svg-err": ["warn", "Failed to load custom POI SVG"],
    "poi-svg-invalid": ["error", "Fetched content is not a valid SVG"],
    "poi-svg-default-err": ["error", "Failed to parse default POI SVG"],
  };
  /** Index representing the number of StoriiiesViewer instances in the current scope */
  static #instanceCounter: number = 0;
  /** The normalised reference to the container where this instance is mounted
   * @readonly
   */
  public containerElement: HTMLElement | null = null;
  /** Whether to display the closing credit slide. Defaults to true, can be overriden in StoriiiesViewerConfig
   * @readonly
   */
  public showCreditSlide: boolean = true;
  /** The URL for the IIIF manifest loaded into this instance */
  public manifestUrl: string;
  /** Whether to disable panning and scrolling */
  public disablePanAndZoom: boolean = false;
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
  /** Reference to the point of interest SVG url
   * @readonly
   */
  public pointOfInterestSvgUrl?: string;
  /** Graphic used for the point of interest markers
   * @readonly
   */
  public pointOfInterestSvg!: SVGElement;
  /** DOMPurify configuration */
  public DOMPurifyConfig: Config = {
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
      "img",
      // Common SVG elements
      "svg",
      "path",
      "circle",
      "rect",
      "line",
      "polyline",
      "polygon",
      "ellipse",
      "defs",
      "mask",
      "g",
      "use",
      "text",
      "tspan",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "class", "id"],
    ADD_ATTR: [
      "viewBox",
      "xmlns",
      "width",
      "height",
      "x",
      "y",
      "cx",
      "cy",
      "r",
      "rx",
      "ry",
      "fill",
      "stroke",
      "stroke-width",
      "stroke-linecap",
      "stroke-linejoin",
      "d",
      "points",
      "transform",
      "xlink:href",
    ],
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

    // Use the provided preference if present
    this.showCreditSlide = config.showCreditSlide ?? true;

    this.disablePanAndZoom = config.disablePanAndZoom ?? false;

    this.pointOfInterestSvgUrl = config.pointOfInterestSvgUrl;

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
   * Takes a service ID and returns the expanded URL that includes "/info.json"\
   * This format is a MUST for the IIIF Image API, so we can rely on our manipulations being valid
   */
  #expandServiceID(serviceID: string): string {
    // Add "/info.json" to the end of the serviceID
    // replacing trailing slash and/or info.json if present
    return serviceID.replace(/\/?(?:info\.json)?$/, "/info.json");
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
    // In lieu of a label, set the floor to 0 to effectively remove the title slide
    if (!this.label) {
      this.#annotationIndexFloor = 0;

      // But should also warn that this is invalid
      this.#logger("no-label");
    }

    this.annotationPages = this.#getAnnotationPages();
    this.activeCanvasAnnotations = this.#getActiveCanvasAnnotations();
    // Calculate the upper bound for the annotation index
    this.#annotationIndexCeiling = this.showCreditSlide
      ? this.activeCanvasAnnotations.length
      : this.activeCanvasAnnotations.length - 1;
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
      tileSources: [
        this.#expandServiceID(
          this.canvases[this.activeCanvasIndex].imageServiceIds[0],
        ),
      ],
      crossOriginPolicy: "Anonymous",
      showSequenceControl: false,
      showHomeControl: false,
      showZoomControl: false,
      showFullPageControl: false,
      visibilityRatio: 0.3,
      mouseNavEnabled: !this.disablePanAndZoom,
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
        // Remove any existing points of interest and re-render
        this.viewer.clearOverlays();
        this.#renderPointsOfInterest();
      }
    });
  }

  /**
   * Set the point of interest SVG graphic\
   * Fetches from a URL if provided, otherwise uses the default SVG
   */
  async #setPointOfInterestSvg() {
    if (this.pointOfInterestSvgUrl) {
      try {
        const response = await fetch(this.pointOfInterestSvgUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch SVG: ${response.statusText}`);
        }
        const svgText = await response.text();

        // Sanitize and return as DOM element
        const sanitized = DOMPurify.sanitize(svgText, {
          ...this.DOMPurifyConfig,
          RETURN_DOM_FRAGMENT: true,
        });

        const svgElement = sanitized.querySelector("svg");

        if (!svgElement) {
          this.#logger("poi-svg-invalid", true);
          return;
        }

        this.pointOfInterestSvg = svgElement;
      } catch (error) {
        this.#logger("poi-svg-err");
        // Fall back to default on error
        this.#setDefaultPointOfInterestSvg();
      }
    } else {
      this.#setDefaultPointOfInterestSvg();
    }
  }

  /**
   * Set default POI SVG graphic
   */
  #setDefaultPointOfInterestSvg() {
    const parser = new DOMParser();
    const doc = parser.parseFromString(poiIcon, "image/svg+xml");
    const svgElement = doc.querySelector("svg");

    if (svgElement) {
      this.pointOfInterestSvg = svgElement;
    } else {
      this.#logger("poi-svg-default-err", true);
    }
  }

  /**
   * Rendering of points of interest on the viewer
   */
  async #renderPointsOfInterest() {
    // Assign point of interest marker SVG
    await this.#setPointOfInterestSvg();

    // Extract POI data from annotations
    const poiData = this.activeCanvasAnnotations.map((annotation, index) => {
      // TODO: Cast needed here until manifesto.js updates return type of getTarget()
      const target = annotation.getTarget() as
        | string
        | null
        | PointOfInterestTarget;
      if (this.#isPointOfInterestTarget(target)) {
        return {
          index,
          x: target.selector.x,
          y: target.selector.y,
        };
      }
    });

    poiData.forEach((poi) => {
      if (poi) {
        // Render HTML element for each POI
        const poiButton = document.createElement("button");
        poiButton.type = "button";
        poiButton.appendChild(this.pointOfInterestSvg.cloneNode(true));
        poiButton.classList.add(
          "storiiies-viewer__icon-button",
          "storiiies-viewer__poi-marker",
        );
        poiButton.dataset.poiIndex = poi.index.toString();
        poiButton.ariaLabel = `Point of interest ${poi.index + 1}`;

        // Having a click event on an overlay requires a bit of extra legwork
        new OpenSeadragon.MouseTracker({
          element: poiButton,
          // Allow deferring to the native click callback as this runs anyway
          clickHandler: () => {},
        });

        // For keyboard actuations as well as mouse clicks
        poiButton.addEventListener("click", () => {
          this.activeAnnotationIndex = poi.index;
        });

        // Try to counteract odd behaviour if focus moves to an out of view POI
        poiButton.addEventListener("focus", () => {
          // Delay to ensure focus movement happens after blur event
          setTimeout(() => {
            this.viewer.viewport.fitBoundsWithConstraints(
              this.viewer.viewport.imageToViewportRectangle(
                poi.x,
                poi.y,
                100,
                100,
              ),
              true,
            );
          }, 0);
        });

        // Return to home when POI loses focus
        // Counteract odd canvas rendering on keyboard navigation
        poiButton.addEventListener("blur", () => {
          this.viewer.viewport.goHome(true);
        });

        // Attach POI to viewer as an OSD overlay
        this.viewer.addOverlay({
          element: poiButton,
          location: this.viewer.viewport.imageToViewportCoordinates(
            poi.x,
            poi.y,
          ),
          checkResize: false,
        });
      }
    });
  }

  /**
   * Verify that a target is a PointOfInterestTarget\
   * Type guard function
   * @param target
   * @returns boolean
   */
  #isPointOfInterestTarget(target: unknown): target is PointOfInterestTarget {
    if (typeof target !== "object" || target === null) {
      return false;
    }
    const t = target as PointOfInterestTarget;
    return (
      t.selector.type === "PointSelector" &&
      typeof t.selector.x === "number" &&
      typeof t.selector.y === "number"
    );
  }

  /**
   * Transform a PointOfInterestTarget to a region string\
   * This should be consumable by #getRegion
   * @param target
   * @returns string
   */
  #transformPointOfInterestToRegion(target: PointOfInterestTarget) {
    // Define a region around the point
    const regionSize = 100;

    const x = Math.max(0, target.selector.x - regionSize / 2);
    const y = Math.max(0, target.selector.y - regionSize / 2);
    return `#xywh=${x},${y},${regionSize},${regionSize}`;
  }

  /**
   * Set the active point of interest marker on the viewer
   **/
  #updatePointOfInterestMarkers() {
    const poiMarkers = this.viewer.canvas.querySelectorAll(
      ".storiiies-viewer__poi-marker",
    );
    // Remove active state from all markers
    poiMarkers.forEach((marker) => {
      marker.classList.remove("storiiies-viewer___poi-marker--active");
    });

    if (
      this.activeAnnotationIndex >= 0 &&
      this.activeAnnotationIndex < this.activeCanvasAnnotations.length &&
      this.#isPointOfInterestTarget(
        this.activeCanvasAnnotations[this.activeAnnotationIndex].getTarget(),
      )
    ) {
      const activeMarker = this.viewer.canvas.querySelector(
        '.storiiies-viewer__poi-marker[data-poi-index="' +
          this.activeAnnotationIndex +
          '"]',
      );
      if (activeMarker) {
        activeMarker.classList.add("storiiies-viewer___poi-marker--active");
      }
    }
  }

  /**
   * Offset region coordinates to compensate for info area\
   * This should be performed on raw values before conversion into any coordinate system
   * @param region OpenSeadragon rectangle representing region
   * @returns OpenSeadragon rectangle with adjusted coordinates
   */
  #offSetRegionByInfoArea(region: OpenSeadragon.Rect): OpenSeadragon.Rect {
    let x = region.x;
    // Space taken by info area
    let infoAreaWidth = this.infoAreaElement.offsetWidth;
    // Available space in viewer
    const viewerWidth = this.viewer.container.clientWidth;
    const halfViewerWidth = viewerWidth / 2;
    const infoInset = this.containerElement
      ? parseFloat(
          getComputedStyle(this.containerElement).getPropertyValue(
            "--storiiies-viewer-outer-spacing",
          ),
        ) || 0
      : 0;

    infoAreaWidth += infoInset;

    const overlap = infoAreaWidth - halfViewerWidth;
    const remainingSpace = viewerWidth - infoAreaWidth;
    const poiButtonWidth = 44;

    // The new focal point becomes the centre of the remaining space
    x -= overlap + remainingSpace / 2 - poiButtonWidth / 2;

    return new OpenSeadragon.Rect(x, region.y, region.width, region.height);
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

    // Do nothing on the credit slide
    if (
      this.activeAnnotationIndex === this.#annotationIndexCeiling &&
      this.showCreditSlide
    ) {
      return;
    }

    let target =
      this.#getActiveCanvasAnnotations()[
        this.activeAnnotationIndex
      ].getTarget() || "";

    // Flatten a point of interest into something the viewer can fit to the screen
    const isPointOfInterest = this.#isPointOfInterestTarget(target);
    if (this.#isPointOfInterestTarget(target)) {
      target = this.#transformPointOfInterestToRegion(target);
    }

    let region = this.#getRegion(target);
    if (region) {
      // Adjust region under certain conditions
      if (
        isPointOfInterest &&
        this.showInfoArea &&
        this.viewer.container.clientWidth >= 640
      ) {
        region = this.#offSetRegionByInfoArea(region);
      }

      this.viewer.viewport.fitBoundsWithConstraints(
        this.viewer.viewport.imageToViewportRectangle(region),
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
    const upperBound = this.#annotationIndexCeiling;
    let infoTextElementMarkup;

    // Ignore out of bounds values
    if (index < lowerBound || index > upperBound) return;

    this.#_activeAnnotationIndex = index;

    // Reset button states
    this.controlButtonElements.prev.disabled = false;
    this.controlButtonElements.next.innerHTML = `<span class="storiiies-viewer__button-icon" inert>${arrowIcon}</span>`;
    this.controlButtonElements.next.ariaLabel = "Next";

    // Update buttons
    if (index === lowerBound) {
      this.controlButtonElements.prev.disabled = true;
    }

    if (index === upperBound) {
      this.controlButtonElements.next.innerHTML = `<span class="storiiies-viewer__button-icon" inert>${restartIcon}</span>`;
      this.controlButtonElements.next.ariaLabel = "Restart";
    }

    // Determine rendering method for info text area
    if (this.activeAnnotationIndex === this.#annotationIndexFloor) {
      infoTextElementMarkup = this.#creatTitleSlideMarkup();
    } else if (
      this.activeAnnotationIndex === this.#annotationIndexCeiling &&
      this.showCreditSlide
    ) {
      infoTextElementMarkup = this.#createCreditSlideMarkup();
    } else {
      infoTextElementMarkup = this.#createAnnotationSlideMarkup();
    }

    this.infoTextElement.innerHTML = infoTextElementMarkup;

    this.#updatePointOfInterestMarkers();

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

    // (Next button innerHTML updated when activeAnnotationIndex changes)
    const nextButtonEl = prevButtonEl.cloneNode() as HTMLButtonElement;
    nextButtonEl.id = `storiiies-viewer-${this.instanceId}__next`;

    prevButtonEl.classList.add("storiiies-viewer__previous");
    nextButtonEl.classList.add("storiiies-viewer__next");

    [prevButtonEl, nextButtonEl].forEach((button) => {
      button.addEventListener("click", (e) => {
        if ((e.target as HTMLButtonElement).ariaLabel === "Previous") {
          this.activeAnnotationIndex = this.activeAnnotationIndex - 1;
        } else {
          if (this.activeAnnotationIndex === this.#annotationIndexCeiling) {
            this.activeCanvasIndex = 0;
          } else {
            this.activeAnnotationIndex = this.activeAnnotationIndex + 1;
          }
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
    // Label should always be plain text
    const labelHTML = sanitiseHTML(nl2br(this.label), this.DOMPurifyConfig);

    // Summary might be plain text or HTML
    const summaryHTML = sanitiseHTML(
      IIIFSaysThisIsHTML(this.summary) ? this.summary : nl2br(this.summary),
      this.DOMPurifyConfig,
    );
    let requiredStatementHTML = "";

    requiredStatementHTML = sanitiseHTML(
      requiredStatementHTML.concat(
        this.requiredStatement.label &&
          `<strong>${this.requiredStatement.label}:</strong> `,
        // Required statement value might be plain text or HTML
        this.requiredStatement.value &&
          `${
            IIIFSaysThisIsHTML(this.requiredStatement.value)
              ? this.requiredStatement.value
              : nl2br(this.requiredStatement.value)
          }`,
      ),
      this.DOMPurifyConfig,
    );

    // N.B. Sanitising this whole chunk would require loosening restrictions on allowed tags and attributes
    return `
        <h1 class="storiiies-viewer__title storiiies-viewer__text-section">${labelHTML}</h1>
        <div class="storiiies-viewer__text-section">${summaryHTML}</div>
        <div class="storiiies-viewer__text-section">${requiredStatementHTML}</div>
      `;
  }

  /**
   * Generate HTML markup for an annotation slide
   */
  #createAnnotationSlideMarkup(): string {
    let markup = "";
    const activeAnnotation =
      this.activeCanvasAnnotations[this.#_activeAnnotationIndex].getBody();

    // getBody will always return AnnotationBody[]
    for (const body of activeAnnotation) {
      // Wrap each annotation in a div
      markup += `<div class="storiiies-viewer__text-section">`;
      if (body.getType() === "textualbody") {
        let value = body.getProperty("value");
        const format = body.getFormat() || "text/plain";

        // Replace newlines with break tags for plain text
        if (format === "text/plain") {
          value = value.replace(/(?:\r\n|\r|\n)/g, "<br/>");
        }

        // Sanitize the value (e.g. it may be text/html)
        markup += sanitiseHTML(value, this.DOMPurifyConfig);
      } else if (body.getType() === "sound") {
        const soundUrl = body.id;
        // Create the audio link and sanitize the src
        const audioElement = `<audio controls src="${sanitiseHTML(
          soundUrl,
          this.DOMPurifyConfig,
        )}">Your browser does not support the audio element.</audio>`;
        markup += audioElement;
      }
      markup += "</div>";
    }

    // The return value isn't sanitised to avoid needing to open up the allowed tags and attributes
    // Remember to sanitise your values when extending this!
    return markup;
  }

  /**
   * Generate HTML markup for an annotation slide
   */
  #createCreditSlideMarkup(): string {
    // No need to sanitise this hardcoded markup
    return `<div class="storiiies-viewer__text-section"><p>Storiiies was created by <a href="https://www.cogapp.com" target="_blank">Cogapp</a>.</p><p>It's easy, and free, to create your own story - find out more at <a href="https://www.cogapp.com/storiiies" target="_blank">cogapp.com/storiiies</a>.</p><p>This viewer is released as open source - see <a href="https://cogapp.com/open-source-at-cogapp" target="_blank">cogapp.com/open-source-at-cogapp</a>.</p></div>`;
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
    // TODO: Deprecation warning from manifesto.js
    // but switching to getAnnotations seems break methods down the chain.
    // This needs investigating further, but strongly suspect it's
    // related to the temporary way we retrieve annotationPages.
    // This has been patched in manifesto and can be updated.
    return this.annotationPages[this.activeCanvasIndex]?.getItems() || [];
  }

  /**
   * Get the region from the URL as an OSD Rectangle\
   * This return value is agnostic to any particular OSD coordinate system
   * @returns OpenSeadragon.Rect using URL values or null if no matching fragment found
   */
  #getRegion(url?: string): OpenSeadragon.Rect | null {
    const xywh = url?.split("#xywh=")[1];

    if (xywh) {
      const [x, y, w, h] = xywh.split(",").map(Number);
      return new OpenSeadragon.Rect(x, y, w, h);
    }

    return null;
  }
}
