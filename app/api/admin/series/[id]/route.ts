import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/app/lib/utils/auth"
import dbConnect from "@/app/lib/db"
import Series from "@/app/lib/models/Series"
import { z } from "zod"

const updateSeriesSchema = z.object({
  round: z.enum(["first", "second", "conference", "finals"]).optional(),
  conference: z.enum(["east", "west"]).nullable().optional(),
  team1: z.string().min(1).optional(),
  team2: z.string().min(1).optional(),
  team1Seed: z.coerce.number().min(1).max(8).optional(),
  team2Seed: z.coerce.number().min(1).max(8).optional(),
  startTime: z.string().datetime().optional(),
  currentScore: z
    .object({
      team1Wins: z.number().min(0).max(4),
      team2Wins: z.number().min(0).max(4),
    })
    .optional(),
  winner: z.string().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    await dbConnect()

    const body = await request.json()
    const validated = updateSeriesSchema.parse(body)

    const updateData: any = { ...validated }
    if (validated.startTime) {
      updateData.startTime = new Date(validated.startTime)
    }

    const series = await Series.findByIdAndUpdate(
      params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    )

    if (!series) {
      return NextResponse.json({ error: "Series not found" }, { status: 404 })
    }

    return NextResponse.json(series)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating series:", error)
    return NextResponse.json(
      { error: "Failed to update series" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    await dbConnect()

    const series = await Series.findByIdAndDelete(params.id)

    if (!series) {
      return NextResponse.json({ error: "Series not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting series:", error)
    return NextResponse.json(
      { error: "Failed to delete series" },
      { status: 500 }
    )
  }
}
