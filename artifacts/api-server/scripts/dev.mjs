import { spawnSync } from "node:child_process";

process.env.NODE_ENV = "development";
process.env.PORT ||= "3000";

const pnpm = process.env.npm_execpath || "pnpm";
const pnpmCommand = pnpm.endsWith(".cjs") || pnpm.endsWith(".js") ? process.execPath : pnpm;
const pnpmArgs = pnpmCommand === process.execPath ? [pnpm] : [];

const build = spawnSync(pnpmCommand, [...pnpmArgs, "run", "build"], {
  stdio: "inherit",
  shell: process.platform === "win32" && pnpmCommand === pnpm,
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const start = spawnSync("node", ["--enable-source-maps", "./dist/index.mjs"], {
  stdio: "inherit",
  env: process.env,
});

process.exit(start.status ?? 0);
