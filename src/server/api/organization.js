import { mapFieldsToModel } from "./lib/utils";
import { getConfig, getFeatures } from "./lib/config";
import { r, Organization, cacheableData } from "../models";
import { getTags } from "./tag";
import { accessRequired } from "./errors";
import { getCampaigns, getCampaignsCount } from "./campaign";
import { buildUsersQuery } from "./user";
import {
  getAvailableActionHandlers,
  getActionChoiceData
} from "../../extensions/action-handlers";

export const ownerConfigurable = {
  // ACTION_HANDLERS: 1,
  ALLOW_SEND_ALL_ENABLED: 1,
  DEFAULT_BATCHSIZE: 1,
  DEFAULT_RESPONSEWINDOW: 1,
  MAX_CONTACTS_PER_TEXTER: 1,
  MAX_MESSAGE_LENGTH: 1,
  NGP_VAN_API_KEY_ENCRYPTED: 1,
  NGP_VAN_APP_NAME: 1,
  NGP_VAN_DATABASE_MODE: 1,
  SHOW_MEDIA: 1
  // MESSAGE_HANDLERS: 1,
  // There is already an endpoint and widget for this:
  // opt_out_message: 1
};

export const getAllowed = (organization, user) => {
  const configable = getConfig("OWNER_CONFIGURABLE", organization);
  const allowed = {};
  ((configable && configable.split(",")) || []).forEach(c => {
    allowed[c] = 1;
  });
  if (user.is_superadmin) {
    allowed["ALL"] = 1;
  }
  return Object.keys(allowed.ALL ? ownerConfigurable : allowed);
};

export const getSideboxChoices = organization => {
  // should match defaults with src/extensions/texter-sideboxes/components.js
  const sideboxes = getConfig("TEXTER_SIDEBOXES", organization);
  const sideboxChoices =
    sideboxes === undefined
      ? [
          "celebration-gif",
          "default-dynamicassignment",
          "default-releasecontacts",
          "contact-reference",
          "default-editinitial",
          "tag-contact"
        ]
      : (sideboxes && sideboxes.split(",")) || [];
  return sideboxChoices;
};

const campaignNumbersEnabled = organization => {
  const inventoryEnabled =
    getConfig("EXPERIMENTAL_PHONE_INVENTORY", organization, {
      truthy: true
    }) ||
    getConfig("PHONE_INVENTORY", organization, {
      truthy: true
    });

  return (
    inventoryEnabled &&
    getConfig("EXPERIMENTAL_CAMPAIGN_PHONE_NUMBERS", organization, {
      truthy: true
    })
  );
};

const manualMessagingServicesEnabled = organization =>
  getConfig(
    "EXPERIMENTAL_TWILIO_PER_CAMPAIGN_MESSAGING_SERVICE",
    organization,
    { truthy: true }
  );

export const resolvers = {
  Organization: {
    ...mapFieldsToModel(["id", "name"], Organization),
    campaigns: async (
      organization,
      { cursor, campaignsFilter, sortBy },
      { user }
    ) => {
      await accessRequired(user, organization.id, "SUPERVOLUNTEER", true);
      return getCampaigns(organization.id, cursor, campaignsFilter, sortBy);
    },
    campaignsCount: async (organization, _, { user }) => {
      await accessRequired(user, organization.id, "OWNER", true);
      return r.getCount(
        r
          .knex("campaign")
          .where({ organization_id: organization.id, is_archived: false })
      );
    },
    numTextsInLastDay: async (organization, _, { user }) => {
      await accessRequired(user, organization.id, "OWNER", true);
      return getNumTextsInLastDay(organization.id);
    },
    uuid: async (organization, _, { user }) => {
      await accessRequired(user, organization.id, "SUPERVOLUNTEER");
      return organization.uuid;
    },
    optOuts: async (organization, _, { user }) => {
      await accessRequired(user, organization.id, "ADMIN");
      return r
        .table("opt_out")
        .getAll(organization.id, { index: "organization_id" });
    },
    people: async (organization, { role, campaignId, sortBy }, { user }) => {
      await accessRequired(user, organization.id, "SUPERVOLUNTEER");
      return buildUsersQuery(organization.id, role, { campaignId }, sortBy);
    },
    tags: async (organization, { group }, { user }) => {
      let groupFilter = group;
      try {
        await accessRequired(user, organization.id, "SUPERVOLUNTEER");
      } catch (err) {
        await accessRequired(user, organization.id, "TEXTER");
        groupFilter = "texter-tags";
      }
      return getTags(organization, groupFilter);
    },
    batchPolicies: organization => {
      const batchPolicies = getConfig(
        "DYNAMICASSIGNMENT_BATCHES",
        organization
      );
      return batchPolicies
        ? batchPolicies.split(",")
        : ["finished-replies", "vetted-texters"];
    },
    profileFields: organization =>
      // @todo: standardize on escaped or not once there's an interface.
      typeof getFeatures(organization).profile_fields === "string"
        ? JSON.parse(getFeatures(organization).profile_fields)
        : getFeatures(organization).profile_fields || [],
    availableActions: async (organization, _, { user, loaders }) => {
      await accessRequired(user, organization.id, "SUPERVOLUNTEER");
      const availableHandlers = await getAvailableActionHandlers(
        organization,
        user
      );

      const promises = availableHandlers.map(handler => {
        return getActionChoiceData(handler, organization, user, loaders).then(
          clientChoiceData => {
            return {
              name: handler.name,
              displayName: handler.displayName(),
              instructions: handler.instructions(),
              clientChoiceData
            };
          }
        );
      });

      return Promise.all(promises);
    },
    allowSendAll: organization =>
      Boolean(
        // the first ALLOW_SEND_ALL is NOT per-org
        // to make sure the system administrator has enabled it
        getConfig("ALLOW_SEND_ALL", null, { truthy: 1 }) &&
          getConfig("ALLOW_SEND_ALL", organization, { truthy: 1 }) &&
          getFeatures(organization).ALLOW_SEND_ALL_ENABLED
      ),
    showMedia: organization =>
      getConfig("SHOW_MEDIA", organization, { truthy: 1 }),
    settings: async (organization, _, { user, loaders }) => {
      try {
        await accessRequired(user, organization.id, "OWNER", true);
      } catch (err) {
        return null;
      }
      let messageHandlers = [];
      let actionHandlers = [];
      const features = getFeatures(organization);
      const visibleFeatures = {};
      const unsetFeatures = [];
      getAllowed(organization, user).forEach(f => {
        if (features.hasOwnProperty(f)) {
          visibleFeatures[f] = f.endsWith("_ENCRYPTED")
            ? "<Encrypted>"
            : features[f];
        } else if (getConfig(f)) {
          visibleFeatures[f] = getConfig(f);
        } else {
          visibleFeatures[f] = "";
          unsetFeatures.push(f);
        }
        if (f === "MESSAGE_HANDLERS") {
          const globalMessageHandlers = getConfig("MESSAGE_HANDLERS");
          messageHandlers =
            (globalMessageHandlers && globalMessageHandlers.split(",")) || [];
        } else if (f === "ACTION_HANDLERS") {
          const globalActionHandlers = getConfig("ACTION_HANDLERS");
          actionHandlers =
            (globalActionHandlers && globalActionHandlers.split(",")) || [];
        }
      });

      return {
        messageHandlers,
        actionHandlers,
        unsetFeatures,
        featuresJSON: JSON.stringify(visibleFeatures)
      };
    },
    textingHoursEnforced: organization => organization.texting_hours_enforced,
    optOutMessage: organization =>
      (organization.features &&
      organization.features.indexOf("opt_out_message") !== -1
        ? JSON.parse(organization.features).opt_out_message
        : getConfig("OPT_OUT_MESSAGE")) ||
      "I'm opting you out of texts immediately. Have a great day.",
    textingHoursStart: organization => organization.texting_hours_start,
    textingHoursEnd: organization => organization.texting_hours_end,
    texterUIConfig: async (organization, _, { user }) => {
      try {
        await accessRequired(user, organization.id, "OWNER");
      } catch (caught) {
        return null;
      }

      const options = getConfig("TEXTER_UI_SETTINGS", organization) || null;
      // note this is global, since we need the set that's globally enabled/allowed to choose from
      const sideboxChoices = getSideboxChoices();
      return {
        options,
        sideboxChoices
      };
    },
    cacheable: (org, _, { user }) =>
      //quanery logic.  levels are 0, 1, 2
      r.redis ? (getConfig("REDIS_CONTACT_CACHE", org) ? 2 : 1) : 0,
    twilioAccountSid: async (organization, _, { user }) => {
      try {
        await accessRequired(user, organization.id, "OWNER");
        return organization.features.indexOf("TWILIO_ACCOUNT_SID") !== -1
          ? JSON.parse(organization.features).TWILIO_ACCOUNT_SID
          : null;
      } catch (err) {
        return null;
      }
    },
    twilioAuthToken: async (organization, _, { user }) => {
      try {
        await accessRequired(user, organization.id, "OWNER");
        return JSON.parse(organization.features || "{}")
          .TWILIO_AUTH_TOKEN_ENCRYPTED
          ? "<Encrypted>"
          : null;
      } catch (err) {
        return null;
      }
    },
    twilioMessageServiceSid: async (organization, _, { user }) => {
      try {
        await accessRequired(user, organization.id, "OWNER");
        return organization.features.indexOf("TWILIO_MESSAGE_SERVICE_SID") !==
          -1
          ? JSON.parse(organization.features).TWILIO_MESSAGE_SERVICE_SID
          : null;
      } catch (err) {
        return null;
      }
    },
    fullyConfigured: async organization => {
      const serviceName =
        getConfig("service", organization) || getConfig("DEFAULT_SERVICE");
      if (serviceName === "twilio") {
        const {
          authToken,
          accountSid
        } = await cacheableData.organization.getTwilioAuth(organization);

        let messagingServiceConfigured;
        if (
          manualMessagingServicesEnabled(organization) ||
          campaignNumbersEnabled(organization)
        ) {
          messagingServiceConfigured = true;
        } else {
          messagingServiceConfigured = await cacheableData.organization.getMessageServiceSid(
            organization
          );
        }

        if (!(authToken && accountSid && messagingServiceConfigured)) {
          return false;
        }
      }
      return true;
    },
    vanEnabled: async (organization, _, { user }) => {
      await accessRequired(user, organization.id, "SUPERVOLUNTEER");
      return (
        getConfig("ACTION_HANDLERS", organization, {
          default: ""
        }).includes("ngpvan-action") ||
        getConfig("CONTACT_LOADERS", organization, {
          default: ""
        }).includes("ngpvan") ||
        getConfig("MESSAGE_HANDLERS", organization, {
          default: ""
        }).includes("ngpvan")
      );
    },
    phoneInventoryEnabled: async (organization, _, { user }) => {
      await accessRequired(user, organization.id, "SUPERVOLUNTEER", true);
      return (
        getConfig("EXPERIMENTAL_PHONE_INVENTORY", organization, {
          truthy: true
        }) ||
        getConfig("PHONE_INVENTORY", organization, {
          truthy: true
        })
      );
    },
    campaignPhoneNumbersEnabled: async (organization, _, { user }) => {
      await accessRequired(user, organization.id, "SUPERVOLUNTEER");
      const inventoryEnabled =
        getConfig("EXPERIMENTAL_PHONE_INVENTORY", organization, {
          truthy: true
        }) ||
        getConfig("PHONE_INVENTORY", organization, {
          truthy: true
        });
      const configured =
        inventoryEnabled &&
        getConfig("EXPERIMENTAL_CAMPAIGN_PHONE_NUMBERS", organization, {
          truthy: true
        });
      // check that the incompatible strategies are not enabled
      const manualMsgServiceFeatureEnabled = getConfig(
        "EXPERIMENTAL_TWILIO_PER_CAMPAIGN_MESSAGING_SERVICE",
        organization,
        { truthy: true }
      );
      if (configured && manualMsgServiceFeatureEnabled) {
        throw new Error(
          "Incompatible phone number management features enabled"
        );
      }
      return configured;
    },
    pendingPhoneNumberJobs: async (organization, _, { user }) => {
      await accessRequired(user, organization.id, "ADMIN", true);
      const jobs = await r
        .knex("job_request")
        .where({
          job_type: "buy_phone_numbers",
          organization_id: organization.id
        })
        .orderBy("updated_at", "desc");
      return jobs.map(j => {
        const payload = JSON.parse(j.payload);
        return {
          id: j.id,
          assigned: j.assigned,
          status: j.status,
          resultMessage: j.result_message,
          areaCode: payload.areaCode,
          limit: payload.limit
        };
      });
    },
    phoneNumberCounts: async (organization, _, { user }) => {
      try {
        await accessRequired(user, organization.id, "ADMIN");
      } catch (err) {
        // for SUPERVOLUNTEERS
        return [];
      }
      if (
        !getConfig("EXPERIMENTAL_PHONE_INVENTORY", organization, {
          truthy: true
        })
      ) {
        return [];
      }
      const usAreaCodes = require("us-area-codes");
      const service =
        getConfig("service", organization) || getConfig("DEFAULT_SERVICE");
      const counts = await r
        .knex("owned_phone_number")
        .select(
          "area_code",
          r.knex.raw("COUNT(allocated_to) as allocated_count"),
          r.knex.raw(
            "SUM(CASE WHEN allocated_to IS NULL THEN 1 END) as available_count"
          )
        )
        .where({
          service,
          organization_id: organization.id
        })
        .groupBy("area_code");
      return counts.map(row => ({
        areaCode: row.area_code,
        state: usAreaCodes.get(Number(row.area_code)),
        allocatedCount: Number(row.allocated_count),
        availableCount: Number(row.available_count)
      }));
    }
  }
};

export async function getNumTextsInLastDay(organizationId) {
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const textsInLastDay = r.knex
    .from("message")
    .join(
      "campaign_contact",
      "message.campaign_contact_id",
      "campaign_contact.id"
    )
    .join("campaign", "campaign.id", "campaign_contact.campaign_id")
    .where({ "campaign.organization_id": organizationId })
    .where("message.sent_at", ">=", yesterday);
  const numTexts = await r.getCount(textsInLastDay);
  return numTexts;
}
