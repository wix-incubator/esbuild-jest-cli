import path from 'node:path';

export function mapSourceToOutputFiles({ rootDir, outdir, sourceFiles, outputFiles }) {
  const sourcesMap = sourceFiles.reduce((acc, rawSourceFile) => {
    const sourceFile = path.relative(rootDir, rawSourceFile);
    const sourceFileParts = sourceFile.split('.');
    const sourceFileBase = sourceFileParts.slice(0, -1).join('.');
    acc[sourceFileBase] = rawSourceFile;
    return acc;
  }, {});

  const outputsMap = outputFiles.reduce((acc, rawOutputFile) => {
    const outputFile = path.relative(outdir, rawOutputFile);
    const outputFileParts = outputFile.split('.');
    const outputFileBase = adaptTwoDots(outputFileParts.slice(0, -1).join('.'));
    acc[outputFileBase] = rawOutputFile;
    return acc;
  }, {});

  const result = {};
  for (const key of Object.keys(sourcesMap)) {
    if (outputsMap[key]) {
      const sourcePath = path.resolve(sourcesMap[key]);
      const outputPath = path.resolve(outputsMap[key]);
      result[sourcePath] = outputPath;
    }
  }

  return result;
}

export function relativizeEntries(rootDirs, mapping) {
  return Object.fromEntries(
    Object.entries(mapping).map(([source, output]) => [
      path.relative(rootDirs[0], source),
      path.relative(rootDirs[1], output),
    ]),
  );
}

function adaptTwoDots(filePath) {
  const segments = filePath.split(path.sep);
  return segments.map(convertTwoDots).join(path.sep);
}

function convertTwoDots(segment) {
  return segment === '_.._' ? '..' : segment;
}
