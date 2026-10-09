const fs = require("fs");

const URL_SAVE = "https://lagoslife.app/api/save";
const ADD = 200_000;
const INTERVAL_MS = 10_000;

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

const headers = {
  Cookie: loadCookies("cookies.txt"),
  "Content-Type": "application/json",
  Origin: "https://lagoslife.app",
  Referer: "https://lagoslife.app/",
  "User-Agent": "Mozilla/5.0 (Linux; Android 14) Chrome/124 Mobile Safari/537.36",
};

let stopping = false;
let wake = null;

process.on("SIGINT", () => {
  if (stopping) process.exit(1); // second Ctrl+C forces exit
  stopping = true;
  console.log("\nStopping after the current tick...");
  if (wake) wake(); // cut the sleep short
});

const sleep = ms => new Promise(res => {
  const t = setTimeout(res, ms);
  wake = () => { clearTimeout(t); res(); };
});

async function tick(n) {
  // GET current state
  const getRes = await fetch(URL_SAVE, { headers });
  if (!getRes.ok) throw new Error(`GET ${getRes.status}`);
  const save = await getRes.json();

  const before = save.game.money;
  save.game.money = before + ADD;

  // PUT { game, base }
  const putRes = await fetch(URL_SAVE, {
    method: "PUT",
    headers,
    body: JSON.stringify({ game: save.game, base: save.updatedAt }),
  });
  if (!putRes.ok) throw new Error(`PUT ${putRes.status} ${(await putRes.text()).slice(0, 200)}`);

  // GET again, save what the server actually holds
  const verifyRes = await fetch(URL_SAVE, { headers });
  if (!verifyRes.ok) throw new Error(`Verify GET ${verifyRes.status}`);
  const fresh = await verifyRes.json();
  fs.writeFileSync("state.json", JSON.stringify(fresh, null, 2));

  console.log(`#${n} money ${before} -> ${fresh.game.money}`);
}

(async () => {
  let n = 1;
  while (!stopping) {
    try {
      await tick(n++);
    } catch (e) {
      console.error("Tick failed:", e.message); // keep going, retry next tick
    }
    if (!stopping) await sleep(INTERVAL_MS);
  }
  console.log("Stopped. Last server state is in state.json.");
})();
