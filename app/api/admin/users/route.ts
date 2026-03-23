import { NextResponse } from "next/server"
import { requireAdmin } from "@/app/lib/utils/auth"
import dbConnect from "@/app/lib/db"
import User from "@/app/lib/models/User"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await requireAdmin()
    await dbConnect()

    const users = await User.find({})
      .select("_id email name isAdmin hasPayed createdAt")
      .sort({ name: 1 })
      .lean()

    const payload = users.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      name: u.name,
      isAdmin: Boolean(u.isAdmin),
      hasPayed: Boolean(u.hasPayed),
      createdAt:
        u.createdAt != null ? new Date(u.createdAt as Date).toISOString() : null,
    }))

    return NextResponse.json(payload)
  } catch (error) {
    console.error("Error listing users:", error)
    return NextResponse.json(
      { error: "Failed to list users" },
      { status: 500 }
    )
  }
}
