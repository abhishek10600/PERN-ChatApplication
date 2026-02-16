import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { prisma } from "../utils/db";
import { ApiResponse } from "../utils/ApiResponse";

export const createPrivateChat = async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user?.id;
    const otherUserId = req.params.userId as string;

    if (!currentUserId) {
      throw new ApiError(404, "logged in user id not found");
    }

    if (!otherUserId) {
      throw new ApiError(404, "receiver user id not found");
    }

    if (currentUserId === otherUserId) {
      throw new ApiError(400, "Cannot chat with yourself");
    }

    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
    });

    if (!otherUser) {
      throw new ApiError(404, "user not found");
    }

    const existingChat = await prisma.chat.findFirst({
      where: {
        type: "PRIVATE",
        AND: [
          {
            members: {
              some: { userId: currentUserId },
            },
          },
          {
            members: {
              some: { userId: otherUserId },
            },
          },
        ],
      },
      include: {
        members: true,
      },
    });

    if (existingChat && existingChat.members.length === 2) {
      return res
        .status(200)
        .json(new ApiResponse(200, existingChat, "Chat alreadt exists"));
    }

    const chat = await prisma.chat.create({
      data: {
        type: "PRIVATE",
        members: {
          create: [{ userId: currentUserId }, { userId: otherUserId }],
        },
      },
      include: {
        members: true,
      },
    });

    return res
      .status(201)
      .json(new ApiResponse(201, chat, "Private chat created"));
  } catch (error: unknown) {
    console.log(error);
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
