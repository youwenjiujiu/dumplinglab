globalThis.RewardAdmin = (() => {
  let epoch = 0;
  const esc = (s) =>
    String(s ?? "").replace(
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
  async function load(request, catalog) {
    const run = ++epoch,
      panel = document.querySelector("#rewardsPanel");
    panel.innerHTML =
      '<p class="reward-admin-message" role="status">正在读取积分设置…</p>';
    try {
      const data = await request("/api/rewards?admin=1");
      if (run !== epoch) return;
      const eligible = catalog;
      panel.innerHTML = `<form id="rewardSettings"><div class="panel-heading"><div><h2>积分规则与兑换商品</h2><p class="muted">${data.memberCount} 位有积分记录的会员 · 当前积分余额合计 ${data.totalPoints}</p></div><button class="primary" type="submit">保存设置</button></div><div class="reward-admin-rules"><label>每实付 S$1 获得 <input name="pointsPerDollar" type="number" min="1" max="100" step="1" required value="${data.pointsPerDollar}"> 分</label><p>此处配置 Dumpling Lab 自己的积分。保存后立即生效，无需重新部署。每单向下取整，兑换金额不再赠送积分。每道菜可指定一种兑换规格；做法、份量或加面不同，请选准规格。每单可用一项积分奖励或 CanCan 兑换券。已进入待付款的订单保留原兑换规则。</p><p>退款会扣回对应的消费积分；全额退款退回兑换积分或原券。已过期的券不会延长有效期。</p></div><div class="table-wrap"><table><caption class="sr-only">配置各菜品兑换积分</caption><thead><tr><th>可兑换商品</th><th>所需积分</th><th>开放兑换</th></tr></thead><tbody>${eligible
        .map((d) => {
          const r = data.rewards[d.id];
          return `<tr data-reward-dish="${esc(d.id)}"><td><strong>${esc(d.cn)}</strong>${d.variants ? `<select data-style aria-label="${esc(d.cn)}兑换规格">${Object.entries(d.variants).filter(([key,v])=>!v.legacy||key===r?.style).map(([key,v])=>`<option value="${esc(key)}" ${key===r?.style?"selected":""}>${esc(key)} · S$${v.price.toFixed(2)}</option>`).join("")}</select>` : ""}<small class="reward-admin-price">S$${d.price.toFixed(2)} · ${d.active === false ? "已下架" : d.soldOut ? "已售罄" : "在售"}</small></td><td><input aria-label="${esc(d.cn)}所需积分" data-cost type="number" min="1" max="100000" step="1" value="${r?.points || ""}" placeholder="填写积分"></td><td><label><input type="checkbox" data-active ${r?.active ? "checked" : ""}> 开放</label></td></tr>`;
        })
        .join(
          "",
        )}</tbody></table></div><p class="reward-admin-message" role="status"></p></form><details class="reward-admin-rules"><summary>最近积分操作（最多 100 条）</summary>${
        data.audit
          .slice(0, 100)
          .map(
            (a) =>
              `<p>${esc(new Date(a.at).toLocaleString("zh-SG"))} · ${esc({ settings: "更新兑换设置", settled: "订单积分入账", refund: "退款积分调整", "voucher-import": "接收 CanCan 兑换券" }[a.action] || a.action)}${a.details.orderId ? " · " + esc(a.details.orderId) : ""}</p>`,
          )
          .join("") || "<p>暂无积分操作。</p>"
      }</details>`;
      const eligibleGifts=catalog.flatMap(d=>d.active!==false&&d.kind==='dumpling'?Object.entries(d.variants||{}).filter(([,v])=>v.pieces===5&&v.prep==='boiled'&&!v.noodles&&!v.legacy).map(([style])=>({dishId:d.id,style,label:d.cn+' · '+style})):[]);
      const apology=document.createElement('section');apology.className='reward-admin-rules apology-admin';
      apology.innerHTML=`<h2>10月28日致歉券</h2><p>每账号一张5颗水饺券，发放后30天有效，无最低消费。仅限当天已付款堂食订单。匿名订单须核对付款记录后批准，每单最多补发一次。</p><label>兑换菜品<select data-apology-gift>${eligibleGifts.map((g,i)=>`<option value="${i}">${esc(g.label)}</option>`).join('')}</select></label><button type="button" data-apology-batch>发给当天已关联账号的客人</button><p data-apology-result role="status"></p><div data-apology-recipients></div><div data-apology-pending></div>`;
      panel.append(apology);
      const result=apology.querySelector('[data-apology-result]');
      async function send(requestId){const gift=eligibleGifts[Number(apology.querySelector('select').value)];if(!gift)throw Error('没有符合条件的5颗水饺');return request('/api/apology',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'grant',dishId:gift.dishId,style:gift.style,...(requestId?{requestId}:{})})});}
      async function pending(){
        const status=await request('/api/apology?admin=1');
        const recipients=status.recipients||[];
        apology.querySelector('[data-apology-recipients]').innerHTML=`<h3>可发放的关联账号 · ${recipients.length} 位</h3><p>按10月28日符合条件的已付款堂食订单核对。账号按会员编号显示；同一账号只发一张。</p>${recipients.map(r=>`<article><p><strong>会员账号 ${esc(r.memberId)}</strong> · ${r.issued?'已发放':'未发放'}<br>${r.orders.map(o=>`${esc(o.table||'—')}桌 · #${esc(o.no)} · ${esc(new Date(o.at).toLocaleTimeString('zh-SG',{timeZone:'Asia/Singapore',hour:'2-digit',minute:'2-digit'}))} · S$${Number(o.total).toFixed(2)}`).join('<br>')}</p></article>`).join('')||'<p>没有符合条件的关联账号。</p>'}<p>另有 ${Number(status.unlinkedOrders||0)} 笔未关联账号的订单，需客人申请后核对补发。</p>`;
        apology.querySelector('[data-apology-pending]').innerHTML=`<p>已发 ${status.issued} 张</p>`+status.requests.filter(r=>r.status==='pending').map(r=>`<p>订单 #${esc(r.orderNo)} · 申请时间 ${esc(new Date(r.at).toLocaleString('zh-SG',{timeZone:'Asia/Singapore'}))}<br><small>申请编号 ${esc(r.id)}</small><br><button type="button" data-apology-approve="${esc(r.id)}">已核对付款记录，批准补发</button></p>`).join('');
        apology.querySelectorAll('[data-apology-approve]').forEach(b=>b.onclick=async()=>{if(!confirm('已核对客人的付款记录及申请账号，确认补发？'))return;b.disabled=true;try{const out=await send(b.dataset.apologyApprove);result.textContent=`新增 ${out.issued} 张券（重复申请不会重复发券）`;await pending();}catch(e){result.textContent=e.message;b.disabled=false;}});
      }
      apology.querySelector('[data-apology-batch]').onclick=async e=>{if(!confirm('确认按所选菜品发放致歉券？同一账号只发一张。'))return;const b=e.currentTarget;b.disabled=true;try{const out=await send();result.textContent=`新增 ${out.issued} 张券`;await pending();}catch(e){result.textContent=e.message;}finally{b.disabled=false;}};
      pending().catch(e=>result.textContent=e.message);
      const form = panel.querySelector("form"),
        message = form.querySelector("[role=status]");
      form.onsubmit = async (e) => {
        e.preventDefault();
        const button = form.querySelector("[type=submit]");
        if (button.disabled) return;
        const rewards = [];
        for (const row of form.querySelectorAll("[data-reward-dish]")) {
          const cost = row.querySelector("[data-cost]"),
            active = row.querySelector("[data-active]").checked;
          if (!cost.value && !active) continue;
          if (!Number.isInteger(Number(cost.value)) || Number(cost.value) < 1) {
            message.textContent = "请为开放兑换的商品填写有效积分。";
            cost.focus();
            return;
          }
          rewards.push({
            dishId: row.dataset.rewardDish,
            points: Number(cost.value),
            style: row.querySelector("[data-style]")?.value || null,
            active,
          });
        }
        button.disabled = true;
        message.textContent = "正在保存…";
        try {
          await request("/api/rewards", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              revision: data.revision,
              pointsPerDollar: Number(form.pointsPerDollar.value),
              rewards,
            }),
          });
          await load(request, catalog);
          panel.querySelector("[role=status]").textContent =
            "积分设置已保存。顾客下次查看或结账时生效。";
        } catch (e) {
          message.textContent = e.message + "；修改仍保留，请刷新后核对。";
        } finally {
          button.disabled = false;
        }
      };
    } catch (e) {
      if (run === epoch)
        panel.innerHTML = `<p class="reward-admin-message" role="alert">${esc(e.message)}</p>`;
    }
  }
  return {
    load,
    clear: () => {
      epoch++;
      const p = document.querySelector("#rewardsPanel");
      if (p) p.innerHTML = "";
    },
  };
})();
