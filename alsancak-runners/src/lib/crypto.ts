import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.STRAVA_TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("STRAVA_TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plaintext: string): {
  ciphertext: string;
  iv: string;
  tag: string;
} {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGO, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return { ciphertext: encrypted, iv: iv.toString("hex"), tag };
}

export function decrypt(
  ciphertext: string,
  ivHex: string,
  tagHex: string,
): string {
  const key = getKey();
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Encrypt access + refresh tokens for DB storage.
 * Uses separate IVs for each token (GCM requires unique nonces).
 * Access token IV/tag stored in tokenIv/tokenTag columns.
 * Refresh token IV/tag embedded in refreshTokenEnc as "ciphertext.iv.tag".
 */
export function encryptTokenPair(accessToken: string, refreshToken: string) {
  const access = encrypt(accessToken);
  const refresh = encrypt(refreshToken);

  return {
    accessTokenEnc: access.ciphertext,
    refreshTokenEnc: `${refresh.ciphertext}.${refresh.iv}.${refresh.tag}`,
    tokenIv: access.iv,
    tokenTag: access.tag,
  };
}

export function decryptAccessToken(
  accessTokenEnc: string,
  tokenIv: string,
  tokenTag: string,
): string {
  return decrypt(accessTokenEnc, tokenIv, tokenTag);
}

export function decryptRefreshToken(refreshTokenEnc: string): string {
  const [ciphertext, iv, tag] = refreshTokenEnc.split(".");
  return decrypt(ciphertext, iv, tag);
}
