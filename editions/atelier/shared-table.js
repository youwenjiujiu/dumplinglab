/* The shared table owns gallery/list, peer feedback and paper receipts.
   Cart mutations and checkout stay in TableCart; no decorative state drives orders. */
const SharedTable = (() => {
  let layout = "table",
    detailOrigin = null,
    scrollPosition = 0;
  let seenActivity = null,
    seenOrders = null,
    activityTimer;
  const printedOrderIds = new Set();
  const key = (i) => `${i.id}|${i.style || ""}|${i.note || ""}`;
  const motion = () => globalThis.TableMotion;
  const author = (p) =>
    p.deviceId === store.device
      ? tr("我", "Me")
      : p.name || tr("同桌", "Guest");
  function attribution(item) {
    const people = store.peopleFor(item.id, item.style);
    if (!people.length || people.every((p) => p.deviceId === store.device)) return "";
    const labels = [...new Set(people.map(author))];
    return `${labels.slice(0, 3).join(tr("、", ", "))}${labels.length > 3 ? tr("等", " + others") : ""}${tr("选的", " picked this")}`;
  }
  const smallQuantity = (i) =>
    `<div class="quantity cart-quantity" role="group" aria-label="${escapeHTML(name(dish(i.id)) + tr("份数", " portions"))}" data-motion-key="qty:${escapeHTML(key(i))}"><button data-cart-delta="-1" data-id="${i.id}" data-style="${i.style || ""}" data-note="${escapeHTML(i.note || "")}" aria-label="${escapeHTML(tr("减少 ", "Remove ") + name(dish(i.id)))}">−</button><b>${i.qty}</b><button data-cart-delta="1" data-id="${i.id}" data-style="${i.style || ""}" data-note="${escapeHTML(i.note || "")}" aria-label="${escapeHTML(tr("增加 ", "Add ") + name(dish(i.id)))}" ${i.qty >= 20 ? "disabled" : ""}>+</button></div>`;
  function itemHTML(i) {
    const d = dish(i.id),
      k = escapeHTML(key(i));
    return `<article class="shared-dish" data-cart-key="${k}"><button class="cart-dish-open" data-cart-dish="${d.id}" data-cart-key="${k}" aria-label="${escapeHTML(name(d))}"><span class="cart-photo" data-motion-key="photo:${k}">${d.img ? `<img src="${photo(d, "s", i.style)}" alt="" decoding="async">` : `<span>${categoryName(d.section)}</span>`}</span><span class="cart-dish-copy" data-motion-key="name:${k}"><strong>${bi(d.cn,d.name)}</strong>${i.style ? `<small>${styleHTML(i.style)}</small>` : ""}${i.note ? `<small class="cart-line-note">${escapeHTML(i.note)}</small>` : ""}</span></button><span class="cart-author" data-motion-key="author:${k}">${escapeHTML(attribution(i))}</span><span class="cart-unit-price" data-motion-key="price:${k}">${foodMoney(itemPrice(d, i.style))}<small>${bi("/ 份", "/ each")}</small></span>${smallQuantity(i)}<button class="cart-remove" data-cart-remove="${i.qty}" data-id="${i.id}" data-style="${i.style || ""}" data-note="${escapeHTML(i.note || "")}" aria-label="${escapeHTML(tr("删除 ", "Remove ") + name(d))}">${bi("删除", "Remove")}</button></article>`;
  }
  function receipt(order, confirmed = false) {
    const subtotal = order.total ?? total(order.items);
    const pricing = order.pricingVersion ? order : confirmed ? null : { ...OrderPricing.quote(total(order.items), 'dinein', OrderPricing.discountFor(globalThis.DL_SETTINGS, order.table || table), discountLines(order.items)), mode: 'dinein' };
    const remote = ['takeaway', 'delivery'].includes(order.mode);
    // Read the order snapshot, never today's nickname: old receipts keep their author.
    const submitter = confirmed && order.actorName
      ? `<p class="receipt-submitter">${bi("提交人", "Submitted by")} <strong>${escapeHTML(order.actorName)}</strong></p>`
      : "";
    return `<article class="paper-receipt ${confirmed ? "is-submitted" : "is-review"}"><header class="receipt-masthead"><span>DUMPLING Lab / 饺</span><span>${remote ? escapeHTML(Fulfilment.label(order.mode)) : `${escapeHTML(order.table || table || "—")} · ${escapeHTML(order.group || group)}`}</span></header><div class="receipt-heading"><div><h2 ${confirmed ? "" : 'id="sheetTitle"'}>${confirmed ? bi("已下单", "Order placed") : bi("确认订单", "Review order")}</h2></div>${confirmed ? `<span class="receipt-stamp">${bi("已提交", "SENT")}</span>` : ""}</div>${confirmed ? `<div class="receipt-meta"><span>#${escapeHTML(order.no)}</span><time>${new Date(order.at).toLocaleString(language === "zh" ? "zh-CN" : "en-SG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></div>` : ""}${submitter}${confirmed ? Fulfilment.pickupTicket(order) : ""}${remote ? `<p class="receipt-note">${order.fulfilment.date ? `${escapeHTML(order.fulfilment.date)} · ${escapeHTML(order.fulfilment.slot)}<br>` : ""}${escapeHTML(order.fulfilment.pickupAddress || [order.customer.address, order.customer.unit].filter(Boolean).join(" "))}</p>` : ""}<div class="receipt-dish-strip" aria-hidden="true">${order.items
      .slice(0, 5)
      .map((i) =>
        dish(i.id)?.img ? `<img src="${photo(dish(i.id), "s", i.style)}" alt="">` : "",
      )
      .join(
        "",
      )}</div><div class="receipt-lines">${order.items.map((i) => `<div><span class="receipt-item">${dish(i.id)?.img ? `<img class="receipt-line-photo" src="${photo(dish(i.id), "s", i.style)}" alt="" width="48" height="48">` : ""}<span class="receipt-item-copy"><strong>${bi(i.name || dish(i.id).cn,i.englishName || dish(i.id).name)}</strong>${i.style ? `<small>${styleHTML(i.style)}</small>` : ""}${i.promo === "bogo" ? `<small>${bi("买一赠一 · 赠送", "Buy 1 get 1 · Free")}</small>` : ""}${i.note ? `<small class="cart-line-note">${escapeHTML(i.note)}</small>` : ""}</span></span><span>× ${i.qty}</span><b>${money((i.price ?? itemPrice(dish(i.id), i.style)) * i.qty)}</b></div>`).join("")}</div>${order.note ? `<p class="receipt-note">${bi("备注", "NOTE")} · ${escapeHTML(order.note)}</p>` : ""}${pricing ? Fulfilment.summary(pricing) : `<div class="receipt-sum"><span>${bi("订单金额", "Order total")}</span><strong>${money(subtotal)}</strong></div>`}<footer>${confirmed ? (production ? bi("订单已提交", "Order submitted") : bi("本地体验已收单 · 未发送至真实厨房", "Saved locally · Not sent to a real kitchen")) : bi("堂食另收 10% 服务费，请确认菜品、份数和做法。", "Dine-in adds a 10% service charge. Check dishes, portions and preparation.")}</footer></article>`;
  }
  function emptyTicket(pending) {
    if (store.sessionEnded) return `<div class="table-empty empty-ticket"><div class="empty-ticket-copy"><h3>${bi("本轮就餐已结束", "Dining session ended")}</h3><p>${bi("如需重新点餐，请再扫一次桌上二维码。", "Scan the table QR code again to start a new visit.")}</p></div></div>`;
    const hasSelection = !pending && store.items.length > 0;
    return `<div class="table-empty empty-ticket"><div class="empty-ticket-copy"><h3>${pending ? bi("还没有选菜", "No dishes selected") : bi("暂无订单", "No orders yet")}</h3><p>${pending ? bi("选好喜欢的菜，再回来确认。", "Choose your dishes, then review them here.") : bi("下单后，可以在这里查看。", "Your placed orders will appear here.")}</p><button class="primary empty-ticket-action" ${hasSelection ? 'data-cart-tab="pending"' : 'data-action="close"'}>${hasSelection ? bi("查看待下单", "View selected dishes") : bi("去选菜", "Browse menu")}</button></div></div>`;
  }
  function render(before = null) {
    if (modal !== "cart") return;
    const active = document.activeElement;
    const rows = [...document.querySelectorAll('.shared-dish')];
    const focusedRow = active?.closest('.shared-dish');
    const focus = $('.cart-page')?.contains(active) && active.matches('button, .cart-quantity, .empty-ticket-copy h3')
      ? { data: { ...active.dataset }, key: focusedRow?.dataset.cartKey, index: rows.indexOf(focusedRow),
          quantity: active.matches('[data-cart-delta], .cart-quantity'), empty: active.matches('.empty-ticket-copy h3') }
      : null;
    const existing = $(".cart-scroll");
    if (existing) scrollPosition = existing.scrollTop;
    const items = store.items,
      pending = cartTab === "pending";
    const remote = Fulfilment.remote();
    $("#sheet").classList.toggle("is-empty-cart", pending ? !items.length && !store.order : !store.orders.length);
    $("#sheetBody").innerHTML =
      `<div class="cart-page"><div class="cart-scroll"><header class="our-table-head"><div><p class="eyebrow">DUMPLING LAB · ${bi("点单", "ORDER")}</p><h2 id="sheetTitle">${remote ? escapeHTML(Fulfilment.label()) : bi("本桌点单", "Table order")}</h2></div>${remote ? "" : `<div class="table-number"><small>${bi("桌号", "TABLE")}</small><strong>${escapeHTML(table || "—")}</strong></div>`}</header><div class="table-members"><span>${bilingualText(statusCopy())}${remote ? "" : ` · ${bi("点餐组", "Group")} ${escapeHTML(group)}`}</span><button data-action="nickname">${store.nickname ? escapeHTML(store.nickname) : bi("设置称呼", "Set name")} <span aria-hidden="true">↗</span></button></div><div class="cart-viewbar"><div class="receipt-tabs"><button data-cart-tab="pending" class="${pending ? "active" : ""}" aria-pressed="${pending}">${bi("待下单", "Selected")} ${count()}</button><button data-cart-tab="ordered" class="${pending ? "" : "active"}" aria-pressed="${!pending}">${bi("已下单", "Placed")} ${store.orders.length}</button></div>${pending && items.length ? `<button class="layout-switch" data-table-layout="${layout === "table" ? "list" : "table"}" aria-label="${tr("切换摆盘或清单", "Switch table and list views")}"><dl-table-view-motion layout="${layout}" aria-hidden="true"></dl-table-view-motion><span>${layout === "table" ? bi("看清单", "List") : bi("看摆盘", "Table")}</span></button>` : ""}</div>${pending ? `${store.order ? `<p class="drawer-note">${bi("这单还没付款。想改菜，直接点加减就行，会自动取消这次付款。", "Not paid yet. To change dishes, just tap − or +; this payment will be cancelled.")}</p>` : store.remote?.paymentPending ? `<p class="drawer-note">${bi("同桌有人正在付款，付完会出现在「已下单」。", "Someone at your table is paying. It will appear under Placed.")}</p><button type="button" class="checkout-continue" data-table-unlock>${bi("取消付款并修改菜品", "Cancel payment & edit dishes")}</button>` : ""}<div class="cart-dishes" data-layout="${layout}">${items.map(itemHTML).join("")}</div>${!items.length ? emptyTicket(true) : `<label class="note-label table-note">${bi("备注", "Note")}<textarea id="cartNote" maxlength="240" placeholder="${tr("例如：不要香菜", "e.g. No coriander")}" ${store.order ? "disabled" : ""}>${escapeHTML(noteDraft ?? store.noteConflict?.local ?? store.note)}</textarea></label><div id="noteConflict" class="note-conflict" role="status" aria-live="polite" hidden></div>`}` : `<div class="placed-receipts">${store.orders.length ? store.orders.map((o) => receipt(o, true)).join("") : emptyTicket(false)}</div>`}${remote ? "" : `<button class="table-invite" data-action="table">${bi("邀请同桌 / 拼桌独立点餐", "Invite companions / separate group")} ↗</button>`}</div><footer class="cart-checkout">${pending && (items.length || store.order) ? `<span><small>${bi("本次待下单", "Not placed yet")}</small><strong>${cartMoney(items)}</strong>${cartBreakdown(items)}</span><button class="primary" data-action="review" ${submitting ? "disabled" : ""}>${store.order ? bi("继续付款", "Continue to payment") : bi("确认订单", "Review order")} ↗</button>` : `<button class="primary" data-action="close">${bi("继续选菜", "Keep exploring")} ↗</button>`}</footer></div>`;
    // Only a genuinely empty cart is simplified. Never hide existing history or
    // an unresolved payment, and keep shared-table identity/sync controls intact.
    const pristine = !items.length && !store.orders.length && !store.order;
    $('.cart-viewbar').hidden = pristine;
    $('.table-members').hidden = pristine && remote;
    if (pending && store.order?.token) $('.drawer-note')?.insertAdjacentHTML('afterend', `<button type="button" class="checkout-continue" data-checkout-cancel>${bi('取消本次付款，继续点餐', 'Cancel payment & keep ordering')}</button>`);
    $(".cart-scroll").scrollTop = scrollPosition;
    updateNoteConflict();
    if (before) motion()?.reconcile($(".cart-dishes"), before);
    if (focus) {
      const currentRows = [...document.querySelectorAll('.shared-dish')];
      const row = currentRows.find(el => el.dataset.cartKey === focus.key);
      let target;
      if (focus.quantity) {
        target = row && [...row.querySelectorAll('[data-cart-delta]')].find(b => b.dataset.cartDelta === focus.data.cartDelta && !b.disabled);
        // At a limit or after removal, focus a group rather than another action:
        // holding Enter must never start decrementing or deleting the next dish.
        target ||= (row || currentRows[Math.min(focus.index, currentRows.length - 1)])?.querySelector('.cart-quantity') || $('.empty-ticket-copy h3');
      } else if (focus.data.cartTab) target = $(`.receipt-tabs [data-cart-tab="${focus.data.cartTab}"]`);
      else if (focus.data.cartDish) target = row?.querySelector('.cart-dish-open');
      else if (focus.data.tableLayout) target = $('[data-table-layout]');
      else if (focus.data.action) target = [...document.querySelectorAll('.cart-page [data-action]')].find(b => b.dataset.action === focus.data.action && !b.disabled);
      else if (focus.empty) target = $('.empty-ticket-copy h3');
      target ||= pristine ? $('.empty-ticket-copy h3') : $('.receipt-tabs [aria-pressed="true"]');
      if (target?.matches('.cart-quantity, .empty-ticket-copy h3')) target.tabIndex = -1;
      target?.focus({ preventScroll: true });
    }
  }
  function open(tab = "pending", options = {}) {
    const origins =
      options.origins ||
      new Map(
        [...document.querySelectorAll("#trayPictures img")].map((img) => [
          `photo:${img.dataset.id}|`,
          motion()?.rect(img),
        ]),
      );
    detailOrigin = null;
    if (!options.keepScroll) {
      scrollPosition = 0;
      const scroller = $(".cart-scroll");
      if (scroller) scroller.scrollTop = 0;
    }
    cartTab = tab;
    openModal("cart", "");
    $("#sheet").removeAttribute("data-return-to");
    document.body.classList.add("viewing-table");
    render();
    if (tab === "pending") motion()?.reconcile($(".cart-dishes"), origins, 420);
  }
  function switchLayout(next) {
    const container = $(".cart-dishes"),
      before = motion()?.capture(container);
    layout = next;
    container.dataset.layout = layout;
    const button = $("[data-table-layout]");
    button.dataset.tableLayout = layout === "table" ? "list" : "table";
    setBilingual(button.querySelector("span"), layout === "table" ? tr("看清单", "List") : tr("看摆盘", "Table"));
    button.querySelector("dl-table-view-motion").setAttribute("layout", layout);
    motion()?.reconcile(container, before);
  }
  function openDetail(button) {
    scrollPosition = $(".cart-scroll")?.scrollTop || 0;
    const origin = motion()?.rect(button.querySelector(".cart-photo"));
    detailOrigin = { key: button.dataset.cartKey };
    const selected = store.items.find((item) => key(item) === button.dataset.cartKey);
    openDish(dish(button.dataset.cartDish), selected?.style);
    $("#sheet").dataset.returnTo = "table";
    $("#closeSheet").textContent = "←";
    $("#closeSheet").ariaLabel = Fulfilment.remote() ? tr("返回订单", "Back to order") : tr("返回本桌", "Back to our table");
    const img = $(".detail-image img");
    if (img && origin) {
      img.dataset.motionKey = `photo:${detailOrigin.key}`;
      motion()?.reconcile(
        $("#sheetBody"),
        new Map([[img.dataset.motionKey, origin]]),
        420,
      );
    }
  }
  function returnFromDetail() {
    if (modal !== "dish" || !detailOrigin) return false;
    const returnKey = detailOrigin.key;
    const origins = new Map(),
      image = $(".detail-image img");
    if (image) origins.set(`photo:${detailOrigin.key}`, motion()?.rect(image));
    detailOrigin = null;
    open("pending", { keepScroll: true, origins });
    [...document.querySelectorAll('.cart-dish-open')].find(b => b.dataset.cartKey === returnKey)?.focus({ preventScroll: true });
    return true;
  }
  function nameForm() {
    return `<div class="nickname-form"><input id="nickname" maxlength="16" autocomplete="nickname" aria-label="${tr("称呼（选填）", "Name (optional)")}" aria-describedby="nicknameHint" placeholder="${tr("输入称呼（选填）", "Name (optional)")}" value="${escapeHTML(store.nickname)}"><p id="nicknameHint">${bi("用于标记你选的菜，并在小票上显示提交人；称呼可不填。", "Labels your picks and identifies the submitter on the receipt. Optional.")}</p><button class="primary" data-action="save-nickname">${bi("保存", "Save")}</button></div>`;
  }
  function observe() {
    updateMenu();
    updateNoteConflict();
    updateReview();
    if (store.status !== "synced") return;
    const events = store.remote.activity || [],
      orders = store.orders;
    if (seenActivity === null) {
      seenActivity = new Set(events.map((e) => e.id));
      seenOrders = new Set(orders.map((o) => o.id));
      return;
    }
    const additions = events.filter(
      (e) =>
        !seenActivity.has(e.id) &&
        e.deviceId !== store.device &&
        e.kind === "delta" &&
        e.delta > 0 &&
        dish(e.dishId),
    );
    events.forEach((e) => seenActivity.add(e.id));
    const placed = orders.filter((o) => !seenOrders.has(o.id));
    orders.forEach((o) => seenOrders.add(o.id));
    const latest = additions.at(-1);
    if (latest) {
      const label = latest.actorName || tr("同桌", "A guest");
      const copy =
        additions.length === 1
          ? tr(
              `${label}端上了${name(dish(latest.dishId))}`,
              `${label} added ${name(dish(latest.dishId))}`,
            )
          : tr(
              `同桌刚加了 ${additions.length} 次菜，一起看看。`,
              `${additions.length} new additions from your table.`,
            );
      announce(copy, photo(dish(latest.dishId)));
    } else if (placed.some((o) => o.id !== store.lastOrderRequestId) && !submitting)
      announce(
        tr(
          "同桌提交了点单，已保留在“已下单”里。",
          "An order was placed. Find it in Placed orders.",
        ),
      );
    if (seenActivity.size > 200)
      seenActivity = new Set(events.map((e) => e.id));
  }
  function announce(copy, src = "") {
    const box = $("#tableActivity");
    ($("#sheet").open ? $("#sheet") : document.body).append(box);
    box.innerHTML = `${src ? `<img src="${src}" alt="">` : ""}<span>${escapeHTML(copy)}</span>`;
    box.hidden = false;
    clearTimeout(activityTimer);
    activityTimer = setTimeout(() => (box.hidden = true), 4600);
  }
  function updateMenu() {
    document.querySelectorAll("[data-table-count]").forEach((node) => {
      // A sized dish's card counts every size of it.
      const n = groupQty(dish(node.dataset.tableCount));
      node.hidden = !n;
      setBilingual(node, tr(`本桌已有 ${n} 份`, `${n} already selected`));
    });
  }
  function review(order) {
    $("#sheetBody").innerHTML =
      `<div class="receipt-page">${receipt(order)}<p id="reviewUpdate" class="review-update" role="status" aria-live="polite" hidden></p><p class="fineprint">${bi("只提交这次确认的菜。同桌后来加的菜会留在下一单。", "Only this selection is submitted. Later additions stay for the next order.")}</p><button class="primary" data-action="submit">${bi("确认下单", "Place this order")} ↗</button><button class="secondary" data-action="cart">${bi("返回修改", "Edit order")}</button></div>`;
    updateReview();
  }
  function updateNoteConflict() {
    const box = $("#noteConflict");
    if (!box) return;
    const conflict = store.noteConflict;
    box.hidden = !conflict;
    const button = $('[data-action="review"]');
    if (button) button.disabled = Boolean(conflict || submitting);
    if (!conflict) { delete box.dataset.signature; box.replaceChildren(); return; }
    const signature = JSON.stringify([conflict.remote, language]);
    if (box.dataset.signature === signature) return;
    box.dataset.signature = signature;
    box.innerHTML = `<p>${bi("同桌修改了备注。你的文字仍保留在上方。", "Someone changed the note. Your text is kept above.")}</p><small>${bi("同桌的备注", "Current shared note")}</small><blockquote>${escapeHTML(conflict.remote || tr("（空）", "(empty)"))}</blockquote><div><button data-note-choice="remote">${bi("使用同桌备注", "Use shared note")}</button><button data-note-choice="local">${bi("保留我的备注", "Keep my note")}</button></div>`;
  }
  function reviewChanged() {
    if (!globalThis.getReviewSnapshot || store.order) return false;
    const snapshot = getReviewSnapshot();
    if (!snapshot) return false;
    const ids = new Set(snapshot.cartOpIds || []);
    return Boolean(store.noteConflict) || (store.note || "") !== (snapshot.note || "") ||
      snapshot.items.some((i) => (store.items.find((item) => key(item) === key(i))?.qty || 0) < i.qty) ||
      (store.remote.activity || []).some((op) => store.remote.opIds?.includes(op.id) && !ids.has(op.id) && (op.kind === "note" || (op.kind === "delta" && op.delta < 0)));
  }
  function updateReview() {
    if (modal !== "review" || submitting || !globalThis.getReviewSnapshot) return;
    const snapshot = getReviewSnapshot();
    if (!snapshot) return;
    const submitted = store.orders.find((o) => snapshot.cartOpIds?.length && snapshot.cartOpIds.every((id) => o.cartOpIds?.includes(id)));
    if (submitted) {
      openModal("success", "");
      confirm(submitted);
      return;
    }
    const box = $("#reviewUpdate"), button = $('[data-action="submit"]');
    if (!box || !button) return;
    const changed = reviewChanged();
    const later = (store.remote.opIds || []).some((id) => !snapshot.cartOpIds?.includes(id));
    const offline = store.status !== "synced";
    box.hidden = !store.order && !changed && !later && !offline;
    setBilingual(box, store.order
      ? tr("订单结果还未确认。请查询或重试同一笔订单，不会重复下单。", "Order status is unconfirmed. Check or retry the same order; it will not be placed twice.")
      : changed ? tr("同桌修改了菜品或备注，请返回重新确认。", "Dishes or notes changed. Go back and review again.")
      : offline ? tr("等待本桌重新连接后再下单。", "Waiting for your table to reconnect.")
      : later ? tr("同桌新加的菜会留到下一单。本次金额不变。", "New additions stay for the next order. This total is unchanged.") : "");
    button.disabled = !store.order && (changed || offline);
    setBilingual(button, store.order ? tr("查询 / 重试本单", "Check / retry this order") : tr("确认下单", "Place this order"));
  }
  function confirm(order) {
    if (order.status === 'paid') return Fulfilment.showPaidOrder(order);
    $("#sheetBody").innerHTML =
      `<div class="receipt-page receipt-success"><h2 id="sheetTitle" class="receipt-success-title" tabindex="-1">${bi("点单已提交", "Order submitted")}</h2><dl-receipt-print class="receipt-printer" data-order-id="${escapeHTML(order.id)}">${receipt(order, true)}</dl-receipt-print><button class="primary" data-action="ordered">${bi("查看本桌点单记录", "View our order history")}</button><button class="secondary" data-action="close">${bi("继续点餐", "Keep ordering")}</button></div>`;
    if (order.id && !printedOrderIds.has(order.id)) {
      printedOrderIds.add(order.id);
      $("dl-receipt-print")?.restart?.();
    }
    $("#sheetTitle")?.focus({preventScroll:true});
  }
  function init() {
    document.addEventListener("keydown", (e) => {
      if (e.target.id === "nickname" && e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        document.querySelector('[data-action="save-nickname"]')?.click();
      }
    });
    document.addEventListener("focusout", (e) => {
      if (e.target.id !== "cartNote") return;
      requestAnimationFrame(() => {
        if (modal === "cart" && document.activeElement?.id !== "cartNote")
          renderCart();
      });
    });
    document.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.noteChoice) {
        clearTimeout(noteTimer);
        const draft = $("#cartNote")?.value;
        noteDraft = null;
        store.resolveNote(b.dataset.noteChoice, draft);
        renderCart();
        $("#cartNote")?.focus({ preventScroll: true });
        return;
      }
      if (b.dataset.tableLayout) {
        switchLayout(b.dataset.tableLayout);
        return;
      }
      if (b.dataset.cartDish) {
        openDetail(b);
        return;
      }
      if (b.dataset.action === "nickname") {
        openModal("profile", "");
        $("#sheetBody").innerHTML =
          `<div class="sheet-content nickname-content"><h2 id="sheetTitle">${bi("设置称呼", "Set name")}</h2>${nameForm()}</div>`;
        // Do not force the software keyboard before the guest sees the form.
      }
      if (b.dataset.action === "save-nickname") {
        store.setNickname($("#nickname").value);
        toast(
          tr(
            "称呼已保存",
            "Name saved",
          ),
        );
        open();
      }
    });
  }
  return {
    open,
    render,
    review,
    confirm,
    init,
    observe,
    updateMenu,
    nameForm,
    returnFromDetail,
    updateReview,
    reviewChanged,
  };
})();

undefined
