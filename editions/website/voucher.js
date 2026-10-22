/* Claiming is signing in: the voucher lands in the guest's account, where the
   ordering flow will find it. This page never redeems — the five dumplings are
   added to an order in the shop, so a button here could only destroy it. */
const $ = (id) => document.getElementById(id);

const EXPIRY_ZH = (iso) => {
  const [y, m, d] = iso.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
};
const EXPIRY_EN = (iso) =>
  new Date(`${iso}T00:00:00+08:00`).toLocaleDateString("en-SG", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Singapore",
  }) + ", inclusive";

function settle(zh, en, { disable = false } = {}) {
  $("hint").innerHTML = `${zh}<span lang="en">${en}</span>`;
  if (disable) {
    const go = $("go");
    go.removeAttribute("href");
    go.setAttribute("aria-disabled", "true");
  }
}

(async () => {
  let status;
  try {
    const response = await fetch("/api/voucher", { cache: "no-store" });
    status = await response.json();
    if (!response.ok || status.error) return;   // the terms above still read fine
  } catch { return; }

  if (status.expiresAt) {
    $("expiry").textContent = EXPIRY_ZH(status.expiresAt);
    $("expiryEn").textContent = EXPIRY_EN(status.expiresAt);
  }

  // Already signed in and already holding it: say so instead of inviting a
  // second claim that would quietly do nothing.
  if (status.held) {
    $("go").textContent = "查看我的优惠券 · View my voucher";
    $("go").href = "/order?claim=tiger";
    return settle(
      "这张券已经在你的账户里了。到店点餐时会自动出现。",
      "This voucher is already in your account. It appears when you order at the table.",
    );
  }

  if (status.expired) return settle("优惠券已过期。", "This voucher has expired.", { disable: true });
  if (status.window === "early")
    return settle("活动尚未开始。", "The campaign has not started yet.", { disable: true });
  if (status.window === "closed")
    return settle("领取已结束。", "Claiming has closed.", { disable: true });
  if (status.soldOut)
    return settle("本次活动的优惠券已全部领完。", "All vouchers have been claimed.", { disable: true });
})();
