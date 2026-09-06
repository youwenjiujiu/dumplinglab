// A separate protected deployment with a temporary STAFF password. Never promote
// this deployment. Does not modify the project's stored Production password.
import { mkdtemp, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
const release = process.argv[2];
if (!release || !/\/dumplinglab-release-[A-Za-z0-9]+$/.test(release)) throw new Error("Pass a fresh release directory");
const directory = await mkdtemp(resolve(tmpdir(), "dumplinglab-acceptance-auth-"));
const secret = randomBytes(32).toString("base64url");
await writeFile(resolve(directory, "acceptance.env"), `DL_STAFF_PASSWORD=${JSON.stringify(secret)}\n`, { mode: 0o600 });
console.log(`Acceptance credentials file: ${resolve(directory, "acceptance.env")}`);
console.log("DO NOT PROMOTE this acceptance-only deployment.");
const child = spawn("vercel", ["deploy", "--prod", "--skip-domain", "--yes", "--env", `DL_STAFF_PASSWORD=${secret}`, "--meta", "acceptanceOnly=true"], { cwd: release, stdio: "inherit" });
child.on("exit", code => process.exit(code || 0));
