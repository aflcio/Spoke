import { r } from "../src/server/models";
import Papa from "papaparse";
import fs from "fs";

const config = Buffer.from(
  process.env.AUTO_OPTOUT_REGEX_LIST_BASE64,
  "base64"
).toString();
const regexList = JSON.parse(config || "[]");

const checkMsg = (msg, matcher) => {
  const re = new RegExp(matcher.regex, "i");
  const match = String(msg.text).match(re);
  if (match) {
    return {
      match: match[0],
      reason: matcher.reason
    };
  }
};

const findMatches = (matches, msg) => {
  const msgMatches = regexList.reduce((acc, matcher) => {
    const match = checkMsg(msg, matcher);
    if (match) {
      acc.push(match);
    }
    return acc;
  }, []);

  if (msgMatches.length && msgMatches[0].reason !== "skip") {
    matches.push({
      msgId: msg.id,
      contactId: msg.campaign_contact_id,
      reason: msgMatches[0].reason,
      match: msgMatches[0].match,
      text: msg.text
    });
  }
  return matches;
};

async function main() {
  const msgs = await await r
    .knex("message")
    .where("is_from_contact", true)
    .select();

  const matches = msgs.reduce(findMatches, []);
  console.log("Messages: ", msgs.length);
  console.log("Matches: ", matches.length);

  const csv = Papa.unparse(matches);

  fs.writeFileSync("matches.csv", csv);
}

main().then(() => process.exit());
