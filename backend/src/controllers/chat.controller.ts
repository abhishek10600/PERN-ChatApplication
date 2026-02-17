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

export const getUserChats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const chats = await prisma.chat.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
        messages: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const formattedChats = await Promise.all(
      chats.map(async (chat) => {
        const otherMember =
          chat.type === "PRIVATE"
            ? chat.members.find((m) => m.userId !== userId)
            : null;

        const unreadCount = await prisma.message.count({
          where: {
            chatId: chat.id,
            senderId: { not: userId },
            deletedAt: null,
            reads: {
              none: {
                userId,
              },
            },
          },
        });

        return {
          id: chat.id,
          type: chat.type,
          updatedAt: chat.updatedAt,
          otherUser: otherMember?.user || null,
          lastMessage: chat.messages[0] || null,
          unreadCount,
        };
      })
    );

    return res
      .status(200)
      .json(new ApiResponse(200, formattedChats, "Chats fetched"));
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

export const getChatMessages = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const chatId = req.params.chatId as string;
    const { cursor, limit = "20" } = req.query;

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

    const take = parseInt(limit as string) + 1;

    const messages = await prisma.message.findMany({
      where: {
        chatId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      take,
      ...(cursor && {
        skip: 1,
        cursor: {
          id: cursor as string,
        },
      }),
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

    let nextCursor: string | null = null;

    if (messages.length > parseInt(limit as string)) {
      const nextItem = messages.pop();
      nextCursor = nextItem!.id;
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          messages,
          nextCursor,
        },
        "Messages fetched"
      )
    );
  } catch (error) {
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
