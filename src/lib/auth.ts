import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { JWTPayload, ISafeUser } from "@/types";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_default_secret_task_tracker_key";
const COOKIE_NAME = "auth_token";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Extracts session from Next.js server context (cookies or Authorization header)
 */
export async function getSession(req?: NextRequest): Promise<JWTPayload | null> {
  // 1. Try Authorization header if req provided
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const verified = verifyToken(token);
      if (verified) return verified;
    }
  }

  // 2. Try cookie
  try {
    const cookieStore = cookies();
    const tokenCookie = cookieStore.get(COOKIE_NAME);
    if (tokenCookie && tokenCookie.value) {
      return verifyToken(tokenCookie.value);
    }
  } catch (err) {
    // cookies() might fail if called outside Request context
  }

  return null;
}

export { COOKIE_NAME };
