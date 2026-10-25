// Loyalty lives alongside the menu and the current order; no separate portal.
globalThis.RewardsUI = (() => {
  let data = null,
    loading = null,
    dialog = null;
  const selections = new WeakMap();
  let pendingGrowth = 0;
  const pointSnapshots = new Map();
  const text = (zh, en) => tr(zh, en);
  const esc = (v) => escapeHTML(v ?? "");
  async function request(path, body) {
    const r = await fetch(path, {
      method: body ? "POST" : "GET",
      headers: body ? { "content-type": "application/json" } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const out = await r.json();
    if (!r.ok || !out.ok)
      throw new Error(
        out.error ||
          text("暂时无法连接，请重试", "Unable to connect. Please retry."),
      );
    return out;
  }
  // Vouchers now come from more than one issuer; the account panel says which.
  const issuer = (r) => (r.source === "tiger" ? "TIGER" : "CanCan");

  /* Arriving from the printed voucher's QR. Signing in is the whole claim:
     one voucher per account, and it lands in 优惠券 where checkout will find
     it. Never auto-redeems — the five dumplings are added to an order in the
     shop, so a tap here could only destroy the voucher. */
  async function claimCampaign() {
    await refresh();
    if (!data?.enabled) return;
    if (!data.member) return login(() => claimCampaign());
    try {
      const out = await request("/api/voucher", { action: "claim" });
      await refresh();
      await account("vouchers");
      toast(
        out.fresh
          ? text("饺子券已存入你的账户", "Your dumpling voucher is saved to your account")
          : text("这张券已经在你的账户里了", "This voucher is already in your account"),
      );
    } catch (e) {
      toast(e.message);
    }
  }

  function paint() {
    const bar = document.querySelector("#rewardsBar");
    if (!bar) return;
    bar.hidden = !data?.enabled;
    if (data?.enabled)
      bar.innerHTML = `<button type="button" data-rewards-account aria-label="${data.member?text('我的','My account'):text('登录 / 注册','Sign in / Join')}" title="${data.member?text('我的','My account'):text('登录 / 注册','Sign in / Join')}"><svg class="member-dumpling-mark" viewBox="42 24 58 76" aria-hidden="true"><path transform="matrix(-1 0 0 1 142 0)" d="M86.1875 63.390625C85.746094 63.820312 85.136719 64.097656 84.46875 64.097656H81.59375C80.246094 64.097656 79.15625 63.015625 79.15625 61.671875C79.15625 60.992188 79.429688 60.382812 79.875 59.953125C80.304688 59.511719 80.914062 59.234375 81.59375 59.234375H84.46875C85.816406 59.234375 86.90625 60.324219 86.90625 61.671875C86.90625 62.347656 86.628906 62.945312 86.1875 63.390625M85.570312 83.070312V83.082031C85.15625 84.355469 83.78125 85.054688 82.503906 84.640625L79.058594 83.519531C77.78125 83.109375 77.085938 81.746094 77.496094 80.46875V80.457031C77.910156 79.179688 79.273438 78.484375 80.550781 78.894531L84.007812 80.015625C85.285156 80.429688 85.980469 81.792969 85.570312 83.070312M79.058594 39.820312L82.503906 38.699219C83.78125 38.277344 85.15625 38.984375 85.570312 40.261719V40.269531C85.980469 41.546875 85.285156 42.914062 84.007812 43.328125L80.550781 44.445312C79.273438 44.859375 77.910156 44.152344 77.496094 42.875C77.417969 42.628906 77.378906 42.375 77.378906 42.128906C77.378906 41.097656 78.027344 40.152344 79.058594 39.820312M96 80.09375C96.226562 75.871094 97.207031 73.042969 98.082031 70.546875C99.03125 67.769531 99.9375 65.148438 99.859375 61.101562C99.78125 56.878906 98.71875 54.355469 97.597656 51.683594C96.578125 49.179688 95.5 46.605469 95.351562 42.597656C95.222656 38.367188 96.226562 32.210938 98.335938 27.417969C98.660156 26.671875 98.589844 25.804688 98.140625 25.109375C97.699219 24.421875 96.933594 24 96.105469 24H79.980469C59.21875 24 42.320312 40.898438 42.320312 61.671875C42.320312 82.429688 59.21875 99.34375 79.980469 99.34375H96.734375C97.53125 99.34375 98.277344 98.941406 98.730469 98.292969C99.179688 97.632812 99.296875 96.816406 99.023438 96.0625C96.707031 89.738281 95.695312 85.417969 96 80.09375"/></svg></button>`;
  }
  async function refresh() {
    if (!loading)
      loading = request("/api/rewards")
        .then(async (out) => {
          if (
            data?.member?.id !== out.member?.id &&
            typeof store !== "undefined" &&
            store
          )
            selections.delete(store);
          if(data?.member?.id !== out.member?.id) pendingGrowth = 0;
          if(out.member){
            const key='dl-earned-seen-'+out.member.id;
            let previous=pointSnapshots.get(key);
            if(!previous)try{previous=JSON.parse(sessionStorage.getItem(key));}catch{}
            const earnIds=(out.transactions||[]).filter(t=>t.type==='earn').map(t=>t.id);
            if(previous && Number.isFinite(previous.points) && Array.isArray(previous.earnIds)){pendingGrowth=Math.max(0,pendingGrowth+Math.min(0,out.availablePoints-previous.points));const gained=(out.transactions||[]).filter(t=>t.type==='earn'&&!previous.earnIds.includes(t.id)).reduce((n,t)=>n+t.points,0);pendingGrowth+=Math.min(gained,Math.max(0,out.availablePoints-previous.points));}
            const snapshot={points:out.availablePoints,earnIds};pointSnapshots.set(key,snapshot);
            try{sessionStorage.setItem(key,JSON.stringify(snapshot));}catch{}
          }
          data = out;
        await globalThis.WalletUI?.refresh(data.member);
          paint();
          if (typeof renderMenu === "function") renderMenu();
          return out;
        })
        .finally(() => (loading = null));
    return loading;
  }
  function close() {
    dialog?.close();
    dialog?.remove();
    dialog = null;
  }
  function shell(title) {
    close();
    const d = document.createElement("dialog");
    dialog = d;
    d.className = "rewards-dialog";
    d.innerHTML = `<header><div><p class="eyebrow">DUMPLING LAB</p><h2 id="rewardTitle">${esc(title)}</h2></div><button type="button" data-rewards-close aria-label="${text("关闭", "Close")}">×</button></header><div class="rewards-content"></div>`;
    d.setAttribute("aria-labelledby", "rewardTitle");
    d.querySelector("[data-rewards-close]").onclick = close;
    d.addEventListener("cancel", (e) => {
      e.preventDefault();
      e.stopPropagation();
      close();
    });
    document.body.append(d);
    d.showModal();
    return d;
  }
  // Sending the guest to Supabase for Google puts the project's random host on
  // the consent screen, which reads like a phishing page. Google's own button
  // issues an ID token to this origin instead, so the screen names our domain.
  // The redirect button stays in the markup and is only hidden once Google's
  // script, the nonce and the render have all succeeded.
  let googleScript = null;
  function loadGoogle() {
    if (globalThis.google?.accounts?.id) return Promise.resolve(true);
    googleScript ||= new Promise((resolve) => {
      const tag = document.createElement("script");
      tag.src = "https://accounts.google.com/gsi/client";
      tag.async = true;
      tag.onload = () => resolve(Boolean(globalThis.google?.accounts?.id));
      tag.onerror = () => resolve(false);
      setTimeout(() => resolve(Boolean(globalThis.google?.accounts?.id)), 6000);
      document.head.append(tag);
    });
    return googleScript;
  }
  async function mountGoogle(body, clientId, error, finish) {
    const mount = body.querySelector("[data-google-mount]");
    const fallback = body.querySelector('[data-oauth="google"]');
    if (!mount || !(await loadGoogle()) || !mount.isConnected) return;
    let start;
    try {
      start = await request("/api/member", { action: "google-nonce", consent: true });
    } catch {
      return;
    }
    if (!mount.isConnected) return;
    try {
      globalThis.google.accounts.id.initialize({
        client_id: clientId,
        nonce: start.nonce,
        use_fedcm_for_prompt: true,
        callback: async ({ credential }) => {
          try {
            await request("/api/member", { action: "google-token", credential, consent: true });
            await finish();
          } catch (e) {
            error.textContent = e.message;
          }
        },
      });
      mount.hidden = false;
      // Google renders this button itself and only honours its own three sizes:
      // large 40px, medium 32px, small 20px. It ignores the container, so the
      // others have to match whichever size is asked for here.
      globalThis.google.accounts.id.renderButton(mount, { type: "icon", shape: "circle", theme: "outline", size: "medium" });
    } catch {
      mount.hidden = true;
      return;
    }
    // renderButton injects an iframe that loads on its own; hiding the fallback
    // straight away leaves a hole in the row for as long as that takes, which on
    // a phone connection is seconds. Keep the fallback until the real button has
    // painted, and keep it for good if it never does.
    const painted = await new Promise((resolve) => {
      const done = (ok) => { clearInterval(timer); clearTimeout(giveUp); resolve(ok); };
      const timer = setInterval(() => {
        if (!mount.isConnected) return done(false);
        if (mount.firstElementChild && mount.getBoundingClientRect().height > 8) done(true);
      }, 60);
      const giveUp = setTimeout(() => done(false), 4000);
    });
    if (!painted) { mount.hidden = true; return; }
    if (fallback) fallback.hidden = true;
  }
  async function login(after) {
    const auth = await request("/api/member").catch(() => ({ authMethods: { email: true } }));
    const methods = auth.authMethods || { email: true };
    const googleClientId = auth.googleClientId || "";
    const d = shell(text("会员账户", "Membership"));
    // The same two cutouts, in the same relationship, the website uses when a
    // guest picks a dumpling up.
    d.querySelector("header").insertAdjacentHTML("afterbegin",
      `<span class="auth-hero" aria-hidden="true"><span class="auth-hero-shape"></span><span class="auth-pick"><span class="auth-pick-sticks auth-pick-far"><img src="/brand/pick-chopstick-far-v1.webp" alt=""></span><img class="auth-pick-food" src="/brand/pick-dumpling-v1.webp" alt=""><span class="auth-pick-sticks auth-pick-near"><img src="/brand/pick-chopstick-near-v1.webp" alt=""></span></span>`);
    const body = d.querySelector(".rewards-content");
    d.classList.add("auth-dialog", "auth-methods");
    const finish = async () => {
      await refresh();
      if (!d.isConnected) return;
      close();
      if (after) await after();
      else await home();
    };
    const showMethods = () => {
      d.className = "rewards-dialog auth-dialog auth-methods";
      d.querySelector("h2").innerHTML = `<span>${text("登录 / 注册", "Sign in / Join")}</span><small>${text("Sign in / Join", "登录 / 注册")}</small>`;
      const social = `${methods.google ? `<div class="auth-google-mount" data-google-mount hidden></div><button type="button" class="auth-provider auth-google" data-oauth="google" aria-label="Google"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.7A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-3.9V7.4H3.1a10 10 0 0 0 0 9.3L6.5 14Z"/><path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3.1 7.4l3.4 2.7A5.9 5.9 0 0 1 12 6.1Z"/></svg></button>` : ""}${methods.apple ? `<button type="button" class="auth-provider auth-apple" data-oauth="apple" aria-label="Apple"><svg viewBox="0 0 24 24" aria-hidden="true"><path transform="translate(1.22 -0.3)" d="M16.8 12.8c0-2.7 2.2-4 2.3-4.1-1.3-1.9-3.3-2.1-4-2.1-1.7-.2-3.3 1-4.2 1-.9 0-2.2-1-3.7-1-1.9 0-3.7 1.1-4.7 2.8-2 3.5-.5 8.7 1.4 11.5.9 1.4 2.1 2.9 3.6 2.8 1.4-.1 2-1 3.7-1s2.2 1 3.7 1c1.5 0 2.5-1.4 3.5-2.8 1.1-1.6 1.6-3.2 1.6-3.3-.1 0-3.2-1.2-3.2-4.8ZM14 4.8c.8-1 1.4-2.5 1.2-3.9-1.2 0-2.7.8-3.6 1.8-.8.9-1.5 2.4-1.3 3.8 1.4.1 2.8-.7 3.7-1.7Z"/></svg></button>` : ""}`;
      const hasSocial = methods.google || methods.apple;
      body.innerHTML = `${social ? `<div class="auth-providers">${social}</div>` : ""}${hasSocial ? `<div class="auth-divider"></div>` : ""}<div class="auth-tabs">${methods.email ? `<button type="button" data-auth-method="email" class="is-active">${text("邮箱", "Email")}</button>` : ""}${methods.phone ? `<button type="button" data-auth-method="phone">${text("手机号", "Mobile")}</button>` : ""}</div><form class="rewards-login"><label data-contact-field><span class="sr-only">${text("邮箱地址", "Email address")}</span><input name="email" type="email" autocomplete="email" inputmode="email" required maxlength="254" placeholder="you@example.com"></label><label data-password-field><span class="sr-only">${text("密码", "Password")}</span><input name="password" type="password" autocomplete="current-password" minlength="8" maxlength="72" placeholder="${text("密码", "Password")}"></label><label data-confirm-field hidden><span class="sr-only">${text("确认密码", "Confirm password")}</span><input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" maxlength="72" placeholder="${text("确认密码", "Confirm password")}"></label><label data-code-field hidden><span class="sr-only">${text("验证码", "Verification code")}</span><input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,8}" maxlength="8" placeholder="${text("验证码", "Verification code")}"></label><p class="rewards-error" role="alert"></p><button class="primary" type="submit">${text("登录", "Sign in")}</button><div class="auth-links"></div><div class="auth-secondary" hidden><button type="button" class="reward-link" data-change-contact>${text("更换账号", "Change account")}</button><button type="button" class="reward-link" data-resend>${text("重新发送", "Resend")}</button></div></form>`;
      let methodName = methods.email ? "email" : "phone", view = "otp", sentValue = "", lastSent = 0, busy = false;
      const form = body.querySelector("form"), submit = form.querySelector("[type=submit]"), error = form.querySelector("[role=alert]"), links = form.querySelector(".auth-links");
      const title = (zh, en) => d.querySelector("h2").innerHTML = `<span>${text(zh,en)}</span><small>${text(en,zh)}</small>`;
      const contact = () => form.querySelector("[data-contact-field] input");
      const setView = (next) => {
        view = next; sentValue = ""; error.textContent = "";
        const passwordMode = methodName === "email" && ["password","signup"].includes(view);
        form.querySelector("[data-contact-field]").hidden = false;
        form.querySelector("[data-password-field]").hidden = !passwordMode;
        form.querySelector("[data-confirm-field]").hidden = view !== "signup";
        form.querySelector("[data-code-field]").hidden = true;
        form.password.required = passwordMode;
        form.confirmPassword.required = view === "signup";
        form.code.required = false;
        form.querySelector(".auth-secondary").hidden = true;
        body.querySelector(".auth-providers")?.removeAttribute("hidden");
        body.querySelector(".auth-divider")?.removeAttribute("hidden");
        body.querySelector(".auth-tabs").hidden = false;
        if(view === "signup") { title("注册","Join"); submit.textContent = text("注册","Join"); links.innerHTML = `<button type="button" data-auth-view="password">${text("返回登录","Back to sign in")}</button>`; }
        else if(view === "forgot") { title("忘记密码","Forgot password"); submit.textContent = text("发送重置邮件","Send reset email"); links.innerHTML = `<button type="button" data-auth-view="password">${text("返回登录","Back to sign in")}</button>`; }
        else if(view === "otp") { title("登录 / 注册","Sign in / Join"); submit.textContent = text("继续","Continue"); links.innerHTML = methodName === "email" ? `<button type="button" data-auth-view="password">${text("用密码登录","Use a password")}</button>` : ""; }
        else { title("密码登录","Password sign-in"); submit.textContent = text("登录","Sign in"); links.innerHTML = `<button type="button" data-auth-view="otp">${text("用邮箱验证码登录","Use an email code")}</button><span class="auth-minor"><button type="button" data-auth-view="signup">${text("注册","Join")}</button><button type="button" data-auth-view="forgot">${text("忘记密码","Forgot password")}</button></span>`; }
        links.querySelectorAll("[data-auth-view]").forEach(button => button.onclick = () => setView(button.dataset.authView));
      };
      const setMethod = (next) => {
        methodName = next;
        body.querySelectorAll("[data-auth-method]").forEach((button) => button.classList.toggle("is-active", button.dataset.authMethod === next));
        contact().name = next; contact().type = next === "phone" ? "tel" : "email"; contact().inputMode = next === "phone" ? "tel" : "email"; contact().autocomplete = next === "phone" ? "tel" : "email"; contact().placeholder = next === "phone" ? "+65 8123 4567" : "you@example.com";
        form.querySelector("[data-contact-field]>span").textContent = text(next === "phone" ? "手机号码" : "邮箱地址", next === "phone" ? "Mobile number" : "Email address");
        setView("otp");
      };
      const notice = (message, action = "") => {
        body.innerHTML = `<section class="auth-notice"><p>${esc(message)}</p>${action ? `<button class="primary" type="button" data-auth-action>${text("继续","Continue")}</button>` : ""}<button type="button" class="reward-link" data-auth-again>${text("返回登录","Back to sign in")}</button></section>`;
        body.querySelector("[data-auth-action]")?.addEventListener("click",()=>location.assign(action));
        body.querySelector("[data-auth-again]").onclick = showMethods;
      };
      const send = async () => {
        if (Date.now() - lastSent < 60000) throw new Error(text("请等待一分钟后重新发送", "Wait a minute before requesting another code"));
        await request("/api/member", { action: "send-code", method: methodName, [methodName]: contact().value, consent: true });
        sentValue = contact().value; lastSent = Date.now();
        body.querySelector(".auth-providers")?.setAttribute("hidden", ""); body.querySelector(".auth-divider")?.setAttribute("hidden", ""); body.querySelector(".auth-tabs").hidden = true;
        form.querySelector("[data-contact-field]").hidden = true; form.querySelector("[data-password-field]").hidden = true; form.querySelector("[data-code-field]").hidden = false; form.code.required = true; links.innerHTML = ""; form.querySelector(".auth-secondary").hidden = false;
        title("输入验证码", "Enter your code"); submit.textContent = text("验证并继续", "Verify and continue"); form.code.focus();
      };
      body.querySelectorAll("[data-auth-method]").forEach((button) => button.onclick = () => setMethod(button.dataset.authMethod));
      body.querySelectorAll("[data-oauth]").forEach((button) => button.onclick = async () => { button.disabled = true; try { const out = await request("/api/member", { action: "oauth", provider: button.dataset.oauth, consent: true }); location.assign(out.url); } catch (e) { error.textContent = e.message; button.disabled = false; } });
      if (googleClientId && methods.google) mountGoogle(body, googleClientId, error, finish);
      form.querySelector("[data-change-contact]").onclick = showMethods;
      form.querySelector("[data-resend]").onclick = async () => { try { lastSent = 0; await send(); error.textContent = text("验证码已重新发送", "Code sent"); } catch (e) { error.textContent = e.message; } };
      form.onsubmit = async (event) => {
        event.preventDefault(); if (busy) return; busy = true; submit.disabled = true; error.textContent = "";
        try {
          if(view === "password") { await request("/api/member", {action:"password-login",email:contact().value,password:form.password.value,consent:true}); await finish(); }
          else if(view === "signup") { if(form.password.value !== form.confirmPassword.value) throw new Error(text("两次密码不一致","Passwords do not match")); const out=await request("/api/member",{action:"password-signup",email:contact().value,password:form.password.value,consent:true}); if(out.confirmationRequired) notice(text("验证邮件已发送，请在 30 分钟内打开邮件。","Check your email within 30 minutes.")); else await finish(); }
          else if(view === "forgot") { const out=await request("/api/member",{action:"forgot-password",email:contact().value,lang:typeof language!=="undefined"?language:"zh",consent:true}); notice(text("如果该邮箱已注册，重置邮件已经发送。","If the account exists, a reset email has been sent."),out.previewRecoveryUrl||""); }
          else if (!sentValue) await send();
          else { await request("/api/member", { action: "verify", method: methodName, [methodName]: sentValue, code: form.code.value, consent: true }); await finish(); }
        } catch (e) { if(error.isConnected) error.textContent = e.message; }
        finally { busy = false; if(submit.isConnected) submit.disabled = false; }
      };
      setView(view);
    };
    showMethods();
  }
  function resetPassword() {
    const d = shell(text("设置新密码", "Set a new password"));
    const body = d.querySelector(".rewards-content");
    d.classList.add("auth-dialog", "auth-reset");
    d.querySelector("h2").innerHTML = `<span>${text("设置新密码", "Set a new password")}</span><small>${text("Set a new password", "设置新密码")}</small>`;
    body.innerHTML = `<form class="rewards-login"><label><span class="sr-only">${text("新密码", "New password")}</span><input name="password" type="password" autocomplete="new-password" minlength="8" maxlength="72" required placeholder="${text("新密码（至少 8 位）", "New password (8+ characters)")}"></label><label><span class="sr-only">${text("确认新密码", "Confirm new password")}</span><input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" maxlength="72" required placeholder="${text("再次输入新密码", "Confirm new password")}"></label><p class="rewards-error" role="alert"></p><button class="primary" type="submit">${text("保存新密码", "Save new password")}</button></form>`;
    const form = body.querySelector("form"), submit = form.querySelector("button"), error = form.querySelector("[role=alert]");
    form.onsubmit = async (event) => {
      event.preventDefault();
      error.textContent = "";
      if (form.password.value !== form.confirmPassword.value) {
        error.textContent = text("两次密码不一致", "Passwords do not match");
        return;
      }
      submit.disabled = true;
      try {
        await request("/api/member", { action: "reset-password", password: form.password.value, consent: true });
        const url = new URL(location.href);
        url.searchParams.delete("reset_password");
        url.searchParams.delete("preview_member");
        history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);
        body.innerHTML = `<section class="auth-notice"><p>${text("密码已更新。", "Your password has been updated.")}</p><button class="primary" type="button" data-auth-done>${text("继续", "Continue")}</button></section>`;
        body.querySelector("[data-auth-done]").onclick = async () => { close(); await refresh().catch(() => {}); await home(); };
      } catch (e) {
        error.textContent = e.message;
        submit.disabled = false;
      }
    };
    form.password.focus();
  }
  const choices = () =>
    data?.member
      ? [
          ...(data.rewards || []).map((r) => ({
            ...r,
            type: "points",
            usable: r.available && data.availablePoints >= r.points,
          })),
          ...(data.vouchers || [])
            .filter((v) => v.status === "available")
            .map((v) => ({
              ...v,
              type: "voucher",
              usable: Boolean(dish(v.dishId) && !dish(v.dishId).soldOut),
            })),
        ]
      : [];
  function cards(list) {
    return list
      .map((r, i) => {
        const d = dish(r.dishId),
          image = d?.img ? photo(d, "s") : null;
        return `<article class="reward-item">${image ? `<img src="${esc(image)}" alt="" width="60" height="60">` : ""}<div><strong>${esc(r.type === "voucher" ? r.title : d ? name(d) : r.title)}</strong><small>${r.type === "points" ? `${r.points} ${text("积分 · 兑换一份", "points · one portion")}${r.style ? " · " + esc(r.style) : ""}` : `${issuer(r)} · ${text("有效至", "Until")} ${new Date(r.expiresAt).toLocaleDateString("en-SG")}`}</small>${!r.usable ? `<small>${(r.type === "points" && !r.available) || !d || d.soldOut ? text("暂时售罄", "Unavailable") : text("积分不足", "More points needed")}</small>` : ""}</div><button type="button" data-reward-choice="${i}" ${r.usable ? "" : "disabled"}>${text("本单使用", "Use")}</button></article>`;
      })
      .join("");
  }
  async function choose(owner, apply) {
    await globalThis.WalletUI?.syncCanCan();
    await refresh();
    if (!data?.enabled) return;
    if (!data.member) return login(() => choose(owner, apply));
    const d = shell(text("本单优惠", "Rewards for this order")),
      body = d.querySelector(".rewards-content"),
      list = choices();
    // A pending order's reserved reward can always be retained or removed.
    body.innerHTML = `<p>${text("每单选一项。兑换商品会加入本单，确认下单后使用积分或券。", "Choose one reward. Its item is added to this order; points or voucher are used when the order is confirmed.")}</p><p class="rewards-balance">${data.availablePoints} <small>${text("可用积分", "available points")}</small></p>${cards(list) || `<p>${text("目前没有可兑换优惠。完成点餐后自动积分享好礼。", "No rewards available yet. Earn points with your order.")}</p>`}<button type="button" class="reward-link" data-no-reward>${text("本单不使用优惠，正常累积积分", "No reward — earn points on this order")}</button><p class="rewards-error" role="alert"></p>`;
    const use = async (r) => {
      body.querySelectorAll("button").forEach((b) => (b.disabled = true));
      try {
        await apply(r ? { type: r.type, id: r.id } : null, r);
        close();
      } catch (e) {
        if (d.isConnected) {
          body.querySelector("[role=alert]").textContent = e.message;
          body.querySelectorAll("button").forEach((b) => (b.disabled = false));
          list.forEach((v, i) => {
            body.querySelector(`[data-reward-choice="${i}"]`).disabled =
              !v.usable;
          });
        }
      }
    };
    body.querySelector("[data-no-reward]").onclick = () => use(null);
    body
      .querySelectorAll("[data-reward-choice]")
      .forEach(
        (b) => (b.onclick = () => use(list[Number(b.dataset.rewardChoice)])),
      );
  }
  async function addFromMenu(selection, reward) {
    const owner = store;
    if (owner.order)
      throw new Error(
        text(
          "请在本单结账中修改优惠，或先取消待付款订单",
          "Change rewards at checkout, or cancel the pending payment first",
        ),
      );
    if (reward && !owner.items.some((i) => i.id === reward.dishId && (i.style || null) === (reward.style || null)))
      owner.mutate({ kind: "delta", dishId: reward.dishId, style: reward.style || undefined, delta: 1 });
    selections.set(owner, selection);
    await owner.flush();
    toast(
      text("已加入本单，结账时使用", "Added to your order. Apply at checkout."),
    );
  }
  function rewardsAtelier(list) {
    const points = data.availablePoints;
    const rewards = list.filter(r=>r.type==='points' && r.available).sort((a,b)=>a.points-b.points);
    const target = rewards.find(r=>r.points>points) || rewards.at(-1);
    const ready = rewards.filter(r=>r.points<=points).length;
    const progress=target?Math.min(1,Math.max(0,points)/target.points):0;
    const food=target?dish(target.dishId):null;
    return `<section class="loyalty-savings" aria-label="${text('积分累积','Your points')}" data-goal="${target?.points||0}"><div class="savings-heading"><span class="savings-growth" aria-live="polite"></span></div><div class="savings-total"><p class="rewards-balance"><span data-points-total>${points}</span><small>${text('可用积分','available points')}</small></p></div>${target?`<div class="savings-scale" style="--progress:${Math.max(0,(progress*5-1)/4)*100}%" role="progressbar" aria-label="${esc(name(food))}" aria-valuemin="0" aria-valuemax="${target.points}" aria-valuenow="${Math.min(Math.max(0,points),target.points)}" ><div class="savings-ticks" aria-hidden="true">${Array.from({length:5},(_,i)=>`<i style="--filled:${progress>=(i+1)/5?100:0}%"></i>`).join('')}</div></div><div class="savings-labels" aria-hidden="true">${Array.from({length:5},(_,i)=>`<span>${Number((target.points*(i+1)/5).toFixed(1))}</span>`).join('')}</div>`:`<p class="savings-empty">${text('每次消费攒下的积分，都留在这里。','The points you earn stay right here.')}</p>`}</section>`;
  }
  function animateSavings(body) {
    const section=body.querySelector('.loyalty-savings');
    const growth=Math.min(pendingGrowth,Math.max(0,data.availablePoints));pendingGrowth=0;
    if(!section||!growth)return;
    section.querySelector('.savings-growth').textContent='+'+growth+' '+text('刚刚攒下','just earned');
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const total=data.availablePoints,start=total-growth,goal=Number(section.dataset.goal),number=section.querySelector('[data-points-total]'),scale=section.querySelector('.savings-scale');
    section.classList.add('is-saving');
    let began;
    function frame(now){if(!section.isConnected)return;began??=now;const t=Math.min(1,(now-began)/1100),eased=1-Math.pow(1-t,3),value=Math.round(start+growth*eased);number.textContent=value;if(scale){const progress=Math.min(1,Math.max(0,value)/goal);scale.style.setProperty('--progress',Math.max(0,(progress*5-1)/4)*100+'%');scale.querySelectorAll('.savings-ticks i').forEach((tick,i)=>tick.style.setProperty('--filled',(progress>=(i+1)/5?100:0)+'%'));scale.setAttribute('aria-valuenow',Math.min(Math.max(0,value),goal));}if(t<1)requestAnimationFrame(frame);}
    requestAnimationFrame(frame);
  }
  function atelierCards(list) {
    const lock = '<svg aria-hidden="true" viewBox="0 0 16 18" width="11" height="13"><rect x="2" y="7" width="12" height="9" rx="2"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>';
    return `<div class="loyalty-gallery">${list.map((r, i) => {
      const food = dish(r.dishId), voucher = r.type === 'voucher';
      const missing = Math.max(0, r.points - data.availablePoints);
      return `<article class="reward-item loyalty-food ${voucher ? 'loyalty-coupon' : r.usable ? 'is-unlocked' : 'is-locked'}">
        ${food?.img ? `<div class="loyalty-food-photo"><img src="${esc(photo(food,'s'))}" alt="" width="180" height="160"></div>` : ''}
        <div class="loyalty-food-copy">
          ${voucher ? `<small>${issuer(r).toUpperCase()} · ${text('已领取','CLAIMED')}</small>` : `<span class="loyalty-cost">${r.usable ? '' : lock}<b>${r.points}</b> ${text('积分','points')}</span>`}
          <strong>${esc(voucher ? r.title : food ? name(food) : r.title)}</strong>
          ${r.style ? `<span class="loyalty-style">${esc(r.style)}</span>` : ''}
          ${voucher ? `<span>${text('有效至 ','Until ') + new Date(r.expiresAt).toLocaleDateString('en-SG')}</span>` : ''}
          <button type="button" data-reward-choice="${i}" ${r.usable ? '' : 'disabled'}>${r.usable ? text(voucher ? '本单使用' : '立即兑换', voucher ? 'Use this voucher' : 'Redeem now') : voucher || r.available === false ? text('暂不可兑','Unavailable') : text(`还差 ${missing} 分`,`${missing} points to go`)}</button>
        </div>
      </article>`;
    }).join('')}</div>`;
  }
  function accountPage(title) {
    const d = shell(title);
    d.classList.add('loyalty-account');
    const back = document.createElement('button');
    back.className = 'account-back';
    back.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg>';
    back.setAttribute('aria-label',text('返回我的','Back to my account'));
    d.classList.add('account-subpage');
    back.onclick = () => home().catch(e => toast(e.message));
    d.querySelector('header').prepend(back);
    return d;
  }
  const orderStatus = o => o.refundedCents >= Math.round(o.total*100) && o.refundedCents > 0 ? text('已退款','Refunded')
    : o.status === 'paid' ? ({received:text('已接单','Received'),preparing:text('制作中','Preparing'),ready:text('待取餐','Ready for pickup'),collected:text('已完成','Completed')}[o.preparationStatus] || text('已付款','Paid'))
    : o.status === 'expired' ? text('已过期','Expired') : o.status === 'cancelled' ? text('已取消','Cancelled') : text('待付款','Awaiting payment');
  const orderItems = o => (o.items || []).map(i => `${esc(text(i.name || i.id, i.englishName || i.name || i.id))}${i.style ? ' · '+esc(i.style) : ''} × ${i.qty}`).join('、');
  const orderRow = (o, i) => `<button class="account-order" data-account-order="${i}"><span class="account-order-top"><strong>${text(o.mode==='dinein'?'堂食':'打包自取',o.mode==='dinein'?'Dine-in':'Takeaway')}</strong><em>${orderStatus(o)}</em></span><span class="account-order-items">${orderItems(o)}</span><span class="account-order-bottom"><time>${esc(new Date(o.at).toLocaleString('en-SG',{dateStyle:'medium',timeStyle:'short'}))}</time><strong>${money(o.total)}</strong></span></button>`;
  function bindOrders(body, orders) {
    body.querySelectorAll('[data-account-order]').forEach(b => b.onclick = () => orderDetail(orders[Number(b.dataset.accountOrder)]));
  }
  function orderDetail(o) {
    const d = accountPage(text('订单详情','Order details')), body = d.querySelector('.rewards-content');
    body.innerHTML = `<div class="account-detail-status">${orderStatus(o)}${o.pickupNumber?` · ${esc(o.pickupNumber)}`:''}</div><p>${esc(new Date(o.at).toLocaleString('en-SG'))} · ${text(o.mode==='dinein'?'堂食':'打包自取',o.mode==='dinein'?'Dine-in':'Takeaway')}</p>${(o.items||[]).map(i=>`<div class="reward-transaction"><div>${esc(text(i.name || i.id, i.englishName || i.name || i.id))}${i.style?`<small>${esc(i.style)}</small>`:''}</div><strong>× ${i.qty}</strong></div>`).join('')}<div class="reward-transaction"><span>${text('订单金额','Order total')}</span><strong>${money(o.total)}</strong></div><div class="reward-transaction"><span>${text('支付方式','Payment method')}</span><span>${o.paymentMethod==='wallet'?text('余额','Balance'):o.total===0?text('优惠兑换','Reward'):text('在线支付','Online payment')}</span></div>${o.refundedCents?`<div class="reward-transaction"><span>${text('已退款','Refunded')}</span><strong>${money(o.refundedCents/100)}</strong></div>`:''}<p class="reward-email">${text('订单编号','Order ID')}<br>${esc(o.id)}</p><button class="reward-link" data-orders-back>${text('查看全部订单','All orders')}</button>`;
    body.querySelector('[data-orders-back]').onclick = ordersPage;
  }
  async function ordersPage() {
    const d = accountPage(text('我的订单','My orders')), body = d.querySelector('.rewards-content');
    let all = [], next = '';
    const load = async () => {
      body.querySelector('[data-load-orders]')?.setAttribute('disabled','');
      try {
        const result = await request('/api/online?history=1'+(next?'&before='+encodeURIComponent(next):''));
        if(!d.isConnected)return;
        all.push(...result.orders); next = result.next;
        body.innerHTML = `${all.length?all.map(orderRow).join(''):`<p class="account-empty">${text('还没有订单','No orders yet')}</p>`}${next?`<button class="reward-link" data-load-orders>${text('加载更多','Load more')}</button>`:''}`;
        bindOrders(body,all); body.querySelector('[data-load-orders]')?.addEventListener('click',load);
      } catch(e) { if(d.isConnected){body.innerHTML = `<p role="alert">${esc(e.message)}</p><button class="reward-link" data-retry>${text('重试','Retry')}</button>`;body.querySelector('[data-retry]').onclick=load;} }
    };
    body.innerHTML = `<p role="status">${text('正在加载订单…','Loading orders…')}</p>`;
    await load();
  }
  async function walletPage() {
    await refresh();
    if(!data?.member)return login(home);
    const d = accountPage(text('余额与充值','Balance & top-up'));
    d.querySelector('.rewards-content').innerHTML = globalThis.WalletUI?.accountHTML() || '';
  }
  async function profilePage() {
    await refresh();
    if(!data?.member)return login(home);
    const d = accountPage(text('个人资料','Profile')), body = d.querySelector('.rewards-content');
    body.innerHTML = `<div class="account-profile-field"><span>${data.member.email?text('登录邮箱','Sign-in email'):text('手机号码','Mobile number')}</span><strong>${esc(data.member.email || data.member.phone)}</strong></div><div class="account-profile-field"><span>${text('账户状态','Account status')}</span><strong>${text('已验证','Verified')}</strong></div><button class="reward-link" data-profile-logout>${text('退出账号','Sign out')}</button><p class="rewards-error" role="alert"></p>`;
    body.querySelector('[data-profile-logout]').onclick = async () => {try{await request('/api/member',{action:'logout'});if(typeof store!=='undefined')selections.delete(store);await refresh();close();}catch(e){body.querySelector('[role=alert]').textContent=e.message;}};
  }
  async function home() {
    await refresh();
    if(!data?.member)return login(home);
    const d = shell(text('我的','My account')), body = d.querySelector('.rewards-content');
    d.classList.add('loyalty-account','member-home');
    const pointRewards = choices().filter(r => r.type === 'points');
    const icon = paths => `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">${paths}</svg>`;
    body.innerHTML = `<div class="account-identity"><span>${esc(data.member.email || data.member.phone)}</span></div>
      <section class="account-pass">
        <div class="account-points">${rewardsAtelier(choices())}<button class="account-points-link" data-account-rewards>${text('兑换','Redeem')} <span>↗</span></button></div>
        <button class="account-balance" data-account-wallet><span>${text('余额','Balance')}<strong>${globalThis.WalletUI?.balanceLabel() || '—'}</strong></span><span>${text('充值 / 明细','Top up / Activity')} ↗</span></button>
      </section>
      ${pointRewards.length ? `<section class="account-redemptions"><div class="account-orders-heading"><h3>${text('积分兑换','Rewards')}</h3><button type="button" data-all-rewards aria-label="${text('查看全部兑换','View all rewards')}" title="${text('查看全部兑换','View all rewards')}"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></button></div>${atelierCards(pointRewards)}</section>` : ''}
      <nav class="account-nav" aria-label="${text('我的账户','Account')}">
        <button data-account-orders>${icon('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 7h6M9 11h6M9 15h3"/>')}<span>${text('我的订单','My orders')}</span></button>
        <button data-account-coupons>${icon('<path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V6Z"/><path d="M15 6v3m0 2v2m0 2v3"/>')}<span>${text('优惠券','Vouchers')}</span></button>
        <button data-account-profile>${icon('<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>')}<span>${text('个人资料','Profile')}</span></button>
      </nav>
      <section data-current-order><p role="status">${text('正在查询订单…','Checking orders…')}</p></section>`;
    body.querySelectorAll('[data-reward-choice]').forEach(button => {
      button.onclick = async () => {
        button.disabled = true;
        try {
          const reward = pointRewards[Number(button.dataset.rewardChoice)];
          await addFromMenu({type:reward.type,id:reward.id},reward);
          close();
        } catch(e) { toast(e.message); }
        finally { if(button.isConnected) button.disabled = false; }
      };
    });
    animateSavings(body);
    body.querySelector('[data-account-wallet]').onclick=()=>walletPage().catch(e=>toast(e.message));
    body.querySelector('[data-account-rewards]').onclick=()=>account().catch(e=>toast(e.message));
    body.querySelector('[data-all-rewards]')?.addEventListener('click',()=>account().catch(e=>toast(e.message)));
    body.querySelector('[data-account-orders]').onclick=ordersPage;
    body.querySelector('[data-account-coupons]').onclick=()=>account('vouchers').catch(e=>toast(e.message));
    body.querySelector('[data-account-profile]').onclick=()=>profilePage().catch(e=>toast(e.message));
    try {
      const result = await request('/api/online?history=1');
      if(!d.isConnected)return;
      const recent = result.orders.find(o=>o.status==='paid'&&o.preparationStatus!=='collected'&&(!o.refundedCents||o.refundedCents<Math.round(o.total*100)));
      const last = recent || result.orders.find(o=>o.status==='paid');
      body.querySelector('[data-current-order]').innerHTML = last ? `<div class="account-orders-heading"><h3>${recent?text('当前订单','Current order'):text('最近订单','Recent order')}</h3><button type="button" data-all-orders>${text('全部订单','All orders')} ↗</button></div>${orderRow(last,0)}` : '';
      bindOrders(body,last?[last]:[]);
      body.querySelector('[data-all-orders]')?.addEventListener('click',ordersPage);
    } catch(e) {if(d.isConnected)body.querySelector('[data-current-order]').innerHTML=`<p>${text('订单暂时无法加载，可进入“我的订单”重试。','Orders could not load. Open My orders to retry.')}</p>`;}
  }
  async function account(view = "rewards") {
    await globalThis.WalletUI?.syncCanCan();
    await refresh();
    if (!data?.enabled) return;
    if (!data.member) return login(() => account(view));
    const d = accountPage(view === "vouchers" ? text("我的优惠券", "My vouchers") : text("全部兑换", "All rewards")),
      body = d.querySelector(".rewards-content"),
      list = choices().filter(r => view === "vouchers" ? r.type === "voucher" : r.type === "points");
    d.classList.add("loyalty-account");
    body.innerHTML = `${rewardsAtelier(list)}${data.reservedPoints ? `<p>${data.reservedPoints} ${text("积分正在待付款订单中，取消后退回。", "points reserved for pending orders; released on cancellation.")}</p>` : ""}<p>${text(`实付 S$1 积 ${data.pointsPerDollar} 分，每单向下取整。兑换部分不积分。${globalThis.WalletUI?.bonusEarnsPoints()?'赠金消费也积分。':'赠金消费不积分。'}`,  `Earn ${data.pointsPerDollar} point(s) per S$1 paid, rounded down per order. Reward items do not earn points. ${globalThis.WalletUI?.bonusEarnsPoints()?'Bonus spending also earns points.':'Bonus spending earns no points.'}`)}</p><h3>${text("积分兑换", "Redeem points")}</h3>${list.length ? atelierCards(list) : `<p>${text("兑换菜单正在准备，积分会为你保留。", "Rewards are being prepared. Your points stay with you.")}</p>`}<p class="rewards-error" role="alert"></p><details><summary>${text("积分明细与规则", "Points activity & rules")}</summary><p>${text("每单限用一项优惠。退款扣回所获积分，不足部分从后续积分抵扣。全额退款退回兑换积分或券，券有效期不变。", "One reward per order. Refunds deduct earned points; any shortfall comes from future points. Full refunds return redeemed points or vouchers. Voucher expiry stays unchanged.")}</p>${(data.transactions || []).map((t) => `<div class="reward-transaction"><div>${esc(t.description)}<small>${esc(new Date(t.at).toLocaleString("en-SG"))}</small></div><strong>${t.points > 0 ? "+" : ""}${t.points}</strong></div>`).join("") || `<p>${text("暂无积分记录", "No points activity yet")}</p>`}${data.points < 0 ? `<p>${text("账户余额", "Account balance")}: ${data.points}</p>` : ""}</details><p class="reward-email">${esc(data.member.email)}</p><button type="button" class="reward-link" data-reward-logout>${text("退出账号", "Sign out")}</button>`;
    if(view === 'vouchers') {
      d.classList.add('coupon-page');
      body.innerHTML = list.length ? `${atelierCards(list)}<p class="rewards-error" role="alert"></p>` : `<section class="coupon-empty"><div class="coupon-ticket" aria-hidden="true"><span class="coupon-symbol"></span><span class="coupon-perforation"></span></div><h3>${text('暂无可用优惠券','No vouchers yet')}</h3><p>${text('在 CanCan 领取或兑换后，<br>餐饮券会显示在这里。','Food vouchers claimed or redeemed<br>on CanCan appear here.')}</p><button class="coupon-explore" data-coupon-explore>${text('查看积分兑换','Explore points rewards')} <span>↗</span></button></section><p class="rewards-error" role="alert"></p>`;
      body.querySelector('[data-coupon-explore]')?.addEventListener('click',()=>account().catch(e=>toast(e.message)));
    }
    if(view !== 'vouchers') {
      d.classList.add('all-rewards-page');
      body.querySelector('.loyalty-savings')?.remove();
      const balance = document.createElement('span');
      balance.className = 'all-rewards-balance';
      balance.textContent = `${data.availablePoints} ${text('积分','pts')}`;
      d.querySelector('[data-rewards-close]').before(balance);
    }
    body.querySelector('.reward-email')?.remove();
    body.querySelector('[data-reward-logout]')?.remove();
    animateSavings(body);
    body.querySelectorAll("[data-reward-choice]").forEach(
      (b) =>
        (b.onclick = async () => {
          b.disabled = true;
          try {
            const r = list[Number(b.dataset.rewardChoice)];
            await addFromMenu({ type: r.type, id: r.id }, r);
            close();
          } catch (e) {
            body.querySelector("[role=alert]").textContent = e.message;
          } finally {
            b.disabled = false;
          }
        }),
    );
    const logout = body.querySelector("[data-reward-logout]");
    if(logout) logout.onclick = async () => {
      try {
        await request("/api/member", { action: "logout" });
        selections.delete(store);
        await refresh();
        close();
      } catch (e) {
        body.querySelector("[role=alert]").textContent = e.message;
      }
    };
  }
  function checkoutHTML(order) {
    if (!data?.enabled && !order.loyalty) return "";
    const l = order.loyalty;
    return `<section class="checkout-block checkout-rewards"><h3>${bi("积分与优惠", "Rewards")}<button class="checkout-text-action" type="button" data-checkout-rewards>${data?.member ? bi("选择 / 修改", "Choose / change") : bi("登录使用", "Sign in")}</button></h3><p>${l?.discountCents ? (l.pointsCost ? `${esc(l.title)} · −${money(l.discountCents / 100)} · ${l.pointsCost} ${text("积分", "points")}` : `${esc(l.title)} · ${text("免费", "Free")}`) : data?.member ? text("本单未使用兑换优惠", "No reward selected") : text("游客可直接付款；登录后本单可累计积分。", "Guests can pay directly. Sign in to earn points on this order.")}</p>${l ? `<small>${text("完成付款预计获得", "Earn after payment")} ${l.expectedPoints} ${text("积分", "points")}</small>` : ""}</section>`;
  }
  const receiptHTML = (order) =>
    order.rewardsSettled
      ? `<section class="checkout-block reward-earned"><strong>${bi("本单获得", "Earned this order")} +${order.rewardPointsEarned || 0} ${bi("积分", "points")}</strong>${order.loyalty?.pointsCost ? `<p>${bi("本单使用", "Redeemed")} ${order.loyalty.pointsCost} ${bi("积分", "points")}</p>` : ""}${order.refundedCents ? `<p>${bi("退款后的积分请在“我的”中查看。", "See My account for your points after refunds.")}</p>` : ""}</section>`
      : "";
  document.addEventListener("DOMContentLoaded", () => {
    refresh().catch(() => {});
    if (new URLSearchParams(location.search).get("reset_password") === "1") resetPassword();
    if (new URLSearchParams(location.search).get("claim") === "tiger") claimCampaign().catch(() => {});
  });
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-rewards-account], [data-dish-reward]");
    if (!b) return;
    e.preventDefault();
    try {
      if (b.hasAttribute("data-dish-reward")) {
        await refresh();
        if (!data?.member) return login(() => account());
        const r = choices().find(
          (r) => r.type === "points" && r.id === b.dataset.dishReward,
        );
        if (!r?.usable) return account();
        await addFromMenu({ type: r.type, id: r.id }, r);
      } else await home();
    } catch (err) {
      toast(err.message);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refresh().catch(() => {});
  });
  return {
    close,login,resetPassword,account,home,
    refresh,
    choose,
    checkoutHTML,
    receiptHTML,
    setSelection: (owner, s) => selections.set(owner, s),
    input: (owner) =>
      data?.enabled && data.member
        ? {
            memberExpected: true,
            rewardSelection: selections.get(owner) || null,
          }
        : {},
    dishBadge: (d) => {
      const r =
        data?.enabled &&
        data.rewards?.find((r) => r.dishId === d.id && r.available);
      return r
        ? `<button type="button" class="dish-reward" data-dish-reward="${esc(r.id)}">${r.points} ${text("积分兑换", "points to redeem")}</button>`
        : "";
    },
    onPaid: () => {
      if (typeof store !== "undefined") selections.delete(store);
      refresh().catch(() => {});
    },
  };
})();
