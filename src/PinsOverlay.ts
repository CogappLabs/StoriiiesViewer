import OpenSeadragon from "openseadragon";
import type { Annotation, Canvas } from "manifesto.js";
import pinIcon from "./images/pin.svg?raw";
import { parseXYWH } from "./utils";

/**
 * Configuration for the PinsOverlay
 */
export interface PinsOverlayConfig {
  /** Instance ID for unique element IDs */
  instanceId: number;
  /** Whether to show pins */
  enabled: boolean;
  /** Whether to show route lines connecting pins */
  enableRoute: boolean;
  /** Callback when a pin is clicked */
  onPinClick?: (index: number) => void;
}

/**
 * Handles pin markers and route lines overlay on OpenSeadragon viewer
 */
export default class PinsOverlay {
  #viewer: OpenSeadragon.Viewer;
  #config: PinsOverlayConfig;
  #pinElements: HTMLElement[] = [];
  #mouseTrackers: OpenSeadragon.MouseTracker[] = [];
  #routeElement: HTMLElement | null = null;
  #activeIndex: number = -1;
  #annotations: Annotation[] = [];
  #canvas: Canvas | null = null;
  #toggleElement: HTMLButtonElement | null = null;
  #visible: boolean = true;

  constructor(viewer: OpenSeadragon.Viewer, config: PinsOverlayConfig) {
    this.#viewer = viewer;
    this.#config = config;
  }

  /**
   * Get the toggle button element
   */
  get toggleElement(): HTMLButtonElement | null {
    return this.#toggleElement;
  }

  /**
   * Get/set visibility of pins and route
   */
  get visible(): boolean {
    return this.#visible;
  }

  set visible(value: boolean) {
    this.#visible = value;
    if (this.#toggleElement) {
      this.#toggleElement.ariaLabel = `${value ? "Hide" : "Show"} pins`;
      this.#toggleElement.ariaPressed = `${value}`;
      this.#toggleElement.classList.toggle(
        "storiiies-viewer__pin-toggle--inactive",
        !value,
      );
    }
    if (value) {
      this.create(this.#annotations, this.#canvas);
    } else {
      this.destroy();
    }
  }

  /**
   * Create the toggle button element
   */
  createToggleButton(): HTMLButtonElement {
    const pinToggleEl = document.createElement("button");
    pinToggleEl.id = `storiiies-viewer-${this.#config.instanceId}__pin-toggle`;
    pinToggleEl.classList.add(
      "storiiies-viewer__icon-button",
      "storiiies-viewer__pin-toggle",
    );
    pinToggleEl.innerHTML = `
      <span class="storiiies-viewer__button-icon" inert>
        ${pinIcon}
      </span>
    `;
    pinToggleEl.ariaLabel = "Hide pins";
    pinToggleEl.ariaPressed = "true";
    pinToggleEl.addEventListener("click", () => {
      this.visible = !this.visible;
    });
    this.#toggleElement = pinToggleEl;
    return pinToggleEl;
  }

  /**
   * Create pins and route for the given annotations
   */
  create(annotations: Annotation[], canvas: Canvas | null) {
    if (!this.#config.enabled) return;

    this.#annotations = annotations;
    this.#canvas = canvas;

    // Clear existing
    this.destroy();

    // Create route first so it's behind pins
    if (this.#config.enableRoute) {
      this.#createRoute();
    }

    // Create pins
    this.#createPins();

    // Update active state
    this.updateActiveState(this.#activeIndex);
  }

  /**
   * Remove all pins and route
   */
  destroy() {
    // Clean up MouseTrackers
    this.#mouseTrackers.forEach((tracker) => tracker.destroy());
    this.#mouseTrackers = [];

    // Remove pin overlays
    this.#pinElements.forEach((pin) => {
      this.#viewer.removeOverlay(pin);
    });
    this.#pinElements = [];

    // Remove route overlay
    if (this.#routeElement) {
      this.#viewer.removeOverlay(this.#routeElement);
      this.#routeElement = null;
    }
  }

  /**
   * Update the active pin state
   */
  updateActiveState(index: number) {
    this.#activeIndex = index;
    this.#pinElements.forEach((pin, i) => {
      if (i === index) {
        pin.classList.add("storiiies-viewer__pin--active");
      } else {
        pin.classList.remove("storiiies-viewer__pin--active");
      }
    });
  }

  /**
   * Create pin overlay elements
   */
  #createPins() {
    this.#annotations.forEach((annotation, index) => {
      const target = annotation.getTarget() || "";
      const centerPoint = this.#getCenterPoint(target);

      if (centerPoint) {
        const pinEl = document.createElement("div");
        pinEl.id = `storiiies-viewer-${this.#config.instanceId}__pin-${index}`;
        pinEl.classList.add("storiiies-viewer__pin");
        pinEl.dataset.annotationIndex = String(index);
        pinEl.setAttribute("role", "button");
        pinEl.setAttribute("aria-label", `Go to annotation ${index + 1}`);
        pinEl.tabIndex = 0;

        // Click handler - MouseTracker prevents OpenSeadragon from zooming
        const tracker = new OpenSeadragon.MouseTracker({
          element: pinEl,
          clickHandler: (e) => {
            (
              e as unknown as { preventDefaultAction: boolean }
            ).preventDefaultAction = true;
            this.#config.onPinClick?.(index);
          },
        });
        this.#mouseTrackers.push(tracker);

        // Keyboard handler
        pinEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            this.#config.onPinClick?.(index);
          }
        });

        this.#viewer.addOverlay({
          element: pinEl,
          location: centerPoint,
          placement: OpenSeadragon.Placement.CENTER,
        });

        this.#pinElements.push(pinEl);
      }
    });
  }

  /**
   * Create curved route path between pins
   */
  #createRoute() {
    if (this.#annotations.length < 2 || !this.#canvas) return;

    // Get center points in image coordinates
    const points: Array<{ x: number; y: number }> = [];
    this.#annotations.forEach((annotation) => {
      const target = annotation.getTarget() || "";
      const coords = parseXYWH(target);
      if (coords) {
        const { x, y, w, h } = coords;
        points.push({ x: x + w / 2, y: y + h / 2 });
      }
    });

    if (points.length < 2) return;

    // Get canvas dimensions
    const canvasWidth = this.#canvas.getWidth();
    const canvasHeight = this.#canvas.getHeight();

    // Create SVG element
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${canvasWidth} ${canvasHeight}`);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.classList.add("storiiies-viewer__route");

    // Build path with quadratic bezier curves
    let pathData = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Skip curve calculation if points are identical
      if (dist === 0) {
        pathData += ` L ${p2.x} ${p2.y}`;
        continue;
      }

      const curveAmount = dist * 0.15;
      const perpX = (-dy / dist) * curveAmount * (i % 2 === 0 ? 1 : -1);
      const perpY = (dx / dist) * curveAmount * (i % 2 === 0 ? 1 : -1);

      const controlX = midX + perpX;
      const controlY = midY + perpY;

      pathData += ` Q ${controlX} ${controlY} ${p2.x} ${p2.y}`;
    }

    // Stroke in image coordinates - scales with zoom like a map route
    const minDimension = Math.min(canvasWidth, canvasHeight);
    const strokeWidth = Math.round(minDimension * 0.003);
    const dashSize = strokeWidth * 2;
    const gapSize = Math.round(strokeWidth * 1.5);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", String(strokeWidth));
    path.setAttribute("stroke-dasharray", `${dashSize} ${gapSize}`);
    path.setAttribute("stroke-linecap", "round");

    svg.appendChild(path);

    // Wrap SVG in a div for proper HTMLElement typing
    const wrapper = document.createElement("div");
    wrapper.id = `storiiies-viewer-${this.#config.instanceId}__route`;
    wrapper.classList.add("storiiies-viewer__route-wrapper");
    wrapper.appendChild(svg);

    // Add overlay
    const rect = this.#viewer.viewport.imageToViewportRectangle(
      0,
      0,
      canvasWidth,
      canvasHeight,
    );

    this.#viewer.addOverlay({
      element: wrapper,
      location: rect,
    });

    this.#routeElement = wrapper;
  }

  /**
   * Get center point from xywh fragment as viewport coordinates
   */
  #getCenterPoint(url?: string): OpenSeadragon.Point | null {
    const coords = parseXYWH(url);
    if (!coords) return null;
    const { x, y, w, h } = coords;
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    return this.#viewer.viewport.imageToViewportCoordinates(centerX, centerY);
  }
}
