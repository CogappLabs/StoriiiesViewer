import StoriiiesViewer from ".";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector("#viewer");

  new StoriiiesViewer({
    container,
    manifestUrl:
      "https://cwp4ao9r10.execute-api.us-east-1.amazonaws.com/dev/manifest/d58788314ce040d6a7288a613476e289/manifest.json",
  });
});
