export {};

function setupViewer(
  regionMarkers?: boolean,
  manifest: string = "standard-v3",
) {
  cy.visit("/").then((window) => {
    cy.document().then((document) => {
      const container = document.querySelector("#viewer");
      if (!window.StoriiiesViewer) return;

      window.storiiiesViewerInstance = new window.StoriiiesViewer({
        container,
        manifestUrl: `http://localhost:43110/manifests/${manifest}/manifest.json`,
        regionMarkers,
        // Keeps the panel off the markers on the left of the image
        infoPosition: "top-right",
      });
    });
  });
}

describe("Region markers", () => {
  it("Should not render markers by default", () => {
    setupViewer();
    cy.get("#viewer[data-loaded='true']");
    cy.get(".storiiies-viewer__region-marker").should("not.exist");
  });

  it("Should skip points of interest", () => {
    setupViewer(true, "points-of-interest-v3");
    cy.get("#viewer[data-loaded='true']");
    cy.get(".storiiies-viewer__poi-marker").should("have.length", 5);
    cy.get(".storiiies-viewer__region-marker").should("have.length", 1);
  });

  describe("When enabled", () => {
    beforeEach(() => {
      setupViewer(true);
      cy.get("#viewer[data-loaded='true']");
    });

    it("Should render a marker for each region annotation", () => {
      cy.get(".storiiies-viewer__region-marker").should("have.length", 2);
    });

    it("Should open the annotation when a marker is clicked", () => {
      cy.get(".storiiies-viewer__region-marker[data-annotation-index='1']")
        .click()
        .should("have.class", "storiiies-viewer__region-marker--active");
      cy.window()
        .its("storiiiesViewerInstance.activeAnnotationIndex")
        .should("equal", 1);
    });

    it("Should hide markers while the info area is hidden", () => {
      cy.get(".storiiies-viewer__info-toggle").click();
      cy.get(".storiiies-viewer__region-marker").should("not.be.visible");
      cy.get(".storiiies-viewer__info-toggle").click();
      cy.get(".storiiies-viewer__region-marker").should("be.visible");
    });
  });
});
