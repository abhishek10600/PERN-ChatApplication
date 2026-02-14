import bcrypt from "bcrypt";
import { JwtUserPayload } from "../../types";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});

export const generateAccessToken = (user: JwtUserPayload) => {
  const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET as Secret;
  const options: SignOptions = {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY as SignOptions["expiresIn"],
  };
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
    },
    accessTokenSecret,
    options
  );
};

export const generateRefreshToken = (user: JwtUserPayload) => {
  const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET as Secret;
  const options: SignOptions = {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY as SignOptions["expiresIn"],
  };
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
    },
    refreshTokenSecret,
    options
  );
};

export const hashToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const encryptPassword = async (password: string) => {
  return await bcrypt.hash(password, 10);
};

export const isPasswordCorrect = async (
  password: string,
  hashedPassword: string
) => {
  return await bcrypt.compare(password, hashedPassword);
};

export const setAuthCokies = (
  res: any,
  accessToken: string,
  refreshToken: string
) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: true,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};
