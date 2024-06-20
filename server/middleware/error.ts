import ErrorHandlers from "../utils/ErrorHandler";
import { NextFunction, Request, Response } from "express";

export const ErrorMiddleWare = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";

  if (err.name === "CastError") {
    const message = `Resource not found. invalid: ${err.path}`;
    err = new ErrorHandlers(message, 400);
  }

  if (err.code === 11000) {
    const message = `Duplicate ${Object.keys(err.keyValue)} entered`;
    err = new ErrorHandlers(message, 400);
  }

  if (err.name === "JsonWebTokenError") {
    const message = `Json web token is invalid. Please try again`;
    err = new ErrorHandlers(message, 400);
  }

  if (err.name === "TokenExpiredError") {
    const message = `Json web token is expired. Please try again`;
    err = new ErrorHandlers(message, 400);
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};
