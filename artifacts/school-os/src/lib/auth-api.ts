import type { LoginResponse, MeResponse } from "./auth-types";

const API = "/api";

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    let message = body;
    try {
      const parsed = JSON.parse(body) as { error?: string };
      message = parsed.error ?? body;
    } catch {
      /* use raw body */
    }
    throw new Error(message || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchCaptcha(): Promise<{ question: string; token: string }> {
  const res = await fetch(`${API}/auth/captcha`);
  return parseJson(res);
}

export async function loginRequest(body: {
  schoolCode?: string;
  userId: string;
  accessCode: string;
  captchaAnswer: string;
  captchaToken: string;
}): Promise<LoginResponse> {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function meRequest(token: string): Promise<MeResponse> {
  const res = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson(res);
}

export async function logoutRequest(token: string): Promise<void> {
  await fetch(`${API}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}
