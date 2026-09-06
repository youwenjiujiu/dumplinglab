// Current lunch menu: supplied menu image + explicitly confirmed prices.
// Versioned IDs prevent previous selections from being silently renamed or repriced.
(() => {
  const previous = globalThis.MENU || [];
  globalThis.LEGACY_MENU = [...(globalThis.LEGACY_MENU || previous), ...(globalThis.RETIRED_LUNCH_MENU || [])];
  globalThis.MENU_SERVICE = "lunch";
  globalThis.MENU_VERSION = "lunch-2026-09-06-v3";
  globalThis.LUNCH_PENDING = Object.freeze({ addNoodles: false, tossedOptions: false, boiledWontons: false });
  globalThis.LUNCH_NOODLE_EXTRA = 3;
  const preparations = [
    { id: "soup", cn: "高汤", en: "Broth", extra: 0, img: "preparation-soup-generated-v3.png" },
    { id: "tossed", cn: "干拌", en: "Tossed", extra: 0, img: "preparation-tossed-generated-v3.png" },
    { id: "boiled", cn: "水煮", en: "Boiled", extra: 0, img: "preparation-boiled-generated-v3.png" },
    { id: "fried", cn: "煎", en: "Pan-fried", extra: 0, img: "preparation-fried-generated-v3.png" },
  ];
  globalThis.LUNCH_PREPARATIONS = preparations;
  const imageFor = id => previous.find(d => d.id === id)?.img;
  const generated = id => `lunch-${id}-generated-v1.png`;
  const filling = (id, cn, name, five, nine, kind, img, meat) => {
    const d = { id: "lunch-v2-" + id, cn, name, section: "dumplings", price: five,
      portionPrices: { 5: five, 9: nine }, preparations: kind === "dumpling" ? ["tossed", "fried", "boiled"] : ["soup", "tossed"],
      kind, img, meat, flavor: "", allergens: [], variants: {}, styles: [] };
    for (const prep of preparations.filter(p => d.preparations.includes(p.id))) for (const pieces of [5, 9]) {
      const base = `${prep.cn} · ${pieces}颗`;
      for (const spicy of prep.id === "tossed" ? [false,true] : [false])
        for (const sesame of prep.id === "tossed" ? [false,true] : [false])
          for (const noodles of ["soup","tossed"].includes(prep.id) ? [false,true] : [false]) {
            const cn = [base], en = [prep.en, `${pieces} pieces`];
            if (prep.id === "tossed") { cn.push(spicy ? "辣" : "不辣", sesame ? "加芝麻酱" : "不加芝麻酱"); en.push(spicy ? "Spicy" : "Not spicy", sesame ? "Sesame sauce" : "No sesame sauce"); }
            if (noodles) { cn.push("加面"); en.push("Add noodles"); }
            const key=cn.join(" · ");
            d.styles.push(key);
            d.variants[key] = { prep: prep.id, pieces, spicy, sesame, noodles, price: Math.round((d.portionPrices[pieces] + (noodles ? LUNCH_NOODLE_EXTRA : 0))*100)/100, en: en.join(" · ") };
          }
      // Existing v2 plain-tossed carts/receipts keep their exact key and price.
      // New selections always use the explicit spice/sesame form above.
      if (prep.id === "tossed") {
        d.styles.push(base);
        d.variants[base] = { prep: prep.id, pieces, spicy:false, sesame:false, noodles:false, legacy:true, price:d.portionPrices[pieces], en:`${prep.en} · ${pieces} pieces` };
      }
    }
    return d;
  };
  const simple = (id, cn, name, section, price, img, portion = "", meat = null, best = false) =>
    ({ id: "lunch-v2-" + id, cn, name, section, price, img, portion, meat, best, flavor: "", allergens: [] });
  const boiledPhoto = "preparation-boiled-generated-v3.png";
  globalThis.MENU = [
    filling("pork-chive-shrimp", "韭菜虾仁猪肉", "Pork, Shrimp & Chive Dumplings", 6.8, 10.8, "dumpling", boiledPhoto, "pork"),
    filling("chicken-cabbage", "鸡肉包菜", "Chicken & Cabbage Dumplings", 5.8, 9.2, "dumpling", boiledPhoto, "chicken"),
    filling("pork-celery-shrimp", "芹菜虾仁猪肉", "Pork, Shrimp & Celery Dumplings", 6.8, 10.8, "dumpling", boiledPhoto, "pork"),
    filling("pork-cabbage", "白菜猪肉", "Pork & Cabbage Dumplings", 5.8, 9.2, "dumpling", boiledPhoto, "pork"),
    filling("pork-scallion", "猪肉大葱", "Pork & Scallion Dumplings", 5.8, 9.2, "dumpling", boiledPhoto, "pork"),
    filling("prawn-roe-wonton", "鲜虾蟹籽云吞", "Prawn & Crab Roe Wontons", 7.2, 11.5, "wonton", imageFor("hk-crab-roe-wonton"), "seafood"),
    filling("chicken-corn-wonton", "鸡肉玉米云吞", "Chicken & Corn Wontons", 5.8, 9.2, "wonton", "lunch-v2-chicken-corn-wonton-generated-v1.png", "chicken"),
    filling("pork-wonton", "鲜肉云吞", "Pork Wontons", 5.8, 9.2, "wonton", generated("pork-wonton"), "pork"),
    simple("mince-scallion-noodles", "肉末葱油面", "Minced Meat & Scallion Noodles", "noodles", 10.8, generated("mince-scallion-noodles")),
    simple("mince-chilli-noodles", "肉末辣椒拌面", "Minced Meat & Chilli Tossed Noodles", "noodles", 10.8, generated("mince-chilli-noodles"), "", null, true),
    simple("kampong-chicken-soup", "甘榜鸡汤拉面", "Kampong Chicken Noodle Soup", "noodles", 13.8, generated("kampong-chicken-soup"), "", "chicken"),
    simple("shaanxi-hot-oil-noodles", "陕西油泼面", "Shaanxi Hot Oil Noodles", "noodles", 11.8, imageFor("xian-hot-oil-noodles")),
    simple("century-egg-noodles", "销魂皮蛋面", "Century Egg Noodles", "noodles", 12.8, "lunch-v2-century-egg-noodles-generated-v1.png", "", null, true),
    simple("mince-red-oil-noodles", "肉末红油燃面", "Minced Meat & Chilli Oil Noodles", "noodles", 10.8, generated("mince-chilli-noodles")),
    simple("pork-rice", "卤肉饭", "Braised Pork Rice", "sides", 5.8, generated("mini-pork-rice"), "", "pork"),
    simple("braised-tofu", "卤豆腐", "Braised Tofu", "sides", 5.2, generated("braised-tofu")),
    simple("braised-pork-belly", "卤五花肉", "Braised Pork Belly", "sides", 6.2, generated("braised-pork-belly"), "", "pork"),
    simple("fishball-soup", "鱼丸汤", "Fishball Soup", "sides", 4.8, imageFor("chaozhou-fishball-soup")),
    simple("pork-cutlet", "秘制猪排", "House Pork Cutlet", "sides", 6.2, imageFor("secret-pork-cutlet"), "1块", "pork"),
    simple("chicken-wings", "秘制鸡翅", "House Chicken Wings", "sides", 6.2, generated("chicken-wings"), "3个", "chicken"),
    simple("cold-veg-shreds", "凉拌蔬菜丝", "Shredded Vegetable Salad", "sides", 4.8, imageFor("cold-veg-shreds")),
    simple("choy-sum", "酱油菜心", "Choy Sum with Soy Sauce", "sides", 6.8, generated("choy-sum")),
    simple("mouthwatering-chicken", "口水鸡", "Chicken in Chilli Sauce", "sides", 6.8, imageFor("mouthwatering-chicken"), "", "chicken"),
    simple("oyster-lettuce", "蚝油生菜", "Lettuce with Oyster Sauce", "sides", 6.8, imageFor("oyster-lettuce")),
    simple("century-egg-tofu", "皮蛋豆腐", "Century Egg & Tofu", "sides", 4.8, generated("century-egg-tofu")),
    simple("soft-egg", "溏心卤蛋", "Soft-centred Braised Egg", "sides", 1.9, generated("soft-egg")),
    simple("pickled-radish", "腌萝卜", "Pickled Radish", "sides", 1.5, imageFor("pickled-radish")),
    simple("cucumber", "黄瓜", "Cucumber", "sides", 4.5, generated("cucumber")),
    simple("barley", "薏米水", "Barley Water", "drinks", 3.5, generated("barley")),
    simple("lemon-tea", "柠檬茶", "Lemon Tea", "drinks", 4.2, generated("lemon-tea")),
    simple("sour-plum", "酸梅汁", "Sour Plum Drink", "drinks", 4.2, generated("sour-plum")),
    simple("soft-drink", "软饮", "Soft Drink", "drinks", 3, generated("soft-drink")),
    simple("water", "水", "Water", "drinks", 1, generated("water")),
    simple("osmanthus-oolong", "桂花乌龙茶", "Osmanthus Oolong Tea", "drinks", 3, "lunch-v2-osmanthus-oolong-generated-v1.png"),
  ];
  // Shortcuts, not duplicate SKUs. Unknown-price combinations remain non-orderable.
  globalThis.LUNCH_RECOMMENDATIONS = [
    { id: "chive-fried", cn: "韭菜虾仁猪肉煎饺", name: "Pork, Shrimp & Chive Potstickers", dishId: "lunch-v2-pork-chive-shrimp", prep: "fried", img: "preparation-fried-generated-v3.png" },
    { id: "chicken-fried", cn: "鸡肉包菜煎饺", name: "Chicken & Cabbage Potstickers", dishId: "lunch-v2-chicken-cabbage", prep: "fried", img: "preparation-fried-generated-v3.png" },
    { id: "red-oil-chaoshou", cn: "红油抄手", name: "Chao Shou in Chilli Oil", pending: "Independent product, portion and price unconfirmed", img: imageFor("sichuan-red-oil-chaoshou") },
    { id: "pork-soup", cn: "清汤鲜肉云吞", name: "Pork Wontons in Clear Broth", dishId: "lunch-v2-pork-wonton", prep: "soup", img: imageFor("hk-crab-roe-wonton") },
    { id: "roe-wonton-noodles", cn: "鲜虾蟹籽云吞面", name: "Prawn & Crab Roe Wonton Noodles", dishId: "lunch-v2-prawn-roe-wonton", prep: "soup", noodles: true, img: imageFor("wonton-soup-noodles") },
    { id: "boiled-dumplings", cn: "白灼饺子", name: "Boiled Dumplings", chooseFilling: true, prep: "boiled", img: boiledPhoto },
  ];
  globalThis.SECTIONS = ["recommended", "dumplings", "noodles", "sides", "drinks"];
  globalThis.SECTION_LABELS = { recommended: "Recommended", dumplings: "Your Choice", noodles: "Noodles", sides: "Sides", drinks: "Drinks" };
  globalThis.lunchPrice = (d, style) => d?.variants ? d.variants[style]?.price : d?.price;
  globalThis.isLunchItem = (id, style) => {
    const d = MENU.find(d => d.id === id);
    return Boolean(d && !d.soldOut && (!d.styles ? !style : d.styles.includes(style)));
  };
  if (typeof I18N !== "undefined") {
    Object.assign(I18N.sections, { recommended: "推荐", dumplings: "自选口味", noodles: "面条", sides: "Sides", drinks: "饮品" });
    for (const d of MENU) I18N.dishes[d.id] = { flavor: "" };
  }
})();
