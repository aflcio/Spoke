import { log } from "../lib";
import telemetry from "./telemetry";

// Codes that should be logged as warnings instead of errors.
const warnCodes = [
  "SENDERR_ASSIGNMENTCHANGED",
  "SENDERR_OPTOUT",
  "SENDERR_OFFHOURS",
  "DUPLICATE_REPLY_MESSAGE",
];

// Apollo plugin that logs server errors through pino and telemetry.
export const ApolloErrorLogger = {
  async requestDidStart(requestContext) {

    return {
      async didEncounterErrors(requestContext) {
        requestContext.errors.forEach(err => {
          const logInfo = {
            userId: requestContext.contextValue?.user?.id,
            code: err?.extensions?.code ?? "INTERNAL_SERVER_ERROR",
            err: {
              ...err,
              stack: process.env.DEBUG ? err.stack : null,
            },
            msg: "GraphQL error"
          };
          if (warnCodes.includes(logInfo.code)) {
            log.warn(logInfo)
          }
          else {
            log.error(logInfo);
          }

          telemetry
            .formatRequestError(err, requestContext.contextValue)
            // drop if this fails
            .catch(() => {})
            .then(() => {});
        });
      }
    }
  },
};
