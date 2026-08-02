function base64(buffer: ArrayBuffer) {
  const str = String.fromCharCode(...new Uint8Array(buffer));
  return ztoolkit.getGlobal("btoa")(str);
}

function randomString(length: number) {
  const baseLen = Math.ceil(length / 4) * 3;
  const random = crypto.getRandomValues(new Uint8Array(baseLen));
  return base64(random as unknown as ArrayBuffer).substring(0, length);
}

function hex(buffer: ArrayBuffer) {
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha1Digest(
  stringToSign: string,
  secretKey: string | ArrayBuffer,
) {
  const enc = new TextEncoder();
  let keyData: ArrayBuffer;
  if (typeof secretKey === "string") {
    keyData = enc.encode(secretKey).buffer as ArrayBuffer;
  } else {
    keyData = secretKey;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    {
      name: "HMAC",
      hash: "SHA-1",
    },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", key, enc.encode(stringToSign));
}

async function hmacSha256Digest(
  stringToSign: string,
  secretKey: string | ArrayBuffer,
): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  let keyData: ArrayBuffer;
  if (typeof secretKey === "string") {
    keyData = enc.encode(secretKey).buffer as ArrayBuffer;
  } else {
    keyData = secretKey;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", key, enc.encode(stringToSign));
}

async function sha256Digest(message: string): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  return crypto.subtle.digest("SHA-256", enc.encode(message));
}

function pkcs7Pad(block: Uint8Array | Array<number>) {
  const padding = 16 - block.length;
  const pad = new Uint8Array(padding);
  pad.fill(padding);
  return new Uint8Array([...block, ...pad]);
}

function pkcs7Unpad(block: Uint8Array) {
  const padding = block[block.length - 1];
  if (padding < 1 || padding > 16) {
    throw new Error(`Invalid PKCS7 padding: ${padding}`);
  }
  for (let i = block.length - padding; i < block.length; i++) {
    if (block[i] !== padding) {
      throw new Error("Invalid PKCS7 padding");
    }
  }
  return block.subarray(0, block.length - padding);
}

// AES ECB encrypt, use CBC mode to simulate ECB mode
async function aesEcbEncrypt(message: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "AES-CBC",
    },
    false,
    ["encrypt"],
  );

  const encodeStr = new TextEncoder().encode(message);
  // split encoded string to 16 byte blocks
  const blocks = [];
  for (let i = 0; i < encodeStr.length; i += 16) {
    const block = encodeStr.subarray(i, i + 16);
    blocks.push(block);
  }

  if (!blocks.length || blocks[blocks.length - 1].length === 16) {
    blocks.push(pkcs7Pad([])); // pad empty block
  } else {
    blocks[blocks.length - 1] = pkcs7Pad(blocks[blocks.length - 1]);
  }

  // encrypt each block, do not pad
  const zeros = new Uint8Array(16);
  const encryptedBlocks = await Promise.all(
    blocks.map((block) =>
      crypto.subtle.encrypt(
        {
          name: "AES-CBC",
          iv: block,
        },
        key,
        zeros,
      ),
    ),
  );
  // concatenate encrypted blocks
  const encrypted = new Uint8Array(encryptedBlocks.length * 16);
  let offset = 0;
  for (const block of encryptedBlocks) {
    encrypted.set(new Uint8Array(block).subarray(0, 16), offset);
    offset += 16;
  }
  return encrypted;
}

async function aesEcbDecrypt(message: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "AES-CBC",
    },
    false,
    ["encrypt", "decrypt"],
  );

  const bytes = Uint8Array.from(ztoolkit.getGlobal("atob")(message), (c) =>
    c.charCodeAt(0),
  );
  const blocks = [];
  for (let i = 0; i < bytes.length; i += 16) {
    blocks.push(bytes.subarray(i, i + 16));
  }

  const zeros = new Uint8Array(16);
  const decryptedBlocks = await Promise.all(
    blocks.map(async (block) => {
      const paddingBlock = new Uint8Array(16);
      paddingBlock.fill(16);
      const paddingIv = new Uint8Array(16);
      for (let i = 0; i < 16; i++) {
        paddingIv[i] = block[i] ^ paddingBlock[i];
      }
      const paddingCipher = new Uint8Array(
        await crypto.subtle.encrypt(
          {
            name: "AES-CBC",
            iv: paddingIv,
          },
          key,
          zeros,
        ),
      ).subarray(0, 16);
      const cipherText = new Uint8Array([...block, ...paddingCipher]);
      return crypto.subtle.decrypt(
        {
          name: "AES-CBC",
          iv: zeros,
        },
        key,
        cipherText,
      );
    }),
  );
  const decrypted = new Uint8Array(decryptedBlocks.length * 16);
  let offset = 0;
  for (const block of decryptedBlocks) {
    decrypted.set(new Uint8Array(block), offset);
    offset += 16;
  }

  return new TextDecoder().decode(pkcs7Unpad(decrypted));
}

export {
  aesEcbDecrypt,
  aesEcbEncrypt,
  base64,
  randomString,
  hex,
  hmacSha1Digest,
  hmacSha256Digest,
  sha256Digest,
};
