import { GraphQLError } from "graphql";

import { r, cacheableData } from "../../models";
import { hasRole, log } from "../../../lib";
import { getConfig } from "../lib/config";
import telemetry from "../../telemetry";
import { SpokeError } from "../errors";

const INVALID_JOIN = () => {
  return new GraphQLError("Invalid join request", {
    extensions: {
      code: 'INVALID_JOIN',
    },
  });
};

// eslint-disable-next-line import/prefer-default-export
export const joinOrganization = async (
  _,
  { organizationUuid, campaignId, queryParams },
  { user }
) => {
  let organization;
  let campaign;
  let userOrg;
  if (campaignId) {
    campaign = await r
      .knex("campaign")
      .where({
        id: campaignId,
        join_token: organizationUuid,
        use_dynamic_assignment: true,
        is_started: true
      })
      .first();
    if (campaign) {
      organization = await cacheableData.organization.load(
        campaign.organization_id
      );
      const maxTextersPerCampaign = getConfig(
        "MAX_TEXTERS_PER_CAMPAIGN",
        organization
      );
      if (maxTextersPerCampaign) {
        const campaignTexterCount = await r.getCount(
          r.knex("assignment").where("campaign_id", campaignId)
        );
        if (campaignTexterCount >= maxTextersPerCampaign) {
          throw new SpokeError("Sorry, this campaign has too many texters already.", {
            extensions: {
              code: 'FAILEDJOIN_TOOMANYTEXTERS',
            },
          });
        }
      }
    } else {
      throw INVALID_JOIN();
    }
  } else {
    organization = await r
      .knex("organization")
      .where("uuid", organizationUuid)
      .first();
  }
  if (!organization) {
    throw INVALID_JOIN();
  }
  userOrg = await r
    .knex("user_organization")
    .where({
      user_id: user.id.toString(),
      organization_id: organization.id.toString()
    })
    .select("role")
    .first();
  if (!userOrg) {
    if (
      campaign &&
      getConfig("CAMPAIGN_INVITES_CURRENT_USERS_ONLY", organization)
    ) {
      // only organization joins are valid with this setting
      throw INVALID_JOIN();
    }
    try {
      await r.knex("user_organization").insert({
        user_id: user.id,
        organization_id: organization.id,
        role: "TEXTER"
      });
      await telemetry.reportEvent("User Join Organization", {
        count: 1,
        organizationId: organization.id
      });
    } catch (err) {
      // Unexpected errors
      log.error({category: "mutations", event: "joinOrganization", err});
      throw new GraphQLError("Error on saving user-organization connection");
    }
    await cacheableData.user.clearUser(user.id);
  }
  if (campaign && (!userOrg || hasRole("TEXTER", [userOrg.role]))) {
    const assignment = await r
      .knex("assignment")
      .where({
        campaign_id: campaign.id,
        user_id: user.id
      })
      .first();
    if (!assignment) {
      const maxContacts = getConfig("MAX_CONTACTS_PER_TEXTER", organization);
      await r.knex("assignment").insert({
        user_id: user.id,
        campaign_id: campaign.id,
        max_contacts: maxContacts ? Number(maxContacts) : null
      });
      await telemetry.reportEvent("User Join Assignment", {
        count: 1,
        campaignId: campaign.id,
        organizationId: organization.id
      });
    }
  }
  return organization;
};
