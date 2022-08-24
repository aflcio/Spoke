import { accessRequired } from "../errors";
import { clearCacheForOrganization as clearContactLoaderCaches } from "../../../extensions/contact-loaders";
import { clearCacheForOrganization as clearActionHandlerCaches } from "../../../extensions/action-handlers";
import cacheable from "../../../server/models/cacheable_queries";
import { r } from "../../../server/models";
import log from "../../log";

export const clearCachedOrgAndExtensionCaches = async (
  _,
  { organizationId },
  { user }
) => {
  await accessRequired(user, organizationId, "OWNER");

  if (!r.redis) {
    return "Redis not configured. No need to clear organization caches";
  }

  try {
    await cacheable.organization.clear(organizationId);
    await cacheable.organization.load(organizationId);
  } catch (caught) {
    log.error(caught, 'Error while clearing organization cache');
  }

  const promises = [
    clearActionHandlerCaches(organizationId),
    clearContactLoaderCaches(organizationId)
  ];

  try {
    await Promise.all(promises);
  } catch (caught) {
    log.error(caught, 'Error while clearing extension caches');
  }

  return "Cleared organization and extension caches";
};
