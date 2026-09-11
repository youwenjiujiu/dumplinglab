globalThis.WalletUI = (() => {
  let wallet = null,
    cancan = null,
    dialog = null,
    currentMember = null;
  const pendingKey = () =>
    "dl-wallet-pending-" + (currentMember?.id || "guest");
  const methods = new WeakMap();
  const esc = (v) => escapeHTML(v ?? "");
  async function api(path, input) {
    const r = await fetch(path, {
        method: input ? "POST" : "GET",
        headers: input ? { "content-type": "application/json" } : {},
        ...(input ? { body: JSON.stringify(input) } : {}),
        cache: "no-store",
        signal: AbortSignal.timeout(18000),
      }),
      out = await r.json();
    if (!r.ok || !out.ok)
      throw Object.assign(
        new Error(out.error || tr("暂时无法连接", "Unable to connect")),
        { status: r.status },
      );
    return out;
  }
  function close() {
    dialog?.close();
    dialog?.remove();
    dialog = null;
  }
  function shell(title) {
    close();
    const d = (dialog = document.createElement("dialog"));
    d.className = "rewards-dialog wallet-dialog";
    d.innerHTML = `<header><div><p class="eyebrow">DUMPLING LAB</p><h2>${esc(title)}</h2></div><button type="button" aria-label="${tr("关闭", "Close")}" data-wallet-close>×</button></header><div class="rewards-content"></div>`;
    d.setAttribute("aria-label", title);
    d.querySelector("[data-wallet-close]").onclick = close;
    d.addEventListener("cancel", (e) => {
      e.preventDefault();
      e.stopPropagation();
      close();
    });
    document.body.append(d);
    d.showModal();
    return d;
  }
  async function refresh(member) {
    currentMember = member;
    if (!member) {
      wallet = null;
      cancan = null;
      return;
    }
    try {
      wallet = await api("/api/wallet");
    } catch (e) {
      wallet = { error: e.message };
    }
    return wallet;
  }
  async function syncCanCan() {
    try {
      cancan = await api("/api/cancan");
    } catch (e) {
      cancan = { error: e.message };
    }
    return cancan;
  }
  const walletHTML = () =>
    wallet?.enabled
      ? `<section class="wallet-card"><div><span>${bi("余额", "Balance")}</span><strong>${money(wallet.availableCents / 100)}</strong><small>${bi("本金", "Principal")} ${money((wallet.availablePrincipalCents ?? wallet.availableCents) / 100)} · ${bi("赠金", "Bonus")} ${money((wallet.availableBonusCents || 0) / 100)}</small>${wallet.reservedCents ? `<small>${bi("预占中", "Reserved")} ${money(wallet.reservedCents / 100)}</small>` : ""}</div><button type="button" class="reward-item-button" data-wallet-topup>${bi("充值", "Top up")}</button></section><details><summary>${bi("余额明细", "Balance activity")}</summary>${wallet.balanceCents < 0 ? `<p>${bi("余额调整后待补金额", "Amount to restore after a balance reversal")} ${money(-wallet.balanceCents / 100)}</p>` : ""}${(wallet.entries || []).map((e) => `<div class="reward-transaction"><div>${esc(e.reason)}<small>${esc(new Date(e.at).toLocaleString("en-SG"))}</small></div><strong>${e.amountCents > 0 ? "+" : ""}${money(e.amountCents / 100)}</strong></div>`).join("") || `<p>${bi("暂无余额记录", "No balance activity yet")}</p>`}${(
          wallet.topups || []
        )
          .filter((t) => t.status === "pending")
          .map(
            (t) =>
              `<button type="button" class="reward-link" data-wallet-pending="${esc(t.id)}">${bi("继续充值", "Resume top-up")} ${money(t.amountCents / 100)}</button>`,
          )
          .join("")}</details>`
      : wallet?.error
        ? `<p class="rewards-error">${esc(wallet.error)}</p>`
        : "";
  async function topupStatus(id) {
    const d = shell(tr("充值记录", "Top-up")),
      body = d.querySelector(".rewards-content");
    body.innerHTML =
      '<p role="status">' +
      tr("正在查询到账状态…", "Checking payment…") +
      "</p>";
    async function draw() {
      const result = await api("/api/wallet?id=" + encodeURIComponent(id)),
        t = result.topup;
      if (!d.isConnected) return;
      body.innerHTML = `<p class="rewards-balance">${money(t.amountCents / 100)}</p><p>${bi("到账金额", "Wallet credit")} ${money((t.amountCents + (t.bonusCents || 0)) / 100)}${t.bonusCents ? " · " + bi("含赠金", "including bonus") + " " + money(t.bonusCents / 100) : ""}${t.bonusPoints ? " · " + t.bonusPoints + " " + bi("赠送积分", "bonus points") : ""}</p><p>${t.status === "paid" ? bi("充值已到账，可用于水饺店消费。", "Top-up received. Ready to spend at Dumpling Lab.") : t.status === "expired" ? bi("本次充值已取消或过期，未增加余额。", "Top-up cancelled or expired. No balance added.") : bi("等待支付平台确认到账，页面返回不代表付款成功。", "Waiting for payment confirmation. Returning here alone does not confirm payment.")}</p><p class="fineprint">${bi("充值编号", "Top-up ID")} · ${esc(id)}</p><p class="rewards-error" role="alert"></p>${t.status === "pending" ? `${result.preview ? `<button type="button" class="primary" data-wallet-simulate>${bi("模拟充值到账", "Simulate top-up")}</button>` : t.paymentUrl ? `<button type="button" class="primary" data-wallet-continue>${bi("继续充值付款", "Continue payment")}</button>` : ""}<button type="button" class="reward-link" data-wallet-check>${bi("刷新到账状态", "Refresh status")}</button><button type="button" class="reward-link" data-wallet-cancel>${bi("取消本次充值", "Cancel this top-up")}</button>` : `<button type="button" class="primary" data-wallet-done>${bi("返回点餐", "Back to ordering")}</button>`}`;
      const run = (fn) => async (e) => {
        e.target.disabled = true;
        try {
          await fn();
        } catch (err) {
          if (d.isConnected)
            body.querySelector("[role=alert]").textContent = err.message;
        } finally {
          e.target.disabled = false;
        }
      };
      body.querySelector("[data-wallet-simulate]")?.addEventListener(
        "click",
        run(async () => {
          await api("/api/wallet", { action: "preview-topup-paid", id });
          await draw();
        }),
      );
      body
        .querySelector("[data-wallet-continue]")
        ?.addEventListener("click", () => {
          if (/^https:\/\/checkout\.stripe\.com\//.test(t.paymentUrl))
            location.assign(t.paymentUrl);
        });
      body
        .querySelector("[data-wallet-check]")
        ?.addEventListener("click", run(draw));
      body.querySelector("[data-wallet-cancel]")?.addEventListener(
        "click",
        run(async () => {
          await api("/api/wallet", { action: "cancel-topup", id });
          await draw();
        }),
      );
      body
        .querySelector("[data-wallet-done]")
        ?.addEventListener("click", () => {
          close();
          const url = new URL(location.href);
          url.searchParams.delete("wallet_topup");
          url.searchParams.delete("wallet_cancel");
          history.replaceState(null, "", url);
        });
      if (t.status !== "pending") {
        try {
          localStorage.removeItem(pendingKey());
        } catch {}
        await RewardsUI.refresh();
      } else
        setTimeout(() => {
          if (d.isConnected)
            draw().catch((e) => {
              body.querySelector("[role=alert]").textContent = e.message;
            });
        }, 4000);
    }
    try {
      await draw();
    } catch (e) {
      body.innerHTML = `<p class="rewards-error">${esc(e.message)}</p>${e.status === 401 ? `<button class="primary" data-wallet-login>${bi("登录后查询", "Sign in to check")}</button>` : ""}`;
      body
        .querySelector("[data-wallet-login]")
        ?.addEventListener("click", () => {
          close();
          RewardsUI.login(() => topupStatus(id));
        });
    }
  }
  async function topup() {
    if (!wallet?.enabled) return;
    RewardsUI.close();
    const d = shell(tr("余额充值", "Top up")),
      body = d.querySelector(".rewards-content");
    body.innerHTML = `<div class="topup-tiers">${(wallet.tiers || []).map((t) => `<button type="button" data-topup-tier="${t.amountCents}"><strong>${money(t.amountCents / 100)}</strong><span>${t.bonusCents ? bi("送", "Bonus") + " " + money(t.bonusCents / 100) : ""}${t.bonusPoints ? " + " + t.bonusPoints + " " + tr("积分", "points") : ""}</span></button>`).join("")}</div><form class="rewards-login"><label>${bi("充值金额 · SGD", "Top-up amount · SGD")}<input name="amount" type="number" inputmode="decimal" step="0.01" min="${wallet.minTopupCents / 100}" max="${wallet.maxTopupCents / 100}" required placeholder="${tr("输入金额", "Enter amount")}"></label><p data-topup-summary aria-live="polite"></p><p class="fineprint">${bi("消费按可用本金与赠金比例扣款。", "Payments use principal and bonus in proportion to your available balances.")} ${wallet.bonusEarnsPoints ? bi("本金与赠金消费均积分。", "Both principal and bonus spending earn points.") : bi("仅本金消费积分，赠金消费不积分。", "Only principal spending earns points.")} ${bi("充值退款会按比例收回赠金和赠送积分；已消费的赠金须先核实。", "Top-up refunds reverse proportional bonuses and bonus points; spent bonuses require review.")}</p><p class="rewards-error" role="alert"></p><button class="primary" type="submit">${bi("确认金额，前往付款", "Confirm amount & pay")}</button></form>`;
    const form = body.querySelector("form");
    function describe() {
      const amount = Math.round(Number(form.amount.value) * 100),
        tier = (wallet.tiers || []).find((t) => t.amountCents === amount);
      body.querySelector("[data-topup-summary]").textContent =
        amount > 0
          ? tr(
              `支付 ${money(amount / 100)}，到账 ${money((amount + (tier?.bonusCents || 0)) / 100)}${tier?.bonusPoints ? "，另赠 " + tier.bonusPoints + " 积分" : ""}`,
              `Pay ${money(amount / 100)}, receive ${money((amount + (tier?.bonusCents || 0)) / 100)}${tier?.bonusPoints ? " + " + tier.bonusPoints + " points" : ""}`,
            )
          : "";
    }
    form.amount.oninput = describe;
    body.querySelectorAll("[data-topup-tier]").forEach(
      (b) =>
        (b.onclick = () => {
          form.amount.value = Number(b.dataset.topupTier) / 100;
          describe();
        }),
    );
    let pending = null;
    try {
      pending = JSON.parse(localStorage.getItem(pendingKey()));
    } catch {}
    if (pending?.id) {
      return topupStatus(pending.id);
    }
    form.onsubmit = async (e) => {
      e.preventDefault();
      const button = form.querySelector("button");
      if (button.disabled) return;
      button.disabled = true;
      try {
        const amount = Number(form.amount.value),
          amountCents = Math.round(amount * 100);
        if (Math.abs(amount * 100 - amountCents) > 1e-7)
          throw new Error(
            tr("最多填写两位小数", "Use up to two decimal places"),
          );
        pending ||= {
          id: crypto.randomUUID(),
          amountCents,
          configRevision: wallet.configRevision,
        };
        if (pending.amountCents !== amountCents)
          throw new Error(
            tr("请先核对上一笔充值", "Please check the previous top-up"),
          );
        localStorage.setItem(pendingKey(), JSON.stringify(pending));
        if (!localStorage.getItem(pendingKey()))
          throw new Error(tr("请允许网站存储", "Please allow website storage"));
        const out = await api("/api/wallet", {
          action: "topup",
          requestId: pending.id,
          amountCents,
          configRevision: pending.configRevision,
        });
        if (out.preview) await topupStatus(pending.id);
        else if (
          /^https:\/\/checkout\.stripe\.com\//.test(out.topup.paymentUrl || "")
        )
          location.assign(out.topup.paymentUrl);
        else await topupStatus(pending.id);
      } catch (e) {
        if (e.status === 422) {
          localStorage.removeItem(pendingKey());
          pending = null;
          await refresh(currentMember);
          await topup();
          toast(e.message);
          return;
        }
        body.querySelector("[role=alert]").textContent = e.message;
      } finally {
        button.disabled = false;
      }
    };
  }
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-wallet-topup],[data-wallet-pending]");
    if (!b) return;
    try {
      if (b.hasAttribute("data-wallet-topup")) return topup();
      if (b.dataset.walletPending) {
        RewardsUI.close();
        return topupStatus(b.dataset.walletPending);
      }
    } catch (err) {
      toast(err.message);
    } finally {
      if (b.isConnected) b.disabled = false;
    }
  });
  document.addEventListener("DOMContentLoaded", () => {
    const id = new URL(location.href).searchParams.get("wallet_topup");
    if (id && /^[a-f0-9-]{36}$/.test(id))
      setTimeout(() => topupStatus(id), 100);
  });
  return {
    refresh,
    syncCanCan,
    bonusEarnsPoints:()=>wallet?.bonusEarnsPoints===true,
    accountHTML: walletHTML,
    balanceLabel: () => wallet?.enabled ? money(wallet.availableCents / 100) : "—",
    barHTML: () =>
      wallet?.enabled
        ? `${tr("余额", "Balance")} ${money(wallet.availableCents / 100)} · `
        : "",
    input: (owner) =>
      wallet?.enabled && methods.get(owner) === "wallet"
        ? { paymentMethod: "wallet" }
        : {},
    setMethod: (owner, value) => methods.set(owner, value),
    paymentHTML: (o) =>
      wallet?.enabled
        ? `<div class="wallet-payment-choice"><p>${bi("可用余额", "Available balance")} ${money(wallet.availableCents / 100)}</p><button type="button" class="checkout-text-action" data-checkout-wallet ${o.paymentMethod !== "wallet" && wallet.availableCents < Math.round(o.total * 100) ? "disabled" : ""}>${o.paymentMethod === "wallet" ? bi("改用其他支付方式", "Use another payment method") : bi("使用余额支付", "Pay with balance")}</button>${o.paymentMethod !== "wallet" && wallet.availableCents < Math.round(o.total * 100) ? `<button type="button" class="reward-link" data-wallet-topup>${bi("余额不足，先充值", "Top up your balance")}</button>` : ""}</div>`
        : "",
  };
})();
