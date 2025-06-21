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

    console.log("start", start);
    console.log("end", end);
    if (!start || !end || isNaN(Number(start)) || isNaN(Number(end))) {
      return NextResponse.json(
        { error: "Invalid startDate or endDate parameters" },
        { status: 400 }
      );
    }

    // Convert timestamps to Date objects, set time to midnight, and add one day
    const startDate = new Date(Number(start));
    const endDate = new Date(Number(end));

    // Set time to midnight (00:00:00)
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(0, 0, 0, 0);

    // Add one day to both dates

    console.log("startDate", startDate);
    console.log("endDate", endDate);

    //date time make zero set

    // Fetch absent students for the specified month and year
    const absentRecords = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: "A",
      },
      // Remove the orderBy clause here as we'll sort manually
    });

    // Extract unique student IDs
    const studentIds = [
      ...new Set(absentRecords.map((record) => record.studentId)),
    ];

    // Fetch all required student data in a single API call
    const studentsData = await fetchStudentsData(studentIds);

    const absentStudents = absentRecords.map((record) => {
      const studentData = studentsData[record.studentId] || {};
      return {
        id: record.id,
        date: record.date.toISOString(),
        studentId: record.studentId,
        rollNo: studentData.rollNo || "N/A",
        name: studentData.name || "Unknown",
        standard: studentData.currentStandard || "N/A",
        class: studentData.currentClass || "N/A",
        reason: record.reason,
      };
    });

    // Custom sorting function
    const sortAbsentStudents = (a: any, b: any) => {
      // Convert standard to number if possible, otherwise use string
      const standardA = isNaN(Number(a.standard))
        ? a.standard
        : Number(a.standard);
      const standardB = isNaN(Number(b.standard))
        ? b.standard
        : Number(b.standard);

      // Sort by standard
      if (standardA !== standardB) {
        return standardA < standardB ? -1 : 1;
      }

      // If standards are the same, sort by class
      return a.class.localeCompare(b.class);
    };

    // Apply the custom sorting
    absentStudents.sort(sortAbsentStudents);

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
