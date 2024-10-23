/**
 * For logging from the frontend/client side, using Rollbar if available.
 * Only nessecary if you want Rollbar logging, otherwise use console.
 */
export const log = {
  error: (err) => {
    if (window.Rollbar) {
      window.Rollbar.error(...err);
    }
    console.log(err);
  }
}
