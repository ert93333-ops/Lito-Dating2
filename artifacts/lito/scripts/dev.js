const { spawnSync } = require("node:child_process");
const path = require("node:path");

process.env.__UNSAFE_EXPO_HOME_DIRECTORY ||= path.join(__dirname, "..", ".expo");

if (process.env.REPLIT_EXPO_DEV_DOMAIN) {
  process.env.EXPO_PACKAGER_PROXY_URL = `https://${process.env.REPLIT_EXPO_DEV_DOMAIN}`;
}

if (process.env.REPLIT_DEV_DOMAIN) {
  process.env.EXPO_PUBLIC_DOMAIN = process.env.REPLIT_DEV_DOMAIN;
  process.env.REACT_NATIVE_PACKAGER_HOSTNAME = process.env.REPLIT_DEV_DOMAIN;
}

if (process.env.REPL_ID) {
  process.env.EXPO_PUBLIC_REPL_ID = process.env.REPL_ID;
}

const pnpm = process.env.npm_execpath || "pnpm";
const pnpmCommand = pnpm.endsWith(".cjs") || pnpm.endsWith(".js") ? process.execPath : pnpm;
const pnpmArgs = pnpmCommand === process.execPath ? [pnpm] : [];
const port = process.env.PORT || "8081";

const result = spawnSync(
  pnpmCommand,
  [...pnpmArgs, "exec", "expo", "start", "--localhost", "--port", port],
  {
    stdio: "inherit",
    shell: process.platform === "win32" && pnpmCommand === pnpm,
    env: process.env,
  },
);

process.exit(result.status ?? 0);
