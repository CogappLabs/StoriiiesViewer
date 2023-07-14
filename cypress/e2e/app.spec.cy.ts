describe("App rendering", () => {
  it("Should display placeholder text", () => {
    cy.visit("/");
    cy.contains("Storiiies Viewer goes here");
  });
});
