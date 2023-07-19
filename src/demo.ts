import StoriiiesViewer from ".";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector("#viewer");

  new StoriiiesViewer({
    container,
    manifestUrl: "http://localhost:43110/manifests/standard-v3/manifest.json",
  });
});
