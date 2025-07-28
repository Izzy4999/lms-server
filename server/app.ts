import express, { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { ErrorMiddleWare } from "./middleware/error";
import userRouter from "./routes/user.routes";
import courseRouter from "./routes/course.route";
import orderRoute from "./routes/order.route";
import notificationRoute from "./routes/notification.route";
import analyticsRoute from "./routes/analytics.route";

export const app = express();

app.use(express.json({ limit: "50mb" }));

app.use(cookieParser());

app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);

app.use("/api/v1/user", userRouter);
app.use("/api/v1/course", courseRouter);
app.use("/api/v1/order", orderRoute);
app.use("/api/v1/notification", notificationRoute);
app.use("/api/v1/analytics", analyticsRoute);

app.get("/", (req: Request, res: Response) => {
  return res.status(200).json({
    message: "Api working",
  });
});

app.all("*", (req: Request, res: Response, next: NextFunction) => {
  const err = new Error(
    `Route: ${req.method} ${req.originalUrl} not found`
  ) as any;
  err.statusCode = 404;
  next(err);
});
app.use(ErrorMiddleWare);
