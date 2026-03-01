import { DEFAULT_DESC, DEFAULT_TITLE, buildShareUrl } from "./shared.js";

const titleInput = document.getElementById("titleInput");
const descInput = document.getElementById("descInput");
const shareUrlInput = document.getElementById("shareUrl");
const buildButton = document.getElementById("buildButton");
const copyButton = document.getElementById("copyButton");
const previewLink = document.getElementById("previewLink");

const launcher = document.getElementById("launcher");
const celebration = document.getElementById("celebration");

function setLauncherMode() {
  launcher.classList.remove("hidden");
  celebration.classList.add("hidden");
  document.body.classList.remove("is-celebrating");
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

function onCopySuccess() {
  copyButton.textContent = "コピー済み";
  window.setTimeout(() => {
    copyButton.textContent = "コピー";
  }, 1200);
}

function copyShareUrlWithFallback() {
  shareUrlInput.select();
  document.execCommand("copy");
  onCopySuccess();
}

function setupEvents() {
  buildButton.addEventListener("click", updateShareLink);

  copyButton.addEventListener("click", () => {
    if (!shareUrlInput.value) {
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrlInput.value).then(onCopySuccess).catch(() => {
        copyShareUrlWithFallback();
      });
      return;
    }

    try {
      copyShareUrlWithFallback();
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
}

function init() {
  setLauncherMode();
  setupEvents();
  titleInput.value = DEFAULT_TITLE;
  descInput.value = DEFAULT_DESC;
  updateShareLink();
}

init();
