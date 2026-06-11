import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const CAPTCHA_TTL_MS = 10 * 60 * 1000;

function captchaSecret(): string {
  return process.env.CAPTCHA_SECRET ?? process.env.DATABASE_URL ?? "schoolos-dev-captcha";
}

function signPayload(payload: string): string {
  return createHmac("sha256", captchaSecret()).update(payload).digest("hex");
}

export function createMathCaptcha(): { question: string; token: string } {
  const a = randomInt(1, 12);
  const b = randomInt(1, 12);
  const answer = String(a + b);
  const exp = Date.now() + CAPTCHA_TTL_MS;
  const payload = `${answer}:${exp}`;
  const sig = signPayload(payload);
  return {
    question: `${a} + ${b} = ?`,
    token: Buffer.from(`${payload}:${sig}`).toString("base64url"),
  };
}

export function verifyCaptchaToken(token: string, answer: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon <= 0) return false;
    const sig = decoded.slice(lastColon + 1);
    const payload = decoded.slice(0, lastColon);
    const expectedSig = signPayload(payload);
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return false;
    }
    const [expectedAnswer, expStr] = payload.split(":");
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return false;
    return expectedAnswer.trim() === answer.trim();
  } catch {
    return false;
  }
}
