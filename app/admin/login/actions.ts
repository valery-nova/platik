"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  adminConfigured,
  adminSessionCookieMaxAgeSeconds,
  createAdminSessionToken,
  verifyAdminCredentials,
} from "@/lib/admin/auth";

export async function login(formData: FormData): Promise<void> {
  if (!adminConfigured()) redirect("/admin/login?error=config");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!verifyAdminCredentials(email, password)) redirect("/admin/login?error=1");
  (await cookies()).set(ADMIN_COOKIE, createAdminSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: adminSessionCookieMaxAgeSeconds(),
  });
  redirect("/admin");
}
