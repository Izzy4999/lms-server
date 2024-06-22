import prisma from "../libs/prisma";
import { CatchAsyncError } from "../middleware/catchAsyncError";

export const createCourse = async (data: any) => {
  const course = await prisma.courses.create({
    data: {
      ...data,
    },
  });

  return course;
};
