<div align="center">
  
![esbuild-jest-cli](images/logo.svg)

[![npm version](https://badge.fury.io/js/esbuild-jest-cli.svg)](https://badge.fury.io/js/esbuild-jest-cli)
[![CI](https://github.com/wix-incubator/esbuild-jest-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/wix-incubator/esbuild-jest-cli/actions/workflows/ci.yml)

</div>

`esbuild-jest-cli` is a CLI tool to bundle Jest tests with `esbuild` for faster or lighter test execution, e.g.:

```bash
esbuild-jest -c jest-custom.config.js --maxWorkers=2

# ls .bundle/**
# .bundle/chunk-ZEPWVVN4.js
# .bundle/tests/first.test.js
# .bundle/tests/second.test.js
```

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

### Advanced Usage

You can also use the CLI programmatically – especially useful if you are wrapping it in a custom script:

```js
import { build } from 'esbuild-jest-cli';
import myPlugin from './my-esbuild-plugin.js';

await build({
  esbuild: {
    outdir: 'dist',
    sourcemap: true,
    plugins: [myPlugin()],
  },
  package: {
    name: 'custom-name',
  },
});
```

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
It is also possible to pass a function to modify its contents, e.g.:

```js
module.exports = {
  esbuild: {
    // ...
  },
  package: (p) => ({
    ...p,
    customField: 'customValue',
  }),
};
```

Troubleshooting
---------------

This project is currently more of a proof-of-concept, and as such, there might be various issues.

Please note that the maintainer's time is limited, but feel free to report any problems you encounter via the issue tracker.

Copyright
---------

© 2023, Wix Incubator. Licensed under [MIT License](LICENSE).
