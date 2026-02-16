import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { uploadToCloudinary } from "../utils/cloudinary";
import { prisma } from "../utils/db";

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const senderId = req.user?.id;
    const { chatId, content } = req.body;

    if (!senderId) {
      throw new ApiError(401, "Unauthorized");
    }

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      throw new ApiError(404, "Chat not found");
    }

    const isMember = await prisma.chatMember.findUnique({
      where: {
        userId_chatId: {
          userId: senderId,
          chatId,
        },
      },
    });

    if (!isMember) {
      throw new ApiError(403, "Not a member of this chat");
    }

    let imageUrl: string | undefined;

    if (req.file?.path) {
      const cloudinaryResult = await uploadToCloudinary(req.file.path);

      if (!cloudinaryResult?.url) {
        throw new ApiError(500, "Image upload failed");
      }

      imageUrl = cloudinaryResult.url;
    }

    if (!content && !imageUrl) {
      throw new ApiError(400, "Message must contain text or image");
    }

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId,
        type: imageUrl ? "IMAGE" : "TEXT",
        content: content || null,
        imageUrl: imageUrl || null,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return res.status(201).json(new ApiResponse(201, message, "Message sent"));
  } catch (error: unknown) {
    console.log(error);

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
