export const ESM_REQUIRE_SHIM = `
/* CommonJS shim */
import { dirname as esbuild_jest_cli__dirname } from "path";
import { fileURLToPath as esbuild_jest_cli__fileURLToPath } from "url";
import esbuild_jest_cli__module from "module";

var __filename = esbuild_jest_cli__fileURLToPath(import.meta.url);
var __dirname = esbuild_jest_cli__dirname(__filename);
var require = esbuild_jest_cli__module.createRequire(import.meta.url);
/* End CommonJS shim */
`;
