import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { getStudent } from "@/app/action";
import { redis } from "@/lib/redis";

interface AttendanceData {
  date: string;
  id: string;
  standard: string;
  class: string;
  attendance: Array<{
    studentId: number;
    status: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const data: AttendanceData = await request.json();

    if (!data || typeof data !== "object") {
      console.error("Invalid data received:", data);
      return NextResponse.json(
        { success: false, error: "Invalid data received" },
        { status: 400 }
      );
    }

    const { date, standard, class: classParam, attendance } = data;
    console.log("date", date);

    if (!date || !standard || !classParam || !Array.isArray(attendance)) {
      console.error("Missing required fields:", {
        date,
        standard,
        classParam,
        attendance,
      });
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // const parsedDate = new Date(date);
    // if (isNaN(parsedDate.getTime())) {
    //   console.error("Invalid date:", date);
    //   return NextResponse.json(
    //     { success: false, error: "Invalid date format" },
    //     { status: 400 }
    //   );
    // }

    // parsedDate.setHours(0, 0, 0, 0);

    const attendanceRecords = attendance.map((record) => ({
      date: new Date(date),
      standard: Number.parseInt(standard),
      class: classParam,
      studentId: record.studentId,
      status: record.status,
    }));

    const result = await prisma.$transaction(
      attendanceRecords.map((record) =>
        prisma.attendance.upsert({
          where: {
            date_studentId: {
              date: record.date,
              studentId: record.studentId,
            },
          },
          update: {
            status: record.status,
            standard: record.standard,
            class: record.class,
          },
          create: record,
        })
      )
    );
    const cacheKey = `attendance:${standard}:${classParam}`;
    await redis.del(cacheKey);

    return NextResponse.json(
      { success: true, message: "Attendance marked successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error marking attendance:", error);

    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      errorMessage = error.message;
    } else if (error && typeof error === "object" && "message" in error) {
      errorMessage = String(error.message);
    } else if (typeof error === "string") {
      errorMessage = error;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, res: NextResponse) {
  console.log("api called");
  const { searchParams } = new URL(req.url);
  const standard = searchParams.get("standard");
  const className = searchParams.get("class");
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  // const cacheKey = `attendance:${standard}:${className}`;

  // Check if the data is already in the cache
  // const cachedData = await redis.get(cacheKey);
  // if (cachedData) {
  //   console.log("Cache hit");
  //   return NextResponse.json(cachedData);
  // }

  if (!standard || !className || !month || !year) {
    return NextResponse.json("missing parameter");
  }

  const startDate = new Date(Number(year), Number(month), 2);
  startDate.setUTCHours(0, 0, 0, 0); 

  const endDate = new Date(Number(year), Number(month) + 1, 1);
  endDate.setUTCHours(0, 0, 0, 0); 

  try {
    const result = await prisma.attendance.findMany({
      where: {
        standard: Number(standard),
        class: className as string,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    console.log("data", result);

    const students = await getStudent(standard as string, className as string);

    // Merge attendance records with student details
    const mergedRecords = result.map((record) => {
      const student = students.find(
        (s: { id: number; name: string; rollNo: string }) =>
          s.id === Number(record.studentId)
      );

      return {
        id: record.id, // ✅ Pass Attendance ID
        studentId: record.studentId, // ✅ Pass Student ID
        studentName: student ? student.name : "Unknown Student",
        rollNo: student ? student.rollNo : "Unknown Roll No",
        date: record.date,
        status: record.status,
        reason: record.reason,
      };
    });

    // Cache the data for future requests
    // await redis.set(cacheKey, JSON.stringify(mergedRecords), { ex: 864000 }); // 10 days cache

    return NextResponse.json(mergedRecords);
  } catch (error) {
    console.error("Error fetching attendance data:", error);
    return NextResponse.error();
  } finally {
    await prisma.$disconnect();
  }
}
