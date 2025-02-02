import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

async function fetchStudentsData(studentIds: number[]) {
  try {
    const response = await fetch(
      `http://localhost:3000/api/students/batch?ids=${studentIds.join(",")}`
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
    const month = Number.parseInt(searchParams.get("month") || "");
    const year = Number.parseInt(searchParams.get("year") || "");

    if (isNaN(month) || isNaN(year)) {
      return NextResponse.json(
        { error: "Invalid month or year parameters" },
        { status: 400 }
      );
    }

    const startDate = new Date(Number(year), Number(month), 2);
    startDate.setUTCHours(0, 0, 0, 0); // Set absolute UTC midnight

    const endDate = new Date(Number(year), Number(month) + 1, 1);
    endDate.setUTCHours(0, 0, 0, 0); // Set absolute UTC midnight

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
