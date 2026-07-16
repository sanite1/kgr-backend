import Counter from "../models/Counter";

// Atomically returns the next value of a named sequence, creating it at
// `start` on first use. Safe under concurrent issuance.
export const nextSequence = async (
  key: string,
  start: number,
): Promise<number> => {
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { value: 1 } },
    { new: true },
  );
  if (doc) return doc.value;
  try {
    const created = await Counter.create({ key, value: start });
    return created.value;
  } catch {
    // another request created it in the same instant; increment normally
    const retry = await Counter.findOneAndUpdate(
      { key },
      { $inc: { value: 1 } },
      { new: true },
    );
    if (!retry) throw new Error(`Counter ${key} unavailable`);
    return retry.value;
  }
};
