import { v2 as cloudinary } from "cloudinary";
import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import ErrorHandlers from "../utils/ErrorHandler";
import { createCourse } from "../services/courses.service";
import prisma from "../libs/prisma";

export const uploadCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;
      if (thumbnail) {
        const mycloud = await cloudinary.uploader.upload(thumbnail, {
          folders: "courses",
        });

        data.thumbnail = {
          public_id: mycloud.public_id,
          url: mycloud.secure_url,
        };

        const course = createCourse(data);
        return res.status(201).json({
          success: true,
          course,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 500));
    }
  }
);

export const editCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;

      const courseId = req.params.courseId;
      const course = await prisma.courses.findFirst({
        where: {
          id: courseId,
        },
      });
      if (thumbnail && course) {
        await cloudinary.uploader.destroy(course?.thumbnail.public_id);
        const mycloud = await cloudinary.uploader.upload(thumbnail, {
          folders: "courses",
        });

        data.thumbnail = {
          public_id: mycloud.public_id,
          url: mycloud.secure_url,
        };
      }

      const newCourse = await prisma.courses.update({
        where: {
          id: courseId,
        },
        data,
      });

      return res.status(200).json({
        success: true,
        course: newCourse,
      });
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 500));
    }
  }
);

export const getSingleCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.courseId;
      const course = await prisma.courses.findFirst({
        where: {
          id: courseId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          thumbnail: true,
          price: true,
          demoUrl: true,
          benefits: true,
          courseData: {
            select: {
              videoLength: true,
              description: true,
              title: true,
              videoPlayer: true,
              videoSection: true,
              videoThumbnail: true,
              questions: false,
              link: false,
              suggestion: false,
              videoUrl: false,
            },
          },
          estimatedPrice: true,
          levels: true,
          prerequisites: true,
          purchased: true,
          ratings: true,
          reviews: true,
          tags: true,
        },
      });
      return res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 500));
    }
  }
);
