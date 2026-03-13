import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/app/lib/utils/auth"
import dbConnect from "@/app/lib/db"
import PlayInGame from "@/app/lib/models/PlayInGame"
import { z } from "zod"

const updatePlayInGameSchema = z.object({
  gameType: z
    .enum([
      "east-7-8",
      "east-9-10",
      "west-7-8",
      "west-9-10",
      "east-final",
      "west-final",
    ])
    .optional(),
  team1: z.string().min(1).optional(),
  team2: z.string().min(1).optional(),
  startTime: z.string().datetime().optional(),
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
    const validated = updatePlayInGameSchema.parse(body)

    const updateData: any = { ...validated }
    if (validated.startTime) {
      updateData.startTime = new Date(validated.startTime)
    }

    const game = await PlayInGame.findByIdAndUpdate(
      params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    )

    if (!game) {
      return NextResponse.json({ error: "Play-In game not found" }, { status: 404 })
    }

    return NextResponse.json(game)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating Play-In game:", error)
    return NextResponse.json(
      { error: "Failed to update Play-In game" },
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

    const game = await PlayInGame.findByIdAndDelete(params.id)

    if (!game) {
      return NextResponse.json(
        { error: "Play-In game not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting Play-In game:", error)
    return NextResponse.json(
      { error: "Failed to delete Play-In game" },
      { status: 500 }
    )
  }
}
