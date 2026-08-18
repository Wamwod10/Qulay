const encoder = new TextEncoder();

const bufferToBase64 = (buffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)));

const base64ToBuffer = (value) =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const fallbackHash = async (password, salt) => {
  const source = `${salt}:${password}`;
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index);
    hash |= 0;
  }

  return btoa(String(hash));
};

export const createPasswordSalt = () => {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return bufferToBase64(bytes);
  }

  return btoa(`${Date.now()}-${Math.random()}`);
};

export const hashPassword = async (password, salt) => {
  // Frontend-only hashing is a demo boundary, not production security.
  // With a backend, hashing must move server-side and the client must never store password material.
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return fallbackHash(password, salt);
  }

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: base64ToBuffer(salt),
      iterations: 120000,
    },
    keyMaterial,
    256,
  );

  return bufferToBase64(bits);
};

export const verifyPassword = async (password, passwordHash, salt) =>
  (await hashPassword(password, salt)) === passwordHash;
