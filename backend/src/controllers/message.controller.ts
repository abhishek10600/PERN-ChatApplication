import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { uploadToCloudinary } from "../utils/cloudinary";
import { prisma } from "../utils/db";
import { io } from "../index";

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const senderId = req.user?.id;
    const { chatId, content } = req.body;

    const trimmedContent = content?.trim();

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

    if (!trimmedContent && !imageUrl) {
      throw new ApiError(400, "Message must contain text or image");
    }

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId,
        type: imageUrl ? "IMAGE" : "TEXT",
        content: trimmedContent || null,
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

    io.to(`chat:${chatId}`).emit("new_message", message);

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

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const chatId = req.params.chatId as string;

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const isMember = await prisma.chatMember.findUnique({
      where: {
        userId_chatId: {
          userId,
          chatId,
        },
      },
    });

    if (!isMember) {
      throw new ApiError(403, "Not a member of this chat");
    }

    const unreadMessage = await prisma.message.findMany({
      where: {
        chatId,
        senderId: {
          not: userId,
        },
        deletedAt: null,
        reads: {
          none: {
            userId,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (unreadMessage.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, null, "No unread messages"));
    }

    await prisma.messageRead.createMany({
      data: unreadMessage.map((msg) => ({
        messageId: msg.id,
        userId,
      })),
      skipDuplicates: true,
    });

    io.to(`chat:${chatId}`).emit("message_read", {
      chatId,
      userId,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Message marked as read"));
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

export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const messageId = req.params.messageId as string;

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const message = await prisma.message.findUnique({
      where: {
        id: messageId,
      },
    });

    if (!message) {
      throw new ApiError(404, "Message not found");
    }

    if (message.senderId !== userId) {
      throw new ApiError(403, "You cannot delete this message");
    }

    if (message.deletedAt) {
      throw new ApiError(400, "Message already deleted");
    }

    const deletedMessage = await prisma.message.update({
      where: {
        id: messageId,
      },
      data: {
        deletedAt: new Date(),
        content: null,
        imageUrl: null,
      },
    });

    io.to(`chat:${message.chatId}`).emit("message_deleted", {
      messageId,
      chatId: message.chatId,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, deletedMessage, "Message deleted successgully")
      );
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
