import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { ErrorMiddleWare } from "./middleware/error";
import userRouter from "./routes/user.routes";

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

app.get("/", (req: Request, res: Response) => {
  return res.status(200).json({
    message: "Api working",
  });
});

app.use(ErrorMiddleWare);
