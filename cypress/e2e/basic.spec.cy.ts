// Use "WindowWithStoriiiesViewer" type with cy.window() to access
// the storiiiesViewerInstance property on the window object
import StoriiiesViewer from "../../src";
import {
  getExpectedCentre,
  getActualCentre,
  assertWithinAcceptableRange,
} from "../support/utils";

type WindowWithStoriiiesViewer = Cypress.AUTWindow & {
  storiiiesViewerInstance?: StoriiiesViewer;
};

describe("Basic rendering", () => {
  beforeEach(() => {
    cy.visit("/basic.html");
  });

  it("Should render an Openseadragon viewer", () => {
    cy.get("#viewer[data-loaded='true']");
  });

  it("Should initially display the label from the manifest", () => {
    cy.contains("Test image");
  });
});

describe("Annotations", () => {
  beforeEach(() => {
    cy.visit("/basic.html");
  });

  it("should be able to navigate between annotations, and disable buttons where necessary", () => {
    cy.get("#storiiies-viewer-0__nav-button--previous").should("be.disabled");
    cy.get("#storiiies-viewer-0__nav-button--next")
      .should("not.be.disabled")
      .click()
      .click()
      .should("be.disabled");

    cy.get("#storiiies-viewer-0__nav-button--previous")
      .should("not.be.disabled")
      .click()
      .click()
      .should("be.disabled");
  });

  it("should display the correct annotation text", () => {
    cy.contains("Test image");
    cy.get("#storiiies-viewer-0__nav-button--next").click();
    cy.contains("This is an annotation");
    cy.get("#storiiies-viewer-0__nav-button--next").click();
    cy.contains("This is another annotation");
  });

  it("should display the correct region in OpenSeadragon", () => {
    cy.window().then((window: WindowWithStoriiiesViewer) => {
      cy.get('#viewer[data-loaded="true"]').then(() => {
        if (!window.storiiiesViewerInstance) return;

        const { storiiiesViewerInstance } = window;
        const { viewer } = storiiiesViewerInstance;

        // The centre, converted from viewport to image coordinates should be:
        // x = imageCoords.x + (imageCoords.width / 2)
        // y = imageCoords.y + (imageCoords.height / 2)

        // Home: width / 2, height / 2
        let expectedCentre = getExpectedCentre("0,0,2048,2048");
        let actualCentre = getActualCentre(viewer);

        // Manifest label: Home
        assertWithinAcceptableRange(expectedCentre.x, actualCentre.x);
        assertWithinAcceptableRange(expectedCentre.y, actualCentre.y);

        // First annotation: 265,661,100,200
        cy.get("#storiiies-viewer-0__nav-button--next")
          .click()
          .then(() => {
            expectedCentre = getExpectedCentre("265,661,100,200");
            actualCentre = getActualCentre(viewer);

            assertWithinAcceptableRange(expectedCentre.x, actualCentre.x);
            assertWithinAcceptableRange(expectedCentre.y, actualCentre.y);
          });

        // Second annotation: 333,242,200,120"
        cy.get("#storiiies-viewer-0__nav-button--next")
          .click()
          .then(() => {
            expectedCentre = getExpectedCentre("333,242,200,120");
            actualCentre = getActualCentre(viewer);

            assertWithinAcceptableRange(expectedCentre.x, actualCentre.x);
            assertWithinAcceptableRange(expectedCentre.y, actualCentre.y);
          });
      });
    });
  });

  it("should toggle annotation text and controls, and update button text", () => {
    cy.get("#storiiies-viewer-0__info-toggle")
      .contains("Hide annotations")
      .should("have.attr", "aria-expanded", "true");

    cy.get("#storiiies-viewer-0__info-area").should("not.have.attr", "inert");

    cy.get("#storiiies-viewer-0__info-toggle")
      .click()
      .contains("Show annotations")
      .should("have.attr", "aria-expanded", "false");

    cy.get("#storiiies-viewer-0__info-area").should("have.attr", "inert");
  });
});
