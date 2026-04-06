import mongoose from "mongoose"
import User from "@/app/lib/models/User"
import {
  USER_NOT_IN_DB_CODE,
  USER_NOT_IN_DB_MESSAGE,
} from "@/app/lib/userNotInDbConstants"

export { USER_NOT_IN_DB_CODE, USER_NOT_IN_DB_MESSAGE }

/** Session user id must still exist in the User collection (e.g. after DB reset). */
export async function userExistsInDb(userId: string): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return false
  const doc = await User.findById(userId).select("_id").lean()
  return doc != null
}
