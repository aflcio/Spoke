import { getConfig } from "../../server/api/lib/config";
import log from "../../server/log";

export function getMessageHandlers(organization) {
  const handlerKey = "MESSAGE_HANDLERS";
  const configuredHandlers = getConfig(handlerKey, organization);
  const enabledHandlers =
    (configuredHandlers && configuredHandlers.split(",")) || [];

  if (typeof configuredHandlers === "undefined") {
    enabledHandlers.push("auto-optout", "outbound-unassign");
  }

  const handlers = [];
  enabledHandlers.forEach(name => {
    try {
      const c = require(`./${name}/index.js`);
      handlers.push(c);
    } catch (err) {
      log.error({
        category: 'extension',
        err
      }, `${handlerKey} failed to load message handler ${name}`);
    }
  });
  return handlers;
}
