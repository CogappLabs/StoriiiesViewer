import {
  assertWithinAcceptableRange,
  getActualCentre,
  getExpectedCentre,
  ScreenSize,
  screenSizes,
} from "../support/utils";

function setupViewer(screenSize: ScreenSize) {
  cy.visit("/").then((window) => {
    cy.document().then((document) => {
      cy.viewport(screenSize.width, screenSize.height);
      const container = document.querySelector("#viewer");
      if (!window.StoriiiesViewer) return;

      window.storiiiesViewerInstance = new window.StoriiiesViewer({
        container,
        manifestUrl:
          "http://localhost:43110/manifests/multiple-images-v3/manifest.json",
      });
    });
  });
}

function assertImageWidth(width: number) {
  cy.window().should((window) => {
    const { viewer } = window.storiiiesViewerInstance;
    expect(viewer.world.getItemAt(0)?.getContentSize().x).to.equal(width);
  });
}

function multipleImages(screenSize: ScreenSize) {
  describe(`Multiple images (${screenSize.label})`, () => {
    beforeEach(() => setupViewer(screenSize));

    it("should step through annotations across images, skipping images without annotations", () => {
      cy.get("#viewer[data-loaded='true']");
      assertImageWidth(2048);

      cy.get("#storiiies-viewer-0__next").click();
      cy.get("#storiiies-viewer-0__info-text").should(
        "contain.text",
        "First image, first annotation",
      );

      cy.get("#storiiies-viewer-0__next").click();
      cy.get("#storiiies-viewer-0__info-text").should(
        "contain.text",
        "Second image, first annotation",
      );
      assertImageWidth(4031);
      cy.window().should((window) => {
        const { storiiiesViewerInstance } = window;
        expect(storiiiesViewerInstance.activeCanvasIndex).to.equal(2);
        expect(storiiiesViewerInstance.activeAnnotationIndex).to.equal(0);
      });

      cy.get("#storiiies-viewer-0__next").click();
      cy.get(
        ".storiiies-viewer__poi-marker[data-poi-index='1'].storiiies-viewer___poi-marker--active",
      ).should("exist");

      cy.get("#storiiies-viewer-0__next")
        .click()
        .should("have.attr", "aria-label", "Restart");
      cy.get("#storiiies-viewer-0__info-text").should(
        "contain.text",
        "Storiiies was created by",
      );

      cy.get("#storiiies-viewer-0__next").click();
      cy.get("#storiiies-viewer-0__previous").should("be.disabled");
      assertImageWidth(2048);
    });

    it("should go back to the previous image", () => {
      cy.get("#viewer[data-loaded='true']");
      cy.get("#storiiies-viewer-0__next").click().click();
      assertImageWidth(4031);

      cy.get("#storiiies-viewer-0__previous").click();
      cy.get("#storiiies-viewer-0__info-text").should(
        "contain.text",
        "First image, first annotation",
      );
      assertImageWidth(2048);
    });

    it("should display the annotation region once the new image opens", () => {
      cy.get("#viewer[data-loaded='true']");
      cy.get("#storiiies-viewer-0__next").click().click();
      assertImageWidth(4031);

      cy.window().should((window) => {
        const { viewer } = window.storiiiesViewerInstance;
        const expectedCentre = getExpectedCentre("1000,1000,400,300");
        const actualCentre = getActualCentre(viewer);

        assertWithinAcceptableRange(expectedCentre.x, actualCentre.x);
        assertWithinAcceptableRange(expectedCentre.y, actualCentre.y);
      });
    });
  });
}

for (const screenSize of screenSizes) {
  multipleImages(screenSize);
}
