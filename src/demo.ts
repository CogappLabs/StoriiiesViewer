import StoriiiesViewer from ".";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector("#viewer");

  new StoriiiesViewer({
    container,
    manifest: "https://storiiies.github.io/storiiies-viewer/manifest.json",
  });
});
