import { invokeJobFunction } from "../../../workers/job-processes";
import { invokeTaskFunction } from "../../../workers/tasks";
import { r } from "../../../server/models";
import { log as logger } from "../../../lib";

const log = logger.child({category: "job-runners"});

const requireKeys = (event, keys) => {
  for (const key of keys) {
    if (!event[key]) {
      throw new Error(`Missing key '${key}' in event ${event}`);
    }
  }
};

const handleJob = async event => {
  requireKeys(event, ["jobId"]);
  try {
    const job = await r
      .knex("job_request")
      .select("*")
      .where("id", event.jobId)
      .first();
    if (!job) {
      log.error({jobId: event.jobId}, "Job not found");
      return;
    }
    log.info({ job }, "Running job");
    await invokeJobFunction(job);
  } catch (err) {
    // For now suppress Lambda retries by not raising the exception.
    // In the future, we may want to mark jobs as retryable and let Lambda do
    // its thing with exceptions.
    log.error({ event: "handleJob", err }, "Caught exception while processing job");
  }
};

const handleTask = async (event, contextVars) => {
  requireKeys(event, ["taskName", "payload"]);
  const { taskName, payload } = event;
  log.info({ event: "handleTask", taskName, payload}, "Running task");
  try {
    await invokeTaskFunction(taskName, payload, contextVars);
  } catch (err) {
    // For now suppress Lambda retries by not raising the exception.
    // In the future, we may want to mark jobs as retryable and let Lambda do
    // its thing with exceptions.
    log.error({ event: "handleTask", err }, "Caught exception while processing task");
  }
};

exports.handler = async (event, context) => {
  log.info({ eventData: event }, "Received event");
  requireKeys(event, ["type"]);

  if (event.type === "JOB") {
    await handleJob(event);
  } else if (event.type === "TASK") {
    await handleTask(event, {
      remainingMilliseconds: () =>
        context && context.getRemainingTimeInMillis
          ? context.getRemainingTimeInMillis()
          : 5 * 60 * 1000
    });
  } else {
    throw new Error(`Unknown event type: ${event.type}`);
  }
};
