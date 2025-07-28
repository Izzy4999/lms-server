import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import ErrorHandlers from "../utils/ErrorHandler";
import { createCourse, getAllCoursesService } from "../services/courses.service";
import prisma from "../libs/prisma";
import { redis } from "../libs/redis";
import Joi from "joi";
import { validateBody } from "../utils/bcrypt";
import { v4 as uuidv4 } from "uuid";
import { PrismaUser } from "../types/user.types";
import { Prisma } from "@prisma/client";
import { JsonObject } from "@prisma/client/runtime/library";
import ejs from "ejs";
import sendMail from "../utils/sendMail";

// schemas
const addQuestionSchema = Joi.object({
  question: Joi.string().required(),
  contentId: Joi.string().required(),
  courseId: Joi.string().required(),
});

const answerSchema = Joi.object({
  answer: Joi.string().required(),
  contentId: Joi.string().required(),
  questionId: Joi.string().required(),
  courseId: Joi.string().required(),
});

const reviewSchema = Joi.object({
  review: Joi.string().required(),
  rating: Joi.number().required(),
  userId: Joi.string().required(),
});

const reviewReplySchema = Joi.object({
  comment: Joi.string().required(),
  courseId: Joi.string().required(),
  reviewId: Joi.string().required(),
});

// controllers

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

      const isCacheexist = await redis.get(courseId);

      if (isCacheexist) {
        const course = JSON.parse(isCacheexist);
        return res.status(200).json({
          success: true,
          course: course,
        });
      }
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

      await redis.set(courseId, JSON.stringify(course));
      return res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 500));
    }
  }
);

export const getAllCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isCacheexist = await redis.get("allCourses");
      if (isCacheexist) {
        const courses = JSON.parse(isCacheexist);
        return res.status(200).json({
          success: true,
          course: courses,
        });
      }
      const course = await prisma.courses.findMany({
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

      await redis.set("allCourses", JSON.stringify(course));

      return res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 500));
    }
  }
);

export const getCourseByUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;
      const courseid = req.params.course;

      const courseExists = userCourseList?.find(
        (course) => course.courseId === courseid
      );

      if (!courseExists) {
        return next(
          new ErrorHandlers("You are not eligible to access this course", 404)
        );
      }

      const course = await prisma.courses.findFirst({
        where: {
          id: courseid,
        },
      });

      const content = course?.courseData;

      return res.status(200).json({
        success: true,
        content,
      });
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 500));
    }
  }
);

export const addQuestion = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      validateBody(addQuestionSchema, req.body, res);

      const { question, courseId, contentId } = req.body;
      const course = await prisma.courses.findFirst({
        where: {
          id: courseId,
        },
      });

      const courseContent = course?.courseData.find(
        (item) => item.id === contentId
      );

      if (!courseContent) {
        return next(new ErrorHandlers("Invalid content id", 404));
      }

      const newQuestion = {
        id: uuidv4(),
        user: req.user as any,
        question: question as string,
        questionReplies: [],
      };

      const newCourse = await prisma.courses.update({
        where: {
          id: courseId,
        },
        data: {
          courseData: {
            updateMany: {
              where: {
                id: contentId,
              },
              data: {
                questions: {
                  push: newQuestion,
                },
              },
            },
          },
        },
      });

      await prisma.notification.create({
        data: {
          userId: req.user?.id as string,
          title: "New question",
          message: `You have new order from ${courseContent.title}`,
          status: "",
        },
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

export const addAnswer = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      validateBody(answerSchema, req.body, res);
      const { answer, contentId, courseId, questionId } = req.body;
      const course = await prisma.courses.findFirst({
        where: {
          id: courseId,
        },
      });

      const courseContent = course?.courseData.find(
        (item) => item.id === contentId
      );
      if (!courseContent) {
        return next(new ErrorHandlers("Invalid content id", 404));
      }

      const question = courseContent.questions.find(
        (item) => item.id === questionId
      );
      if (!question) {
        return next(new ErrorHandlers("Invalid quesstion id", 404));
      }

      const newAnswer = {
        id: uuidv4(),
        user: req.user as any,
        answer: answer as string,
      };

      const newCourse = await prisma.courses.update({
        where: {
          id: courseId,
        },
        data: {
          courseData: {
            updateMany: {
              where: {
                id: contentId,
              },
              data: {
                questions: {
                  updateMany: {
                    where: {
                      id: questionId,
                    },
                    data: {
                      questionReplies: {
                        push: newAnswer,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (req.user?.id === (question.user as JsonObject)?.id) {
        await prisma.notification.create({
          data: {
            userId: req.user?.id as string,
            title: "New question reply recieved",
            message: `You have new order from ${courseContent.title}`,
            status: "",
          },
        });
      } else {
        const data = {
          name: (question.user as any)?.name,
          title: courseContent.title,
        };

        // const html = ejs.renderFile(
        //   path.join(__dirname, "../mails/activation-mail.ejs"),
        //   data
        // );

        try {
          await sendMail({
            email: (question.user as JsonObject)?.email as string,
            data,
            subject: "Question Reply",
            template: "question-reply.ejs",
          });
        } catch (error: any) {
          return next(new ErrorHandlers(error.message, 500));
        }

        return res.status(200).json({
          success: true,
          course: newCourse,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 500));
    }
  }
);

export const addReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      validateBody(reviewSchema, req.body, res);

      const { review, rating, userId } = req.body;
      const userCourseList = req.user?.courses;
      const courseId = req.params.id;

      const courseExists = userCourseList?.find(
        (course) => course.courseId === courseId.toString()
      );

      if (!courseExists) {
        return next(
          new ErrorHandlers("You are not eligible to access this course", 404)
        );
      }

      const course = await prisma.courses.findFirst({
        where: {
          id: courseId,
        },
      });

      if (!course) {
        return next(new ErrorHandlers("course not found", 404));
      }

      const reviewData: any = {
        id: uuidv4(),
        user: req.user,
        comment: review,
        rating,
      };

      const newCourse = await prisma.courses.update({
        where: {
          id: courseId,
        },
        data: {
          reviews: {
            push: reviewData,
          },
        },
      });

      let avg = 0;
      newCourse.reviews.forEach((rev) => {
        avg += rev.rating;
      });

      await prisma.courses.update({
        where: {
          id: courseId,
        },
        data: {
          ratings: avg / newCourse.reviews.length,
        },
      });

      const notification = {
        title: "New Review Recieved",
        message: `${req.user?.name} has given a review in ${newCourse.name}`,
      };

      return res.status(200).json({
        success: true,
        course: newCourse,
      });
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 500));
    }
  }
);

export const addReplyToReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      validateBody(reviewReplySchema, req.body, res);

      const { comment, courseId, reviewId } = req.body;

      const course = await prisma.courses.findFirst({
        where: {
          id: courseId,
        },
      });

      if (!course) {
        return next(new ErrorHandlers("course not found", 404));
      }

      const review = course.reviews.find((rev) => rev.id === reviewId);
      if (!review) {
        return next(new ErrorHandlers("review not found", 404));
      }

      const replyData: any = {
        id: uuidv4(),
        user: req.user,
        comment: comment,
      };

      const newCourse = await prisma.courses.update({
        where: {
          id: courseId,
        },
        data: {
          reviews: {
            updateMany: {
              where: {
                id: reviewId,
              },
              data: {
                commentReplies: {
                  push: replyData,
                },
              },
            },
          },
        },
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

export const getAllCourses = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courses = await getAllCoursesService();
      return res.status(200).json({
        success: true,
        courses,
      });
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 500));
    }
  }
);