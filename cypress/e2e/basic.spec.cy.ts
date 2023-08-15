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
        `<p><strong>Lorem ipsum dolor</strong> sit amet, <em>consectetur adipiscing elit</em>.</p><p>Nam rutrum elit id metus blandit, vel egestas enim sagittis. Integer at sem sit amet nulla dictum sagittis a ut enim.<br><br> Sed dignissim <a href="https://google.com">commodo sapien</a> ut vestibulum. Aenean sed iaculis metus, vel varius massa. Nullam placerat tempus pharetra. Vestibulum maximus elit ut eros sollicitudin, viverra aliquet metus condimentum. Proin sed pellentesque nibh. Pellentesque suscipit tempus risus, condimentum semper sem ultrices quis. Suspendisse blandit viverra ex in sollicitudin. Fusce aliquet tincidunt leo ut venenatis. Quisque eu sem hendrerit, pellentesque nibh et, imperdiet mi. Mauris arcu eros, consequat sit amet sapien accumsan, pellentesque malesuada justo.</p>`,
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
        `<p><strong>Lorem ipsum dolor</strong> sit amet, <em>consectetur adipiscing elit</em>.</p><p>Nam rutrum elit id metus blandit, vel egestas enim sagittis. Integer at sem sit amet nulla dictum sagittis a ut enim.<br><br> Sed dignissim <a href="https://google.com">commodo sapien</a> ut vestibulum. Aenean sed iaculis metus, vel varius massa. Nullam placerat tempus pharetra. Vestibulum maximus elit ut eros sollicitudin, viverra aliquet metus condimentum. Proin sed pellentesque nibh. Pellentesque suscipit tempus risus, condimentum semper sem ultrices quis. Suspendisse blandit viverra ex in sollicitudin. Fusce aliquet tincidunt leo ut venenatis. Quisque eu sem hendrerit, pellentesque nibh et, imperdiet mi. Mauris arcu eros, consequat sit amet sapien accumsan, pellentesque malesuada justo.</p>`,
      );
      cy.get("#storiiies-viewer-0__next").click();

      cy.get("#storiiies-viewer-0__info-text").should(
        "have.html",
        `Nullam sit amet egestas metus.<br><br>Sed dictum mattis erat feugiat gravida`,
      );
      cy.get("#storiiies-viewer-0__next").click();
      cy.get("#storiiies-viewer-0__info-text").should(
        "have.html",
        `Suspendisse lacinia enim lorem, sit amet interdum odio dignissim et. Curabitur ultricies felis non sagittis commodo. Proin finibus imperdiet lectus quis imperdiet. Maecenas at rhoncus nibh, ac lobortis ante. Nam et ligula a dui consectetur consectetur. Suspendisse non nisi turpis.`,
      );
    });

    it("should display sanitised annotation text", () => {});

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
