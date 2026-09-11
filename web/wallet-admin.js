globalThis.WalletAdmin = (() => {
  let epoch = 0;
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const money = (n) => "S$" + (n / 100).toFixed(2);
  async function load(request) {
    const run = ++epoch,
      p = document.querySelector("#walletPanel");
    p.innerHTML = '<p class="reward-admin-message">正在读取余额记录…</p>';
    try {
      const [d, points, menu] = await Promise.all([
        request("/api/wallet?admin=1"),
        request("/api/rewards?admin=1"),
        request("/api/catalog"),
      ]);
      const pointValue = Math.max(
        0,
        ...Object.values(points.rewards || {})
          .filter((r) => r.active)
          .map((r) => {
            const dish = menu.items?.find((i) => i.id === r.dishId);
            return dish
              ? (((r.style ? dish.variants?.[r.style]?.price : dish.price) ||
                  0) *
                  100) /
                  r.points
              : 0;
          }),
      );
      if (run !== epoch) return;
      const row = (o, kind) => {
        const amount =
            kind === "topup" ? o.amountCents : Math.round(o.total * 100),
          left = amount - (o.refundedCents || 0),
          eligible =
            kind === "topup"
              ? o.status === "paid" && left > 0
              : !o.freeRewardRefunded && (left > 0 || amount === 0);
        return `<article class="wallet-admin-record"><div><strong>${kind === "topup" ? "充值" : "订单 " + esc(o.no)} · ${money(amount)}</strong><small>${esc(o.id)} · ${esc(new Date(o.at).toLocaleString("zh-SG"))}</small><p>${kind === "topup" ? esc({ paid: "已到账", pending: "待付款", expired: "已取消" }[o.status] || o.status) : "已付款"}${kind==='topup'&&o.bonusCents?' · 赠金 '+money(o.bonusCents):''}${kind==='topup'&&o.bonusPoints?' · 赠 '+o.bonusPoints+' 积分':''} · 已退 ${money(o.refundedCents || 0)}${o.freeRewardRefunded ? " · 兑换已退还" : ""}</p></div>${eligible ? `<details><summary>办理退款</summary><form data-wallet-refund="${kind}" data-id="${esc(o.id)}"><label>本次退款金额（SGD）<input name="amount" type="number" min="${amount === 0 ? "0" : "0.01"}" max="${left / 100}" step="0.01" value="${left / 100}" required ${amount === 0 ? "readonly" : ""}></label><label>退款原因<input name="reason" maxlength="200" required></label><p>${kind === "topup" ? "退回原充值支付渠道。已消费或预占的本金不能退款；相应赠金和充值赠分按比例收回。" : "余额付款退回水饺店余额；按退款金额扣回消费积分，全额退款退回本单兑换积分或券。"}不会自动补回食品库存。</p><button type="submit">确认退款</button><p role="status"></p></form></details>` : ""}</article>`;
      };
      p.innerHTML = `<div class="panel-heading"><div><h2>充值与余额</h2><p>${d.memberCount} 位余额账户 · 余额合计 ${money(d.balanceCents)}</p></div></div><section id="walletSettings" class="reward-admin-rules"></section><div class="reward-admin-rules"><h3>充值记录</h3>${d.topups.map((o) => row(o, "topup")).join("") || "<p>暂无充值。</p>"}<h3>余额支付与全额兑换订单</h3>${d.orders.map((o) => row(o, "order")).join("") || "<p>暂无订单。</p>"}</div>`;
      const settings = p.querySelector("#walletSettings");
      let tiers = structuredClone(d.tiers || []),
        bonusEarns = Boolean(d.bonusEarnsPoints);
      function drawSettings() {
        settings.innerHTML = `<form><h3>充值赠送规则</h3><p>按单笔充值金额匹配一档优惠，不累加档位。保存后新充值生效。</p><div class="wallet-tier-list">${tiers.map((t, i) => `<fieldset data-tier="${i}"><label>充值金额（S$）<input data-amount type="number" min="1" max="1000" step="0.01" required value="${t.amountCents / 100}"></label><label>赠送金额（S$）<input data-bonus type="number" min="0" step="0.01" required value="${t.bonusCents / 100}"></label><label>赠送积分<input data-points type="number" min="0" max="100000" step="1" required value="${t.bonusPoints}"></label><label><input data-enabled type="checkbox" ${t.active ? "checked" : ""}> 开放</label><button type="button" data-remove="${i}">删除此档</button><p data-estimate></p></fieldset>`).join("")}</div><button type="button" data-add-tier>新增充值档位</button><label class="wallet-bonus-toggle"><input name="bonusEarnsPoints" type="checkbox" ${bonusEarns ? "checked" : ""}> 赠金消费也获得积分</label><p>默认仅本金消费积分，按本金与赠金的可用比例扣款。餐费退款退回原本金、赠金；充值退款按比例收回赠金和充值赠分。赠金不足以收回时须先核实消费记录。</p><p>消费积分比例与商品兑换积分在「积分与兑换」设置。</p><button class="primary" type="submit">保存充值规则</button><p role="status"></p><p class="wallet-estimate-note">估算假设余额全部消费、积分按当前最高菜单兑换单价用完，未扣除逐单取整；这是奖励菜单价值，不是门店实际成本。</p></form>`;
        const form = settings.querySelector("form");
        function readForm() {
          tiers = [...settings.querySelectorAll("[data-tier]")].map((row) => ({
            amountCents: Math.round(
              Number(row.querySelector("[data-amount]").value) * 100,
            ),
            bonusCents: Math.round(
              Number(row.querySelector("[data-bonus]").value) * 100,
            ),
            bonusPoints: Number(row.querySelector("[data-points]").value),
            active: row.querySelector("[data-enabled]").checked,
          }));
          bonusEarns = form.bonusEarnsPoints.checked;
        }
        function estimates() {
          readForm();
          for (const row of settings.querySelectorAll("[data-tier]")) {
            const t = tiers[Number(row.dataset.tier)],
              value =
                t.bonusCents +
                (t.bonusPoints +
                  ((t.amountCents + (bonusEarns ? t.bonusCents : 0)) / 100) *
                    points.pointsPerDollar) *
                  pointValue;
            row.querySelector("[data-estimate]").textContent =
              t.amountCents > 0
                ? `支付 ${money(t.amountCents)}，到账 ${money(t.amountCents + t.bonusCents)}${t.bonusPoints ? "，另赠 " + t.bonusPoints + " 积分" : ""}。${pointValue ? `预计额外奖励菜单价值 ${money(value)}，约为本金的 ${((100 * value) / t.amountCents).toFixed(1)}%。` : "未开放积分兑换，暂不能折算积分价值。"}`
                : "";
          }
        }
        form.oninput = estimates;
        form.onchange = estimates;
        estimates();
        settings.querySelector("[data-add-tier]").onclick = () => {
          readForm();
          if (tiers.length >= 20) return;
          tiers.push({
            amountCents: 20000,
            bonusCents: 2000,
            bonusPoints: 0,
            active: false,
          });
          drawSettings();
        };
        settings.querySelectorAll("[data-remove]").forEach(
          (b) =>
            (b.onclick = () => {
              readForm();
              tiers.splice(Number(b.dataset.remove), 1);
              drawSettings();
            }),
        );
        form.onsubmit = async (e) => {
          e.preventDefault();
          const button = form.querySelector("[type=submit]"),
            status = form.querySelector("[role=status]");
          if (button.disabled) return;
          readForm();
          button.disabled = true;
          try {
            await request("/api/wallet", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                action: "settings",
                revision: d.configRevision,
                tiers,
                bonusEarnsPoints: bonusEarns,
              }),
            });
            await load(request);
            p.querySelector("#walletSettings [role=status]").textContent =
              "充值规则已保存，新充值立即生效。";
          } catch (e) {
            status.textContent = e.message;
          } finally {
            button.disabled = false;
          }
        };
      }
      drawSettings();
      for (const f of p.querySelectorAll("[data-wallet-refund]")) {
        const key =
          "dl-admin-refund-" + f.dataset.walletRefund + "-" + f.dataset.id;
        let pending;
        try {
          pending = JSON.parse(sessionStorage.getItem(key));
          if (pending) {
            f.amount.value = pending.amountCents / 100;
            f.reason.value = pending.reason;
          }
        } catch {}
        f.onsubmit = async (e) => {
          e.preventDefault();
          const button = f.querySelector("button"),
            message = f.querySelector("[role=status]");
          if (button.disabled) return;
          button.disabled = true;
          try {
            const amountCents = Math.round(Number(f.amount.value) * 100),
              reason = f.reason.value.trim();
            if (
              pending &&
              (pending.amountCents !== amountCents || pending.reason !== reason)
            )
              throw new Error("请先以原金额和原因重试待确认的退款。");
            pending ||= { requestId: crypto.randomUUID(), amountCents, reason };
            sessionStorage.setItem(key, JSON.stringify(pending));
            const input =
              f.dataset.walletRefund === "topup"
                ? { action: "refund-topup", topupId: f.dataset.id, ...pending }
                : {
                    action: "refund-order",
                    id: f.dataset.id,
                    refundId: pending.requestId,
                    amountCents,
                    reason,
                  };
            const out = await request("/api/wallet", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(input),
            });
            if (out.result?.pending) {
              message.textContent =
                "支付平台正在处理，余额继续预占；请稍后以相同请求重试。";
              return;
            }
            sessionStorage.removeItem(key);
            pending = null;
            await load(request);
          } catch (e) {
            if (
              [
                "此笔退款已失败，请重新发起",
                "可用本金或待收回赠金不足，请先核实已消费金额",
                "超过此笔充值可退金额",
                "原路退款失败，余额预占已释放",
              ].includes(e.message)
            ) {
              sessionStorage.removeItem(key);
              pending = null;
            }
            message.textContent = e.message;
          } finally {
            button.disabled = false;
          }
        };
      }
    } catch (e) {
      if (run === epoch)
        p.innerHTML = `<p class="reward-admin-message" role="alert">${esc(e.message)}</p>`;
    }
  }
  return {
    load,
    clear() {
      epoch++;
      const p = document.querySelector("#walletPanel");
      if (p) p.innerHTML = "";
    },
  };
})();
