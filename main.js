import { decodeSharePayload, encodeSharePayload } from "./sharePayload.js";

const DEFAULT_TITLE = "めでたい！！おめでとう！！";
const DEFAULT_DESC = "すてきな日を、めいっぱい祝おう。";

const titleInput = document.getElementById("titleInput");
const descInput = document.getElementById("descInput");
const shareUrlInput = document.getElementById("shareUrl");
const buildButton = document.getElementById("buildButton");
const copyButton = document.getElementById("copyButton");
const previewLink = document.getElementById("previewLink");

const launcher = document.getElementById("launcher");
const celebration = document.getElementById("celebration");
const celebrationMessage = document.getElementById("celebrationMessage");
const celebrationDescription = document.getElementById("celebrationDescription");
const confettiLayer = document.getElementById("confettiLayer");

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

function getLegacyTitleFromQuery() {
  const search = window.location.search;
  if (search.startsWith("?=") && search.length > 2) {
    return decodeMessage(search.slice(2));
  }

  const raw = search.startsWith("?") ? search.slice(1) : "";
  if (raw && !raw.includes("=")) {
    return decodeMessage(raw);
  }

  return "";
}

async function getCelebrationContentFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const packedPayload = getFirstNonEmptyParam(params, ["p", "payload"]);
  if (packedPayload) {
    const decoded = await decodeSharePayload(packedPayload);
    if (decoded && (decoded.title || decoded.desc)) {
      return decoded;
    }
  }

  const titleFromParams = getFirstNonEmptyParam(params, ["title", "t", "msg", "m", "text", ""]);
  const descFromParams = getFirstNonEmptyParam(params, ["desc", "d", "description"]);

  return {
    title: titleFromParams || getLegacyTitleFromQuery(),
    desc: descFromParams,
  };
}

async function buildShareUrl(title, desc) {
  const current = new URL(window.location.href);
  current.search = "";
  current.hash = "";
  const params = new URLSearchParams();
  params.set("p", await encodeSharePayload({ title, desc }));
  current.search = params.toString();
  return current.toString();
}

function setLauncherMode() {
  launcher.classList.remove("hidden");
  celebration.classList.add("hidden");
  document.body.classList.remove("is-celebrating");
}

function createConfettiPiece() {
  const element = document.createElement("span");
  const isStar = Math.random() > 0.72;
  element.className = isStar ? "confetti star" : "confetti";
  element.style.setProperty("--left", (Math.random() * 100).toFixed(2));
  element.style.setProperty("--size", String(8 + Math.random() * 16));
  element.style.setProperty("--hue", String(Math.floor(Math.random() * 360)));
  element.style.setProperty("--delay", String((-Math.random() * 8).toFixed(2)));
  element.style.setProperty("--duration", String((5 + Math.random() * 8).toFixed(2)));
  element.style.setProperty("--drift", String((-80 + Math.random() * 160).toFixed(0)));
  element.style.setProperty("--spin", String((-180 + Math.random() * 360).toFixed(0)));
  return element;
}

function fillConfetti(count) {
  confettiLayer.innerHTML = "";
  for (let index = 0; index < count; index += 1) {
    confettiLayer.append(createConfettiPiece());
  }
}

function setCelebrationMode(title, desc) {
  launcher.classList.add("hidden");
  celebration.classList.remove("hidden");
  celebrationMessage.textContent = title || DEFAULT_TITLE;
  celebrationDescription.textContent = desc || DEFAULT_DESC;
  document.body.classList.add("is-celebrating");
  fillConfetti(window.innerWidth < 768 ? 72 : 120);
}

let shareUpdateToken = 0;

async function updateShareLink() {
  const title = titleInput.value.trim();
  const desc = descInput.value.trim();
  const updateToken = shareUpdateToken + 1;
  shareUpdateToken = updateToken;

  if (!title) {
    shareUrlInput.value = "";
    previewLink.removeAttribute("href");
    return;
  }

  try {
    const shareUrl = await buildShareUrl(title, desc);
    if (updateToken !== shareUpdateToken) {
      return;
    }

    shareUrlInput.value = shareUrl;
    previewLink.href = shareUrl;
  } catch (error) {
    shareUrlInput.value = "";
    previewLink.removeAttribute("href");
  }
}

function blockScrollWhenCelebrating(event) {
  if (document.body.classList.contains("is-celebrating")) {
    event.preventDefault();
  }
}

buildButton.addEventListener("click", updateShareLink);
copyButton.addEventListener("click", () => {
  if (!shareUrlInput.value) {
    return;
  }

  const onCopySuccess = () => {
    copyButton.textContent = "コピー済み";
    window.setTimeout(() => {
      copyButton.textContent = "コピー";
    }, 1200);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(shareUrlInput.value)
      .then(onCopySuccess)
      .catch(() => {
        shareUrlInput.select();
        document.execCommand("copy");
        onCopySuccess();
      });
    return;
  }

  try {
    shareUrlInput.select();
    document.execCommand("copy");
    onCopySuccess();
  } catch (error) {
    copyButton.textContent = "手動コピーしてね";
  }
});

titleInput.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    updateShareLink();
  }
});
descInput.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    updateShareLink();
  }
});
titleInput.addEventListener("input", updateShareLink);
descInput.addEventListener("input", updateShareLink);

window.addEventListener("resize", () => {
  if (document.body.classList.contains("is-celebrating")) {
    fillConfetti(window.innerWidth < 768 ? 72 : 120);
  }
});
window.addEventListener("wheel", blockScrollWhenCelebrating, { passive: false });
window.addEventListener("touchmove", blockScrollWhenCelebrating, { passive: false });

async function init() {
  const queryContent = await getCelebrationContentFromQuery();
  if (queryContent.title || queryContent.desc) {
    setCelebrationMode(queryContent.title, queryContent.desc);
    return;
  }

  setLauncherMode();
  titleInput.value = DEFAULT_TITLE;
  descInput.value = DEFAULT_DESC;
  updateShareLink();
}

init().catch(() => {
  setLauncherMode();
  titleInput.value = DEFAULT_TITLE;
  descInput.value = DEFAULT_DESC;
  updateShareLink();
});
