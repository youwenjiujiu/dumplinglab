// Verified CanCan identity. Restaurant rewards live in their own server ledger.
import { createHash, randomBytes } from "node:crypto";
import { RequestError } from "./order-core.js";

const sessionCookie = "dl-member";
const oauthCookie = "dl-member-oauth";
const signupCookie = "dl-member-signup";
const recoveryCookie = "dl-member-recovery";

export function createMemberService({
  origin,
  authUrl,
  anonKey,
  googleEnabled = false,
  appleEnabled = false,
  phoneEnabled = false,
  fetcher = fetch,
}) {
  const configured = Boolean(origin && authUrl && anonKey);
  const secure = origin?.startsWith("https://");
  const authMethods = {
    email: configured,
    password: configured,
    phone: configured && phoneEnabled,
    google: configured && googleEnabled,
    apple: configured && appleEnabled,
  };
  const cookie = (name, value, age = 0, path = "/") =>
    `${name}=${value}; Path=${path}; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? "; Secure" : ""}`;
  const cookieOf = (headers, name) =>
    String(headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(name + "="))
      ?.slice(name.length + 1);
  const tokenOf = (headers) => {
    const value = cookieOf(headers, sessionCookie);
    return value && /^[\w.-]+$/.test(value) && value.length < 12000
      ? value
      : null;
  };
  async function provider(path, body, token, method = body ? "POST" : "GET") {
    let response;
    try {
      response = await fetcher(`${authUrl}/auth/v1/${path}`, {
        method,
        headers: {
          apikey: anonKey,
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });
    } catch {
      throw new RequestError("会员服务暂时无法连接，请稍后重试", 503);
    }
    if (!response.ok) {
      if (response.status === 429)
        throw new RequestError("请求较频繁，请稍后再试", 429);
      if (path === "verify")
        throw new RequestError("验证码不正确或已过期，请重新获取", 400);
      if (path.startsWith("token?grant_type=password") && [400, 401].includes(response.status))
        throw new RequestError("邮箱或密码不正确", 400);
      if (path === "user" && method === "GET" && [401, 403].includes(response.status)) return null;
      if (path === "user" && method === "PUT")
        throw new RequestError("密码未能更新，请检查密码要求", 400);
      if (path.startsWith("signup"))
        throw new RequestError("暂时无法注册，请检查邮箱或稍后再试", 400);
      throw new RequestError("会员服务暂时不可用，请稍后重试", 503);
    }
    return response.status === 204 ? {} : response.json();
  }
  function publicUser(user) {
    if (!user?.id || (!user.email_confirmed_at && !user.phone_confirmed_at))
      return null;
    return { id: user.id, email: user.email || null, phone: user.phone || null };
  }
  function sessionResult(session, expected = {}) {
    const user = publicUser(session.user);
    if (
      !user ||
      (expected.email && user.email?.toLowerCase() !== expected.email) ||
      (expected.phone && user.phone !== expected.phone) ||
      !/^[\w.-]+$/.test(session.access_token || "")
    )
      throw new RequestError("验证未完成，请重试", 401);
    const age = Math.min(3600, Math.max(0, Math.floor(Number(session.expires_in) || 0)));
    if (!age) throw new RequestError("登录已过期，请重试", 401);
    return { user, cookie: cookie(sessionCookie, session.access_token, age) };
  }
  async function identity(headers = {}) {
    const token = tokenOf(headers);
    return configured && token ? publicUser(await provider("user", null, token)) : null;
  }
  async function session(headers = {}) {
    const accessToken = tokenOf(headers);
    if (!configured || !accessToken) return null;
    const member = publicUser(await provider("user", null, accessToken));
    return member ? { member, accessToken } : null;
  }
  return {
    configured,
    authMethods,
    identity,
    session,
    async handle({ method, headers = {}, body = {}, query = {} }) {
      if (method === "GET" && ["signup-callback", "recovery-callback"].includes(query.action)) {
        if (!configured) throw new RequestError("会员登录尚未开放", 503);
        const isRecovery = query.action === "recovery-callback";
        const flowCookie = isRecovery ? recoveryCookie : signupCookie;
        const savedFlow = cookieOf(headers, flowCookie) || "";
        const recoveryFlow = isRecovery ? savedFlow.match(/^(en|zh)\.([\w-]+)$/) : null;
        const verifier = recoveryFlow ? recoveryFlow[2] : savedFlow;
        const code = String(query.code || "");
        if (!/^[\w-]{32,128}$/.test(verifier) || !code || code.length > 4096)
          throw new RequestError(isRecovery ? "重置链接无效或已过期" : "验证链接无效或已过期", 400);
        const result = sessionResult(
          await provider("token?grant_type=pkce", { auth_code: code, code_verifier: verifier }),
        );
        return {
          redirect: `${origin}/order?${isRecovery ? `lang=${recoveryFlow?.[1] || "zh"}&reset_password=1` : "member=1"}`,
          cookies: [result.cookie, cookie(flowCookie, "", 0, "/api/member")],
        };
      }
      if (method === "GET" && query.action === "oauth-callback") {
        if (!configured) throw new RequestError("会员登录尚未开放", 503);
        const saved = cookieOf(headers, oauthCookie) || "";
        const divider = saved.indexOf(":");
        const providerName = saved.slice(0, divider);
        const verifier = saved.slice(divider + 1);
        const code = String(query.code || "");
        if (
          !["google", "apple"].includes(providerName) ||
          !/^[\w-]{32,128}$/.test(verifier) ||
          !code ||
          code.length > 4096
        )
          throw new RequestError("登录链接无效，请重新登录", 400);
        const result = sessionResult(
          await provider("token?grant_type=pkce", { auth_code: code, code_verifier: verifier }),
        );
        return {
          redirect: `${origin}/order?member=1`,
          cookies: [result.cookie, cookie(oauthCookie, "", 0, "/api/member")],
        };
      }
      if (method === "GET") {
        const token = tokenOf(headers);
        const user = configured && token ? publicUser(await provider("user", null, token)) : null;
        return {
          body: { ok: true, loginReady: configured, authMethods, member: user },
          ...(token && !user ? { cookie: cookie(sessionCookie, "") } : {}),
        };
      }
      if (method !== "POST") throw new RequestError("Method not allowed", 405);
      if (
        !origin ||
        headers.origin !== origin ||
        !String(headers["content-type"] || "").startsWith("application/json")
      )
        throw new RequestError("请从本网站重新操作", 403);
      if (body.action === "logout")
        return { body: { ok: true }, cookie: cookie(sessionCookie, "") };
      if (!configured)
        throw new RequestError("会员登录尚未开放，请先以游客身份点餐", 503);
      if (body.consent !== true)
        throw new RequestError("请确认使用 CanCan 账号登录或注册", 400);
      if (body.action === "oauth") {
        const providerName = String(body.provider || "");
        if (!authMethods[providerName] || !["google", "apple"].includes(providerName))
          throw new RequestError("该登录方式尚未开放", 409);
        const verifier = randomBytes(32).toString("base64url");
        const challenge = createHash("sha256").update(verifier).digest("base64url");
        const url = new URL(`${authUrl}/auth/v1/authorize`);
        url.searchParams.set("provider", providerName);
        url.searchParams.set("redirect_to", `${origin}/api/member?action=oauth-callback`);
        url.searchParams.set("code_challenge", challenge);
        url.searchParams.set("code_challenge_method", "s256");
        return {
          body: { ok: true, url: url.toString() },
          cookie: cookie(oauthCookie, `${providerName}:${verifier}`, 600, "/api/member"),
        };
      }
      const email = String(body.email || "").trim().toLowerCase();
      const validEmail = email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const password = String(body.password || "");
      const validPassword = password.length >= 8 && password.length <= 72;
      if (body.action === "password-login") {
        if (!validEmail) throw new RequestError("请输入有效邮箱", 400);
        if (!password) throw new RequestError("请输入密码", 400);
        const result = sessionResult(
          await provider("token?grant_type=password", { email, password }),
          { email },
        );
        return { body: { ok: true, member: result.user }, cookie: result.cookie };
      }
      if (body.action === "password-signup") {
        if (!validEmail) throw new RequestError("请输入有效邮箱", 400);
        if (!validPassword) throw new RequestError("密码需要 8–72 个字符", 400);
        const verifier = randomBytes(32).toString("base64url");
        const challenge = createHash("sha256").update(verifier).digest("base64url");
        const callback = `${origin}/api/member?action=signup-callback`;
        const response = await provider(`signup?redirect_to=${encodeURIComponent(callback)}`, {
          email,
          password,
          code_challenge: challenge,
          code_challenge_method: "s256",
        });
        if (response.access_token) {
          const result = sessionResult(response, { email });
          return { body: { ok: true, member: result.user }, cookie: result.cookie };
        }
        return {
          body: { ok: true, confirmationRequired: true },
          cookie: cookie(signupCookie, verifier, 1800, "/api/member"),
        };
      }
      if (body.action === "forgot-password") {
        if (!validEmail) throw new RequestError("请输入有效邮箱", 400);
        const verifier = randomBytes(32).toString("base64url");
        const challenge = createHash("sha256").update(verifier).digest("base64url");
        const callback = `${origin}/api/member?action=recovery-callback`;
        await provider(`recover?redirect_to=${encodeURIComponent(callback)}`, {
          email,
          code_challenge: challenge,
          code_challenge_method: "s256",
        });
        return {
          body: { ok: true },
          cookie: cookie(recoveryCookie, `${body.lang === "en" ? "en" : "zh"}.${verifier}`, 1800, "/api/member"),
        };
      }
      if (body.action === "reset-password") {
        if (!validPassword) throw new RequestError("密码需要 8–72 个字符", 400);
        const accessToken = tokenOf(headers);
        if (!accessToken) throw new RequestError("重置链接无效或已过期", 401);
        const updated = await provider("user", { password }, accessToken, "PUT");
        if (!publicUser(updated.user || updated))
          throw new RequestError("密码未能更新，请重新打开重置链接", 400);
        return { body: { ok: true } };
      }
      if (!["send-code", "verify"].includes(body.action))
        throw new RequestError("无效操作", 400);
      const methodName = body.method === "phone" ? "phone" : "email";
      if (!authMethods[methodName]) throw new RequestError("该登录方式尚未开放", 409);
      const phone = String(body.phone || "").replace(/[\s()-]/g, "");
      if (methodName === "email" && !validEmail)
        throw new RequestError("请输入有效邮箱", 400);
      if (methodName === "phone" && !/^\+[1-9]\d{7,14}$/.test(phone))
        throw new RequestError("请输入含国家代码的手机号", 400);
      const contact = methodName === "phone" ? { phone } : { email };
      if (body.action === "send-code") {
        await provider("otp", { ...contact, create_user: true });
        return { body: { ok: true } };
      }
      const code = String(body.code || "").trim();
      if (!/^\d{6,8}$/.test(code)) throw new RequestError("请输入收到的验证码", 400);
      const result = sessionResult(
        await provider("verify", { ...contact, token: code, type: methodName === "phone" ? "sms" : "email" }),
        contact,
      );
      return { body: { ok: true, member: result.user }, cookie: result.cookie };
    },
  };
}
