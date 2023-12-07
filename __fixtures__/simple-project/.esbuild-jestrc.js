module.exports = {
  "esbuild": {
    "sourcemap": true,
    "platform": "node",
    "outdir": "../simple-project-bundled",
    "outExtension": {
      ".js": ".mjs"
    },
    "external": ["chalk", "jest-allure2-reporter"],
  },
  "preTransform": (path, contents) => {
    if (path.includes('lodash/noop')) {
      return 'console.log("You called noop!");\n' + contents;
    }

    return contents;
  },
  "package": {
    "name": "custom-name"
  }
};
