import { Response } from "express";

export const SendRefreshToken = (res: Response, token: string): void => {
  // Persist cookie across browser restarts, aligned to refresh token TTL (7 days by default)
  // Security flags: HttpOnly to prevent JS access, SameSite Lax to reduce CSRF risk,
  // Secure only in production, and path root to be accessible by all routes.
  res.cookie("jrt", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 300 * 24 * 60 * 60 * 1000 // 7 days in ms
  });
};
