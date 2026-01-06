import {
  assertWithinAcceptableRange,
  getActualCentre,
  getExpectedCentre,
  ScreenSize,
  screenSizes,
} from "../support/utils";

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
  describe(`Basic rendering (${screenSize.label})`, () => {
    beforeEach(() =>
      setupViewer(
        screenSize,
        "http://localhost:43110/manifests/points-of-interest-v3/manifest.json",
      ),
    );
    it("Should render an Openseadragon viewer", () => {
      cy.get("#viewer[data-loaded='true']");
    });

    it("Should render points of interest on the canvas", () => {
      cy.get(
        "#storiiies-viewer-0__osd-container > .openseadragon-container button.storiiies-viewer__poi-marker[data-poi-index='0']",
      ).should("exist");
      cy.get(
        "#storiiies-viewer-0__osd-container > .openseadragon-container button.storiiies-viewer__poi-marker[data-poi-index='2']",
      ).should("exist");
      cy.get(
        "#storiiies-viewer-0__osd-container > .openseadragon-container button.storiiies-viewer__poi-marker[data-poi-index='3']",
      ).should("exist");
      cy.get(
        "#storiiies-viewer-0__osd-container > .openseadragon-container button.storiiies-viewer__poi-marker[data-poi-index='4']",
      ).should("exist");
      cy.get(
        "#storiiies-viewer-0__osd-container > .openseadragon-container button.storiiies-viewer__poi-marker[data-poi-index='5']",
      ).should("exist");
    });

    it("Should navigate to a point of interest when clicked", () => {
      cy.window().then((window) => {
        cy.get('#viewer[data-loaded="true"]').then(() => {
          if (!window.storiiiesViewerInstance) return;

          const { storiiiesViewerInstance } = window;
          const { viewer } = storiiiesViewerInstance;

          // First POI (centre)
          cy.get(
            "#storiiies-viewer-0__osd-container > .openseadragon-container button.storiiies-viewer__poi-marker[data-poi-index='0']",
          )
            .click({ force: true })
            .then(() => {
              const expectedCentre = getExpectedCentre("1024,1024,0,0");
              const actualCentre = getActualCentre(viewer);

              assertWithinAcceptableRange(expectedCentre.x, actualCentre.x);
              assertWithinAcceptableRange(expectedCentre.y, actualCentre.y);
            });
          cy.get(
            "#storiiies-viewer-0__osd-container > .openseadragon-container button.storiiies-viewer__poi-marker[data-poi-index='0']",
          ).should("have.class", "storiiies-viewer___poi-marker--active");
          cy.get(
            "#storiiies-viewer-0__osd-container .storiiies-viewer___poi-marker--active",
          ).should("have.length", 1);
          cy.get("#storiiies-viewer-0__info-text").contains(
            "This point marks the centre of the image.",
          );

          // Second POI (top left)
          cy.get(
            "#storiiies-viewer-0__osd-container > .openseadragon-container button.storiiies-viewer__poi-marker[data-poi-index='2']",
          )
            .click({ force: true })
            .then(() => {
              const expectedCentre = getExpectedCentre("512,512,0,0");
              const actualCentre = getActualCentre(viewer);

              assertWithinAcceptableRange(expectedCentre.x, actualCentre.x);
              assertWithinAcceptableRange(expectedCentre.y, actualCentre.y);
            });
          cy.get(
            "#storiiies-viewer-0__osd-container > .openseadragon-container button.storiiies-viewer__poi-marker[data-poi-index='2']",
          ).should("have.class", "storiiies-viewer___poi-marker--active");
          cy.get(
            "#storiiies-viewer-0__osd-container .storiiies-viewer___poi-marker--active",
          ).should("have.length", 1);
          cy.get("#storiiies-viewer-0__info-text").contains(
            "This point marks the top left quadrant of the image.",
          );

          // Third POI (bottom top right)
          cy.get(
            "#storiiies-viewer-0__osd-container > .openseadragon-container button.storiiies-viewer__poi-marker[data-poi-index='3']",
          )
            .click({ force: true })
            .then(() => {
              const expectedCentre = getExpectedCentre("1536,512,0,0");
              const actualCentre = getActualCentre(viewer);
              assertWithinAcceptableRange(expectedCentre.x, actualCentre.x);
              assertWithinAcceptableRange(expectedCentre.y, actualCentre.y);
            });
          cy.get(
            "#storiiies-viewer-0__osd-container > .openseadragon-container button.storiiies-viewer__poi-marker[data-poi-index='3']",
          ).should("have.class", "storiiies-viewer___poi-marker--active");
          cy.get(
            "#storiiies-viewer-0__osd-container .storiiies-viewer___poi-marker--active",
          ).should("have.length", 1);
          cy.get("#storiiies-viewer-0__info-text").contains(
            "This point marks the top right quadrant of the image.",
          );

          // Fourth POI (bottom right)
          cy.get(
            "#storiiies-viewer-0__osd-container > .openseadragon-container button.storiiies-viewer__poi-marker[data-poi-index='4']",
          )
            .click({ force: true })
            .then(() => {
              const expectedCentre = getExpectedCentre("1536,1536,0,0");
              const actualCentre = getActualCentre(viewer);
              assertWithinAcceptableRange(expectedCentre.x, actualCentre.x);
              assertWithinAcceptableRange(expectedCentre.y, actualCentre.y);
            });
          cy.get(
            "#storiiies-viewer-0__osd-container > .openseadragon-container button.storiiies-viewer__poi-marker[data-poi-index='4']",
          ).should("have.class", "storiiies-viewer___poi-marker--active");
          cy.get(
            "#storiiies-viewer-0__osd-container .storiiies-viewer___poi-marker--active",
          ).should("have.length", 1);
          cy.get("#storiiies-viewer-0__info-text").contains(
            "This point marks the bottom right quadrant of the image.",
          );

          // Fifth POI (bottom left)
          cy.get(
            "#storiiies-viewer-0__osd-container > .openseadragon-container button.storiiies-viewer__poi-marker[data-poi-index='5']",
          )
            .click({ force: true })
            .then(() => {
              const expectedCentre = getExpectedCentre("512,1536,0,0");
              const actualCentre = getActualCentre(viewer);
              assertWithinAcceptableRange(expectedCentre.x, actualCentre.x);
              assertWithinAcceptableRange(expectedCentre.y, actualCentre.y);
            });
          cy.get(
            "#storiiies-viewer-0__osd-container > .openseadragon-container button.storiiies-viewer__poi-marker[data-poi-index='5']",
          ).should("have.class", "storiiies-viewer___poi-marker--active");
          cy.get(
            "#storiiies-viewer-0__osd-container .storiiies-viewer___poi-marker--active",
          ).should("have.length", 1);
          cy.get("#storiiies-viewer-0__info-text").contains(
            "This point marks the bottom left quadrant of the image.",
          );
        });
      });
    });

    it("Should activate the correct point of interest pin when navigating via the info panel", () => {
      cy.get("#storiiies-viewer-0__next")
        .click()
        .click()
        .click()
        .click()
        .click();
      cy.get(
        "#storiiies-viewer-0__osd-container > .openseadragon-container button.storiiies-viewer__poi-marker[data-poi-index='4']",
      ).should("have.class", "storiiies-viewer___poi-marker--active");
      cy.get(
        "#storiiies-viewer-0__osd-container .storiiies-viewer___poi-marker--active",
      ).should("have.length", 1);
      cy.get("#storiiies-viewer-0__info-text").contains(
        "This point marks the bottom right quadrant of the image.",
      );
    });

    it("Shouldn't show any active point of interest when showing a non-POI slide", () => {
      cy.get(
        "#storiiies-viewer-0__osd-container > .openseadragon-container  button.storiiies-viewer__poi-marker[data-poi-index='0']",
      ).click();
      cy.get("#storiiies-viewer-0__next").click();
      cy.get(
        "#storiiies-viewer-0__osd-container > .openseadragon-container  button.storiiies-viewer__poi-marker[data-poi-index='0']",
      ).should("not.have.class", "storiiies-viewer___poi-marker--active");
      cy.get(
        "#storiiies-viewer-0__osd-container .storiiies-viewer___poi-marker--active",
      ).should("have.length", 0);
    });
  });
}

// Run each test at each screen size
for (const screenSize of screenSizes) {
  rendering(screenSize);
}
