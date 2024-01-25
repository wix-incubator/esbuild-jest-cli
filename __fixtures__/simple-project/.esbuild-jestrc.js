module.exports = {
  "esbuild": {
    "sourcemap": true,
    "platform": "node",
    "outdir": "../simple-project-bundled",
    "outExtension": {
      ".js": ".mjs"
    },
    "external": ["chalk", "dtrace-provider", "@linked-dependencies/external"],
  },
  "preTransform": (path, contents) => {
    if (path.includes('lodash/noop')) {
      return 'console.log("You called noop!");\n' + contents;
    }

    return contents;
  },
  "package": {
    "name": "custom-name",
    "dependencies": {
      "@linked-dependencies/external": "../linked-dependencies/external",
    }
  }
};
