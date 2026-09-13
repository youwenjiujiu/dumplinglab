// mono-color: two-ink editorial print from our own dish photograph, via gpt-image-1 edits.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
const key = process.env.OPENAI_API_KEY || execFileSync("security", ["find-generic-password","-s","dumplinglab-openai","-w"], { encoding:"utf8" }).trim();
const [src, out, promptFile, size = "1024x1536"] = process.argv.slice(2);
const prompt = readFileSync(promptFile, "utf8");
const flat = await sharp(src).flatten({ background: "#FAFAF7" }).resize(1024, 1024, { fit: "contain", background: "#FAFAF7" }).png().toBuffer();
const form = new FormData();
form.append("model", "gpt-image-1"); form.append("prompt", prompt); form.append("size", size); form.append("quality", "high"); form.append("background", "opaque");
form.append("image", new File([flat], "source.png", { type: "image/png" }));
const res = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { authorization: `Bearer ${key}` }, body: form });
const data = await res.json();
if (!res.ok) { console.error(data.error?.message || res.status); process.exit(1); }
writeFileSync(out, Buffer.from(data.data[0].b64_json, "base64"));
console.log("wrote", out);
