import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import { validateData } from "../middlewares/validate.middleware";
import { sendMessageSchema } from "../validations/message.validator";
import {
  markAsRead,
  sendMessage,
  deleteMessage,
} from "../controllers/message.controller";
import { upload } from "../middlewares/multer.middleware";

const router = express.Router();

router
  .route("/")
  .post(
    verifyJWT,
    upload.single("image"),
    validateData(sendMessageSchema),
    sendMessage
  );

router.route("/:chatId/read").post(verifyJWT, markAsRead);
router.route("/:messageId").delete(verifyJWT, deleteMessage);

export default router;
