import { Request } from "express";
import { PrismaUser } from "./user.types";

declare global {
  namespace Express {
    interface Request {
      user?: PrismaUser;
    }
  }
}
