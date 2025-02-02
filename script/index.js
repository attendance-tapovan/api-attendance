import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seed() {
  try {
    console.log("Seeding data...");

    await prisma.attendance.deleteMany({});
    console.log("Deleted all attendance records");
  } catch (error) {
    console.log("Error seeding data: ", error);
  }
}

seed();
