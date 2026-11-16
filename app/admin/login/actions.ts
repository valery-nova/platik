"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  ADMIN_LOGIN_ATTEMPTS_COOKIE,
  adminConfigured,
  adminLoginAttemptsCookieMaxAgeSeconds,
  adminLoginLockSeconds,
  adminLoginMaxAttempts,
  adminSessionCookieMaxAgeSeconds,
  createAdminLoginAttemptsToken,
  createAdminSessionToken,
  verifyAdminCredentials,
  verifyAdminLoginAttemptsToken,
} from "@/lib/admin/auth";

const LOGIN_DELAY_MS = 400;

export async function login(formData: FormData): Promise<void> {
  if (!adminConfigured()) redirect("/admin/login?error=config");
  const store = await cookies();
  const now = Math.floor(Date.now() / 1000);
  const attempts = verifyAdminLoginAttemptsToken(store.get(ADMIN_LOGIN_ATTEMPTS_COOKIE)?.value);
  if (attempts.lockedUntil > now) redirect("/admin/login?error=locked");

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  await new Promise((resolve) => setTimeout(resolve, LOGIN_DELAY_MS));

  if (!verifyAdminCredentials(email, password)) {
    const nextCount = attempts.count + 1;
    const lockedUntil = nextCount >= adminLoginMaxAttempts() ? now + adminLoginLockSeconds() : 0;
    store.set(
      ADMIN_LOGIN_ATTEMPTS_COOKIE,
      createAdminLoginAttemptsToken(lockedUntil > 0 ? 0 : nextCount, lockedUntil),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/admin",
        maxAge: adminLoginAttemptsCookieMaxAgeSeconds(),
      },
    );
    redirect(lockedUntil > 0 ? "/admin/login?error=locked" : "/admin/login?error=1");
  }

  store.set(ADMIN_LOGIN_ATTEMPTS_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 0,
  });
  store.set(ADMIN_COOKIE, createAdminSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: adminSessionCookieMaxAgeSeconds(),
  });
  redirect("/admin");
}
