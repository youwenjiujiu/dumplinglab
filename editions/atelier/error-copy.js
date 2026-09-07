// Presentation only: never change status codes, pending payments or retry keys.
(() => {
  const pairs = [
    ['此地址超出 10 km 配送范围', 'This address is outside our 10 km delivery area.'],
    ['配送菜品小计需满 $100（未税，不含配送费）', 'Delivery requires at least $100 of food before GST, excluding the delivery fee.'],
    ['请选择有效的预订日期和时段；次日订单前晚 21:00 截止', 'Choose an available date and time. Next-day orders close at 9 pm Singapore time.'],
    ['请填写新加坡联系电话', 'Enter a valid Singapore contact number.'],
    ['请填写六位邮编', 'Enter a six-digit postal code.'],
    ['未找到该邮编，请检查地址', 'Postal code not found. Check the delivery address.'],
    ['请选择自取门店', 'Choose a pickup location.'],
    ['请选择自取或配送', 'Choose pickup or delivery.'],
    ['线上付款尚未开放，请联系门店', 'Online payment is not available yet. Please contact the restaurant.'],
    ['线上收单服务尚未配置', 'Online ordering is not available yet. Please contact the restaurant.'],
    ['配送地址核验尚未开放', 'Delivery address verification is not available yet. Please contact the restaurant.'],
    ['暂时无法核实配送地址，请稍后重试', 'Unable to verify this delivery address right now. Please try again shortly.'],
    ['付款服务暂时不可用，请重试', 'Payment is temporarily unavailable. Check your order status before retrying.'],
    ['服务暂时不可用，请稍后重试', 'Service is temporarily unavailable. Please try again shortly.'],
    ['订单正在更新，请稍后重试', 'Your order is being updated. Please try again shortly.'],
    ['订单内容已更改，请先确认上一笔付款', 'Your order has changed. Check the previous payment before continuing.'],
    ['订单内容已更改，请重新确认', 'Your order has changed. Review it again before continuing.'],
    ['付款已过期，请重新确认订单', 'This payment has expired. Review your order again.'],
    ['价格已更新，请重新核对订单', 'Prices have changed. Review the updated total before paying.'],
    ['原付款状态需门店核实，请勿重新付款', 'The restaurant needs to verify your previous payment. Do not pay again.'],
    ['找不到该订单', 'Order not found. Check the order link or contact the restaurant.'],
    ['订单访问凭证无效', 'This order link is not valid. Use the original order link.'],
    ['已经选择桌号，请扫描新桌二维码切换。', 'A table is already selected. Scan the QR code on the new table to switch.'],
    ['请填写桌牌上的桌号，例如 A1。', 'Enter the number shown on your table, such as A1.'],
    ['无法读取本桌选菜，请重试或扫描桌上二维码。', 'Unable to load this table. Try again or scan the table QR code.'],
    ['本桌有一笔订单待确认，请扫描桌上二维码查看；当前选菜已保留。', 'This table has an order awaiting confirmation. Scan its QR code to check; your selection is saved.'],
    ['无法保存桌号，选菜仍在当前页面。请允许网站存储后重试。', 'Unable to save the table number. Your selection is still on this page. Enable site storage and try again.'],
    ['请先确认上一次订单是否成功，再继续加菜。', 'Check whether your previous order succeeded before adding more dishes.'],
    ['请先扫描桌上的二维码。', 'Scan the QR code on your table first.'],
    ['请先处理备注冲突，再确认订单。', 'Resolve the conflicting notes before confirming your order.'],
    ['请先选择菜品。', 'Choose some dishes first.'],
    ['缺少有效的桌号', 'Enter a valid table number.'],
    ['用餐组编号无效', 'This ordering group is not valid. Scan the table QR code again.'],
    ['订单菜品数量无效', 'Check the number of dishes in your order.'],
    ['该菜品不提供自选做法', 'This dish does not offer preparation options.'],
    ['菜品规格价格无效', 'This option is unavailable. Return to the menu and choose again.'],
    ['请选择需要的服务', 'Choose the service you need.'],
    ['请允许网站存储以保留订单凭证', 'Enable browser storage to save your order access'],
    ['付款页面暂时不可用，订单已保留，可安全重试', 'Payment unavailable. Your order is saved; retry safely.'],
  ];
  const english = new Map(pairs), chinese = new Map(pairs.map(([zh,en])=>[en,zh]));
  const fields = {姓名:'name',手机号码:'phone number',邮编:'postal code',配送地址:'delivery address'};
  function message(error, language = 'zh', catalogue = globalThis.MENU || []) {
    const text = String(error?.message || error || '');
    const en = language === 'en';
    if (english.has(text)) return en ? english.get(text) : text;
    if (chinese.has(text)) return en ? text : chinese.get(text);
    const field = /^请填写有效的(.+)$/.exec(text);
    if (field && fields[field[1]]) return en ? `Enter a valid ${fields[field[1]]}.` : text;
    const match = /^(?:请选择)?「(.+)」(已售罄，请返回菜单修改|的数量无效|的做法和份量|的做法无效)$/.exec(text);
    if (match) {
      if (!en) return text;
      const name = catalogue.find(d=>d.cn === match[1])?.name || 'This dish';
      return ({
        '已售罄，请返回菜单修改':`${name} is sold out. Return to the menu and choose another dish.`,
        '的数量无效':`Choose between 1 and 20 portions of ${name}.`,
        '的做法和份量':`Choose the preparation and portion size for ${name}.`,
        '的做法无效':`Choose an available preparation for ${name}.`,
      })[match[2]];
    }
    if (text.startsWith('菜单里没有 ')) return en ? 'This dish is no longer available. Return to the menu and choose again.' : '这道菜已不在菜单中，请返回菜单重新选择。';
    if (['TimeoutError','AbortError'].includes(error?.name) || /Failed to fetch|Load failed|NetworkError|Network request failed/i.test(text)) {
      return en ? 'Connection interrupted. Check your order status before retrying.' : '网络连接中断，请先确认订单状态后再重试。';
    }
    // Unknown server/JSON errors must not expose internals or untranslated copy.
    return en ? 'Unable to complete this request. Check your order and try again, or contact the restaurant.' : '暂时无法完成操作，请核对订单后重试，或联系店员。';
  }
  globalThis.OrderErrors = Object.freeze({message});
})();
