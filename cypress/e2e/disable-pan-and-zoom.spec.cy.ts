describe("OpenSeadragon Disable Zoom & Pan", () => {
  beforeEach(() => {
    cy.visit("/").then((window) => {
      cy.document().then((document) => {
        const container = document.querySelector("#viewer");
        if (!window.StoriiiesViewer) return;

        window.storiiiesViewerInstance = new window.StoriiiesViewer({
          container,
          manifestUrl:
            "http://localhost:43110/manifests/standard-v3/manifest.json",
          disablePanAndZoom: true, // This is what we are testing
        });
      });
    });

    // Ensure the viewer has loaded before running assertions
    cy.get("#viewer").should("have.attr", "data-loaded", "true");
  });

  it("should prevent zooming when clicking on the OpenSeadragon canvas", () => {
    cy.window().its("storiiiesViewerInstance.viewer").should("exist");

    cy.get(".openseadragon-canvas").then(($canvas) => {
      const rect = $canvas[0].getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      cy.window().then((win) => {
        const osdViewer = win.storiiiesViewerInstance.viewer;
        const zoomBefore = osdViewer.viewport.getZoom();

        // Simulate a click at the center of the OpenSeadragon canvas
        cy.wrap($canvas).click(centerX, centerY, { force: true });

        cy.window().then((win) => {
          const zoomAfter =
            win.storiiiesViewerInstance.viewer.viewport.getZoom();
          expect(zoomAfter).to.equal(zoomBefore);
        });
      });
    });
  });

  it("should prevent panning when pressing arrow keys on the OpenSeadragon canvas", () => {
    cy.window().its("storiiiesViewerInstance.viewer").should("exist");

    cy.get(".openseadragon-canvas").then(($canvas) => {
      // Ensure the canvas is focused without triggering a click
      cy.wrap($canvas).focus();

      cy.window().then((win) => {
        const osdViewer = win.storiiiesViewerInstance.viewer;
        const centerBefore = osdViewer.viewport.getCenter();

        // Send arrow key events to the document (where OpenSeadragon listens)
        cy.get("body").type("{rightarrow}");
        cy.get("body").type("{downarrow}");

        cy.window().then((win) => {
          const centerAfter =
            win.storiiiesViewerInstance.viewer.viewport.getCenter();

          // Ensure panning has not changed the viewport center
          expect(centerAfter.x).to.be.closeTo(centerBefore.x, 0.001);
          expect(centerAfter.y).to.be.closeTo(centerBefore.y, 0.001);
        });
      });
    });
  });
});
