import { WindowWithStoriiiesViewer } from "../support/utils";

function setup(
  containerSelector: string = "#viewer",
  manifestUrl: string = "http://localhost:43110/manifests/standard-v3/manifest.json",
) {
  cy.visit("/").then((window: WindowWithStoriiiesViewer) => {
    cy.document().then((document) => {
      const options = {
        container:
          containerSelector && document.querySelector(containerSelector),
        manifestUrl,
      };
      // Pass an empty string to remove an option
      // Ignore statements ahoy: TS obviously isn't going like this
      // but we want to check it anyway
      // @ts-ignore
      if (!containerSelector) delete options.container;
      // @ts-ignore
      if (!manifestUrl) delete options.manifestUrl;
      if (!window.StoriiiesViewer) return;
      // @ts-ignore
      window.storiiiesViewerInstance = new window.StoriiiesViewer(options);
    });
  });
}

describe("Errors", () => {
  // Provide a mechanism for allowing a test to fail
  // Resetting to false after each test
  let allowFail: boolean | string = false;

  afterEach(() => {
    allowFail = false;
  });

  Cypress.on("fail", (err) => {
    if (allowFail) {
      expect(err.message).to.contain(allowFail);
      return false;
    } else {
      throw err;
    }
  });

  it("Should error if the manifest is not found", () => {
    cy.intercept("GET", "/manifests/standard-v3/manifest.json", {
      statusCode: 404,
    }).as("404");

    setup();

    cy.wait("@404");

    cy.get("#viewer")
      .should("have.attr", "data-status")
      .and("match", /manifest-err/);

    cy.on("uncaught:exception", (err) => {
      expect(err.message).to.contain(
        "Storiiies Viewer: Encountered a problem loading the manifest",
      );
      return false;
    });
  });

  it("Should error if there is a server error", () => {
    cy.intercept("GET", "/manifests/standard-v3/manifest.json", {
      statusCode: 500,
    }).as("500");

    setup();

    cy.wait("@500");

    cy.get("#viewer")
      .should("have.attr", "data-status")
      .and("match", /manifest-err/);

    cy.on("uncaught:exception", (err) => {
      expect(err.message).to.contain(
        "Storiiies Viewer: Encountered a problem loading the manifest",
      );
      return false;
    });
  });

  it("Should error if the manifest is invalid", () => {
    cy.intercept("GET", "/manifests/standard-v3/manifest.json", {
      // Return something we know isn't a manifest instead
      fixture: "/manifests/not-a-manifest/manifest.json",
    }).as("not-a-manifest");

    setup();

    cy.wait("@not-a-manifest");

    cy.get("#viewer")
      .should("have.attr", "data-status")
      .and("match", /bad-manifest/);

    cy.on("uncaught:exception", (err) => {
      expect(err.message).to.contain(
        "Storiiies Viewer: Could not parse the manifest",
      );
      return false;
    });
  });

  it("Should error if the provided container doesn't exist", () => {
    // Need to use Cypress.on("fail") here because the error is thrown in the constructor(?)
    allowFail = "Storiiies Viewer: Container element not found";
    setup("#not-a-real-container");
  });

  it("Should error if the provided no container is provided", () => {
    // Need to use Cypress.on("fail") here because the error is thrown in the constructor(?)
    // N.B. This one won't get to the bad config error because it will fail on not finding the container first
    allowFail = "Storiiies Viewer: Container element not found";
    setup("");
  });

  it("Should error if the provided no manifest is provided", () => {
    // Need to use Cypress.on("fail") here because the error is thrown in the constructor(?)
    allowFail = "Storiiies Viewer: Missing required config";
    setup("#viewer", "");
  });
});

describe("Warnings", () => {
  it("Should warn if the manifest looks like it isn't supported", () => {
    cy.intercept("GET", "/manifests/standard-v3/manifest.json", {
      fixture: "/manifests/standard-v2/manifest.json",
    }).as("v2-manifest");

    setup();

    cy.wait("@v2-manifest");

    cy.get("#viewer")
      .should("have.attr", "data-status")
      .and("match", /unkn-version/);
  });

  it("Should warn if the manifest doesn't contain a label", () => {
    cy.intercept("GET", "/manifests/standard-v3/manifest.json", {
      fixture: "/manifests/no-label-v3/manifest.json",
    }).as("no-label-manifest");

    setup();

    cy.wait("@no-label-manifest");

    cy.get("#viewer")
      .should("have.attr", "data-status")
      .and("match", /no-label/);
  });

  it("Should warn if the manifest contains external annotation pages", () => {
    cy.intercept("GET", "/manifests/standard-v3/manifest.json", {
      fixture: "/manifests/external-annotation-pages-v3/manifest.json",
    }).as("external-anno-pages-manifest");

    setup();

    cy.wait("@external-anno-pages-manifest");

    cy.get("#viewer")
      .should("have.attr", "data-status")
      .and("match", /no-ext-anno/);
  });
});
