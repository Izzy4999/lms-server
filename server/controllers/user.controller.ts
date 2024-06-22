import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import ErrorHandlers from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import Joi from "joi";
import {
  comparePassword,
  createActivationToken,
  hashPassword,
  validateBody,
} from "../utils/bcrypt";
import prisma from "../libs/prisma";
import sendMail from "../utils/sendMail";
import env from "../utils/env";
import { IUser } from "../types/user.types";
import {
  ITokenOptions,
  accessTokenOptions,
  refreshTokenOpitons,
  sendToken,
} from "../utils/jwt";
import { redis } from "../libs/redis";
import { getUserById } from "../services/user.service";
import cloudinary from "cloudinary";

// schemas

const registrationSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const activationSchema = Joi.object({
  activation_token: Joi.string().required(),
  activation_code: Joi.string().required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const socialAuthSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().required(),
  avatar: Joi.object({
    public_id: Joi.string().required(),
    url: Joi.string().required(),
  }).optional(),
});

const updatePasswordSchema = Joi.object({
  oldPassword: Joi.string().min(6).required(),
  newPassword: Joi.string().min(6).required(),
});

const updateProfilePictureSchema = Joi.object({
  avatar: Joi.object({
    public_id: Joi.string().required(),
    url: Joi.string().required(),
  }).required(),
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

// interface IActivationToken {
//   activation_token: string;
//   activation_code: string;
// }

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

      await prisma.user.create({
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

export const loginUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      validateBody(loginSchema, req.body, res);
      const { email, password } = req.body;

      const user = await prisma.user.findFirst({
        where: {
          email,
        },
      });

      if (!user) {
        return next(new ErrorHandlers("Invalid email or password", 400));
      }

      const passwordCorrect = await comparePassword(
        password,
        user.password as string
      );

      if (!passwordCorrect) {
        return next(new ErrorHandlers("Invalid email or password", 400));
      }

      return sendToken(user, 200, res);
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 400));
    }
  }
);

export const logoutUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie("access_token", "", { maxAge: 1 });
      res.cookie("refresh_token", "", { maxAge: 1 });

      const id = req.user?.id || "";
      redis.del(id);

      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 400));
    }
  }
);

export const updateAccessToken = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refresh_token = req.cookies.refresh_token as string;
      const decoded = jwt.verify(
        refresh_token,
        env.REFRESH_TOKEN
      ) as JwtPayload;

      const message = "Could not refresh token";
      if (!decoded) {
        return next(new ErrorHandlers(message, 400));
      }

      const session = await redis.get(decoded.id as string);
      if (!session) {
        return next(new ErrorHandlers(message, 400));
      }

      const user = JSON.parse(session);

      const accessToken = jwt.sign({ id: user.id }, env.ACCESS_TOKEN, {
        expiresIn: "5m",
      });

      const refreshToken = jwt.sign({ id: user.id }, env.REFRESH_TOKEN, {
        expiresIn: "3d",
      });

      req.user = user;
      //   if (env.isProduction) {
      //     accessTokenOptions.secure = true;
      //   }

      res.cookie("refresh_token", refreshToken, refreshTokenOpitons);
      res.cookie("access_token", accessToken, accessTokenOptions);

      res.status(200).json({
        status: "success",
        accessToken,
      });
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 400));
    }
  }
);

export const getUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.user?.id;
      const user = getUserById(id as string);
      return res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 400));
    }
  }
);

export const socialAuth = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      validateBody(socialAuthSchema, req.body, res);
      const { email, name, avatar } = req.body;

      const user = await prisma.user.findFirst({
        where: {
          email,
        },
      });

      if (!user) {
        const newUser = await prisma.user.create({
          data: {
            name,
            email,
            avatar,
          },
        });

        sendToken(newUser, 200, res);
        return;
      } else {
        sendToken(user, 200, res);
        return;
      }
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 400));
    }
  }
);

interface IUpadteUserInfo {
  name?: string;
  email?: string;
}

export const updateUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let updatedUser;
      const { name, email } = req.body;
      const userId = req.user?.id;

      const user = await prisma.user.findFirst({
        where: {
          id: userId,
        },
      });

      if (email && user) {
        const isEmailExist = await prisma.user.findFirst({
          where: {
            email,
          },
        });

        if (isEmailExist) {
          return next(new ErrorHandlers("Email already exist", 400));
        }

        updatedUser = await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            email,
          },
        });
      }

      if (name && user) {
        updatedUser = await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            name,
          },
        });
      }

      await redis.set(userId as string, JSON.stringify(updatedUser));

      return res.status(200).json({
        success: true,
        user: updatedUser,
      });
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 400));
    }
  }
);

// interface IUpdatePassword {
//   oldPassword: string;
//   newPassword: string;
// }

export const updatePassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      validateBody(updatePasswordSchema, req.body, res);
      const { oldPassword, newPassword } = req.body;

      const user = req.user;

      if (user?.password === null || user?.password === undefined) {
        return next(new ErrorHandlers("invalid user", 400));
      }

      const isPasswordMatched = await comparePassword(
        oldPassword,
        user?.password
      );

      if (!isPasswordMatched) {
        return next(new ErrorHandlers("invalid password", 400));
      }

      const hashedPassword = await hashPassword(newPassword);

      const newUser = await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          password: hashedPassword,
        },
      });

      redis.set(user.id, JSON.stringify(newUser));

      return res.status(201).json({
        success: true,
        user: newUser,
      });
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 400));
    }
  }
);

export const updateProfilePicture = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      validateBody(updateProfilePictureSchema, req.body, res);

      let updatedUser;

      const { avatar } = req.body;

      const user = req.user;

      const userExist = await prisma.user.findFirst({
        where: {
          id: user?.id,
        },
      });

      if (avatar && userExist) {
        if (user?.avatar?.public_id) {
          await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);
          const mycloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "avatar",
            width: 150,
          });

          updatedUser = await prisma.user.update({
            where: {
              id: userExist.id,
            },
            data: {
              avatar: {
                public_id: mycloud.public_id,
                url: mycloud.secure_url,
              },
            },
          });
        } else {
          const mycloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "avatar",
            width: 150,
          });

          updatedUser = await prisma.user.update({
            where: {
              id: userExist.id,
            },
            data: {
              avatar: {
                public_id: mycloud.public_id,
                url: mycloud.secure_url,
              },
            },
          });
        }
      }

      await redis.set(userExist?.id as string, JSON.stringify(updatedUser));

      return res.status(201).json({
        success: true,
        user: updatedUser,
      });
    } catch (error: any) {
      return next(new ErrorHandlers(error.message, 400));
    }
  }
);
