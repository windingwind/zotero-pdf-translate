function base64(buffer: ArrayBuffer) {
  const str = String.fromCharCode(...new Uint8Array(buffer));
  return ztoolkit.getGlobal("btoa")(str);
}

function hex(buffer: ArrayBuffer) {
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha1Digest(stringToSign: string, secretKey: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secretKey),
    {
      name: "HMAC",
      hash: "SHA-1",
    },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", key, enc.encode(stringToSign));
}

async function hmacSha256Digest(stringToSign: string, secretKey: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secretKey),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", key, enc.encode(stringToSign));
}

async function sha256Digest(message: string) {
  const enc = new TextEncoder();
  return crypto.subtle.digest("SHA-256", enc.encode(message));
}

function pkcs7Pad(block: Uint8Array | Array<number>) {
  const padding = 16 - block.length;
  const pad = new Uint8Array(padding);
  pad.fill(padding);
  return new Uint8Array([...block, ...pad]);
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
    ["encrypt"]
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
        zeros
      )
    )
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

export {
  aesEcbEncrypt,
  base64,
  hex,
  hmacSha1Digest,
  hmacSha256Digest,
  sha256Digest,
};
