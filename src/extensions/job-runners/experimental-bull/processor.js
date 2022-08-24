import { invokeJobFunction } from "../../../workers/job-processes";
import { invokeTaskFunction } from "../../../workers/tasks";
import { r } from "../../../server/models";
import log from "../../../server/log";

import { jobQueue, taskQueue } from "./queues";

taskQueue.process(async bullJob => {
  log.debug({
    category: 'bull',
    event: 'taskQueue.process',
    bullJob,
    queue: null
  }, 'Processing bull job');
  const { taskName, payload } = bullJob.data;
  await invokeTaskFunction(taskName, payload);
});

jobQueue.process(async bullJob => {
  log.debug({
    category: 'bull',
    event: 'jobQueue.process',
    bullJob,
    queue: null
  }, 'Processing bull job');
  const { jobId } = bullJob.data;
  const job = await r
    .knex("job_request")
    .select("*")
    .where("id", jobId)
    .first();
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }
  await invokeJobFunction(job);
});
