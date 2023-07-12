interface StoriiiesViewerConfig {
  container: Element | string | null;
  manifest: string;
}

export default class StoriiiesViewer {
  private containerEl: Element | null;

  constructor(config: StoriiiesViewerConfig) {
    // Convert string to HTMLElement
    if (typeof config.container === "string") {
      this.containerEl = document.querySelector(config.container);
    } else {
      this.containerEl = config.container;
    }

    this.init();
  }

  /**
   * Initialize the viewer
   */
  private init() {
    if (this.containerEl) {
      this.containerEl.innerHTML = "Storiiies Viewer goes here";
    }
  }
}
