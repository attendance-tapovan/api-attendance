import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import prisma from "@/lib/prisma"


export async function POST(request: NextRequest) {
  try {
    const { date, reason } = await request.json()

    if (!date || !reason) {
      return NextResponse.json({ error: "Date and reason are required" }, { status: 400 })
    }

    const holiday = await prisma.holiday.create({
      data: {
        date: new Date(date),
        reason,
      },
    })

    return NextResponse.json(holiday)
  } catch (error) {
    console.error("Error adding holiday:", error)
    return NextResponse.json({ error: "Failed to add holiday" }, { status: 500 })
  }
}

