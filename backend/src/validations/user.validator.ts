import { z } from "zod";

export const registerUserSchema = z
  .object({
    email: z
      .email("Invalid email address")
      .min(2, "Email is too short")
      .max(255, "Email is to long")
      .transform((val) => val.toLowerCase().trim()),

    username: z
      .string()
      .min(3, "Username must be atleast 3 characters long")
      .max(30, "Username must be at most 30 characters long")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers and underscores"
      )
      .transform((val) => val.trim()),

    password: z
      .string()
      .min(6, "Password must be atleast 6 characters long")
      .max(100, "Password is too long"),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerUserSchema>;

export const loginUserSchema = z.object({
  identifier: z.string().min(3, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginUserInput = z.infer<typeof loginUserSchema>;
