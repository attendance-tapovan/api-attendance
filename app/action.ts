"use server";

export const getStudent = async (standard: string, classId: string) => {
     console.log(standard, classId);
   
     const data = await fetch(
       `https://tapovanmarks.vercel.app/api/students?standard=${standard}&class=${classId}`
     );
     const datas = await data.json();
   
     return datas;
   };