function setupViewers() {
  cy.visit("/multi-viewer.html").then((window) => {
    cy.document().then((document) => {
      const containers = document.querySelectorAll(".viewer");

      Array.prototype.forEach.call(containers, (container) => {
        if (!window.StoriiiesViewer) return;
        new window.StoriiiesViewer({
          container,
          manifestUrl:
            "http://localhost:43110/manifests/standard-v3/manifest.json",
        });
      });
    });
  });
}

function rendering() {
  describe(`Basic rendering`, () => {
    beforeEach(() => setupViewers());

    it("Should render multiple Openseadragon viewers", () => {
      cy.get("[data-loaded='true']").should("have.length", 3);
    });
  });
}

function annotations() {
  describe(`Annotations`, () => {
    beforeEach(() => setupViewers());

    it("should be able to navigate between annotations, and disable buttons where necessary", () => {
      for (let i = 0; i <= 2; i++) {
        cy.get(`#storiiies-viewer-${i}__previous`).should("be.disabled");
        cy.get(`#storiiies-viewer-${i}__next`)
          .should("not.be.disabled")
          .click()
          .click()
          .should("be.disabled");

        cy.get(`#storiiies-viewer-${i}__previous`)
          .should("not.be.disabled")
          .click()
          .click()
          .should("be.disabled");
      }
    });

    it("should isolate each instance from events in other instances", () => {
      // Click next once in instance 0, check others
      cy.get("#storiiies-viewer-0__next").click();
      cy.get("#storiiies-viewer-1__previous").should("be.disabled");
      cy.get("#storiiies-viewer-2__previous").should("be.disabled");

      // Click previous once in instance 0, check others
      cy.get("#storiiies-viewer-0__previous").click().should("be.disabled");
      cy.get("#storiiies-viewer-1__previous").should("be.disabled");
      cy.get("#storiiies-viewer-2__previous").should("be.disabled");

      // Click next twice in instance 1, check others
      cy.get("#storiiies-viewer-1__next").click().click().should("be.disabled");
      cy.get("#storiiies-viewer-0__next").should("not.be.disabled");
      cy.get("#storiiies-viewer-2__next").should("not.be.disabled");

      // Click previous twice in instance 1, check others
      cy.get("#storiiies-viewer-1__previous")
        .click()
        .click()
        .should("be.disabled");
      cy.get("#storiiies-viewer-0__next").should("not.be.disabled");
      cy.get("#storiiies-viewer-2__next").should("not.be.disabled");

      // Click info toggle in instance 0, check info area visibility
      cy.get("#storiiies-viewer-0__info-toggle").click();
      cy.get("#storiiies-viewer-0__info-area").should("not.be.visible");
      cy.get("#storiiies-viewer-1__info-area").should("be.visible");
      cy.get("#storiiies-viewer-2__info-area").should("be.visible");

      // Click info toggle in instance 1, check info area visibility
      cy.get("#storiiies-viewer-1__info-toggle").click();
      cy.get("#storiiies-viewer-0__info-area").should("not.be.visible");
      cy.get("#storiiies-viewer-1__info-area").should("not.be.visible");
      cy.get("#storiiies-viewer-2__info-area").should("be.visible");

      // Click info toggle in instance21, check info area visibility
      cy.get("#storiiies-viewer-2__info-toggle").click();
      cy.get("#storiiies-viewer-0__info-area").should("not.be.visible");
      cy.get("#storiiies-viewer-1__info-area").should("not.be.visible");
      cy.get("#storiiies-viewer-2__info-area").should("not.be.visible");
    });
  });
}

rendering();
annotations();
