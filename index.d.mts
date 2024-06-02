import type { PluginBuild, BuildOptions } from 'esbuild';
import type { ScriptTransformer } from '@jest/transform';

export type ESBuildJestConfig = {
  esbuild: Omit<
    BuildOptions,
    | 'bundle'
    | 'splitting'
    | 'metafile'
    | 'outbase'
    | 'banner'
    | 'format'
    | 'entryPoints'
  >;
  package: Record<string, unknown> | ((base: Record<string, unknown>) => Record<string, unknown>);
  useTransformer: (context: { build: PluginBuild; transformer: ScriptTransformer; }) => void | Promise<void>;
  postTransform: (filePath: string, fileContent: string) => string;
};

export declare const build: (config: Partial<ESBuildJestConfig>) => Promise<void>;
