/** @type {import('esbuild-jest-cli').ESBuildJestConfig} */
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
  "useTransformer": ({ build, transformer }) => {
    build.onLoad({ filter: /lodash\/noop/ }, async (args) => {
      const fs = await import('fs');
      const raw = await fs.promises.readFile(args.path, 'utf8');
      const { code: transformed } =  transformer.transformSource(args.path, raw, {});

      return {
        contents: 'console.log("You called noop!");\n' + transformed,
        loader: 'js',
      };
    });
  },
  "package": {
    "name": "custom-name",
    "dependencies": {
      "@linked-dependencies/external": "../linked-dependencies/external",
    }
  }
};
