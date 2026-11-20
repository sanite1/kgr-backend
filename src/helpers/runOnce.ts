import mongoose from "mongoose";
import Counter from "../models/Counter";
import logger from "../config/logger";
import { nextSequence } from "./sequence";

// One-time startup jobs (access grants and the like). Every function
// instance boots cold on Vercel, so instead of each job doing its own
// counter write on every boot, the jobs are collected and checked with
// a single read. Only a job whose counter is missing claims it (the
// atomic nextSequence still guards against two instances racing) and
// runs. Jobs registered at import time all land in one batch.

type Job = { key: string; run: () => Promise<void> };
const queue: Job[] = [];
let scheduled = false;

const flush = async () => {
  scheduled = false;
  const jobs = queue.splice(0);
  if (jobs.length === 0) return;
  const done = await Counter.find({ key: { $in: jobs.map((j) => j.key) } })
    .select("key")
    .lean();
  const doneKeys = new Set(done.map((d) => d.key));
  for (const job of jobs) {
    if (doneKeys.has(job.key)) continue;
    try {
      if ((await nextSequence(job.key, 1)) !== 1) continue;
      await job.run();
    } catch (error) {
      logger.error(`One-time job ${job.key} failed`, {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
};

const schedule = () => {
  if (scheduled) return;
  scheduled = true;
  const go = () => setImmediate(() => void flush());
  if (mongoose.connection.readyState === 1) go();
  else mongoose.connection.once("connected", go);
};

export const runOnce = (key: string, run: () => Promise<void>) => {
  queue.push({ key, run });
  schedule();
};
