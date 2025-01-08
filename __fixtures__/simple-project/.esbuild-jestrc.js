/** @type {import('esbuild-jest-cli').ESBuildJestConfig} */
module.exports = {
  esbuild: {
    sourcemap: true,
    platform: "node",
    metafile: true,
    outdir: "../simple-project-bundled",
    external: ["chalk", "dtrace-provider", "@linked-dependencies/external"],
  },
  useTransformer: ({ build, transformer }) => {
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
  jestConfig: {
    transform: {
      'someCuriousPattern': '@swc/jest',
    },
  },
  package: {
    name: "custom-name",
    dependencies: {
      "@linked-dependencies/external": "../linked-dependencies/external",
    }
  }
};
