import pino from "pino";

const logConfig = {
  base: undefined,
  level: process.env.DEBUG ? "debug" : "info",
  transport: {
    targets: [
      { target: 'pino/file' },
    ],
  },
};

if (process.env.NODE_ENV === "production") {
  // Include text severity labels.
  logConfig.mixin = (_context, level) => {
    return {
      severity: pino.levels.labels[level]
    };
  };

  // Add rollbar transport if configured.
  if (process.env.ROLLBAR_ACCESS_TOKEN) {
    logConfig.transport.targets.push({
      target: '@t-botz/pino-rollbar-transport',
      level: 'error',
      options: {
        rollbarOpts: {
          accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
          payload: {
            environment: "production",
          },
        },
        // Prevent calling console.error when rollbar returns errors
        logErrors: false
      }
    });
  }
}
else {
  // Note: pino-pretty is installed as a dev package
  logConfig.transport = {
    target: 'pino-pretty',
    options: {
      ignore: 'pid,hostname',
      colorize: true,
    }
  };
}

export const log = pino(logConfig);
