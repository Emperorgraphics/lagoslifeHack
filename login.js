const fs = require("fs");
const readline = require("readline");

const LOGIN_URL = "https://lagoslife.app/api/auth/login";
const HOST = "lagoslife.app";

function ask(question, hidden = false) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = s => {
        if (s.includes(question)) process.stdout.write(s);
      };
    }
    rl.question(question, answer => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    });
  });
}

// Convert one Set-Cookie header into a Netscape cookies.txt line
function toNetscape(setCookie) {
  const parts = setCookie.split(";").map(s => s.trim());
  const [name, ...v] = parts[0].split("=");
  const value = v.join("=");
  const attrs = {};
  for (const p of parts.slice(1)) {
    const [k, ...rest] = p.split("=");
    attrs[k.toLowerCase()] = rest.join("=") || true;
  }
  const domain = (attrs.domain || HOST).toString();
  const path = (attrs.path || "/").toString();
  const secure = attrs.secure ? "TRUE" : "FALSE";
  let expiry = 0;
  if (attrs["max-age"]) expiry = Math.floor(Date.now() / 1000) + parseInt(attrs["max-age"], 10);
  else if (attrs.expires) expiry = Math.floor(new Date(attrs.expires).getTime() / 1000) || 0;
  const prefix = attrs.httponly ? "#HttpOnly_" : "";
  const sub = domain.startsWith(".") ? "TRUE" : "FALSE";
  return `${prefix}${domain}\t${sub}\t${path}\t${secure}\t${expiry}\t${name}\t${value}`;
}

(async () => {
  const username = await ask("Username: ");
  const password = await ask("Password: ", true);

  const res = await fetch(LOGIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://lagoslife.app",
      Referer: "https://lagoslife.app/",
      "User-Agent": "Mozilla/5.0 (Linux; Android 14) Chrome/124 Mobile Safari/537.36",
    },
    body: JSON.stringify({ username, password }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${text.slice(0, 200)}`);

  const setCookies = res.headers.getSetCookie();
  if (!setCookies.length) throw new Error("Login OK but no cookies were returned.");

  const lines = [
    "# Netscape HTTP Cookie File",
    ...setCookies.map(toNetscape),
  ];
  fs.writeFileSync("cookies.txt", lines.join("\n") + "\n", { mode: 0o600 });
  console.log(`Logged in. Saved ${setCookies.length} cookie(s) to cookies.txt`);
})().catch(e => console.error(e.message));
