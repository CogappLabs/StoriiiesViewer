# Storiiies Viewer ![Build status badge](https://github.com/CogappLabs/StoriiiesViewer/actions/workflows/build.yml/badge.svg)

Storiiies Viewer is an open source viewer for [Storiiies](https://www.cogapp.com/r-d/storiiies), the IIIF digital storytelling platform.

## Usage

TODO

## Customisation

TODO

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

| Command | Action |
| --- | --- |
| `npm run dev` | Watches files in the [`src`](./src) directory for changes and serves a preview at https://localhost:43110 with hot module replacement |
| `npm run build` | Builds the package for use in production. See "[Usage](#usage)" for how this package can be used |

### Running the tests

| Command | Action |
| --- | --- |
| `npm run test:gui` | Will start the local dev server and run the e2e tests with the interactive GUI |
| `npm run test` | Starts the dev server as above, but instead runs the tests without the GUI |

`npm run cypress:gui` and `npm run cypress` will also do the same as the above _without_ starting the dev server, if you already have it running.

### Linting the code

| Command | Action |
| --- | --- |
| `npm run lint` | Will lint (and fix where possible) all problems in the code |

