import express from "express";
import { validateData } from "../middlewares/validate.middleware";
import { registerUserSchema } from "../validations/user.validator";
import { upload } from "../middlewares/multer.middleware";
import { registerUser } from "../controllers/user.controller";

const router = express.Router();

router
  .route("/register")
  .post(
    upload.single("avatar"),
    validateData(registerUserSchema),
    registerUser
  );

export default router;
