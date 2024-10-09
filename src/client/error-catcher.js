import { log } from "../lib/log-client";

export default error => {
  if (!error) {
    log.error("Uncaught exception with null error object");
    return;
  }

  log.error(error);
};
