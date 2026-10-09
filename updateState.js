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
    "Content-Type": "application/json",
    Origin: "https://lagoslife.app",
    Referer: "https://lagoslife.app/",
    "User-Agent": "Mozilla/5.0 (Linux; Android 14) Chrome/124 Mobile Safari/537.36",
  };

  // 1. Read the edited file and pull out the game object
  const file = JSON.parse(fs.readFileSync("state.json", "utf8"));
  const game = file.game;
  fs.copyFileSync("state.json", "state.prev.json"); // keep your edited copy

  // 2. Get the server's current updatedAt to use as base
  const getRes = await fetch(URL_SAVE, { headers });
  if (!getRes.ok) throw new Error(`GET failed: ${getRes.status}`);
  const current = await getRes.json();

  // 3. PUT { game, base }
  const putRes = await fetch(URL_SAVE, {
    method: "PUT",
    headers,
    body: JSON.stringify({ game, base: current.updatedAt }),
  });
  const putText = await putRes.text();
  if (!putRes.ok) throw new Error(`PUT failed: ${putRes.status} ${putText}`);
  console.log("Saved:", putRes.status, putText.slice(0, 200));

  // 4. GET again and write what the server now holds to state.json
  const verifyRes = await fetch(URL_SAVE, { headers });
  if (!verifyRes.ok) throw new Error(`Verify GET failed: ${verifyRes.status}`);
  const newState = await verifyRes.json();
  fs.writeFileSync("state.json", JSON.stringify(newState, null, 2));
  console.log("updated state");
})().catch(console.error);
