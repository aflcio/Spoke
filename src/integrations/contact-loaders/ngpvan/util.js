import { getConfig } from "../../../server/api/lib/config";

export const DEFAULT_NGP_VAN_API_BASE_URL = "https://api.securevan.com";

export default class Van {
  static getAuth = (organization, statecode) => {
    let apiKeyName = "NGP_VAN_API_KEY";
    if (statecode) {
      apiKeyName += "_" + statecode;
    }

    const appName = getConfig("NGP_VAN_APP_NAME", organization);
    const apiKey = getConfig(apiKeyName, organization);

    if (!appName || !apiKey) {
      throw new Error(
        `Environment missing NGP_VAN_APP_NAME or ${apiKeyName}`
      );
    }

    const buffer = Buffer.from(`${appName}:${apiKey}|0`);
    return `Basic ${buffer.toString("base64")}`;
  };

  static makeUrl = (pathAndQuery, organization) => {
    const baseUrl =
      getConfig("NGP_VAN_API_BASE_URL", organization) ||
      DEFAULT_NGP_VAN_API_BASE_URL;
    return `${baseUrl}/${pathAndQuery}`;
  };
}
