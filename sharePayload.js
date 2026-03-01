const PAYLOAD_VERSION = 1;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBase64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(encoded) {
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function compressBytes(bytes) {
  if (typeof CompressionStream === "undefined") {
    return null;
  }

  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate"));
    const buffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(buffer);
  } catch (error) {
    return null;
  }
}

async function decompressBytes(bytes) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("decompression_not_supported");
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

function encodePayloadObject(title, desc) {
  return {
    v: PAYLOAD_VERSION,
    t: title,
    d: desc || "",
  };
}

function parsePayloadObject(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return {
    title: typeof payload.t === "string" ? payload.t.trim() : "",
    desc: typeof payload.d === "string" ? payload.d.trim() : "",
  };
}

export async function encodeSharePayload({ title, desc }) {
  const plainJson = JSON.stringify(encodePayloadObject(title, desc));
  const plainBytes = textEncoder.encode(plainJson);
  const compressedBytes = await compressBytes(plainBytes);

  if (compressedBytes && compressedBytes.length < plainBytes.length) {
    return `z${toBase64Url(compressedBytes)}`;
  }

  return `n${toBase64Url(plainBytes)}`;
}

export async function decodeSharePayload(encoded) {
  if (!encoded || typeof encoded !== "string") {
    return null;
  }

  const mode = encoded.slice(0, 1);
  const body = encoded.slice(1);

  if (!body) {
    return null;
  }

  try {
    const sourceBytes = fromBase64Url(body);
    const decodedBytes = mode === "z" ? await decompressBytes(sourceBytes) : sourceBytes;
    const jsonText = textDecoder.decode(decodedBytes);
    return parsePayloadObject(JSON.parse(jsonText));
  } catch (error) {
    return null;
  }
}
