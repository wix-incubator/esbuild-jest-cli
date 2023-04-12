esbuild-jest-cli
================

`esbuild-jest-cli` is a CLI tool to bundle Jest tests with `esbuild` for faster or lighter test execution.

It can handle various Jest configurations and supports external modules.

* **Supported Jest versions:** 27.x – 29.x
* **Supported Node.js versions:** 14.x and higher

Table of Contents
-----------------

*   [Installation](#installation)
*   [Usage](#usage)
*   [Configuration](#configuration)
*   [Troubleshooting](#troubleshooting)
*   [Copyright](#copyright)

Installation
------------

To install the CLI, run:

```sh
npm install --save-dev esbuild-jest-cli
```

or with yarn:

```sh
yarn add --dev esbuild-jest-cli
```

Before you can use it, you also have to run `esbuild-jest-patch`, which comes with the package, e.g.:

```
npx esbuild-jest-patch
```

This patch adds an additional module to the exports section in the jest-cli package. It is mandatory for proper usage.

Usage
-----

Before you bundle your tests, make sure you can run them in Jest and that they pass.

To configure the CLI, create a config file in your project root directory. The possible file names are:

* `.esbuild-jestrc`
* `.esbuild-jestrc.js`
* `.esbuild-jestrc.json`,

and any other filenames that follow [cosmiconfig](https://www.npmjs.com/package/cosmiconfig) convention.

Once the config is ready, run:

```
npx esbuild-jest [...optional-jest-arguments]
```

You can pass any Jest arguments just like you're running Jest itself.

Configuration
-------------

The configuration file consists of two sections: `esbuild` and `package`, e.g.:

```json
{
  "esbuild": {
    "sourcemap": true,
    "platform": "node",
    "outdir": ".bundle",
    "external": ["chalk"]
  },
  "package": {
    "name": "custom-name"
  }
}
```

In the `esbuild` section, you can override any `esbuild` option except for a few that are critical for this project to work:

* `bundle: true` – the goal of this project is to bundle so no surprise;
* `splitting: true` – helps to avoid state bugs in modules;
* `metafile: true` – helps to generate `jest.config.json` automatically;
* `outbase` – current working directory is used;
* `banner` – needed to inject a shim allowing the use of `require()` with ESM.

Any other valid [esbuild configuration options](https://esbuild.github.io/api/#options) are supported as expected.

In `package` section, you can override fields in the generated `package.json`, such as `name`, `scripts`, etc.

Troubleshooting
---------------

This project is currently more of a proof-of-concept, and as such, there might be various issues.

Please note that the maintainer's time is limited, but feel free to report any problems you encounter via the issue tracker.

Copyright
---------

© 2023, Wix Incubator. Licensed under [MIT License](LICENSE).
