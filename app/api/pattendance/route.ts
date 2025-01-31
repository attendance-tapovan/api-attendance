import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { error } from "console";

export async function GET(req: NextRequest, res: NextResponse) {
     console.log("api called");
     const { searchParams } = new URL(req.url);
     const standard = searchParams.get("standard");
     const className = searchParams.get("class");
     const month = searchParams.get("month");
     const year = searchParams.get("year");
   
     if (!standard || !className || !month || !year) {
       return NextResponse.json("missing parameter");
     }
   
     const startDate = new Date(Number(year), Number(month), 1);
     const endDate = new Date(Number(year), Number(month) + 1, 0);
   
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
       return NextResponse.json(result);
     }catch(e:any){
          throw new Error(e)
     }
}
   