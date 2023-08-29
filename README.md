# Storiiies Viewer ![Build status badge](https://github.com/CogappLabs/StoriiiesViewer/actions/workflows/build.yml/badge.svg)

Storiiies Viewer is an open source viewer for [Storiiies](https://www.cogapp.com/r-d/storiiies), the IIIF digital storytelling platform.

## Usage

### Adding the dependencies

There's two options for adding StoriiiesViewer to your project:

#### In the browser

(This is the quickest and easiest way to get started)

You can include the JavaScript and CSS in the HTML like so, using the [unpkg CDN](https://unpkg.com/):

```HTML
<head>
  <!-- ... -->
  <link rel="stylesheet" href="https://unpkg.com/browse/@cogapp/storiiiesviewer@latest/dist/storiiies-viewer.css">
  <script src="https://unpkg.com/browse/@cogapp/storiiiesviewer@latest/dist/umd/storiiies-viewwer.js"></script>
  <!-- ... -->
</head>
```

Or you could save these files and serve them locally if you prefer.

Including the JavaScript file this way will make `StoriiiesViewer` available globally in JavaScript.


#### Using a bundler

1. Install the dependecy with `npm install --save @cogapp/storiiiesviewer`
2. Use `import StoriiiesViewer from '@cogapp/storiiiesviewer'` in your code to access the StoriiiesViewer constructor
3. Depending on how your tooling handles importing CSS you might also be able to import the CSS file with `import @cogapp/storiiiesviewer/dist/storiiies-viewer.css` — but you could also use the method above, or copy the contents of the CSS file into your own src files.


### Initialise a viewer
In your HTML:
```HTML
<div id="storiiies-viewer"></div>
```

In your JavaScript
```JS
Document.addEventListener('DOMContentLoaded', () => {
  const myViewer = new StoriiiesViewer({
    container: "#storiiies-viewer", // or document.querySelector("#storiiies-viewer")
    manifestUrl: "https://path-to-your-storiiies-manifest",
  });
});
```

## Customisation

To customize of appearance of StoriiiesViewer you have a few options:

1. If you'd prefer to bring all your own styles, StoriiiesViewer can be styled from scratch without needing to include the default stylesheet
2. To 'theme' StoriiiesViewer, you may find the custom properties provided by the default stylesheet to be sufficient
3. Start with default stylesheet and expand or override these styles as you see fit


## Local development

### Installation

#### Pre-requisites

- [Node.js / npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

Although optional, we recommend using [nvm](https://github.com/nvm-sh/nvm) to match the version of Node used in this project before running the install command, or the npm scripts described below.

If you encounter problems and aren't using the version of Node shown in the [.nvmrc](.nvmrc) file, you should try aligning your node version to this first. This represents a known compatibility with the code here and our dependencies.

#### Setup

Install the dependencies in the project root with:

```console
npm ci
```

### Compiling and previewing changes

<table width="100%">
  <thead>
    <tr>
      <th width="300px">Command</th>
      <th width="800px">Action</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>npm run dev</code></td>
      <td>Watches files in the <a href="./src"><code>src</code></a> directory for changes and serves a preview at https://localhost:43110 with hot module replacement</td>
    </tr>
    <tr>
      <td><code>npm run build</code></td>
      <td>Builds the package for use in production. See "<a href="#usage">Usage</a> for how this package can be used</td>
    </tr>
  </tbody>
</table>


### Running the tests

<table width="100%">
  <thead>
    <tr>
      <th width="300px">Command</th>
      <th width="800px">Action</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>npm run test:gui</code></td>
      <td>Will start the local dev server and run the e2e tests with the interactive GUI</td>
    </tr>
    <tr>
      <td><code>npm run test</code></td>
      <td> Starts the dev server as above, but instead runs the tests without the GUI</td>
    </tr>
  </tbody>
</table>

`npm run cypress:gui` and `npm run cypress` will also do the same as the above _without_ starting the dev server, if you already have it running.

### Linting the code

<table width="100%">
  <thead>
    <tr>
      <th width="300px">Command</th>
      <th width="800px">Action</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>npm run lint</code></td>
      <td>Will lint (and fix where possible) all problems in the code</td>
    </tr>
  </tbody>
</table>
