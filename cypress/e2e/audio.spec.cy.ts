import { ScreenSize, screenSizes } from "../support/utils";

function setupViewer(
  screenSize: ScreenSize,
  manifestUrl: string,
  showCreditSlide: boolean = true,
) {
  cy.visit("/").then((window) => {
    cy.document().then((document) => {
      cy.viewport(screenSize.width, screenSize.height);
      const container = document.querySelector("#viewer");
      if (!window.StoriiiesViewer) return;

      window.storiiiesViewerInstance = new window.StoriiiesViewer({
        container,
        manifestUrl,
        showCreditSlide,
      });
    });
  });
}

function rendering(screenSize: ScreenSize) {
  describe(`Rendering (${screenSize.label})`, () => {
    beforeEach(() =>
      setupViewer(
        screenSize,
        "http://localhost:43110/manifests/audio-v3/manifest.json",
      ),
    );

    it("Should render an Openseadragon viewer", () => {
      cy.get("#viewer[data-loaded='true']");
    });

    it("Should load and unload an audio element when navigating annotations", () => {
      // Note: ID cannot be used here due to theoretical abundance of audio elements
      cy.get("#storiiies-viewer-0__next").click();
      cy.get("#viewer audio").should("exist");
      cy.get("#storiiies-viewer-0__next").click();
      cy.get("#viewer audio").should("not.exist");
    });
  });
}

// Run each test at each screen size
for (const screenSize of screenSizes) {
  rendering(screenSize);
}
