import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

async function fetchStudentsData(studentIds: number[]) {
  try {
    const response = await fetch(
      `https://tapovanmarks.vercel.app/api/students/batch?ids=${studentIds.join(",")}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch student data`);
    }
    const students = await response.json();
    return students.reduce((acc: Record<number, any>, student: any) => {
      acc[student.id] = student;
      return acc;
    }, {});
  } catch (error) {
    console.error(`Error fetching student data:`, error);
    return {};
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get("startDate") || "";
    const end = searchParams.get("endDate") || "";
    const std = searchParams.get("standard") || "";
    const className = searchParams.get("className") || "";

    if (!start || !end || isNaN(Number(start)) || isNaN(Number(end))) {
      return NextResponse.json(
        { error: "Invalid startDate or endDate parameters" },
        { status: 400 }
      );
    }

    const startDate = new Date(Number(start));
    const endDate = new Date(Number(end));

    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(0, 0, 0, 0);

    // Build dynamic where condition
    const whereClause: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: "A",
    };

    if (std) {
      whereClause.standard = Number(std);
    }

    if (className) {
      whereClause.class = className;
    }

    const absentRecords = await prisma.attendance.findMany({
      where: whereClause,
    });

    const absentStudents = absentRecords.map((record) => ({
      id: record.id,
      date: record.date.toISOString(),
      studentId: record.studentId,
      standard: record.standard,
      class: record.class,
      reason: record.reason,
    }));

    // Sorting
    absentStudents.sort((a: any, b: any) => {
      if (a.standard !== b.standard) {
        return a.standard - b.standard;
      }
      return a.class.localeCompare(b.class);
    });

    return NextResponse.json(absentStudents);
  } catch (error) {
    console.error("Error fetching absent students:", error);
    return NextResponse.json(
      { error: "Failed to fetch absent students" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, reason } = body;

    if (!studentId || reason === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const updatedAttendance = await prisma.attendance.update({
      where: {
        id: studentId,
      },
      data: {
        reason,
      },
    });

    return NextResponse.json(updatedAttendance);
  } catch (error) {
    console.error("Error updating absence reason:", error);
    return NextResponse.json(
      { error: "Failed to update absence reason" },
      { status: 500 }
    );
  }
}
