import type {BuildOptions} from 'esbuild';

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
  preTransform: (filePath: string, fileContent: string) => string;
  postTransform: (filePath: string, fileContent: string) => string;
};

export declare const build: (config: Partial<ESBuildJestConfig>) => Promise<void>;
