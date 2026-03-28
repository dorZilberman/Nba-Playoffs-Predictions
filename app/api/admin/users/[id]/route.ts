import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import { requireAdmin } from "@/app/lib/utils/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import User from "@/app/lib/models/User"
import { z } from "zod"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  hasPayed: z.boolean(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return runApiRoute("PATCH /api/admin/users/[id]", request, async () => {
  try {
    await requireAdmin()
    await dbConnect()

    const { id } = params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 })
    }

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { hasPayed: parsed.data.hasPayed } },
      { new: true, runValidators: true }
    )
      .select("_id email name isAdmin hasPayed createdAt")
      .lean()

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      isAdmin: Boolean(user.isAdmin),
      hasPayed: Boolean(user.hasPayed),
      createdAt:
        user.createdAt != null
          ? new Date(user.createdAt as Date).toISOString()
          : null,
    })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
  })
}
