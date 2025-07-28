import ejs from "ejs";
import path from "path";
import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import ErrorHandlers from "../utils/ErrorHandler";
import Joi from "joi";
import { validateBody } from "../utils/bcrypt";
import prisma from "../libs/prisma";
import { createOrderService, getAllOrderService } from "../services/order.service";
import sendMail from "../utils/sendMail";

const orderShema = Joi.object({
  courseId: Joi.string().required(),
  payment_info: Joi.object().required(),
});

export const createOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      validateBody(orderShema, req.body, res);

      const { courseId, payment_info } = req.body;

      const user = await prisma.user.findFirst({
        where: {
          id: req.user?.id,
        },
      });

      const courseExist = await user?.courses.find(
        (c) => c.courseId === courseId
      );

      if (courseExist) {
        return next(new ErrorHandlers("Course already purchased", 400));
      }

      const course = await prisma.courses.findFirst({
        where: {
          id: courseId,
        },
      });

      if (!course) {
        return next(new ErrorHandlers("not found ", 404));
      }

      const data: any = {
        courseId: course.id,
        userId: user?.id,
      };

      const order = createOrderService(data);

      const mailData = {
        order: {
          id: course.id.slice(0, 6),
          name: course.name,
          price: course.price,
          date: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        },
      };

      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/order-confirmation.ejs"),
        { order: mailData }
      );

      try {
        if (user) {
          await sendMail({
            email: user.email,
            subject: "Order confirmation",
            template: "order-confirmation.ejs",
            data: { order: mailData },
          });
        }
      } catch (error: any) {
        return next(new ErrorHandlers(error.message, 500));
      }

      const newUser = await prisma.user.update({
        where: {
          id: user?.id,
        },
        data: {
          courses: {
            push: {
              courseId: course.id,
            },
          },
        },
      });

      await prisma.notification.create({
        data: {
          userId: newUser.id,
          title: "New Order",
          message: `Ypu have new order from ${course.name}`,
          status: "",
        },
      });

      await prisma.courses.update({
        where: {
          id: course.id,
        },
        data: {
          purchased: {
            increment: 1,
          },
        },
      });

      return res.status(201).json({
        success: true,
        order: course,
      });
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 500));
    }
  }
);

export const getAllOrders = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orders = await getAllOrderService();
      return res.status(200).json({
        success: true,
        orders,
      });
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 500));
    }
  }
);