import { log } from "../../lib";

function getJobRunner() {
  const name = process.env.JOB_RUNNER || "legacy";
  let runner;
  try {
    // eslint-disable-next-line global-require
    runner = require(`./${name}`);
  } catch (e) {
    throw new Error(`Job runner ${name} not found`);
  }
  log.info({category: 'job-runners', name}, "Successfully loaded job runner");
  if (!runner.fullyConfigured()) {
    throw new Error(`Job runner ${name} is not fully configured`);
  }
  return runner;
}

export const jobRunner = getJobRunner();
