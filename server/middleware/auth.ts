import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "./catchAsyncError";
import ErrorHandlers from "../utils/ErrorHandler";
import env from "../utils/env";
import { redis } from "../libs/redis";

export const isAuthenticated = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const access_token = req.cookies.access_token;
    if (!access_token) {
      return next(new ErrorHandlers("Please login to access", 400));
    }

    const decoded = (await jwt.verify(
      access_token,
      env.ACCESS_TOKEN
    )) as JwtPayload;
    if (!decoded) {
      return next(new ErrorHandlers("access token invalid", 400));
    }

    const user = await redis.get(decoded.id);
    if (!user) {
      return next(new ErrorHandlers("user not found", 400));
    }

    req.user = JSON.parse(user);
    next();
  }
);

export const authorizedRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role || "")) {
      return next(
        new ErrorHandlers(
          `Role: ${req.user?.role} is not allowed to access this  resource`,
          403
        )
      );
    }
    next();
  };
};
