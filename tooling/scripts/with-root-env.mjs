import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { config } from "dotenv";

const root = path.resolve(import.meta.dirname, "../..");
const envFile = path.join(root, ".env");
if (existsSync(envFile)) config({ path: envFile });

const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error("A command is required.");

const child = spawn(command, args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
