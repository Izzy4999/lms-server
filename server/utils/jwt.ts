import { Response } from "express";
import { PrismaUser } from "../types/user.types";
import { signAccessToken, signRefreshToken } from "./bcrypt";
import env from "./env";
import { redis } from "../libs/redis";

export interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none" | undefined;
  secure?: boolean;
}

const accessTokenExpire = parseInt(env.ACCESS_TOKEN_EXPIRE, 10);
const refreshTokenExpire = parseInt(env.REFRESH_TOKEN_EXPIRE, 10);

export const accessTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + accessTokenExpire * 60 * 60 * 1000),
  maxAge: accessTokenExpire * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "lax",
};
export const refreshTokenOpitons: ITokenOptions = {
  expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
  maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "lax",
};

export const sendToken = (
  user: PrismaUser,
  statusCode: number,
  res: Response
) => {
  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  redis.set(user.id, JSON.stringify(user as any));



  //   if (env.isProduction) {
  //     accessTokenOptions.secure = true;
  //   }

  res.cookie("refresh_token", refreshToken, refreshTokenOpitons);
  res.cookie("access_token", accessToken, accessTokenOptions);

  res.status(statusCode).json({
    success: true,
    user,
    accessToken,
  });
};
