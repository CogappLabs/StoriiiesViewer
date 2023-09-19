import {
  getExpectedCentre,
  getActualCentre,
  assertWithinAcceptableRange,
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
          "http://localhost:43110/manifests/standard-v3/manifest.json",
      });
    });
  });
}

function rendering(screenSize: ScreenSize) {
  describe(`Basic rendering (${screenSize.label})`, () => {
    beforeEach(() => setupViewer(screenSize));

    it("Should render an Openseadragon viewer", () => {
      cy.get("#viewer[data-loaded='true']");
    });

    it("Should initially display the label from the manifest", () => {
      cy.get("#storiiies-viewer-0__info-text").should(
        "have.html",
        `<div>\n        <h1 class="storiiies-viewer__text-section">Lorem ipsum dolor sit amet, consectetur adipiscing elit</h1>\n        <div class="storiiies-viewer__text-section"><div><p><em>Pellentesque tempor ante non congue pulvinar.</em> Maecenas non ipsum non metus imperdiet facilisis. Vestibulum ante ipsum primis in <strong>faucibus</strong> orci luctus et ultrices posuere cubilia curae; Praesent sem felis, porta eu nisl in, rhoncus luctus nunc.<br>Morbi bibendum, eros eu sollicitudin egestas, nisi dui convallis nisi, sed lacinia velit augue eu lectus. In enim est, elementum ac elit a, ultricies pellentesque nibh.</p></div></div>\n        <div class="storiiies-viewer__text-section"><strong>Attribution:</strong> Provided courtesy of Example Institution</div>\n      </div>`,
      );
    });
  });
}

function annotations(screenSize: ScreenSize) {
  describe(`Annotations (${screenSize.label})`, () => {
    beforeEach(() => setupViewer(screenSize));

    it("should be able to navigate between annotations, and disable buttons where necessary", () => {
      cy.get("#storiiies-viewer-0__previous").should("be.disabled");
      cy.get("#storiiies-viewer-0__next")
        .should("not.be.disabled")
        .click()
        .click()
        .should("be.disabled");

      cy.get("#storiiies-viewer-0__previous")
        .should("not.be.disabled")
        .click()
        .click()
        .should("be.disabled");
    });

    it("should display the correct annotation text and be sanitised", () => {
      cy.get("#storiiies-viewer-0__info-text").should(
        "have.html",
        `<div>\n        <h1 class="storiiies-viewer__text-section">Lorem ipsum dolor sit amet, consectetur adipiscing elit</h1>\n        <div class="storiiies-viewer__text-section"><div><p><em>Pellentesque tempor ante non congue pulvinar.</em> Maecenas non ipsum non metus imperdiet facilisis. Vestibulum ante ipsum primis in <strong>faucibus</strong> orci luctus et ultrices posuere cubilia curae; Praesent sem felis, porta eu nisl in, rhoncus luctus nunc.<br>Morbi bibendum, eros eu sollicitudin egestas, nisi dui convallis nisi, sed lacinia velit augue eu lectus. In enim est, elementum ac elit a, ultricies pellentesque nibh.</p></div></div>\n        <div class="storiiies-viewer__text-section"><strong>Attribution:</strong> Provided courtesy of Example Institution</div>\n      </div>`,
      );
      cy.get("#storiiies-viewer-0__next").click();

      cy.get("#storiiies-viewer-0__info-text").should(
        "have.html",
        `Nullam sit amet egestas metus.<br><br>Sed dictum mattis erat feugiat gravida`,
      );
      cy.get("#storiiies-viewer-0__next").click();
      cy.get("#storiiies-viewer-0__info-text").should(
        "have.html",
        `<p><strong>Suspendisse lacinia enim lorem</strong>, sit amet interdum odio dignissim et. Curabitur ultricies felis non sagittis commodo.</p><p>Proin finibus imperdiet lectus quis imperdiet. Maecenas at rhoncus nibh, ac lobortis ante. Nam et ligula a dui <a href="https://www.google.com">consectetur consectetur</a>. Suspendisse non nisi turpis.</p>`,
      );
    });

    it("should display the correct region in OpenSeadragon", () => {
      cy.window().then((window) => {
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
          cy.get("#storiiies-viewer-0__next")
            .click()
            .then(() => {
              expectedCentre = getExpectedCentre("265,661,100,200");
              actualCentre = getActualCentre(viewer);

              assertWithinAcceptableRange(expectedCentre.x, actualCentre.x);
              assertWithinAcceptableRange(expectedCentre.y, actualCentre.y);
            });

          // Second annotation: 333,242,200,120"
          cy.get("#storiiies-viewer-0__next")
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
      cy.get("#storiiies-viewer-0__info-area").should("not.have.attr", "inert");
      cy.get("#storiiies-viewer-0__info-toggle")
        .then((el) => {
          expect(el.get(0).ariaLabel).to.equal("Hide annotations");
          expect(el.get(0).ariaExpanded).to.equal("true");
        })
        .click();
      cy.get("#storiiies-viewer-0__info-toggle").then((el) => {
        expect(el.get(0).ariaLabel).to.equal("Show annotations");
        expect(el.get(0).ariaExpanded).to.equal("false");
      });

      cy.get("#storiiies-viewer-0__info-area[inert]");
    });
  });
}

// Run each test at each screen size
for (const screenSize of screenSizes) {
  rendering(screenSize);
  annotations(screenSize);
}
