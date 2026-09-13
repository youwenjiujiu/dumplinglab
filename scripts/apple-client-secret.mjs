// Apple does not hand out a lasting OAuth secret. It hands out a signing key,
// and the "secret" is a short-lived JWT you sign yourself — six months at most,
// so this has to be re-run before every expiry. The .p8 stays on disk and never
// travels through a chat, a commit or a browser form.
//
//   node scripts/apple-client-secret.mjs \
//     --key ~/Downloads/AuthKey_ABC1234567.p8 \
//     --key-id ABC1234567 --team-id DEF7654321 \
//     --services-id sg.dumplinglab.web
import { readFile } from "node:fs/promises";
import { createSign, createPrivateKey } from "node:crypto";
import { homedir } from "node:os";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, part, i, all) =>
    part.startsWith("--") ? [...pairs, [part.slice(2), all[i + 1]]] : pairs, []),
);
const missing = ["key", "key-id", "team-id", "services-id"].filter((k) => !args[k]);
if (missing.length) {
  console.error(`缺少参数：${missing.map((k) => "--" + k).join(" ")}`);
  console.error(`
用法：
  node scripts/apple-client-secret.mjs \\
    --key <AuthKey_XXXXXXXXXX.p8 的路径> \\
    --key-id <Key ID，10 位> \\
    --team-id <Team ID，10 位，在开发者后台右上角> \\
    --services-id <Services ID，例如 sg.dumplinglab.web>
`);
  process.exit(1);
}

const base64url = (input) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const pem = await readFile(args.key.replace(/^~/, homedir()), "utf8");
const privateKey = createPrivateKey(pem);

// Apple caps the lifetime at six months and rejects anything longer.
const issuedAt = Math.floor(Date.now() / 1000);
const expiresAt = issuedAt + 180 * 24 * 60 * 60;
const header = base64url(JSON.stringify({ alg: "ES256", kid: args["key-id"] }));
const payload = base64url(JSON.stringify({
  iss: args["team-id"],
  iat: issuedAt,
  exp: expiresAt,
  aud: "https://appleid.apple.com",
  sub: args["services-id"],
}));

// JWS wants the raw r‖s pair, not the DER structure Node signs with by default.
const signature = createSign("SHA256")
  .update(`${header}.${payload}`)
  .sign({ key: privateKey, dsaEncoding: "ieee-p1363" })
  .toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

console.log(`${header}.${payload}.${signature}`);
console.error(`
↑ 这一串贴进 Supabase → Authentication → Providers → Apple → Secret Key
   Client IDs 那一栏填：${args["services-id"]}
   有效期至：${new Date(expiresAt * 1000).toLocaleDateString("zh-SG", { dateStyle: "long" })}（到期前重跑本脚本换新的）
`);
