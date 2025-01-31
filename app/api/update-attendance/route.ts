import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const { id, status, reason, standard, className } = await req.json();
    console.log(id, status, reason);
    console.log("std", standard);
    console.log("class", className);

    const cacheKey = `attendance:${standard}:${className}`;

    // Validate input
    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ensure status is either 'P' or 'A'
    if (status !== "P" && status !== "A") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Convert id to integer
    const attendanceId = Number.parseInt(id, 10);
    if (isNaN(attendanceId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // Update the attendance record
    const result = await prisma.attendance.update({
      where: {
        id: attendanceId,
      },
      data: {
        status: status,
        reason: reason,
      },
    });

    console.log("Successfully updated:", result);

    await redis.del(cacheKey);

    return NextResponse.json({
      message: "Attendance updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error updating attendance:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
