describe("App rendering", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("Should render an Openseadragon viewer", () => {
    cy.get(".openseadragon-canvas");
  });

  it("Should initially display the label from the manifest", () => {
    cy.contains("Test image");
  });
});
