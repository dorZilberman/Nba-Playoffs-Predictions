/**
 * Normalize user id from a prediction document (raw ObjectId or populated user).
 */
export function predictionUserId(pred: { userId: unknown }): string {
  const uid = pred.userId
  if (uid == null) return ""
  if (typeof uid === "object" && uid !== null && "_id" in uid) {
    const id = (uid as { _id: { toString: () => string } })._id
    return id?.toString?.() ?? ""
  }
  return String(uid)
}

export function filterPredictionsByPaid<T extends { userId: unknown }>(
  preds: T[],
  paidIds: Set<string> | null
): T[] {
  if (!paidIds) return preds
  return preds.filter((p) => paidIds.has(predictionUserId(p)))
}
