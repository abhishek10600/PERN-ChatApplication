import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.CORS_ORIGINS,
  })
);
app.use(cookieParser());

app.get("/test", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Api working fine",
  });
});

import userRouter from "./routes/user.route";

app.use("/api/v1/users", userRouter);
