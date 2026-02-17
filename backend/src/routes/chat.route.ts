import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  createPrivateChat,
  getChatMessages,
  getUserChats,
} from "../controllers/chat.controller";

const router = express.Router();

router.route("/private/:userId").post(verifyJWT, createPrivateChat);
router.route("/").get(verifyJWT, getUserChats);
router.route("/:chatId/messages").get(verifyJWT, getChatMessages);

export default router;
