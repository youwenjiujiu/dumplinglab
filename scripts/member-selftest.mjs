import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createMemberService } from "../web/server/member-core.js";

const emailUser = { id: "email-member", email: "member@example.test", email_confirmed_at: "2026-09-10T00:00:00Z" };
const phoneUser = { id: "phone-member", phone: "+6581234567", phone_confirmed_at: "2026-09-10T00:00:00Z" };
const makeSession = (user, token = "signed.test.token") => ({ user, access_token: token, expires_in: 7200, refresh_token: "must-not-leak" });
let calls = [], forcedStatus = 200, unverified = false;
const fetcher = async (url, options) => {
  calls.push({ url, options });
  const input = options.body ? JSON.parse(options.body) : {};
  const user = input.phone ? { ...phoneUser, ...(unverified ? { phone_confirmed_at: null } : {}) } : { ...emailUser, ...(unverified ? { email_confirmed_at: null } : {}) };
  let output = {};
  if (url.endsWith("/user")) output = emailUser;
  if (url.endsWith("/verify")) output = makeSession(user);
  if (url.includes("/token?grant_type=password")) output = makeSession(emailUser, "password.signed.token");
  if (url.includes("/token?grant_type=pkce")) output = makeSession(emailUser, "oauth.signed.token");
  return { ok: forcedStatus === 200, status: forcedStatus, json: async () => output };
};
const service = createMemberService({
  origin: "https://shop.example.test", authUrl: "https://auth.example.test", anonKey: "public-test-key",
  googleEnabled: true, appleEnabled: true, phoneEnabled: true, fetcher,
});
const headers = { origin: "https://shop.example.test", "content-type": "application/json" };
const post = (body) => service.handle({ method: "POST", headers, body });

const unavailable = await createMemberService({}).handle({ method: "GET" });
assert.equal(unavailable.body.loginReady, false);
assert.equal(unavailable.body.member, null);
assert.deepEqual(unavailable.body.authMethods, { email: false, password: false, phone: false, google: false, apple: false });
const capability = await service.handle({ method: "GET" });
assert.deepEqual(capability.body.authMethods, { email: true, password: true, phone: true, google: true, apple: true });

await assert.rejects(service.handle({ method: "POST", headers: { ...headers, origin: "https://attacker.test" }, body: { action: "send-code" } }), (error) => error.status === 403);
assert.equal(calls.length, 0);
await assert.rejects(post({ action: "send-code", email: "member@example.test", consent: false }), (error) => error.status === 400);
assert.equal(calls.length, 0);

await post({ action: "send-code", method: "email", email: " Member@Example.test ", consent: true });
assert.equal(JSON.parse(calls.at(-1).options.body).email, "member@example.test");
const emailLogin = await post({ action: "verify", method: "email", email: "member@example.test", consent: true, code: "123456" });
assert.match(emailLogin.cookie, /HttpOnly; SameSite=Lax; Max-Age=3600; Secure/);
assert(!JSON.stringify(emailLogin.body).includes("token"));
assert(!JSON.stringify(emailLogin).includes("must-not-leak"));

await post({ action: "send-code", method: "phone", phone: "+65 8123 4567", consent: true });
assert.deepEqual(JSON.parse(calls.at(-1).options.body), { phone: "+6581234567", create_user: true });
const phoneLogin = await post({ action: "verify", method: "phone", phone: "+65 8123 4567", consent: true, code: "123456" });
assert.equal(phoneLogin.body.member.phone, "+6581234567");
assert.equal(JSON.parse(calls.at(-1).options.body).type, "sms");

const passwordLogin = await post({ action: "password-login", email: "member@example.test", password: "correct horse", consent: true });
assert.equal(passwordLogin.body.member.email, emailUser.email);
assert.match(passwordLogin.cookie, /^dl-member=password\.signed\.token;/);
assert.deepEqual(JSON.parse(calls.at(-1).options.body), { email: "member@example.test", password: "correct horse" });
const signup = await post({ action: "password-signup", email: "member@example.test", password: "new password", consent: true });
assert.equal(signup.body.confirmationRequired, true);
assert.match(signup.cookie, /^dl-member-signup=[\w-]+;/);
const signupCall = calls.at(-1);
assert(new URL(signupCall.url).searchParams.get("redirect_to").endsWith("/api/member?action=signup-callback"));
assert.equal(JSON.parse(signupCall.options.body).code_challenge_method, "s256");
const recovery = await post({ action: "forgot-password", email: "member@example.test", lang: "en", consent: true });
assert.match(recovery.cookie, /^dl-member-recovery=en\.[\w-]+;/);
assert(new URL(calls.at(-1).url).searchParams.get("redirect_to").endsWith("/api/member?action=recovery-callback"));
await service.handle({ method: "POST", headers: { ...headers, cookie: "dl-member=recovery.signed.token" }, body: { action: "reset-password", password: "updated password", consent: true } });
assert.equal(calls.at(-1).options.method, "PUT");
assert.deepEqual(JSON.parse(calls.at(-1).options.body), { password: "updated password" });

const oauth = await post({ action: "oauth", provider: "google", consent: true });
const authorize = new URL(oauth.body.url);
assert.equal(authorize.origin, "https://auth.example.test");
assert.equal(authorize.pathname, "/auth/v1/authorize");
assert.equal(authorize.searchParams.get("provider"), "google");
assert.equal(authorize.searchParams.get("redirect_to"), "https://shop.example.test/api/member?action=oauth-callback");
assert.equal(authorize.searchParams.get("code_challenge_method"), "s256");
assert.match(oauth.cookie, /^dl-member-oauth=google:[\w-]+; Path=\/api\/member; HttpOnly;/);
const verifier = oauth.cookie.match(/^dl-member-oauth=google:([\w-]+)/)[1];
assert.equal(authorize.searchParams.get("code_challenge"), createHash("sha256").update(verifier).digest("base64url"));
const callback = await service.handle({ method: "GET", headers: { cookie: `dl-member-oauth=google:${verifier}` }, query: { action: "oauth-callback", code: "provider-auth-code" } });
assert.equal(callback.redirect, "https://shop.example.test/order?member=1");
assert.equal(callback.cookies.length, 2);
assert.match(callback.cookies[0], /^dl-member=oauth\.signed\.token;/);
assert.match(callback.cookies[1], /^dl-member-oauth=; Path=\/api\/member;.*Max-Age=0/);
assert.deepEqual(JSON.parse(calls.at(-1).options.body), { auth_code: "provider-auth-code", code_verifier: verifier });
assert(!JSON.stringify(callback).includes("must-not-leak"));

const profile = await service.handle({ method: "GET", headers: { cookie: "dl-member=signed.test.token" } });
assert.equal(profile.body.member.id, emailUser.id);
assert.equal(calls.at(-1).options.headers.authorization, "Bearer signed.test.token");
assert.equal(profile.body.points, undefined, "Auth endpoint does not invent a balance");
forcedStatus = 401;
const expired = await service.handle({ method: "GET", headers: { cookie: "dl-member=expired.token" } });
assert.equal(expired.body.member, null);
assert.match(expired.cookie, /Max-Age=0/);
forcedStatus = 429;
await assert.rejects(post({ action: "send-code", method: "email", email: "member@example.test", consent: true }), (error) => error.status === 429);
forcedStatus = 200;
unverified = true;
await assert.rejects(post({ action: "verify", method: "phone", phone: "+6581234567", consent: true, code: "123456" }), (error) => error.status === 401);
unverified = false;
const count = calls.length;
const logout = await post({ action: "logout" });
assert.match(logout.cookie, /Max-Age=0/);
assert.equal(calls.length, count);
console.log("PASS member auth: password sign-in/sign-up/reset, email/phone OTP, Google/Apple, PKCE callbacks, origin validation, secure cookies, no client tokens, rate limits and logout; no live calls.");
