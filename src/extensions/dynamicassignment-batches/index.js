import { getConfig } from "../../server/api/lib/config";
import log from "../../server/log";

export const getDynamicAssignmentBatchPolicies = ({
  organization,
  campaign
}) => {
  const handlerKey = "DYNAMICASSIGNMENT_BATCHES";
  const campaignEnabled = getConfig(handlerKey, campaign, { onlyLocal: true });
  const configuredHandlers =
    campaignEnabled ||
    getConfig(handlerKey, organization) ||
    "finished-replies-tz,vetted-texters,finished-replies";
  const enabledHandlers =
    (configuredHandlers && configuredHandlers.split(",")) || [];
  if (!campaignEnabled) {
    // remove everything except the first one for non-campaign enabled choices
    enabledHandlers.splice(1);
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
      }, `${handlerKey} failed to load dynamicassignment-batches handler ${name}`);
    }
  });
  return handlers;
};
