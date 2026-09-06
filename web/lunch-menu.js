// Lunch catalogue transcribed from the restaurant's supplied menu.
// Keep legacy data only for historical receipts, never as orderable lunch items.
(() => {
  const previous = globalThis.MENU || [];
  globalThis.LEGACY_MENU = globalThis.LEGACY_MENU || previous;
  globalThis.MENU_SERVICE = "lunch";
  globalThis.MENU_VERSION = "lunch-2026-09-06";
  const preparations = [
    { id: "soup", cn: "高汤", en: "Broth", extra: 0, img: "preparation-soup-reference-v2.jpg" },
    { id: "tossed", cn: "干拌", en: "Tossed", extra: 0, img: "preparation-tossed-reference-v2.jpg" },
    { id: "boiled", cn: "水煮", en: "Boiled", extra: 0, img: "preparation-boiled-reference-v1.jpg" },
    { id: "fried", cn: "煎", en: "Pan-fried", extra: 1, img: "preparation-fried-reference-v1.jpg" },
  ];
  globalThis.LUNCH_PREPARATIONS = preparations;
  const imageFor = id => previous.find(d => d.id === id)?.img || null;
  const filling = (id, cn, name, five, ten, all, imageId, meat, veg = false) => {
    const d = { id: "lunch-" + id, cn, name, section: "dumplings", price: five,
      portionPrices: { 5: five, 10: ten }, preparations: all ? preparations.map(p => p.id) : ["soup", "tossed"],
      img: imageFor(imageId), meat, veg, flavor: "", allergens: [], variants: {}, styles: [] };
    for (const prep of preparations.filter(p => d.preparations.includes(p.id))) {
      for (const pieces of [5, 10]) {
        for (const spicy of prep.id === "tossed" ? [false, true] : [false]) {
          for (const sesame of prep.id === "tossed" ? [false, true] : [false]) {
            for (const noodles of ["soup", "tossed"].includes(prep.id) ? [false, true] : [false]) {
              const parts = [prep.cn, pieces + "颗"];
              const english = [prep.en, pieces + " pieces"];
              if (prep.id === "tossed") {
                parts.push(spicy ? "辣" : "不辣", sesame ? "加芝麻酱" : "不加芝麻酱");
                english.push(spicy ? "Spicy" : "Not spicy", sesame ? "Sesame sauce" : "No sesame sauce");
              }
              if (["soup", "tossed"].includes(prep.id)) {
                parts.push(noodles ? "加面" : "不加面");
                english.push(noodles ? "Add noodles" : "No noodles");
              }
              const key = parts.join(" · ");
              d.styles.push(key);
              d.variants[key] = { prep: prep.id, pieces, spicy, sesame, noodles,
                price: Math.round((d.portionPrices[pieces] + prep.extra + (noodles ? 2.5 : 0)) * 100) / 100,
                en: english.join(" · ") };
            }
          }
        }
      }
    }
    return d;
  };
  const simple = (id, cn, name, section, price, imageId = null, portion = "", meat = null, veg = false) =>
    ({ id: "lunch-" + id, cn, name, section, price, img: imageFor(imageId), portion, meat, veg, flavor: "", allergens: [] });
  globalThis.MENU = [
    filling("pork-chive", "韭菜猪肉", "Pork & Chive Dumplings", 5.5, 9.8, true, "diy-pork-chive", "pork"),
    filling("chicken-cabbage", "鸡肉包菜", "Chicken & Cabbage Dumplings", 4.5, 8.8, true, "diy-chicken-cabbage", "chicken"),
    filling("pork-celery", "芹菜猪肉", "Pork & Celery Dumplings", 5.5, 9.8, true, null, "pork"),
    filling("chicken-corn", "鸡肉玉米", "Chicken & Corn Dumplings", 4.5, 8.8, true, null, "chicken"),
    filling("zucchini-egg", "西葫芦鸡蛋", "Zucchini & Egg Dumplings", 4.5, 8.8, true, null, null, true),
    filling("tomato-egg", "西红柿鸡蛋", "Tomato & Egg Dumplings", 4.5, 8.8, true, "diy-tomato-egg", null, true),
    filling("prawn-roe-wonton", "鲜虾蟹籽云吞", "Prawn & Crab Roe Wontons", 6.5, 10.8, false, "hk-crab-roe-wonton", "seafood"),
    filling("pork-wonton", "鲜肉抄手", "Pork Wontons", 4.5, 8.8, false, null, "pork"),
    filling("veg-pork-wonton", "菜肉馄饨", "Pork & Vegetable Wontons", 4.5, 8.8, false, "diy-veg-pork-wonton", "pork"),
    simple("mince-scallion-noodles", "肉末葱油面", "Minced Meat & Scallion Noodles", "noodles", 11.8),
    simple("mince-chilli-noodles", "肉末辣椒面", "Minced Meat & Chilli Noodles", "noodles", 10.8),
    simple("kampong-chicken-tossed", "甘榜鸡肉拌面", "Kampong Chicken Tossed Noodles", "noodles", 12.5, null, "", "chicken"),
    simple("kampong-chicken-soup", "甘榜鸡汤拉面", "Kampong Chicken Soup Noodles", "noodles", 12.5, null, "", "chicken"),
    simple("plain-scallion-noodles", "干拌葱油面", "Scallion Oil Noodles", "noodles", 7.8, "shanghai-scallion-noodles", "", null, true),
    simple("mini-pork-rice", "Mini 卤肉饭", "Mini Braised Pork Rice", "sides", 5.5, null, "", "pork"),
    simple("braised-tofu", "卤豆腐", "Braised Tofu", "sides", 4.5),
    simple("braised-pork-belly", "卤五花肉", "Braised Pork Belly", "sides", 6.2, null, "", "pork"),
    simple("fried-wontons", "炸云吞", "Fried Wontons", "sides", 5.5, null, "5个"),
    simple("pork-cutlet", "秘制猪排", "House Pork Cutlet", "sides", 6.2, "secret-pork-cutlet", "1块", "pork"),
    simple("chicken-wings", "秘制鸡翅", "House Chicken Wings", "sides", 6.2, null, "3个", "chicken"),
    simple("cold-veg-shreds", "凉拌蔬菜丝", "Shredded Vegetable Salad", "sides", 4.5, "cold-veg-shreds"),
    simple("choy-sum", "酱油菜心", "Choy Sum with Soy Sauce", "sides", 6.5),
    simple("oyster-lettuce", "蚝油生菜", "Lettuce with Oyster Sauce", "sides", 6.5, "oyster-lettuce"),
    simple("century-egg-tofu", "皮蛋豆腐", "Century Egg & Tofu", "sides", 4.5),
    simple("soft-egg", "溏心卤蛋", "Soft-centred Braised Egg", "sides", 1.9),
    simple("pickled-radish", "腌萝卜", "Pickled Radish", "sides", 1.5, "pickled-radish"),
    simple("cucumber", "黄瓜", "Cucumber", "sides", 4.5),
    simple("barley", "薏米水", "Barley Water", "drinks", 3.5),
    simple("lemon-tea", "柠檬茶", "Lemon Tea", "drinks", 4.2),
    simple("sour-plum", "酸梅汁", "Sour Plum Drink", "drinks", 4.2),
    simple("soft-drink", "软饮", "Soft Drink", "drinks", 2.8),
    simple("water", "水", "Water", "drinks", 1),
  ];
  // Temporary generated assets; replace these mappings with restaurant photos.
  const temporaryImages = {
    "lunch-mince-scallion-noodles": "lunch-mince-scallion-noodles-generated-v1.png",
    "lunch-mince-chilli-noodles": "lunch-mince-chilli-noodles-generated-v1.png",
    "lunch-kampong-chicken-tossed": "lunch-kampong-chicken-tossed-generated-v1.png",
    "lunch-kampong-chicken-soup": "lunch-kampong-chicken-soup-generated-v1.png",
    "lunch-pork-celery": "lunch-pork-celery-generated-v1.png",
    "lunch-chicken-corn": "lunch-chicken-corn-generated-v1.png",
    "lunch-zucchini-egg": "lunch-zucchini-egg-generated-v1.png",
    "lunch-pork-wonton": "lunch-pork-wonton-generated-v1.png",
    "lunch-mini-pork-rice": "lunch-mini-pork-rice-generated-v1.png",
    "lunch-braised-tofu": "lunch-braised-tofu-generated-v1.png",
    "lunch-braised-pork-belly": "lunch-braised-pork-belly-generated-v1.png",
    "lunch-fried-wontons": "lunch-fried-wontons-generated-v1.png",
    "lunch-chicken-wings": "lunch-chicken-wings-generated-v1.png",
    "lunch-choy-sum": "lunch-choy-sum-generated-v1.png",
    "lunch-century-egg-tofu": "lunch-century-egg-tofu-generated-v1.png",
    "lunch-soft-egg": "lunch-soft-egg-generated-v1.png",
    "lunch-cucumber": "lunch-cucumber-generated-v1.png",
    "lunch-barley": "lunch-barley-generated-v1.png",
    "lunch-lemon-tea": "lunch-lemon-tea-generated-v1.png",
    "lunch-sour-plum": "lunch-sour-plum-generated-v1.png",
    "lunch-soft-drink": "lunch-soft-drink-generated-v1.png",
    "lunch-water": "lunch-water-generated-v1.png",
  };
  for (const dish of globalThis.MENU) if (temporaryImages[dish.id]) dish.img = temporaryImages[dish.id];
  globalThis.SECTIONS = ["dumplings", "noodles", "sides", "drinks"];
  globalThis.SECTION_LABELS = { dumplings: "Dumplings & Wontons", noodles: "Noodles", sides: "Sides", drinks: "Drinks" };
  globalThis.lunchPrice = (d, style) => d?.variants ? d.variants[style]?.price : d?.price;
  globalThis.isLunchItem = (id, style) => {
    const d = MENU.find(d => d.id === id);
    return Boolean(d && (!d.styles ? !style : d.styles.includes(style)));
  };
  if (typeof I18N !== "undefined") {
    Object.assign(I18N.sections, { dumplings: "水饺·云吞", noodles: "面条", sides: "小食", drinks: "饮品" });
    for (const d of MENU) I18N.dishes[d.id] = { flavor: "" };
  }
})();
