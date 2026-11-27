type SetupOptions = {
  showFullscreenButton?: boolean;
  fullscreenEnabled?: boolean;
};

const fullscreenToggle = ".storiiies-viewer__fullscreen-toggle";

function setupFullscreenViewer({
  showFullscreenButton,
  fullscreenEnabled = true,
}: SetupOptions = {}) {
  cy.visit("/").then((window) => {
    cy.document().then((document) => {
      const container = document.querySelector("#viewer");
      if (!window.StoriiiesViewer) return;

      // Simulate browsers where element fullscreen isn't available
      Object.defineProperty(document, "fullscreenEnabled", {
        configurable: true,
        get: () => fullscreenEnabled,
      });

      window.storiiiesViewerInstance = new window.StoriiiesViewer({
        container,
        manifestUrl:
          "http://localhost:43110/manifests/standard-v3/manifest.json",
        showFullscreenButton,
      });
    });
  });

  // Ensure the viewer has loaded before running assertions
  cy.get("#viewer").should("have.attr", "data-loaded", "true");
}

/**
 * Real fullscreen can't be entered reliably in automated browsers,
 * so fake the browser's fullscreen state and fire the change event
 */
function simulateFullscreenChange(
  getElement: (document: Document) => Element | null,
) {
  cy.document().then((document) => {
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => getElement(document),
    });
    document.dispatchEvent(new Event("fullscreenchange"));
  });
}

describe("Fullscreen button", () => {
  describe("Rendering", () => {
    it("should not render the button by default", () => {
      setupFullscreenViewer();
      cy.get(fullscreenToggle).should("not.exist");
    });

    it("should not render the button when fullscreen isn't supported", () => {
      setupFullscreenViewer({
        showFullscreenButton: true,
        fullscreenEnabled: false,
      });
      cy.get(fullscreenToggle).should("not.exist");
    });

    it("should render the button, directly after the info toggle, when enabled", () => {
      setupFullscreenViewer({ showFullscreenButton: true });

      cy.get(fullscreenToggle)
        .should("have.attr", "aria-label", "Enter full screen")
        .and("have.attr", "aria-pressed", "false");

      cy.get(".storiiies-viewer__info-toggle")
        .next()
        .should("have.class", "storiiies-viewer__fullscreen-toggle");
    });
  });

  describe("Interaction", () => {
    beforeEach(() => setupFullscreenViewer({ showFullscreenButton: true }));

    it("should request fullscreen on the viewer container when clicked", () => {
      cy.get("#viewer").then(($viewer) => {
        cy.stub($viewer[0], "requestFullscreen")
          .as("requestFullscreen")
          .resolves();
      });

      cy.get(fullscreenToggle).click();
      cy.get("@requestFullscreen").should("have.been.calledOnce");
    });

    it("should exit fullscreen when clicked while fullscreen", () => {
      cy.document().then((document) => {
        cy.stub(document, "exitFullscreen").as("exitFullscreen").resolves();
      });
      simulateFullscreenChange((document) => document.querySelector("#viewer"));

      cy.get(fullscreenToggle).click();
      cy.get("@exitFullscreen").should("have.been.calledOnce");
    });

    it("should update the button when fullscreen is entered and exited", () => {
      simulateFullscreenChange((document) => document.querySelector("#viewer"));
      cy.get(fullscreenToggle)
        .should("have.attr", "aria-label", "Exit full screen")
        .and("have.attr", "aria-pressed", "true");

      // e.g. the user pressed Esc
      simulateFullscreenChange(() => null);
      cy.get(fullscreenToggle)
        .should("have.attr", "aria-label", "Enter full screen")
        .and("have.attr", "aria-pressed", "false");
    });

    it("should ignore fullscreen changes for other elements", () => {
      simulateFullscreenChange((document) => document.body);
      cy.get(fullscreenToggle)
        .should("have.attr", "aria-label", "Enter full screen")
        .and("have.attr", "aria-pressed", "false");
    });

    it("should warn if the browser refuses fullscreen", () => {
      cy.get("#viewer").then(($viewer) => {
        cy.stub($viewer[0], "requestFullscreen").rejects(new Error("Denied"));
      });

      cy.get(fullscreenToggle).click();
      cy.get("#viewer")
        .invoke("attr", "data-status")
        .should("contain", "fullscreen-err");
    });
  });
});
