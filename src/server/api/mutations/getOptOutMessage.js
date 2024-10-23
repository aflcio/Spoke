import { getConfig } from "../lib/config";
import optOutMessageCache from "../../models/cacheable_queries/opt-out-message";
import zipStateCache from "../../models/cacheable_queries/zip";
import { log } from "../../../lib";

export const getOptOutMessage = async (
  _,
  { organizationId, zip, defaultMessage }
) => {
  if (!getConfig("OPT_OUT_PER_STATE")) {
    return defaultMessage;
  }
  try {
    const queryResult = await optOutMessageCache.query({
      organizationId: organizationId,
      state: await zipStateCache.query({ zip: zip })
    });

    return queryResult || defaultMessage;
  } catch (err) {
    log.error({category: "mutations", event: "getOptOutMessage", err})
    return defaultMessage;
  }
};
