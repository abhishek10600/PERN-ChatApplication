import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { prisma } from "../utils/db";
import {
  encryptPassword,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  isPasswordCorrect,
  setAuthCookies,
} from "../utils/Authentication/helpers";
import { uploadToCloudinary } from "../utils/cloudinary";
import { ApiResponse } from "../utils/ApiResponse";
import jwt from "jsonwebtoken";

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

    setAuthCookies(res, accessToken, refreshToken);

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
          refreshToken,
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

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      errors: [],
    });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user) {
      throw new ApiError(401, "Invalid credentials");
    }

    const isPasswordMatch = await isPasswordCorrect(password, user.password);

    if (!isPasswordMatch) {
      throw new ApiError(401, "Invalid credentials");
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

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            avatarUrl: user.avatarUrl,
          },
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
  } catch (error: unknown) {
    console.error("Login User Error: ", error);

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      errors: [],
    });
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new ApiError(400, "No refresh token found");
    }

    const hashedToken = hashToken(refreshToken);

    await prisma.session.deleteMany({
      where: {
        refreshToken: hashedToken,
      },
    });

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    return res
      .status(200)
      .json(new ApiResponse(200, null, "User logged out successfully"));
  } catch (error: unknown) {
    // console.error("Login User Error: ", error);

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      errors: [],
    });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const refreshToken =
      req.cookies?.refreshToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!refreshToken) {
      throw new ApiError(401, "Refresh token missing");
    }

    const hashedToken = hashToken(refreshToken);

    const session = await prisma.session.findUnique({
      where: { refreshToken: hashedToken },
      include: { user: true },
    });

    if (!session) {
      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET!
        ) as { id: string };

        await prisma.session.deleteMany({
          where: { userId: decoded.id },
        });
      } catch (error) {}

      throw new ApiError(403, "Refresh token reuse detected");
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({
        where: { id: session.id },
      });

      throw new ApiError(403, "Refresh token expired");
    }

    const user = session.user;

    await prisma.session.delete({
      where: { id: session.id },
    });

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    const newHashedToken = hashToken(newRefreshToken);

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: newHashedToken,
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    setAuthCookies(res, newAccessToken, newRefreshToken);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { accessToken: newAccessToken, refreshToken: newRefreshToken },
          "Token refreshed successfully"
        )
      );
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      errors: [],
    });
  }
};
