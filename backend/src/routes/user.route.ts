import express from "express";
import { validateData } from "../middlewares/validate.middleware";
import {
  loginUserSchema,
  registerUserSchema,
} from "../validations/user.validator";
import { upload } from "../middlewares/multer.middleware";
import { loginUser, registerUser, logoutUser } from "../controllers/user.controller";
import { verifyJWT } from "../middlewares/auth.middleware";

const router = express.Router();

router
  .route("/register")
  .post(
    upload.single("avatar"),
    validateData(registerUserSchema),
    registerUser
  );

router.route("/login").post(validateData(loginUserSchema), loginUser);
router.route("/logout").post(verifyJWT, logoutUser);

export default router;
