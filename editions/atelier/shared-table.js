/* The shared table owns gallery/list, peer feedback and paper receipts.
   Cart mutations and checkout stay in TableCart; no decorative state drives orders. */
const SharedTable = (() => {
  let layout = "table",
    detailOrigin = null,
    scrollPosition = 0;
  let seenActivity = null,
    seenOrders = null,
    activityTimer;
  const key = (i) => `${i.id}|${i.style || ""}`;
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
    `<div class="quantity cart-quantity" role="group" aria-label="${escapeHTML(name(dish(i.id)) + tr("份数", " portions"))}" data-motion-key="qty:${escapeHTML(key(i))}"><button data-cart-delta="-1" data-id="${i.id}" data-style="${i.style || ""}" aria-label="${escapeHTML(tr("减少 ", "Remove ") + name(dish(i.id)))}" ${store.order ? "disabled" : ""}>−</button><b>${i.qty}</b><button data-cart-delta="1" data-id="${i.id}" data-style="${i.style || ""}" aria-label="${escapeHTML(tr("增加 ", "Add ") + name(dish(i.id)))}" ${store.order || i.qty >= 20 ? "disabled" : ""}>+</button></div>`;
  function itemHTML(i) {
    const d = dish(i.id),
      k = escapeHTML(key(i));
    return `<article class="shared-dish" data-cart-key="${k}"><button class="cart-dish-open" data-cart-dish="${d.id}" data-cart-key="${k}" aria-label="${escapeHTML(name(d))}"><span class="cart-photo" data-motion-key="photo:${k}">${d.img ? `<img src="${photo(d, "s", i.style)}" alt="" decoding="async">` : `<span>${categoryName(d.section)}</span>`}</span><span class="cart-dish-copy" data-motion-key="name:${k}"><strong>${dishNameHTML(d)}</strong><small>${i.style ? styleName(i.style) + " · " : ""}${otherName(d)}</small></span></button><span class="cart-author" data-motion-key="author:${k}">${escapeHTML(attribution(i))}</span><span class="cart-unit-price" data-motion-key="price:${k}">${money(itemPrice(d, i.style))}<small>${tr("/ 份", "/ each")}</small></span>${smallQuantity(i)}</article>`;
  }
  function receipt(order, confirmed = false) {
    const subtotal = order.total ?? total(order.items);
    return `<article class="paper-receipt ${confirmed ? "is-submitted" : "is-review"}"><header class="receipt-masthead"><span>DUMPLING Lab / 饺</span><span>${escapeHTML(order.table || table || "—")} · ${escapeHTML(order.group || group)}</span></header><div class="receipt-heading"><div><h2 ${confirmed ? "" : 'id="sheetTitle"'}>${confirmed ? tr("已下单", "Order placed") : tr("确认订单", "Review order")}</h2></div>${confirmed ? `<span class="receipt-stamp">${tr("已提交", "SENT")}</span>` : ""}</div>${confirmed ? `<div class="receipt-meta"><span>#${escapeHTML(order.no)}</span><time>${new Date(order.at).toLocaleString(language === "zh" ? "zh-CN" : "en-SG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></div>` : ""}<div class="receipt-dish-strip" aria-hidden="true">${order.items
      .slice(0, 5)
      .map((i) =>
        dish(i.id)?.img ? `<img src="${photo(dish(i.id), "s", i.style)}" alt="">` : "",
      )
      .join(
        "",
      )}</div><div class="receipt-lines">${order.items.map((i) => `<div><span><strong>${dishNameHTML({ ...dish(i.id), cn: i.name || dish(i.id).cn, name: i.englishName || dish(i.id).name })}</strong>${i.style ? `<small>${styleName(i.style)}</small>` : ""}</span><span>× ${i.qty}</span><b>${money((i.price ?? itemPrice(dish(i.id), i.style)) * i.qty)}</b></div>`).join("")}</div>${order.note ? `<p class="receipt-note">${tr("备注", "NOTE")} · ${escapeHTML(order.note)}</p>` : ""}<div class="receipt-sum"><span>${tr("菜品小计", "Food subtotal")}</span><strong>${money(subtotal)}</strong></div><footer>${confirmed ? (production ? tr("订单已提交", "Order submitted") : tr("本地体验已收单 · 未发送至真实厨房", "Saved locally · Not sent to a real kitchen")) : tr("请确认菜品、份数和做法。税费如适用，以店内结账为准。", "Check dishes, portions and preparation. Applicable charges are confirmed in-store.")}</footer></article>`;
  }
  function render(before = null) {
    if (modal !== "cart") return;
    const active = document.activeElement;
    const focus = active?.dataset.cartDelta ? { ...active.dataset } : null;
    const existing = $(".cart-scroll");
    if (existing) scrollPosition = existing.scrollTop;
    const items = store.items,
      pending = cartTab === "pending";
    $("#sheetBody").innerHTML =
      `<div class="cart-page"><div class="cart-scroll"><header class="our-table-head"><div><p class="eyebrow">DUMPLING LAB · ${tr("点单", "ORDER")}</p><h2 id="sheetTitle">${tr("本桌点单", "Table order")}</h2></div><div class="table-number"><small>${tr("桌号", "TABLE")}</small><strong>${escapeHTML(table || "—")}</strong></div></header><div class="table-members"><span>${statusCopy()} · ${tr("点餐组", "Group")} ${escapeHTML(group)}</span><button data-action="nickname">${store.nickname ? escapeHTML(store.nickname) : tr("设置称呼", "Set name")} <span aria-hidden="true">↗</span></button></div><div class="cart-viewbar"><div class="receipt-tabs"><button data-cart-tab="pending" class="${pending ? "active" : ""}" aria-pressed="${pending}">${tr("待下单", "Selected")} ${count()}</button><button data-cart-tab="ordered" class="${pending ? "" : "active"}" aria-pressed="${!pending}">${tr("已下单", "Placed")} ${store.orders.length}</button></div>${pending ? `<button class="layout-switch" data-table-layout="${layout === "table" ? "list" : "table"}" aria-label="${tr("切换摆盘或清单", "Switch table and list views")}"><dl-table-view-motion layout="${layout}" aria-hidden="true"></dl-table-view-motion><span>${layout === "table" ? tr("看清单", "List") : tr("看摆盘", "Table")}</span></button>` : ""}</div>${pending ? `${store.order ? `<p class="drawer-note">${tr("上一笔订单仍待确认，请先查询或安全重试。", "Your last order awaits confirmation. Safely check it below.")}</p>` : ""}<div class="cart-dishes" data-layout="${layout}">${items.map(itemHTML).join("")}</div>${!items.length ? `<div class="table-empty"><span aria-hidden="true">◯</span><h3>${tr("尚未选菜", "No dishes selected")}</h3><button class="secondary" data-action="close">${tr("去选菜", "Explore the menu")}</button></div>` : `<label class="note-label table-note">${tr("备注", "Note")}<textarea id="cartNote" maxlength="240" placeholder="${tr("例如：不要香菜", "e.g. No coriander")}" ${store.order ? "disabled" : ""}>${escapeHTML(noteDraft ?? store.noteConflict?.local ?? store.note)}</textarea></label><div id="noteConflict" class="note-conflict" role="status" aria-live="polite" hidden></div>`}` : `<div class="placed-receipts">${store.orders.length ? store.orders.map((o) => receipt(o, true)).join("") : `<div class="table-empty"><h3>${tr("还没有提交的订单", "No placed orders yet")}</h3></div>`}</div>`}<button class="table-invite" data-action="table">${tr("邀请同桌 / 拼桌独立点餐", "Invite companions / separate group")} ↗</button></div><footer class="cart-checkout">${pending && (items.length || store.order) ? `<span><small>${tr("本次待下单", "Not placed yet")}</small><strong>${money(total(items))}</strong></span><button class="primary" data-action="review" ${submitting ? "disabled" : ""}>${store.order ? tr("确认上一笔订单", "Check last order") : tr("确认订单", "Review order")} ↗</button>` : `<button class="primary" data-action="close">${tr("继续选菜", "Keep exploring")} ↗</button>`}</footer></div>`;
    $(".cart-scroll").scrollTop = scrollPosition;
    updateNoteConflict();
    if (before) motion()?.reconcile($(".cart-dishes"), before);
    if (focus)
      [...document.querySelectorAll("[data-cart-delta]")]
        .find(
          (b) =>
            b.dataset.id === focus.id &&
            b.dataset.style === focus.style &&
            b.dataset.cartDelta === focus.cartDelta,
        )
        ?.focus({ preventScroll: true });
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
    button.querySelector("span").textContent =
      layout === "table" ? tr("看清单", "List") : tr("看摆盘", "Table");
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
    $("#closeSheet").ariaLabel = tr("返回本桌", "Back to our table");
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
    const origins = new Map(),
      image = $(".detail-image img");
    if (image) origins.set(`photo:${detailOrigin.key}`, motion()?.rect(image));
    detailOrigin = null;
    open("pending", { keepScroll: true, origins });
    return true;
  }
  function nameForm() {
    return `<div class="nickname-form"><label for="nickname">${tr("同桌怎么称呼你？", "What should your table call you?")}</label><input id="nickname" maxlength="16" autocomplete="nickname" placeholder="${tr("比如：小陈（可不填）", "e.g. Alex (optional)")}" value="${escapeHTML(store.nickname)}"><p>${tr("自选称呼仅用于提示谁加了菜，不代表已验证身份。不填则显示“同桌”。", "An optional, unverified label for dish updates. Leave blank to appear as Guest.")}</p><button class="primary" data-action="save-nickname">${tr("记住这个称呼", "Save this name")}</button></div>`;
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
      const n = qty(node.dataset.tableCount);
      node.hidden = !n;
      node.textContent = tr(`本桌已有 ${n} 份`, `${n} already selected`);
    });
  }
  function review(order) {
    $("#sheetBody").innerHTML =
      `<div class="receipt-page">${receipt(order)}<p id="reviewUpdate" class="review-update" role="status" aria-live="polite" hidden></p><p class="fineprint">${tr("只提交这次确认的菜。同桌后来加的菜会留在下一单。", "Only this selection is submitted. Later additions stay for the next order.")}</p><button class="primary" data-action="submit">${tr("确认下单", "Place this order")} ↗</button><button class="secondary" data-action="cart">${tr("返回修改", "Edit order")}</button></div>`;
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
    box.innerHTML = `<p>${tr("同桌修改了备注。你的文字仍保留在上方。", "Someone changed the note. Your text is kept above.")}</p><small>${tr("同桌的备注", "Current shared note")}</small><blockquote>${escapeHTML(conflict.remote || tr("（空）", "(empty)"))}</blockquote><div><button data-note-choice="remote">${tr("使用同桌备注", "Use shared note")}</button><button data-note-choice="local">${tr("保留我的备注", "Keep my note")}</button></div>`;
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
    box.textContent = store.order
      ? tr("订单结果还未确认。请查询或重试同一笔订单，不会重复下单。", "Order status is unconfirmed. Check or retry the same order; it will not be placed twice.")
      : changed ? tr("同桌修改了菜品或备注，请返回重新确认。", "Dishes or notes changed. Go back and review again.")
      : offline ? tr("等待本桌重新连接后再下单。", "Waiting for your table to reconnect.")
      : later ? tr("同桌新加的菜会留到下一单。本次金额不变。", "New additions stay for the next order. This total is unchanged.") : "";
    button.disabled = !store.order && (changed || offline);
    button.textContent = store.order ? tr("查询 / 重试本单", "Check / retry this order") : tr("确认下单", "Place this order");
  }
  function confirm(order) {
    $("#sheetBody").innerHTML =
      `<div class="receipt-page"><h2 id="sheetTitle" class="sr-only">${tr("点单已提交", "Order submitted")}</h2>${receipt(order, true)}<button class="primary" data-action="ordered">${tr("查看本桌点单记录", "View our order history")}</button><button class="secondary" data-action="close">${tr("继续点餐", "Keep ordering")}</button></div>`;
  }
  function init() {
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
          `<div class="sheet-content"><h2 id="sheetTitle">${tr("设置称呼", "Set name")}</h2>${nameForm()}</div>`;
        $("#nickname").focus();
      }
      if (b.dataset.action === "save-nickname") {
        store.setNickname($("#nickname").value);
        toast(
          tr(
            "称呼已保存，之后加菜会带上你的名字。",
            "Name saved. It will appear on your next additions.",
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
