import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import { createPrivateChat } from "../controllers/chat.controller";

const router = express.Router();

router.route("/private/:userId").post(verifyJWT, createPrivateChat);

export default router;
