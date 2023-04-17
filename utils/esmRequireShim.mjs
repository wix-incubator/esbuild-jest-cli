export const ESM_REQUIRE_SHIM = `
/* CommonJS shim */
import { dirname as esbuild_jest_cli__dirname } from "path";
import { fileURLToPath as esbuild_jest_cli__fileURLToPath } from "url";
import esbuild_jest_cli__module from "module";

if (typeof globalThis.__filename === "undefined") {
  globalThis.__filename = esbuild_jest_cli__fileURLToPath(import.meta.url);
}
if (typeof globalThis.__dirname === "undefined") {
  globalThis.__dirname = esbuild_jest_cli__dirname(globalThis.__filename);
}
if (typeof globalThis.require === "undefined") {
  globalThis.require = esbuild_jest_cli__module.createRequire(import.meta.url);
}
/* End CommonJS shim */
`;
