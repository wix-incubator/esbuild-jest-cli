import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  bunyamin,
  isDebug,
  threadGroups,
  traceEventStream,
} from 'bunyamin';
import { createLogger } from 'bunyan';
import { create as createDebugStream } from 'bunyan-debug-stream';

const PACKAGE_NAME = 'esbuild-jest-cli';

threadGroups.add({
  id: PACKAGE_NAME,
  displayName: PACKAGE_NAME,
});

threadGroups.add({
  id: 'jest-transform',
  displayName: 'Jest Transform',
});

bunyamin.useLogger(createBunyanImpl(), 1);

export const logger = bunyamin.child({
  cat: PACKAGE_NAME,
});

const noop = () => {};

export const optimizeTracing = isDebug(PACKAGE_NAME)
  ? ((f) => f)
  : (() => noop);

function createBunyanImpl() {
  const logPath = process.env.BUNYAMIN_LOG;

  return createLogger({
    name: PACKAGE_NAME,
    streams: [
      {
        type: 'raw',
        level: 'warn',
        stream: createDebugStream({
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
}

function ensureCleanLog(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  return filePath;
}
