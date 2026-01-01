export async function encrypt(
  jsonData: Request,
  key: string,
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(jsonData));

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 250000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    plaintext,
  );

  const ciphertext = new Uint8Array(encryptedBuffer);

  const blob = new Uint8Array(salt.length + iv.length + ciphertext.length);

  blob.set(salt, 0);
  blob.set(iv, salt.length);
  blob.set(ciphertext, salt.length + iv.length);

  return blob;
}

export async function decrypt(blob: Uint8Array, key: string): Promise<Request> {
  const salt = blob.slice(0, 16);
  const iv = blob.slice(16, 28);
  const ciphertext = blob.slice(28);

  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 250000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    ciphertext,
  );

  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(decryptedBuffer));
}
