import path from 'node:path';

export function mapSourceToOutputFiles({ rootDir, outdir, sourceFiles, outputFiles }) {
  const sourceMap = sourceFiles.reduce((acc, rawSourceFile) => {
    const sourceFile = path.relative(rootDir, rawSourceFile);
    const sourceFileParts = sourceFile.split('.');
    const sourceFileBase = sourceFileParts.slice(0, -1).join('.');
    acc[sourceFileBase] = rawSourceFile;
    return acc;
  }, {});

  const outputMap = outputFiles.reduce((acc, rawOutputFile) => {
    const outputFile = path.relative(outdir, rawOutputFile);
    const outputFileParts = outputFile.split('.');
    const outputFileBase = outputFileParts.slice(0, -1).join('.');
    acc[outputFileBase] = rawOutputFile;
    return acc;
  }, {});

  const result = {};
  for (const key of Object.keys(sourceMap)) {
    if (outputMap[key]) {
      const sourcePath = path.resolve(sourceMap[key]);
      const outputPath = path.resolve(outputMap[key]);
      result[sourcePath] = outputPath;
    }
  }

  return result;
}
