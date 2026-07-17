import { waitUntil } from "@vercel/functions";

// Fire-and-forget that survives serverless. On Vercel, waitUntil keeps
// the function alive until the task settles (the response still returns
// immediately). On a persistent host it is a no-op and the task simply
// runs in the background as before.
export const inBackground = (task: Promise<unknown>): void => {
  try {
    waitUntil(task);
  } catch {
    // not running on a platform that provides a request context;
    // the promise still executes normally
  }
};
