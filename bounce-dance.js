
async function main() {
  try {
    console.log("[INFO] Fetching current save...");

    const save = await getSave();
    const SAVE_URL = "https://lagoslife.app/api/save"

    if (!save?.game?.skills) {
      throw new Error("Save response is missing game.skills.");
    }

    const previousDance = save.game.skills.dance;
    save.game.skills.dance = NEW_DANCE_LEVEL;

    const payload = {
      game: save.game,
      base: Date.now()
    };

    console.log(
      `[INFO] Updating dance: ${previousDance} -> ${NEW_DANCE_LEVEL}`
    );

    const putResponse = await fetch(SAVE_URL, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const putText = await putResponse.text();

    if (!putResponse.ok) {
      console.error(
        `[FAIL] PUT request failed: HTTP ${putResponse.status}`,
        putText
      );
      return;
    }

    console.log(
      `[SUCCESS] PUT request accepted (HTTP ${putResponse.status}).`
    );

    console.log("[INFO] Verifying updated save...");

    const verifiedSave = await getSave();
    const actualDance = verifiedSave?.game?.skills?.dance;

    if (actualDance === NEW_DANCE_LEVEL) {
      console.log(
        `[SUCCESS] Dance level verified: ${actualDance}.`
      );
    } else {
      console.error(
        `[FAIL] Dance level verification failed. Expected ${NEW_DANCE_LEVEL}, received ${actualDance}.`
      );
    }

    fs.writeFileSync(
      "updated-save.json",
      JSON.stringify(verifiedSave, null, 2),
      "utf8"
    );

    console.log("[SUCCESS] Latest save written to updated-save.json.");
  } catch (error) {
    console.error("[FAIL] Script failed:", error.message);
    process.exitCode = 1;
  }
}