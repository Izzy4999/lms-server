import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import ErrorHandlers from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import Joi from "joi";
import {
  createActivationToken,
  hashPassword,
  validateBody,
} from "../utils/bcrypt";
import prisma from "../libs/prisma";
import sendMail from "../utils/sendMail";
import env from "../utils/env";
import { IUser } from "../types/user.types";

// schemas

const registrationSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  avatar: Joi.string().optional(),
});

const activationSchema = Joi.object({
  activation_token: Joi.string().required(),
  activation_code: Joi.string().required(),
});

// controllers

export const registrationUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      validateBody(registrationSchema, req.body, res);

      const { name, email, password } = req.body;

      const isEmailExist = await prisma.user.findFirst({
        where: {
          email,
        },
      });

      if (isEmailExist) {
        return next(new ErrorHandlers("Email already exist", 400));
      }

      const user = {
        name,
        email,
        password,
      };

      const activationToken = createActivationToken(user);

      const activationCode = activationToken.activationCode;

      const data = { user: { name: user.name }, activationCode };
      //   const html = await ejs.renderFile(
      //     path.join(__dirname, "../mails/activation-mail.ejs"),
      //     data
      //   );

      try {
        await sendMail({
          email: user.email,
          subject: "Activate your account",
          template: "activation-mail.ejs",
          data,
        });

        res.status(201).json({
          success: true,
          message: `Please check your email: ${user.email} to activate your account`,
          activationToken: activationToken.token,
        });
      } catch (error: any) {
        return next(new ErrorHandlers(error.message, 400));
      }
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 400));
    }
  }
);

interface IActivationToken {
  activation_token: string;
  activation_code: string;
}

export const activateUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      validateBody(activationSchema, req.body, res);
      const { activation_token, activation_code } = req.body;

      const newUser = jwt.verify(activation_token, env.SECRET_KEY) as {
        user: IUser;
        activationCode: string;
      };

      if (newUser.activationCode !== activation_code) {
        return next(new ErrorHandlers("Invalid activation code", 400));
      }

      const { name, email, password } = newUser.user;

      const existUser = await prisma.user.findFirst({
        where: {
          email,
        },
      });

      if (existUser) {
        return next(new ErrorHandlers("Email already exist", 400));
      }

      const hashedPassword = await hashPassword(password);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          isVerified: true,
        },
      });

      return res.status(201).json({
        success: true,
      });
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 400));
    }
  }
);
