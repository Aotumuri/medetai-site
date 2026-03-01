import { DEFAULT_DESC, DEFAULT_TITLE, getCelebrationContentFromLocation } from "../shared.js";

const celebration = document.getElementById("celebration");
const celebrationMessage = document.getElementById("celebrationMessage");
const celebrationDescription = document.getElementById("celebrationDescription");
const confettiLayer = document.getElementById("confettiLayer");

function getConfettiCount() {
  return window.innerWidth < 768 ? 72 : 120;
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
  celebration.classList.remove("hidden");
  celebrationMessage.textContent = title || DEFAULT_TITLE;
  celebrationDescription.textContent = desc || DEFAULT_DESC;
  document.body.classList.add("is-celebrating");
  fillConfetti(getConfettiCount());
}

function blockScrollWhenCelebrating(event) {
  if (document.body.classList.contains("is-celebrating")) {
    event.preventDefault();
  }
}

function setupEvents() {
  window.addEventListener("resize", () => {
    if (document.body.classList.contains("is-celebrating")) {
      fillConfetti(getConfettiCount());
    }
  });
  window.addEventListener("wheel", blockScrollWhenCelebrating, { passive: false });
  window.addEventListener("touchmove", blockScrollWhenCelebrating, { passive: false });
}

async function init() {
  setupEvents();
  const queryContent = await getCelebrationContentFromLocation(window.location, { useHash: true });
  setCelebrationMode(queryContent.title || DEFAULT_TITLE, queryContent.desc || DEFAULT_DESC);
}

init().catch(() => {
  setCelebrationMode(DEFAULT_TITLE, DEFAULT_DESC);
});
