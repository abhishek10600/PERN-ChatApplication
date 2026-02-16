import { z } from "zod";
import { MessageType } from "@prisma/client";

export const sendMessageSchema = z.object({
  chatId: z.uuid(),
  content: z.string().trim().max(5000).optional(),
});
