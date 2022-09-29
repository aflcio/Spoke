import { getConfig } from "../../../server/api/lib/config";
import urlJoin from "url-join";

export const name = "twilio-skip-messageservice";

export const metadata = () => ({
  displayName: "Skip Twilio Message Service",
  description: "Sends messages without a Twilio messaging service. Should only be used in combination with sticky-sender and a number picker like numpicker-basic.",
  canSpendMoney: false,
  moneySpendingOperations: [],
  supportsOrgConfig: false,
  supportsCampaignConfig: false
});

export async function onMessageSend({
  message,
  contact,
  organization,
  campaign
}) {
  const twilioBaseUrl =
    getConfig("TWILIO_BASE_CALLBACK_URL", organization) ||
    getConfig("BASE_URL");
  return {
    status_callback_url: urlJoin(twilioBaseUrl, "twilio-message-report", organization.id.toString()),
  }
}

export async function onBuyPhoneNumbers({ organization, serviceName, opts }) {
  return {
    opts: {
      skipOrgMessageService: true
    }
  };
}

export async function onVendorServiceFullyConfigured({
  organization,
  serviceName
}) {
  return {
    skipOrgMessageService: true
  };
}

export async function onOrganizationServiceVendorSetup({
  organization,
  newConfig,
  serviceName
}) {
  return {
    skipOrgMessageService: true
  };
}
