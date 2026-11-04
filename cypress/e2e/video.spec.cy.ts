function setupVideoViewer(embedOrigins?: string[]) {
  cy.visit("/").then((window) => {
    cy.document().then((document) => {
      const container = document.querySelector("#viewer");
      if (!window.StoriiiesViewer) return;

      window.storiiiesViewerInstance = new window.StoriiiesViewer({
        container,
        manifestUrl: "http://localhost:43110/manifests/video-v3/manifest.json",
        embedOrigins,
      });
    });
  });
  cy.get("#viewer[data-loaded='true']");
}

const next = () => cy.get("#storiiies-viewer-0__next").click();

describe("Video", () => {
  it("Should embed a YouTube Video body in an iframe", () => {
    setupVideoViewer();
    next();
    cy.get("#viewer iframe.storiiies-viewer__embed")
      .should(
        "have.attr",
        "src",
        "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ",
      )
      .and("have.attr", "allowfullscreen");
  });

  it("Should not embed a URL outside embedOrigins", () => {
    setupVideoViewer();
    cy.window().then((win) => cy.spy(win.console, "warn").as("warn"));
    next();
    next();
    cy.get("#viewer iframe").should("not.exist");
    cy.get("@warn").should("have.been.called");
  });

  it("Should allow embedOrigins to be overridden", () => {
    setupVideoViewer(["https://example.com/"]);
    next();
    cy.get("#viewer iframe").should("not.exist");
    next();
    cy.get("#viewer iframe").should(
      "have.attr",
      "src",
      "https://example.com/not-allowed",
    );
  });

  it("Should render a video/* Video body as a video element", () => {
    setupVideoViewer();
    next();
    next();
    next();
    cy.get("#viewer video[controls]").should(
      "have.attr",
      "src",
      "http://localhost:43110/video/example.mp4",
    );
  });

  it("Should not let a quote in a Sound id add attributes", () => {
    setupVideoViewer();
    for (let i = 0; i < 4; i++) next();
    cy.get("#viewer audio").should("not.have.attr", "onplay");
  });
});
