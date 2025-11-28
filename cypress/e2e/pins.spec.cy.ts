import { ScreenSize, screenSizes } from "../support/utils";

function setupViewer(
  screenSize: ScreenSize,
  options: { enablePins?: boolean; enableRoute?: boolean } = {},
) {
  cy.visit("/").then((window) => {
    cy.document().then((document) => {
      cy.viewport(screenSize.width, screenSize.height);
      const container = document.querySelector("#viewer");
      if (!window.StoriiiesViewer) return;

      window.storiiiesViewerInstance = new window.StoriiiesViewer({
        container,
        manifestUrl:
          "http://localhost:43110/manifests/map-pins-v1/manifest.json",
        enablePins: options.enablePins ?? false,
        enableRoute: options.enableRoute ?? false,
      });
    });
  });
}

function pinsDisabledByDefault(screenSize: ScreenSize) {
  describe(`Pins disabled by default (${screenSize.label})`, () => {
    beforeEach(() => setupViewer(screenSize));

    it("Should not render pins when enablePins is false", () => {
      cy.get("#viewer[data-loaded='true']");
      cy.get("[id^='storiiies-viewer-'][id$='__pin-0']").should("not.exist");
    });

    it("Should not render pin toggle button when enablePins is false", () => {
      cy.get("#viewer[data-loaded='true']");
      cy.get("#storiiies-viewer-0__pin-toggle").should("not.exist");
    });

    it("Should not render route when enablePins is false", () => {
      cy.get("#viewer[data-loaded='true']");
      cy.get("#storiiies-viewer-0__route").should("not.exist");
    });
  });
}

function pinsEnabled(screenSize: ScreenSize) {
  describe(`Pins enabled (${screenSize.label})`, () => {
    beforeEach(() => setupViewer(screenSize, { enablePins: true }));

    it("Should render pins when enablePins is true", () => {
      cy.get("#viewer[data-loaded='true']");
      cy.get("#storiiies-viewer-0__pin-0").should("exist");
    });

    it("Should render pin toggle button when enablePins is true", () => {
      cy.get("#viewer[data-loaded='true']");
      cy.get("#storiiies-viewer-0__pin-toggle").should("exist");
    });

    it("Should not render route when enableRoute is false", () => {
      cy.get("#viewer[data-loaded='true']");
      cy.get("#storiiies-viewer-0__route").should("not.exist");
    });

    it("Should toggle pin visibility when clicking toggle button", () => {
      cy.get("#viewer[data-loaded='true']");
      cy.get("#storiiies-viewer-0__pin-0").should("exist");

      // Hide pins
      cy.get("#storiiies-viewer-0__pin-toggle").click();
      cy.get("#storiiies-viewer-0__pin-0").should("not.exist");

      // Show pins
      cy.get("#storiiies-viewer-0__pin-toggle").click();
      cy.get("#storiiies-viewer-0__pin-0").should("exist");
    });

    it("Should have correct aria attributes on toggle button", () => {
      cy.get("#viewer[data-loaded='true']");
      cy.get("#storiiies-viewer-0__pin-toggle")
        .should("have.attr", "aria-label", "Hide pins")
        .and("have.attr", "aria-pressed", "true");

      cy.get("#storiiies-viewer-0__pin-toggle").click();
      cy.get("#storiiies-viewer-0__pin-toggle")
        .should("have.attr", "aria-label", "Show pins")
        .and("have.attr", "aria-pressed", "false");
    });

    it("Should mark first pin as active initially", () => {
      cy.get("#viewer[data-loaded='true']");
      // Navigate to first annotation
      cy.get("#storiiies-viewer-0__next").click();
      cy.get("#storiiies-viewer-0__pin-0").should(
        "have.class",
        "storiiies-viewer__pin--active",
      );
    });

    it("Should update active pin when navigating annotations", () => {
      cy.get("#viewer[data-loaded='true']");
      // Navigate to first annotation
      cy.get("#storiiies-viewer-0__next").click();
      cy.get("#storiiies-viewer-0__pin-0").should(
        "have.class",
        "storiiies-viewer__pin--active",
      );

      // Navigate to second annotation
      cy.get("#storiiies-viewer-0__next").click();
      cy.get("#storiiies-viewer-0__pin-0").should(
        "not.have.class",
        "storiiies-viewer__pin--active",
      );
      cy.get("#storiiies-viewer-0__pin-1").should(
        "have.class",
        "storiiies-viewer__pin--active",
      );
    });

    it("Should have accessible pin elements", () => {
      cy.get("#viewer[data-loaded='true']");
      cy.get("#storiiies-viewer-0__pin-0").then(($pin) => {
        expect($pin).to.have.attr("role", "button");
        expect($pin).to.have.attr("aria-label");
        expect($pin).to.have.attr("tabindex", "0");
      });
    });
  });
}

function routeEnabled(screenSize: ScreenSize) {
  describe(`Route enabled (${screenSize.label})`, () => {
    beforeEach(() =>
      setupViewer(screenSize, { enablePins: true, enableRoute: true }),
    );

    it("Should render route when both enablePins and enableRoute are true", () => {
      cy.get("#viewer[data-loaded='true']");
      cy.get("#storiiies-viewer-0__route").should("exist");
    });

    it("Should render route with SVG path", () => {
      cy.get("#viewer[data-loaded='true']");
      cy.get("#storiiies-viewer-0__route path").should("exist");
    });

    it("Should hide route when pins are toggled off", () => {
      cy.get("#viewer[data-loaded='true']");
      cy.get("#storiiies-viewer-0__route").should("exist");

      cy.get("#storiiies-viewer-0__pin-toggle").click();
      cy.get("#storiiies-viewer-0__route").should("not.exist");
    });
  });
}

screenSizes.forEach((screenSize) => {
  pinsDisabledByDefault(screenSize);
  pinsEnabled(screenSize);
  routeEnabled(screenSize);
});
