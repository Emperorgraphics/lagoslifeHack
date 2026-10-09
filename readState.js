const fs = require("fs");

const URL_SAVE = "https://lagoslife.app/api/save";

function loadCookies(file, host = "lagoslife.app") {
  return fs.readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map(l => l.replace(/^#HttpOnly_/, ""))
    .filter(l => l && !l.startsWith("#"))
    .map(l => l.split("\t"))
    .filter(p => p.length >= 7 && host.endsWith(p[0].replace(/^\./, "")))
    .map(p => `${p[5]}=${p[6]}`)
    .join("; ");
}

(async () => {
  const headers = {
    Cookie: loadCookies("cookies.txt"),
    Origin: "https://lagoslife.app",
    Referer: "https://lagoslife.app/",
    "User-Agent": "Mozilla/5.0 (Linux; Android 14) Chrome/124 Mobile Safari/537.36",
  };

  const res = await fetch(URL_SAVE, { headers });
  if (!res.ok) throw new Error(`GET failed: ${res.status} ${await res.text()}`);
  const state = await res.json();

  fs.writeFileSync("state.json", JSON.stringify(state, null, 2));
  console.log(
    "state.json written.",
    "sim =", state.game?.sim?.name,
    "| money =", state.game?.money,
    "| updatedAt =", state.updatedAt
  );
})().catch(console.error);
