import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  bunyamin,
  threadGroups,
  traceEventStream,
} from 'bunyamin';

const PACKAGE_NAME = 'esbuild-jest-cli';

export async function useLoggingForCLI() {
  const bunyan = await import('bunyan');
  const bds = await import('bunyan-debug-stream');
  const logPath = process.env.BUNYAMIN_LOG;

  const logger = bunyan.createLogger({
    name: PACKAGE_NAME,
    streams: [
      {
        type: 'raw',
        level: 'warn',
        stream: bds.create({
          out: process.stderr,
          showMetadata: false,
          showDate: false,
          showPid: false,
          showProcess: false,
          showLoggerName: false,
          showLevel: false,
          prefixers: {
            cat: (value) => String(value).split(',', 1)[0],
          },
        }),
      },
      ...(logPath
        ? [
          {
            type: 'raw',
            level: 'trace',
            stream: traceEventStream({
              filePath: ensureCleanLog(logPath),
              threadGroups,
            }),
          },
        ]
        : []),
    ],
  });

  bunyamin.useLogger(logger, 1);
}

function ensureCleanLog(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  return filePath;
}
