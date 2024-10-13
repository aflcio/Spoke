/// All functions are OPTIONAL EXCEPT metadata() and const name=.
/// DO NOT IMPLEMENT ANYTHING YOU WILL NOT USE -- the existence of a function adds behavior/UI (sometimes costly)

import { r, cacheableData } from "../../../server/models";
import { log as logger } from "../../../lib";

export const name = "numpicker-basic";
const log = logger.child({category: "numpicker", picker: "basic"});

export const metadata = () => ({
  // set canSpendMoney=true, if this extension can lead to (additional) money being spent
  // if it can, which operations below can trigger money being spent?
  displayName: "Basic Number Picker",
  description:
    "Picks a number available in owned_phone_number table for the service to send messages with. Defaults to basic rotation.",
  canSpendMoney: false,
  moneySpendingOperations: [],
  supportsOrgConfig: false,
  supportsCampaignConfig: false
});

export async function onMessageSend({
  message,
  contact,
  organization,
  campaign,
  serviceManagerData
}) {
  log.debug({
    event: 'onMessageSend',
    orgId: organization.id,
    campaignId: campaign.id,
    messageId: message.id,
    userNumber: message.user_number,
    serviceManagerData
  });
  if (
    message.user_number ||
    (serviceManagerData && serviceManagerData.user_number)
  ) {
    // This is meant as a fallback -- if another serviceManager already
    // chose a phone number then don't change anything
    return;
  }
  const serviceName = cacheableData.organization.getMessageService(
    organization
  );
  const selectedPhone = await r
    .knex("owned_phone_number")
    .where({ service: serviceName, organization_id: organization.id })
    .whereNull("allocated_to_id")
    .orderByRaw("random()")
    .select("phone_number")
    .first();
    log.info({event: 'onMessageSend', selectedPhone});
  // TODO: caching
  // TODO: something better than pure rotation -- maybe with caching we use metrics
  //   based on sad deliveryreports
  if (selectedPhone && selectedPhone.phone_number) {
    return { user_number: selectedPhone.phone_number };
  } else {
    log.warn({
      event: 'onMessageSend',
      serviceName,
      orgId: organization.id,
    }, "None found");
  }
}
