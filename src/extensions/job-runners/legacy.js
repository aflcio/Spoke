import { saveJob } from "./helpers";
import { invokeJobFunction } from "../../workers/job-processes";
import { invokeTaskFunction } from "../../workers/tasks";
import log from "../../server/log";

const JOBS_SAME_PROCESS = !!(
  process.env.JOBS_SAME_PROCESS || global.JOBS_SAME_PROCESS
);
const JOBS_SYNC = !!(process.env.JOBS_SYNC || global.JOBS_SYNC);
const TASKS_SYNC = !!(process.env.TASKS_SYNC || global.TASKS_SYNC);

export const fullyConfigured = () => true;

export const dispatchJob = async (
  { queue_name, locks_queue, job_type, organization_id, campaign_id, payload },
  opts = {}
) => {
  const job = await saveJob(
    {
      assigned: JOBS_SAME_PROCESS,
      locks_queue,
      job_type,
      organization_id,
      campaign_id,
      queue_name,
      payload
    },
    opts.trx
  );

  if (JOBS_SAME_PROCESS) {
    if (JOBS_SYNC) {
      await invokeJobFunction(job);
    } else {
      // Intentionally un-awaited promise
      invokeJobFunction(job).catch(err =>
        log.error({category: 'job', job, err}, "Job failed")
      );
    }
  }
  return job;
  // default: just save the job
};

// Tasks always run in the same process
export const dispatchTask = async (taskName, payload) => {
  if (TASKS_SYNC) {
    await invokeTaskFunction(taskName, payload);
  } else {
    // fire and forget
    invokeTaskFunction(taskName, payload).catch(err =>
      log.error({category: 'task', taskName, err}, "Task failed")
    );
  }
};
