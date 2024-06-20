import bcrypt from "bcrypt";
import { Response } from "express";
import Joi from "joi";
import { IRegisterationBody } from "../types/user.types";
import jwt from "jsonwebtoken";
import env from "./env";

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string) {
  return await bcrypt.compare(password, hash);
}

export function validateBody(
  validationSchema: Joi.ObjectSchema<any>,
  body: any,
  res: Response
) {
  const validation = validationSchema.validate(body);
  if (validation.error) {
    return res.status(400).json({
      message: validation.error.message,
    });
  }
}

export const createActivationToken = (
  user: any
): { token: string; activationCode: string } => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
  const token = jwt.sign(
    {
      user,
      activationCode,
    },
    env.SECRET_KEY,
    {
      expiresIn: "5m",
    }
  );

  return { token, activationCode };
};

export const signAccessToken = (id: string) => {
  return jwt.sign(
    {
      id,
    },
    env.ACCESS_TOKEN,
    {
      expiresIn: "5m",
    }
  );
};

export const signRefreshToken = (id: string) => {
  return jwt.sign(
    {
      id,
    },
    env.REFRESH_TOKEN,
    {
      expiresIn: "5m",
    }
  );
};
