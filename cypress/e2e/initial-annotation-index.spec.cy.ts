import {
  assertWithinAcceptableRange,
  getActualCentre,
  getExpectedCentre,
} from "../support/utils";

function setupViewer(
  initialAnnotationIndex?: number,
  useUrlHash?: boolean,
  hash: string = "",
  pointOfInterestSvgUrl?: string,
) {
  cy.visit(`/${hash}`).then((window) => {
    cy.document().then((document) => {
      const container = document.querySelector("#viewer");
      if (!window.StoriiiesViewer) return;

      window.storiiiesViewerInstance = new window.StoriiiesViewer({
        container,
        manifestUrl:
          "http://localhost:43110/manifests/standard-v3/manifest.json",
        initialAnnotationIndex,
        useUrlHash,
        pointOfInterestSvgUrl,
      });
    });
  });
}

describe("Initial annotation index", () => {
  it("should open on the given annotation", () => {
    setupViewer(1);

    cy.window().then((window) => window.storiiiesViewerInstance.ready);

    cy.get("#storiiies-viewer-0__info-text").should(
      "contain.html",
      "<strong>Suspendisse lacinia enim lorem</strong>",
    );
    cy.get("#storiiies-viewer-0__previous").should("not.be.disabled");
    // No retry: the viewport must already be on the region, not animating to it
    cy.window().then((window) => {
      const expectedCentre = getExpectedCentre("-20,242,200,120");
      const actualCentre = getActualCentre(
        window.storiiiesViewerInstance.viewer,
      );
      assertWithinAcceptableRange(expectedCentre.x, actualCentre.x);
      assertWithinAcceptableRange(expectedCentre.y, actualCentre.y);
    });
  });

  it("should navigate backwards from the initial annotation", () => {
    setupViewer(0);

    cy.window().then((window) => window.storiiiesViewerInstance.ready);
    cy.get("#storiiies-viewer-0__previous").click().should("be.disabled");
    cy.get("#storiiies-viewer-0__info-text h1").should("exist");
  });

  it("should warn and start from the title slide when out of range", () => {
    setupViewer(99);

    cy.window().then((window) => window.storiiiesViewerInstance.ready);
    cy.get("#viewer")
      .should("have.attr", "data-status")
      .and("match", /bad-initial-index/);
    cy.get("#storiiies-viewer-0__info-text h1").should("exist");
    cy.get("#storiiies-viewer-0__previous").should("be.disabled");
  });

  it("should resolve ready with the title slide when not set", () => {
    setupViewer();

    cy.window().then((window) => window.storiiiesViewerInstance.ready);
    cy.get("#viewer").should("have.attr", "data-loaded", "true");
    cy.get("#storiiies-viewer-0__info-text h1").should("exist");
  });
});

describe("URL hash", () => {
  it("should open on the annotation in the hash (1-based)", () => {
    setupViewer(undefined, true, "#annotation-2");

    cy.window().then((window) => window.storiiiesViewerInstance.ready);
    cy.get("#storiiies-viewer-0__info-text").should(
      "contain.html",
      "<strong>Suspendisse lacinia enim lorem</strong>",
    );
    cy.hash().should("eq", "#annotation-2");
  });

  it("should update the hash while navigating and clear it on the title slide", () => {
    setupViewer(undefined, true);

    cy.window().then((window) => window.storiiiesViewerInstance.ready);
    cy.hash().should("eq", "");
    cy.get("#storiiies-viewer-0__next").click();
    cy.hash().should("eq", "#annotation-1");
    cy.get("#storiiies-viewer-0__next").click();
    cy.hash().should("eq", "#annotation-2");
    cy.get("#storiiies-viewer-0__previous").click().click();
    cy.hash().should("eq", "");
  });

  it("should navigate when the hash is edited after load", () => {
    setupViewer(undefined, true);

    cy.window().then((window) => window.storiiiesViewerInstance.ready);
    cy.window().then((window) => {
      window.location.hash = "#annotation-2";
    });
    cy.get("#storiiies-viewer-0__info-text").should(
      "contain.html",
      "<strong>Suspendisse lacinia enim lorem</strong>",
    );
  });

  it("should leave unrelated hashes alone", () => {
    setupViewer(undefined, true, "#something-else");

    cy.window().then((window) => window.storiiiesViewerInstance.ready);
    cy.get("#storiiies-viewer-0__info-text h1").should("exist");
    cy.hash().should("eq", "#something-else");
  });

  it("should ignore the hash unless useUrlHash is set", () => {
    setupViewer(undefined, undefined, "#annotation-2");

    cy.window().then((window) => window.storiiiesViewerInstance.ready);
    cy.get("#storiiies-viewer-0__info-text h1").should("exist");
    cy.get("#storiiies-viewer-0__next").click();
    cy.hash().should("eq", "#annotation-2");
  });

  it("should prefer initialAnnotationIndex over the hash", () => {
    setupViewer(0, true, "#annotation-2");

    cy.window().then((window) => window.storiiiesViewerInstance.ready);
    cy.hash().should("eq", "#annotation-1");
  });

  it("should warn and start from the title slide when the hash is out of range", () => {
    setupViewer(undefined, true, "#annotation-99");

    cy.window().then((window) => window.storiiiesViewerInstance.ready);
    cy.get("#viewer")
      .should("have.attr", "data-status")
      .and("match", /bad-initial-index/);
    cy.get("#storiiies-viewer-0__info-text h1").should("exist");
  });
});

describe("Ready", () => {
  it("should reject when the image fails to load", () => {
    cy.intercept("GET", "/images/exact-tiles/info.json", { statusCode: 404 });
    // The viewer's own rejection of ready is unhandled until the test catches it
    cy.on("uncaught:exception", () => false);
    setupViewer();

    cy.window()
      .then((window) =>
        window.storiiiesViewerInstance.ready.then(
          () => "resolved",
          () => "rejected",
        ),
      )
      .should("eq", "rejected");
    cy.get("#viewer")
      .should("have.attr", "data-status")
      .and("match", /image-err/);
  });

  it("should still open on the initial annotation when the custom POI SVG is invalid", () => {
    cy.intercept("GET", "/custom-poi.svg", { body: "<div>Not an SVG</div>" });
    cy.on("uncaught:exception", () => false);
    setupViewer(1, undefined, "", "/custom-poi.svg");

    cy.window().then((window) => window.storiiiesViewerInstance.ready);
    cy.get("#viewer")
      .should("have.attr", "data-status")
      .and("match", /poi-svg-invalid/);
    cy.get("#storiiies-viewer-0__info-text").should(
      "contain.html",
      "<strong>Suspendisse lacinia enim lorem</strong>",
    );
  });
});
