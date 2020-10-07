import { loadMessages } from "./jobs";
import fs from "fs";
import log from "../server/log";

const csvFilename = process.argv.filter(f => /\.csv/.test(f))[0];

new Promise((resolve, reject) => {
  fs.readFile(csvFilename, "utf8", function(err, contents) {
    loadMessages(contents)
      .then(msgs => {
        resolve(msgs);
        process.exit();
      })
      .catch(err => {
        log.info(err);
        reject(err);
        log.info("Error", err);
        process.exit();
      });
  });
});
