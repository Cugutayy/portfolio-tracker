import crypto from "node:crypto";

const COOKIE = "jn_studio";
const maxAge = 60 * 60 * 12;

function sign(secret) {
  return crypto.createHmac("sha256", secret).update("journey-studio-v1").digest("hex");
}
function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function cookie(req, name) {
  const raw = req.headers.cookie || "";
  const part = raw.split(";").map(v => v.trim()).find(v => v.startsWith(name + "="));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : "";
}
export default function handler(req, res) {
  const password = process.env.JOURNEY_STUDIO_PASSWORD;
  const secret = process.env.JOURNEY_STUDIO_SECRET;
  if (!password || !secret) {
    return res.status(503).json({ error: "Yönetim girişi henüz yapılandırılmadı." });
  }

  const expected = sign(secret);
  if (req.method === "GET") {
    return safeEqual(cookie(req, COOKIE), expected)
      ? res.status(200).json({ ok: true })
      : res.status(401).json({ ok: false });
  }

  if (req.method === "POST") {
    const supplied = typeof req.body === "string" ? JSON.parse(req.body || "{}").password : req.body?.password;
    if (!safeEqual(supplied, password)) {
      return res.status(401).json({ error: "Parola yanlış." });
    }
    res.setHeader("Set-Cookie", `${COOKIE}=${expected}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`);
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).end();
}
