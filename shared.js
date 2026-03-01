const PAYLOAD_VERSION = 1;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const DEFAULT_TITLE = "めでたい！！おめでとう！！";
export const DEFAULT_DESC = "すてきな日を、めいっぱい祝おう。";

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

async function encodeSharePayload({ title, desc }) {
  const plainJson = JSON.stringify(encodePayloadObject(title, desc));
  const plainBytes = textEncoder.encode(plainJson);
  const compressedBytes = await compressBytes(plainBytes);

  if (compressedBytes && compressedBytes.length < plainBytes.length) {
    return `z${toBase64Url(compressedBytes)}`;
  }

  return `n${toBase64Url(plainBytes)}`;
}

async function decodeSharePayload(encoded) {
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

function decodeMessage(rawText) {
  try {
    return decodeURIComponent(rawText.replace(/\+/g, " ")).trim();
  } catch (error) {
    return rawText.trim();
  }
}

function getFirstNonEmptyParam(params, keys) {
  for (const key of keys) {
    const value = params.get(key);
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

function getLegacyTitleFromSearch(search) {
  if (search.startsWith("?=") && search.length > 2) {
    return decodeMessage(search.slice(2));
  }

  const raw = search.startsWith("?") ? search.slice(1) : "";
  if (raw && !raw.includes("=")) {
    return decodeMessage(raw);
  }

  return "";
}

function getSharePagePath(pathname) {
  const withoutIndex = pathname.replace(/\/index\.html$/, "");
  const normalized = withoutIndex.replace(/\/$/, "");
  if (normalized.endsWith("/s")) {
    return `${normalized}/`;
  }

  return `${normalized}/s/`;
}

async function decodePackedPayload(rawValue) {
  if (!rawValue) {
    return null;
  }

  const decoded = await decodeSharePayload(rawValue);
  if (decoded && (decoded.title || decoded.desc)) {
    return decoded;
  }

  return null;
}

export async function buildShareUrl(title, desc, href = window.location.href) {
  const current = new URL(href);
  current.search = "";
  current.hash = "";
  current.pathname = getSharePagePath(current.pathname);

  const hashParams = new URLSearchParams();
  hashParams.set("p", await encodeSharePayload({ title, desc }));
  current.hash = hashParams.toString();
  return current.toString();
}

export async function getCelebrationContentFromLocation(
  locationObject = window.location,
  options = {},
) {
  if (options.useHash) {
    const rawHash = (locationObject.hash || "").replace(/^#/, "");
    const hashParams = new URLSearchParams(rawHash);
    const packedFromHash = getFirstNonEmptyParam(hashParams, ["p", "payload"]);
    const fromHash = await decodePackedPayload(packedFromHash);
    if (fromHash) {
      return fromHash;
    }
  }

  const queryParams = new URLSearchParams(locationObject.search || "");
  const packedFromQuery = getFirstNonEmptyParam(queryParams, ["p", "payload"]);
  const fromQuery = await decodePackedPayload(packedFromQuery);
  if (fromQuery) {
    return fromQuery;
  }

  const titleFromParams = getFirstNonEmptyParam(queryParams, ["title", "t", "msg", "m", "text", ""]);
  const descFromParams = getFirstNonEmptyParam(queryParams, ["desc", "d", "description"]);

  return {
    title: titleFromParams || getLegacyTitleFromSearch(locationObject.search || ""),
    desc: descFromParams,
  };
}
