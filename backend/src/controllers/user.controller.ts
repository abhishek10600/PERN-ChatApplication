import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { prisma } from "../utils/db";
import {
  encryptPassword,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  setAuthCokies,
} from "../utils/Authentication/helpers";
import { uploadToCloudinary } from "../utils/cloudinary";
import { ApiResponse } from "../utils/ApiResponse";

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ApiError(409, "User with this email already exists");
    }

    let avatarLocalPath;
    let avatarUrl;
    if (req.file?.path) {
      avatarLocalPath = req.file.path;
      const cloudinaryResult = await uploadToCloudinary(avatarLocalPath);
      if (cloudinaryResult?.url) {
        avatarUrl = cloudinaryResult.url;
      }
    }

    const hashedPassword = await encryptPassword(password);

    let user;
    if (avatarUrl) {
      user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          avatarUrl,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
        },
      });
    }
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const hashedRefreshToken = hashToken(refreshToken);

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: hashedRefreshToken,
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    setAuthCokies(res, accessToken, refreshToken);

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            avatarUrl: user.avatarUrl,
          },
          accessToken,
          refreshToken: hashedRefreshToken,
        },
        "User registered successfully"
      )
    );
  } catch (error: unknown) {
    console.error("Regsiter User Error: ", error);

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errors: error.errors,
      });
    }
  }
};
