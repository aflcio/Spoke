import pino from "pino";

const logConfig = {
  base: null,
  level: process.env.LOG_LEVEL || "info",
  transport: {
    targets: [
      { target: 'pino/file' },
    ],
  },
};

if (process.env.NODE_ENV !== "production") {
  // Note: pino-pretty is installed as a dev package
  logConfig.transport = {
    target: 'pino-pretty',
    options: {
      ignore: 'pid,hostname',
      colorize: true,
    }
  };
}
else if (process.env.ROLLBAR_ACCESS_TOKEN) {
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

export default pino(logConfig);
