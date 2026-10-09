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
  const cookies = loadCookies("cookies.txt");

  if (!cookies) {
    throw new Error("No matching cookies found in cookies.txt");
  }

  const headers = {
    Cookie: cookies,
    "Content-Type": "application/json",
    Origin: "https://lagoslife.app",
    Referer: "https://lagoslife.app/",
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 14) Chrome/124 Mobile Safari/537.36",
  };

  // 1. Read the edited save file.
  const file = JSON.parse(
    fs.readFileSync("state.json", "utf8")
  );

  if (!file.game) {
    throw new Error("state.json does not contain a game object");
  }

  const game = file.game;

  // Preserve the edited file before making changes.
  fs.copyFileSync("state.json", "state.prev.json");

  // 2. Retrieve the current server state.
  const getRes = await fetch(URL_SAVE, { headers });
  const getText = await getRes.text();

  if (!getRes.ok) {
    throw new Error(
      `GET failed: ${getRes.status} ${getText}`
    );
  }

  let current;

  try {
    current = JSON.parse(getText);
  } catch {
    throw new Error("GET returned invalid JSON: " + getText);
  }

  if (current.updatedAt == null) {
    throw new Error("Server response does not contain updatedAt");
  }

  // 3. Submit the edited game object.
  const putRes = await fetch(URL_SAVE, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      game,
      base: current.updatedAt,
    }),
  });

  // Read the response body exactly once.
  const putText = await putRes.text();

  if (!putRes.ok) {
    console.error("❌ PUT failed");
    console.error("HTTP status:", putRes.status);
    console.error("Server response:", putText);

    throw new Error(
      `PUT failed with HTTP ${putRes.status}`
    );
  }

  console.log("✅ PUT request accepted:", putRes.status);
  console.log("Server response:", putText.slice(0, 500));

  // 4. Verify the resulting server state.
  const verifyRes = await fetch(URL_SAVE, { headers });
  const verifyText = await verifyRes.text();

  if (!verifyRes.ok) {
    throw new Error(
      `Verify GET failed: ${verifyRes.status} ${verifyText}`
    );
  }

  let newState;

  try {
    newState = JSON.parse(verifyText);
  } catch {
    throw new Error("Verification returned invalid JSON");
  }

  fs.writeFileSync(
    "state.json",
    JSON.stringify(newState, null, 2)
  );

  console.log("✅ Verification successful.");
  console.log("Updated state.json with the server's current save.");
})().catch(err => {
  console.error("❌ Error:", err.message);
  process.exitCode = 1;
});