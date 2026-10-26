// Current lunch menu: supplied menu image + explicitly confirmed prices.
// Versioned IDs prevent previous selections from being silently renamed or repriced.
(() => {
  const previous = globalThis.MENU || [];
  globalThis.LEGACY_MENU = [...(globalThis.LEGACY_MENU || previous), ...(globalThis.RETIRED_LUNCH_MENU || [])];
  globalThis.MENU_SERVICE = "lunch";
  globalThis.MENU_VERSION = "lunch-2026-09-06-v4";
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
    simple("mince-red-oil-noodles", "肉末红油燃面", "Minced Meat & Chilli Oil Noodles", "noodles", 10.8, generated("mince-red-oil-noodles")),
    simple("pork-rice", "卤肉饭", "Braised Pork Rice", "sides", 5.8, generated("mini-pork-rice"), "", "pork"),
    simple("braised-tofu", "卤豆腐", "Braised Tofu", "sides", 5.2, generated("braised-tofu")),
    simple("braised-pork-belly", "卤五花肉", "Braised Pork Belly", "sides", 6.2, generated("braised-pork-belly"), "", "pork"),
    simple("fishball-soup", "鱼丸汤", "Fishball Soup", "sides", 4.8, imageFor("chaozhou-fishball-soup")),
    simple("pork-cutlet", "秘制猪排", "House Pork Cutlet", "sides", 6.2, imageFor("secret-pork-cutlet"), "1块", "pork"),
    simple("chicken-wings", "秘制鸡翅", "House Chicken Wings", "sides", 6.2, generated("chicken-wings"), "3个", "chicken"),
    simple("cold-veg-shreds", "凉拌蔬菜丝", "Shredded Vegetable Salad", "sides", 4.8, imageFor("cold-veg-shreds")),
    simple("choy-sum", "酱油菜心", "Choy Sum with Soy Sauce", "sides", 6.8, generated("choy-sum")),
    simple("mouthwatering-chicken", "口水鸡", "Chicken in Chilli Sauce", "sides", 6.8, imageFor("mouthwatering-chicken"), "", "chicken"),
    simple("oyster-lettuce", "蚝油生菜", "Lettuce with Oyster Sauce", "sides", 6.8, "oyster-lettuce-clean-v2.png"),
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
  // A separate fixed-recipe product, not an alias for a wonton filling.
  const chaoshou = {
    id: "lunch-v4-red-oil-chaoshou", cn: "红油抄手", name: "Chao Shou in Chilli Oil",
    section: "recommended", kind: "chaoshou", price: 5.8, portionPrices: { 5: 5.8, 9: 9.2 },
    preparations: ["red-oil"], fixedPreparation: { id: "red-oil", cn: "红油", en: "Chilli oil" },
    img: imageFor("sichuan-red-oil-chaoshou"), flavor: "", allergens: [], variants: {}, styles: [],
  };
  for (const pieces of [5, 9]) {
    const style = `红油 · ${pieces}颗`;
    chaoshou.styles.push(style);
    chaoshou.variants[style] = { prep: "red-oil", pieces, spicy: true, sesame: false, noodles: false,
      price: chaoshou.portionPrices[pieces], en: `Chilli oil · ${pieces} pieces` };
  }
  MENU.push(chaoshou);
  // Ingredient summaries are limited to the current menu's explicit names.
  // They are NOT complete kitchen recipes or an allergen/suitability declaration.
  // Do not infer ingredients from generated photos or the retired menu.
  const ingredientSummaries = {
    "pork-chive-shrimp": [["韭菜", "Chives"], ["虾仁", "Shrimp"], ["猪肉", "Pork"], ["饺子皮", "Dumpling wrappers"]],
    "chicken-cabbage": [["鸡肉", "Chicken"], ["包菜", "Cabbage"], ["饺子皮", "Dumpling wrappers"]],
    "pork-celery-shrimp": [["芹菜", "Celery"], ["虾仁", "Shrimp"], ["猪肉", "Pork"], ["饺子皮", "Dumpling wrappers"]],
    "pork-cabbage": [["白菜", "Chinese cabbage"], ["猪肉", "Pork"], ["饺子皮", "Dumpling wrappers"]],
    "pork-scallion": [["猪肉", "Pork"], ["大葱", "Scallions"], ["饺子皮", "Dumpling wrappers"]],
    "prawn-roe-wonton": [["鲜虾", "Prawns"], ["蟹籽", "Crab roe"], ["云吞皮", "Wonton wrappers"]],
    "chicken-corn-wonton": [["鸡肉", "Chicken"], ["玉米", "Corn"], ["云吞皮", "Wonton wrappers"]],
    "pork-wonton": [["猪肉", "Pork"], ["云吞皮", "Wonton wrappers"]],
    "mince-scallion-noodles": [["面条", "Noodles"], ["肉末", "Minced meat"], ["葱油", "Scallion oil"]],
    "mince-chilli-noodles": [["面条", "Noodles"], ["肉末", "Minced meat"], ["辣椒", "Chilli"]],
    "kampong-chicken-soup": [["拉面", "Noodles"], ["甘榜鸡", "Kampong chicken"], ["汤底", "Broth"]],
    "shaanxi-hot-oil-noodles": [["面条", "Noodles"], ["食用油", "Cooking oil"]],
    "century-egg-noodles": [["面条", "Noodles"], ["皮蛋", "Century egg"]],
    "mince-red-oil-noodles": [["面条", "Noodles"], ["肉末", "Minced meat"], ["红油", "Chilli oil"]],
    "pork-rice": [["猪肉", "Pork"], ["米饭", "Rice"]],
    "braised-tofu": [["豆腐", "Tofu"]],
    "braised-pork-belly": [["五花肉", "Pork belly"]],
    "fishball-soup": [["鱼丸", "Fishballs"], ["汤底", "Broth"]],
    "pork-cutlet": [["猪肉", "Pork"]],
    "chicken-wings": [["鸡翅", "Chicken wings"]],
    "cold-veg-shreds": [["蔬菜丝", "Shredded vegetables"]],
    "choy-sum": [["菜心", "Choy sum"], ["酱油", "Soy sauce"]],
    "mouthwatering-chicken": [["鸡肉", "Chicken"], ["辣味酱汁", "Chilli sauce"]],
    "oyster-lettuce": [["生菜", "Lettuce"], ["蚝油", "Oyster sauce"]],
    "century-egg-tofu": [["皮蛋", "Century egg"], ["豆腐", "Tofu"]],
    "soft-egg": [["蛋", "Egg"]],
    "pickled-radish": [["萝卜", "Radish"]],
    "cucumber": [["黄瓜", "Cucumber"]],
    "barley": [["薏米", "Barley"], ["水", "Water"]],
    "lemon-tea": [["柠檬", "Lemon"], ["茶", "Tea"]],
    "sour-plum": [["酸梅", "Sour plum"]],
    "soft-drink": [],
    "water": [["水", "Water"]],
    "osmanthus-oolong": [["桂花", "Osmanthus"], ["乌龙茶", "Oolong tea"]],
    "red-oil-chaoshou": [["抄手皮", "Wonton wrappers"], ["红油", "Chilli oil"]],
  };
  const ingredientNotes = {
    "cold-veg-shreds": ["具体蔬菜种类请向店员确认。", "Please check which vegetables are used with staff."],
    "red-oil-chaoshou": ["馅料成分请向店员确认。", "Please check the filling ingredients with staff."],
    "soft-drink": ["成分以所选饮品的包装配料表为准。", "Check the ingredient label on your chosen drink."],
  };
  for (const d of MENU) {
    const key = d.id.replace(/^lunch-v[24]-/, "");
    if (!Object.hasOwn(ingredientSummaries, key)) throw new Error(`Missing ingredient summary: ${d.id}`);
    d.ingredientInfo = {
      items: ingredientSummaries[key].map(([cn, en]) => ({cn, en})),
      note: ingredientNotes[key] || null,
      source: "current-menu-names",
      completeRecipe: false,
    };
  }
  // Each filling has its own cutaway for each supported preparation.
  const friedPhotos = {
    "lunch-v2-pork-chive-shrimp": "potstickers-pork-shrimp-chive-cutaway-v1.png",
    "lunch-v2-chicken-cabbage": "potstickers-chicken-cabbage-cutaway-v1.png",
  };
  for (const d of MENU) if (d.kind === "dumpling") {
    const fillingId = d.id.replace("lunch-v2-", "");
    d.preparationImages = Object.fromEntries(d.preparations.map(prep => [prep,
      prep === "fried" && friedPhotos[d.id] ? friedPhotos[d.id] : `filling-${fillingId}-${prep}-cutaway-v1.png`,
    ]));
    d.img = d.preparationImages.boiled;
  }
  // The clear-broth shortcut and every soup variant use the same photograph.
  // Keep the dry plated filling photo for tossed preparation only.
  const porkWonton = MENU.find(d => d.id === "lunch-v2-pork-wonton");
  porkWonton.preparationImages = { soup: imageFor("hk-crab-roe-wonton"), tossed: porkWonton.img };
  // Shortcuts, not duplicate SKUs. Unknown-price combinations remain non-orderable.
  globalThis.LUNCH_RECOMMENDATIONS = [
    { id: "chive-fried", cn: "韭菜虾仁猪肉煎饺", name: "Pork, Shrimp & Chive Potstickers", dishId: "lunch-v2-pork-chive-shrimp", prep: "fried", img: friedPhotos["lunch-v2-pork-chive-shrimp"] },
    { id: "chicken-fried", cn: "鸡肉包菜煎饺", name: "Chicken & Cabbage Potstickers", dishId: "lunch-v2-chicken-cabbage", prep: "fried", img: friedPhotos["lunch-v2-chicken-cabbage"] },
    { id: "red-oil-chaoshou", cn: chaoshou.cn, name: chaoshou.name, dishId: chaoshou.id, prep: "red-oil", img: chaoshou.img },
    { id: "pork-soup", cn: "清汤鲜肉云吞", name: "Pork Wontons in Clear Broth", dishId: "lunch-v2-pork-wonton", prep: "soup", img: porkWonton.preparationImages.soup },
    { id: "roe-wonton-noodles", cn: "鲜虾蟹籽云吞面", name: "Prawn & Crab Roe Wonton Noodles", dishId: "lunch-v2-prawn-roe-wonton", prep: "soup", noodles: true, img: imageFor("wonton-soup-noodles") },
    { id: "boiled-dumplings", cn: "白灼饺子", name: "Boiled Dumplings", chooseFilling: true, prep: "boiled", img: boiledPhoto },
  ];
  globalThis.SECTIONS = ["recommended", "dumplings", "noodles", "sides", "cold", "drinks"];
  globalThis.SECTION_LABELS = { recommended: "Recommended", dumplings: "Your Choice", noodles: "Noodles", sides: "Sides", cold: "Cold Dishes", drinks: "Drinks" };
  globalThis.lunchPrice = (d, style) => d?.variants ? d.variants[style]?.price : d?.price;
  globalThis.isLunchItem = (id, style) => {
    const d = MENU.find(d => d.id === id);
    return Boolean(d && !d.soldOut && (!d.styles ? !style : d.styles.includes(style)));
  };
  if (typeof I18N !== "undefined") {
    Object.assign(I18N.sections, { recommended: "推荐", dumplings: "自选", noodles: "面条", sides: "配菜", cold: "凉菜", drinks: "饮品" });
    for (const d of MENU) I18N.dishes[d.id] = { flavor: "" };
  }
})();

// Confirmed October menu. Same-dish IDs preserve merchant photographs and stock.
(()=>{
 const update={"fillings":[{"key":"pork-chive-shrimp","cn":"韭菜虾仁猪肉","kind":"dumpling","portionPrices":{"5":6.8,"10":10.8}},{"key":"chicken-cabbage","cn":"鸡肉包菜","kind":"dumpling","portionPrices":{"5":5.8,"10":9.8}},{"key":"pork-celery-shrimp","cn":"芹菜虾仁猪肉","kind":"dumpling","portionPrices":{"5":6.8,"10":10.8}},{"key":"pork-corn","cn":"猪肉玉米","kind":"dumpling","portionPrices":{"5":5.8,"10":9.8},"replaces":"pork-cabbage"},{"key":"pork-scallion","cn":"猪肉大葱","kind":"dumpling","portionPrices":{"5":5.8,"10":9.8}},{"key":"prawn-roe-wonton","cn":"鲜虾蟹籽云吞","kind":"wonton","portionPrices":{"5":7.2,"10":11.8}},{"key":"pork-wonton","cn":"鲜肉云吞","kind":"wonton","portionPrices":{"5":5.8,"10":9.8}}],"noodles":[{"key":"mince-scallion-noodles","cn":"肉末葱油面","price":10.8},{"key":"mince-chilli-noodles","cn":"肉末辣椒板面","price":11.8,"recommended":true},{"key":"shaanxi-hot-oil-noodles","cn":"陕西油泼面","price":11.8},{"key":"century-egg-noodles","cn":"销魂皮蛋面","price":12.8,"recommended":true},{"key":"mince-red-oil-noodles","cn":"肉末红油燃面","price":10.8}],"sides":[{"key":"pork-rice","cn":"卤肉饭","price":5.8},{"key":"braised-tofu","cn":"卤豆腐","price":5.2},{"key":"braised-pork-belly","cn":"卤五花肉","price":6.5},{"key":"pork-cutlet","cn":"秘制猪排","price":6.2,"portion":"1块"},{"key":"chicken-wings","cn":"秘制鸡翅","price":6.2,"portion":"3个"},{"key":"cold-veg-shreds","cn":"凉拌蔬菜丝","price":4.8},{"key":"choy-sum","cn":"酱油菜心","price":6.8},{"key":"oyster-lettuce","cn":"蚝油生菜","price":6.8},{"key":"century-egg-tofu","cn":"皮蛋豆腐","price":5.2},{"key":"onsen-egg","cn":"温泉蛋","price":1.5,"replaces":"soft-egg"},{"key":"pickled-radish","cn":"腌萝卜","price":1.5}],"drinks":[{"key":"barley","cn":"薏米水","price":3.5},{"key":"lemon-tea","cn":"柠檬茶","price":4.2},{"key":"sour-plum","cn":"酸梅汁","price":3.9},{"key":"soft-drink","cn":"软饮","price":3},{"key":"water","cn":"水","price":1}],"lunchSets":[{"key":"dumpling-set","name":"Dumpling Set","price":null,"pieces":10,"fillingChoices":["pork-chive-shrimp","pork-corn","pork-scallion","pork-celery-shrimp","pork-wonton","prawn-roe-wonton"],"preparationChoices":[{"key":"boiled","cn":"白煮"},{"key":"soup","cn":"清汤"},{"key":"red-oil","cn":"四川红油拌"},{"key":"peanut","cn":"花生酱拌"}],"includedColdDish":"cold-veg-shreds","drinkChoices":["barley","lemon-tea","sour-plum"],"optionalNoodlesExtra":2.5,"pricingStatus":"pending","orderable":false,"priceLabel":{"cn":"价格待定","en":"Price to be confirmed"}},{"key":"noodle-set","name":"Noodle Set","price":null,"noodleChoices":["mince-scallion-noodles","mince-chilli-noodles","shaanxi-hot-oil-noodles","century-egg-noodles","mince-red-oil-noodles"],"sideDumplings":{"pieces":4,"preparation":"fried","fillingChoices":["chicken-cabbage","pork-chive-shrimp","pork-scallion"]},"drinkChoices":["barley","lemon-tea","sour-plum"],"pricingStatus":"pending","orderable":false,"priceLabel":{"cn":"价格待定","en":"Price to be confirmed"}}],"availability":{"days":"inherit-business-hours","start":"11:00","end":"15:00","timeZone":"Asia/Singapore","requiresRestaurantOpen":true}};
 const clone=value=>JSON.parse(JSON.stringify(value));
 const prior=clone(MENU),byKey=key=>prior.find(d=>d.id==='lunch-v2-'+key);
 globalThis.LEGACY_MENU=[...prior,...(globalThis.LEGACY_MENU||[])];
 globalThis.MENU_VERSION='lunch-2026-10-20-v5';
 globalThis.LUNCH_ALLOW_NOODLE_EXTRA=false;
 const active=[];
 for(const entry of update.fillings){
  const old=byKey(entry.key),template=old||byKey('pork-cabbage');
  const d=clone(template);d.id=old?.id||'lunch-v5-'+entry.key;d.cn=entry.cn;d.portionPrices=entry.portionPrices;d.price=entry.portionPrices[5];d.styles=[];d.variants={};
  if(!old){d.name='Pork & Corn Dumplings';d.img=null;delete d.preparationImages;d.ingredientInfo={items:[{cn:'猪肉',en:'Pork'},{cn:'玉米',en:'Corn'},{cn:'饺子皮',en:'Dumpling wrappers'}],completeRecipe:false,source:'current-menu-names'};}
  for(const [style,v] of Object.entries(template.variants)){
   if(v.legacy||v.noodles)continue;
   const pieces=v.pieces===9?10:v.pieces,key=style.replace('9颗','10颗');
   d.styles.push(key);d.variants[key]={...v,pieces,price:d.portionPrices[pieces],en:v.en.replace('9 pieces','10 pieces')};
  }
  // Existing wonton-noodle recommendation is a fixed noodle dish, not a single-item add-on.
  if(entry.key==='prawn-roe-wonton')for(const pieces of [5,10]){const key='高汤 · '+pieces+'颗 · 加面';d.styles.push(key);d.variants[key]={prep:'soup',pieces,spicy:false,sesame:false,noodles:true,recommendationOnly:true,price:Math.round((d.portionPrices[pieces]+LUNCH_NOODLE_EXTRA)*100)/100,en:'Broth · '+pieces+' pieces · Noodles included'};}
  d.menuRevision=MENU_VERSION;active.push(d);
 }
 for(const entry of [...update.noodles,...update.sides,...update.drinks]){
  const old=byKey(entry.key);let d;
  if(old)d=clone(old);else d={id:'lunch-v5-'+entry.key,name:'Onsen Egg',section:'sides',img:null,flavor:'',allergens:[],ingredientInfo:{items:[{cn:'蛋',en:'Egg'}],completeRecipe:false,source:'current-menu-names'}};
  Object.assign(d,{cn:entry.cn,price:entry.price,menuRevision:MENU_VERSION});
  if(entry.key==='mince-chilli-noodles')d.name='Minced Meat Chilli Ban Mian';
  if(['cold-veg-shreds','century-egg-tofu','pickled-radish'].includes(entry.key))d.section='cold';
  if(entry.portion)d.portion=entry.portion;active.push(d);
 }
 // Retired products stay visible to staff for reference and can be explicitly re-enabled.
 const ids=new Set(active.map(d=>d.id));
 const retired=prior.filter(d=>!ids.has(d.id)).map(d=>({...d,active:false,retired:true,menuRevision:MENU_VERSION}));
 globalThis.MENU=[...active,...retired];
 globalThis.LUNCH_RECOMMENDATIONS=LUNCH_RECOMMENDATIONS.filter(r=>r.id!=='red-oil-chaoshou');
 LUNCH_RECOMMENDATIONS.push(...['mince-chilli-noodles','century-egg-noodles'].map(key=>{const d=byKey(key);return {id:key,dishId:d.id,cn:active.find(a=>a.id===d.id).cn,name:active.find(a=>a.id===d.id).name,img:d.img}}));
 // No unconfirmed standalone chaoshou price is invented. Keep its shortcut visible but disabled.
 const chaoshou=prior.find(d=>d.id==='lunch-v4-red-oil-chaoshou');
 if(chaoshou)LUNCH_RECOMMENDATIONS.push({id:'red-oil-chaoshou',dishId:chaoshou.id,cn:chaoshou.cn,name:chaoshou.name,img:chaoshou.img,pending:true});
 globalThis.LUNCH_SETS=update.lunchSets;globalThis.LUNCH_SET_AVAILABILITY=update.availability;
 globalThis.SECTIONS=['lunchsets',...SECTIONS];globalThis.SECTION_LABELS.lunchsets='Lunch Sets';
 if(typeof I18N!=='undefined')I18N.sections.lunchsets='午市套餐';
})();

// Latest single-dish menu: six boiled/tossed fillings; chicken-cabbage is fried only.
(()=>{
 globalThis.MENU_VERSION='lunch-2026-10-20-v6';
 globalThis.LUNCH_SINGLE_PREPARATIONS=['boiled','tossed'];
 LUNCH_PREPARATIONS.find(p=>p.id==='boiled').cn='水煮';
 LUNCH_PREPARATIONS.find(p=>p.id==='tossed').cn='干拌';
 for(const d of MENU.filter(d=>d.active!==false&&['dumpling','wonton'].includes(d.kind))){
  d.singleChoice=!d.id.endsWith('-chicken-cabbage');
  if(!d.singleChoice){
   d.section='recommended';d.fixedPreparation={id:'fried',cn:'煎饺',en:'Pan-fried'};
   d.preparations=['fried'];
   d.styles=d.styles.filter(s=>d.variants[s].prep==='fried');
   d.variants=Object.fromEntries(d.styles.map(s=>[s,d.variants[s]]));
   d.img=d.preparationImages?.fried||d.img;
   continue;
  }
  if(d.kind==='wonton'){
   for(const pieces of [5,10]){
    const key=`水煮 · ${pieces}颗`;
    d.styles.push(key);d.variants[key]={prep:'boiled',pieces,spicy:false,sesame:false,noodles:false,price:d.portionPrices[pieces],en:`Boiled · ${pieces} pieces`};
   }
   d.preparations=[...new Set([...d.preparations,'boiled'])];
   d.preparationImages={...d.preparationImages,boiled:d.img};
  }
  d.styles=d.styles.filter(s=>{const v=d.variants[s];return ['boiled','tossed'].includes(v.prep)||d.id.endsWith('-pork-chive-shrimp')&&v.prep==='fried'||d.id.endsWith('-pork-wonton')&&v.prep==='soup'||d.id.endsWith('-prawn-roe-wonton')&&v.prep==='soup'&&v.noodles});
  d.variants=Object.fromEntries(d.styles.map(s=>[s,d.variants[s]]));
  d.preparations=[...new Set(Object.values(d.variants).map(v=>v.prep))];
 }
 const recommendedOrder=['chive-fried','chicken-fried','red-oil-chaoshou','pork-soup','mince-chilli-noodles','century-egg-noodles','roe-wonton-noodles','boiled-dumplings'];
 LUNCH_RECOMMENDATIONS.sort((a,b)=>recommendedOrder.indexOf(a.id)-recommendedOrder.indexOf(b.id));
 const boiled=LUNCH_RECOMMENDATIONS.find(r=>r.id==='boiled-dumplings');if(boiled){boiled.cn='水煮饺子';boiled.name='Boiled Dumplings';}
})();

// The merchant can manage recommendations without changing dish names or IDs.
(()=>{
 const recommendedIds=new Set(LUNCH_RECOMMENDATIONS.filter(r=>!r.pending&&r.dishId).map(r=>r.dishId));
 for(const d of MENU)d.recommended=d.active!==false&&(recommendedIds.has(d.id)||Boolean(d.best));
})();

// Wontons and wonton noodles are independent products, not an add-noodles variant.
(()=>{
 const wontons=MENU.find(d=>d.id==='lunch-v2-prawn-roe-wonton');
 const shortcut=LUNCH_RECOMMENDATIONS.find(r=>r.id==='roe-wonton-noodles');
 const clone=value=>JSON.parse(JSON.stringify(value));
 const noodles={...clone(wontons),id:'lunch-v7-prawn-roe-wonton-noodles',cn:'鲜虾蟹籽云吞面',name:'Prawn & Crab Roe Wonton Noodles',section:'noodles',kind:'wonton-noodles',singleChoice:false,recommended:true,img:shortcut.img,menuRevision:'lunch-2026-10-20-v7',fixedPreparation:{id:'soup',cn:'清汤云吞面',en:'Wonton Noodle Soup'},preparations:['soup'],portionPrices:{},variants:{},styles:[]};
 delete noodles.imageUrl;delete noodles.preparationImages;delete noodles.best;
 for(const pieces of [5,10]){
  // Carry forward displayed combination prices once; later edits are independent.
  noodles.portionPrices[pieces]=Math.round((wontons.portionPrices[pieces]+LUNCH_NOODLE_EXTRA)*100)/100;
  const key=`清汤 · ${pieces}颗云吞`;
  noodles.styles.push(key);noodles.variants[key]={prep:'soup',pieces,spicy:false,sesame:false,noodles:false,containsNoodles:true,price:noodles.portionPrices[pieces],en:`Noodle soup · ${pieces} wontons`};
 }
 noodles.price=noodles.portionPrices[5];
 noodles.ingredientInfo.items.push({cn:'面条',en:'Noodles'});
 wontons.styles=wontons.styles.filter(s=>!wontons.variants[s].noodles);
 wontons.variants=Object.fromEntries(wontons.styles.map(s=>[s,wontons.variants[s]]));
 wontons.preparations=[...new Set(Object.values(wontons.variants).map(v=>v.prep))];
 wontons.recommended=false;
 MENU.push(noodles);
 shortcut.dishId=noodles.id;shortcut.cn=noodles.cn;shortcut.name=noodles.name;delete shortcut.noodles;
 globalThis.MENU_VERSION='lunch-2026-10-20-v7';
})();

// Pick a filling first, then the preparation allowed for that product.
(()=>{
 globalThis.MENU_VERSION='lunch-2026-10-20-v8';
 globalThis.LUNCH_CHOOSE_FILLING_FIRST=false;
 globalThis.LUNCH_SINGLE_PREPARATIONS=['boiled','soup','red-oil','peanut'];
 const soup=LUNCH_PREPARATIONS.find(p=>p.id==='soup');soup.cn='清汤';soup.en='Clear Broth';
 const image=LUNCH_PREPARATIONS.find(p=>p.id==='tossed').img;
 for(const p of [{id:'red-oil',cn:'四川红油拌',en:'Sichuan Chilli Oil',extra:0,img:image},{id:'peanut',cn:'花生酱拌',en:'Peanut Sauce',extra:0,img:image}])if(!LUNCH_PREPARATIONS.some(x=>x.id===p.id))LUNCH_PREPARATIONS.push(p);
 for(const d of MENU.filter(d=>d.active!==false&&d.singleChoice===true)){
  const methods=d.kind==='wonton'?['soup','red-oil','peanut']:['boiled','soup','red-oil','peanut'];
  const fried=d.id==='lunch-v2-pork-chive-shrimp'?Object.entries(d.variants).filter(([,v])=>v.prep==='fried'):[];
  d.styles=[];d.variants={};
  for(const method of methods)for(const pieces of [5,10]){
   const p=LUNCH_PREPARATIONS.find(p=>p.id===method),key=`${p.cn} · ${pieces}颗`;
   d.styles.push(key);d.variants[key]={prep:method,pieces,spicy:method==='red-oil',sesame:false,noodles:false,peanut:method==='peanut',price:d.portionPrices[pieces],en:`${p.en} · ${pieces} pieces`};
  }
  for(const [key,v] of fried){d.styles.push(key);d.variants[key]=v;}
  d.preparations=[...methods,...(fried.length?['fried']:[])];
  if(d.preparationImages){d.preparationImages['red-oil']=d.preparationImages.tossed||d.img;d.preparationImages.peanut=d.preparationImages.tossed||d.img;}
 }
})();

// Portion counts are merchant editable; keep every preparation and price aligned.
globalThis.remapMenuPortions = (dish, sizes) => {
 const old=Object.keys(dish.portionPrices).map(Number).sort((a,b)=>a-b);
 const counts=new Map(old.map((n,i)=>[n,sizes[i]])),variants={},styles=[];
 for(const key of dish.styles){const v=dish.variants[key],pieces=counts.get(v.pieces);if(!pieces)continue;
  const next=key.replace(/\d+(?=颗)/,String(pieces));styles.push(next);
  variants[next]={...v,pieces,en:v.en?.replace(/\d+(?= pieces| wontons)/,String(pieces))};
 }
 dish.portionPrices=Object.fromEntries(old.map(n=>[counts.get(n),dish.portionPrices[n]]));dish.styles=styles;dish.variants=variants;
 return dish;
};
for(const d of MENU.filter(d=>d.active!==false&&d.portionPrices?.[10]!==undefined))remapMenuPortions(d,Object.keys(d.portionPrices).map(Number).sort((a,b)=>a-b).map(n=>n===10?9:n));
globalThis.MENU_VERSION='lunch-2026-10-20-v9';

for(const s of globalThis.LUNCH_SETS||[])if(s.key==='dumpling-set')s.pieces=9;

// Fixed potstickers are distinct products, separate from filling-first dumplings.
(()=>{
 const source=MENU.find(d=>d.id==='lunch-v2-pork-chive-shrimp');
 const fried=JSON.parse(JSON.stringify(source));fried.id='lunch-v10-pork-chive-shrimp-fried';
 Object.assign(fried,{cn:'韭菜虾仁猪肉煎饺',name:'Pork, Shrimp & Chive Potstickers',section:'recommended',singleChoice:false,recommended:true,fixedPreparation:{id:'fried',cn:'煎饺',en:'Pan-fried'},preparations:['fried']});
 fried.styles=fried.styles.filter(s=>fried.variants[s].prep==='fried');fried.variants=Object.fromEntries(fried.styles.map(s=>[s,fried.variants[s]]));
 fried.img=source.preparationImages?.fried||LUNCH_RECOMMENDATIONS.find(r=>r.id==='chive-fried').img;
 fried.preparationImages={fried:fried.img};MENU.push(fried);
 source.styles=source.styles.filter(s=>source.variants[s].prep!=='fried');source.variants=Object.fromEntries(source.styles.map(s=>[s,source.variants[s]]));
 source.preparations=source.preparations.filter(p=>p!=='fried');if(source.preparationImages)delete source.preparationImages.fried;source.recommended=false;
 LUNCH_RECOMMENDATIONS.find(r=>r.id==='chive-fried').dishId=fried.id;
 const chicken=MENU.find(d=>d.id==='lunch-v2-chicken-cabbage');chicken.cn='鸡肉包菜煎饺';chicken.name='Chicken & Cabbage Potstickers';
 globalThis.MENU_VERSION='lunch-2026-10-20-v10';
})();

// Restore the fried shortcut to its shared filling SKU; preparations are configurable.
(()=>{
 const source=MENU.find(d=>d.id==='lunch-v2-pork-chive-shrimp'),retired=MENU.find(d=>d.id==='lunch-v10-pork-chive-shrimp-fried');
 for(const key of retired.styles){source.styles.push(key);source.variants[key]=JSON.parse(JSON.stringify(retired.variants[key]));}
 source.preparations.push('fried');source.preparationImages={...source.preparationImages,fried:retired.img};source.recommended=true;
 retired.active=false;retired.retired=true;retired.menuRevision='lunch-2026-10-20-v11';
 LUNCH_RECOMMENDATIONS.find(r=>r.id==='chive-fried').dishId=source.id;
 globalThis.LUNCH_SINGLE_PREPARATIONS=['boiled','soup','red-oil','peanut','fried'];
 const fried=LUNCH_PREPARATIONS.find(p=>p.id==='fried');fried.cn='煎饺';fried.en='Pan-fried';
 for(const d of MENU.filter(d=>d.active!==false&&['dumpling','wonton'].includes(d.kind))){
  d.availablePreparations=d.fixedPreparation?['fried']:d.kind==='dumpling'?['boiled','soup','red-oil','peanut','fried']:['soup','red-oil','peanut'];
  d.enabledPreparations=[...d.availablePreparations];
  d.preparationExtras=Object.fromEntries(d.availablePreparations.map(id=>[id,id==='boiled'?0:id==='fried'?1.5:1]));
 }
 globalThis.MENU_VERSION='lunch-2026-10-20-v11';
})();
// 2026-10-26 大厨：干拌饺子默认红油 + 花生酱；免辣 = 花生酱拌，免花生酱 = 红油拌，都不要 = 酱油拌。
// 红油花生酱拌、酱油拌跟随红油拌的开关、加价和做法图片（sameAs），后台不另设。
(()=>{
 const image=LUNCH_PREPARATIONS.find(p=>p.id==='red-oil').img;
 LUNCH_PREPARATIONS.push({id:'dry',cn:'红油花生酱拌',en:'Chilli Oil & Peanut Sauce',extra:0,img:image,sameAs:'red-oil'},{id:'soy',cn:'酱油拌',en:'Soy Sauce',extra:0,img:image,sameAs:'red-oil'});
 globalThis.LUNCH_TOSSED=[{id:'dry',spicy:true,peanut:true},{id:'red-oil',spicy:true,peanut:false},{id:'peanut',spicy:false,peanut:true},{id:'soy',spicy:false,peanut:false}];
 globalThis.LUNCH_SINGLE_PREPARATIONS=[...LUNCH_SINGLE_PREPARATIONS,'dry','soy'];
})();
globalThis.expandPreparations = ids => ids.flatMap(id=>[id,...LUNCH_PREPARATIONS.filter(p=>p.sameAs===id).map(p=>p.id)]);
globalThis.configureMenuPreparations = d => {
 if(!d.availablePreparations)return d;
 const styles=[],variants={},methods=expandPreparations(d.enabledPreparations);
 for(const method of methods)for(const pieces of Object.keys(d.portionPrices).map(Number)){
  const p=LUNCH_PREPARATIONS.find(p=>p.id===method),key=`${p.cn} · ${pieces}颗`,tossed=LUNCH_TOSSED.find(t=>t.id===method);
  styles.push(key);variants[key]={prep:method,pieces,spicy:Boolean(tossed?.spicy),sesame:false,noodles:false,peanut:Boolean(tossed?.peanut),price:Math.round((d.portionPrices[pieces]+d.preparationExtras[p.sameAs||method])*100)/100,en:`${p.en} · ${pieces} pieces`};
 }
 d.styles=styles;d.variants=variants;d.preparations=methods;d.price=Math.min(...Object.values(variants).map(v=>v.price));return d;
};
for(const d of MENU)configureMenuPreparations(d);

// Show a dedicated fixed fried product alongside the configurable filling.
(()=>{
 const source=MENU.find(d=>d.id==='lunch-v2-pork-chive-shrimp'),fried=MENU.find(d=>d.id==='lunch-v10-pork-chive-shrimp-fried');
 Object.assign(fried,{active:true,recommended:true,menuRevision:source.menuRevision,availablePreparations:['fried'],enabledPreparations:['fried'],preparationExtras:{fried:1.5}});
 delete fried.retired;configureMenuPreparations(fried);source.recommended=false;
 LUNCH_RECOMMENDATIONS.find(r=>r.id==='chive-fried').dishId=fried.id;
 globalThis.MENU_VERSION='lunch-2026-10-20-v12';
})();

// Wonton noodles have a fixed recipe of five wontons per serving.
(()=>{
 const d=MENU.find(d=>d.id==='lunch-v7-prawn-roe-wonton-noodles');d.fixedPieces=5;
 d.portionPrices={5:d.portionPrices[5]};d.styles=d.styles.filter(s=>d.variants[s].pieces===5);d.variants=Object.fromEntries(d.styles.map(s=>[s,d.variants[s]]));d.price=d.portionPrices[5];
 globalThis.MENU_VERSION='lunch-2026-10-20-v13';
})();

// 2026-10-20 店主最新菜单图，以此为准：价格、份量（饺子 5/9 颗、云吞 5/10 颗），
// 单点做法不加价、单点不卖煎（煎饺只作为推荐里的独立菜品），配菜大小份和新菜。
// 后台仍可开关做法、设加价；菜单版本号变化后，旧版本存的价格自动失效。
(()=>{
 const REVISION='lunch-2026-10-20-v14';
 const find=id=>MENU.find(d=>d.id===id);
 const price=(d,values)=>{d.portionPrices=values;d.menuRevision=REVISION;d.active=true;delete d.retired;configureMenuPreparations(d);};
 const fillings={'lunch-v2-pork-chive-shrimp':[5.8,10.8],'lunch-v2-pork-celery-shrimp':[5.8,10.8],'lunch-v5-pork-corn':[4.8,9.8],'lunch-v2-pork-scallion':[4.8,9.8],'lunch-v2-prawn-roe-wonton':[5.8,10.8],'lunch-v2-pork-wonton':[4.8,9.8]};
 for(const [id,[small,large]] of Object.entries(fillings)){
  const d=find(id),wonton=d.kind==='wonton';
  d.availablePreparations=wonton?['soup','red-oil','peanut']:['boiled','soup','red-oil','peanut','fried'];
  d.enabledPreparations=wonton?['soup','red-oil','peanut']:['boiled','soup','red-oil','peanut'];
  d.preparationExtras=Object.fromEntries(d.availablePreparations.map(p=>[p,0]));
  price(d,wonton?{5:small,10:large}:{5:small,9:large});
 }
 // 猪肉玉米每种做法先共用一张照片，后台可按做法另传。
 const corn=find('lunch-v5-pork-corn');corn.img='lunch-chicken-corn-generated-v1.png';
 corn.preparationImages=Object.fromEntries(corn.availablePreparations.map(p=>[p,corn.img]));
 // 推荐里的两道煎饺、红油抄手和云吞面是固定做法的独立菜品。
 for(const [id,values] of [['lunch-v10-pork-chive-shrimp-fried',{5:5.8,9:10.8}],['lunch-v2-chicken-cabbage',{5:5.8,9:9.2}]]){const d=find(id);d.preparationExtras={fried:0};price(d,values);}
 const chaoshou=find('lunch-v4-red-oil-chaoshou');price(chaoshou,{5:5.8,9:9.2});
 const shortcut=LUNCH_RECOMMENDATIONS.find(r=>r.id==='red-oil-chaoshou');if(shortcut)delete shortcut.pending;
 const wontonNoodles=find('lunch-v7-prawn-roe-wonton-noodles');wontonNoodles.portionPrices={5:8.8};wontonNoodles.menuRevision=REVISION;
 for(const v of Object.values(wontonNoodles.variants))v.price=8.8;wontonNoodles.price=8.8;
 for(const [key,value] of Object.entries({'mince-scallion-noodles':9.8,'mince-chilli-noodles':9.8,'shaanxi-hot-oil-noodles':10.8,'century-egg-noodles':11.8,'mince-red-oil-noodles':9.8,'cold-veg-shreds':5.8,'choy-sum':6.8,'oyster-lettuce':6.8,'century-egg-tofu':5.2,'pickled-radish':1.5,'barley':3.5,'lemon-tea':4.2,'sour-plum':3.9,'soft-drink':3,'water':1})){
  const d=find('lunch-v2-'+key);d.price=value;d.menuRevision=REVISION;
 }
 find('lunch-v5-onsen-egg').price=1.5;find('lunch-v5-onsen-egg').img='lunch-v5-onsen-egg-placeholder.png';find('lunch-v5-onsen-egg').menuRevision=REVISION;
 // 配菜分大小份的：数据上是两道菜（价格、库存各管各的），顾客菜单上合成一张卡片，点进去选份量。
 const ingredients=items=>({items:items.map(([cn,en])=>({cn,en})),completeRecipe:false,source:'current-menu-names'});
 const simple=(id,cn,name,section,value,img,portion,items)=>({id,cn,name,section,price:value,img,portion,flavor:'',allergens:[],menuRevision:REVISION,ingredientInfo:ingredients(items)});
 const sized=[
  ['pork-rice','卤肉饭','Braised Pork Rice',[5.8,9.8],['小份','大份']],
  ['braised-tofu','卤豆腐','Braised Tofu',[6.2,10.8],['小份','大份']],
  ['braised-pork-belly','卤五花肉','Braised Pork Belly',[7.2,12.5],['小份','大份']],
  ['pork-cutlet','炸秘制猪排','Fried House Pork Cutlet',[7.2,12.5],['小份','大份']],
  ['chicken-wings','炸秘制鸡翅','Fried House Chicken Wings',[6.2,11.5],['3个','6个']],
  ['fried-wontons','炸云吞','Fried Wontons',[6.2,11.5],['小份','大份']],
 ];
 const sizeNames={'小份':'Small','大份':'Large','3个':'3 pieces','6个':'6 pieces'};
 let previous=null;
 for(const [key,cn,name,[small,large],[a,b]] of sized){
  let first=find('lunch-v2-'+key);
  if(!first){first=simple('lunch-v5-'+key,cn,name,'sides',small,`lunch-${key}-generated-v1.png`,a,[['云吞','Wontons']]);MENU.splice(MENU.indexOf(previous)+1,0,first);}
  const second={...JSON.parse(JSON.stringify(first)),id:'lunch-v5-'+key+'-large'};
  delete second.imageUrl;MENU.splice(MENU.indexOf(first)+1,0,second);
  const ids=[first.id,second.id];
  for(const [d,value,label] of [[first,small,a],[second,large,b]])Object.assign(d,{
   cn:`${cn}（${label==='小份'?'小':label==='大份'?'大':label}）`,name:`${name} (${sizeNames[label]})`,section:'sides',price:value,portion:label,
   active:true,menuRevision:REVISION,sizeGroup:ids,groupCn:cn,groupName:name,sizeLabel:{cn:label,en:sizeNames[label]},
  });
  previous=second;
 }
 const newSides=[
  simple('lunch-v5-peanut-sesame-sauce','花生芝麻酱','Peanut Sesame Sauce','sides',0.5,'lunch-v5-peanut-sesame-sauce-placeholder.png','',[['花生','Peanut'],['芝麻','Sesame']]),
  simple('lunch-v5-chilli-oil','辣油','Chilli Oil','sides',0.5,'lunch-v5-chilli-oil-placeholder.png','',[['辣椒油','Chilli oil']]),
  simple('lunch-v5-cucumber-tofu-soup','黄瓜豆腐清汤','Cucumber & Tofu Clear Soup','sides',1.2,'lunch-v5-cucumber-tofu-soup-placeholder.png','',[['黄瓜','Cucumber'],['豆腐','Tofu']]),
 ];
 const radish=MENU.indexOf(find('lunch-v2-pickled-radish'));MENU.splice(radish+1,0,...newSides);
 for(const d of MENU)if(typeof I18N!=='undefined'&&!I18N.dishes[d.id])I18N.dishes[d.id]={flavor:''};
 // 套餐还没定要不要做：默认不在顾客菜单显示，后台「午市套餐」里打开。
 for(const set of globalThis.LUNCH_SETS||[])set.visible=false;
 globalThis.MENU_VERSION=REVISION;
})();

// 单价菜品的选项（例如软饮：可乐 / 气泡水 / 乌龙茶），由后台设置。选中的选项名
// 就是订单里的规格，厨房和小票直接显示；所有选项共用本菜库存。
globalThis.applyChoiceOptions = d => {
 if (d.variants || !d.choiceOptions) return d;
 const on = (d.choiceOptions.items || []).filter(o => o.active);
 // Sold-out options stay listed for staff and customers but cannot be ordered.
 if (on.length) d.styles = on.filter(o => !o.soldOut).map(o => o.cn); else delete d.styles;
 d.optionsSoldOut = Boolean(on.length && !d.styles.length);
 return d;
};
globalThis.choiceOptionFor = (d, style) => d?.choiceOptions?.items?.find(o => o.active && o.cn === style) || null;
(() => {
 const portionPrice = globalThis.lunchPrice;
 globalThis.lunchPrice = (d, style) => {
  if (d?.variants || !d?.choiceOptions?.items?.some(o => o.active)) return portionPrice(d, style);
  const option = choiceOptionFor(d, style);
  return option ? option.price ?? d.price : undefined;
 };
})();

// 共用库存（店里按实物备料）：
// 鲜虾蟹籽云吞面用云吞的库存，一碗扣 5 颗；韭菜虾仁猪肉如果在后台打开「煎」，
// 煎的那部分扣煎饺库存（煎饺和水煮的饺子形状不同，分开备料）；
// 配菜大小份共用一个库存：鸡翅按个数算（3 个 / 6 个），其余按小份算，大份扣 2 份。
(() => {
 const find = id => MENU.find(d => d.id === id);
 find('lunch-v7-prawn-roe-wonton-noodles').stockPool = 'lunch-v2-prawn-roe-wonton';
 find('lunch-v2-pork-chive-shrimp').stockPoolByPrep = { fried: 'lunch-v10-pork-chive-shrimp-fried' };
 for (const d of MENU.filter(d => d.sizeGroup && d.id === d.sizeGroup[0])) {
  const large = find(d.sizeGroup[1]), wings = d.id === 'lunch-v2-chicken-wings';
  Object.assign(d, { stockUnits: wings ? 3 : 1, stockUnitName: wings ? '个' : '小份' });
  Object.assign(large, { stockPool: d.id, stockUnits: wings ? 6 : 2, stockUnitName: d.stockUnitName });
 }
})();
