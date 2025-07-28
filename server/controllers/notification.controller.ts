import { CatchAsyncError } from "../middleware/catchAsyncError";
import { Request, Response, NextFunction } from "express";
import ErrorHandlers from "../utils/ErrorHandler";
import prisma from "../libs/prisma";
import cron from "node-cron";

export const getNotifiaction = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notifications = await prisma.notification.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(201).json({
        success: true,
        notifications,
      });
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 500));
    }
  }
);

export const updateNotifications = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notification = await prisma.notification.findFirst({
        where: {
          id: req.params.id,
        },
      });
      if (!notification) {
        return next(new ErrorHandlers("Not found", 404));
      }

      const newNotification = await prisma.notification.update({
        where: {
          id: req.params.id,
        },
        data: {
          status: "read",
        },
      });

      const allNotifications = await prisma.notification.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(201).json({
        success: true,
        notification: allNotifications,
      });
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 500));
    }
  }
);

// delete notification --- only admin
cron.schedule("0 0 0 * * *", async () => {
  const thirtyDyasAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  await prisma.notification.deleteMany({
    where: {
      AND: [
        {
          status: "read",
        },
        {
          createdAt: {
            lt: thirtyDyasAgo,
          },
        },
      ],
    },
  });
});
