/* Dumpling Lab — bilingual copy. Chinese is written as restaurant copy,
   not translated word-for-word: same warmth, same editorial voice. */

const I18N = {
  ui: {
    en: {
      tagline: "Dumplings, noodles and small plates, cooked to order.",
      table: n => `Table ${n}`,
      chapter: n => `CHAPTER ${n}`,
      steamer: "Your order",
      steamerSub: (n, t) => `${n} ${n===1?"item":"items"}${t ? ` · Table ${t}` : ""}`,
      emptyCart: "Nothing here yet.<br>Add a dish to start your order.",
      kitchenTotal: "Total",
      estCalories: "Estimated calories",
      steamTime: "Estimated wait",
      steamTimeVal: "12–15 min",
      send: "Place order",
      addToSteamer: "Add",
      theFlavor: "About this dish",
      fromKitchen: "Kitchen note",
      chefSig: "— Chef Lin",
      whatsInside: "Ingredients",
      onTheScale: "Nutrition",
      spice: "Spice",
      spiceLevels: ["Not spicy", "Mild", "Medium", "Hot", "Fiery"],
      recSauce: "Best with",
      allergens: "Allergens",
      lovelyWith: "Goes well with",
      handmade: "Made today",
      bestSeller: "Popular",
      chefsChoice: "Chef’s pick",
      pieces: "pc",
      kcal: "kcal",
      noteLabel: "Special requests",
      notePlaceholder: "e.g. No cilantro, sauce on the side",
      ordered: "Order sent",
      orderedNote: (t, n) => `${t ? `Table ${t} · ` : ""}Order ${n}\nThe kitchen has your order. Estimated wait: 12–15 minutes.`,
      back: "Back to menu",
      colophon: "Made by hand, every day",
      search: "Search the menu…",
      viewCart: "View order",
      total: "Total", estCal: "Est. calories",
      order: "Place order", pickStyle: "Choose a style",
      added: n => `Added: ${n}`,
      cartSub: (n,t) => `${n} ${n===1?"item":"items"}${t?` · Table ${t}`:""}`,
      orderNote: (t,no) => `${t?`Table ${t} · `:""}Order ${no}\nThe kitchen has your order. Estimated wait: 12–15 minutes.`,
      waiterOntheway: "A staff member has been notified.",
      todays: "Today's table",
      dishOf: (i,n) => `${String(i).padStart(2,"0")} / ${String(n).padStart(2,"0")}`,
      scHint: "DRAG TO TURN · SWIPE FOR NEXT",
      scHintFlat: "SWIPE FOR NEXT",
      scHintAlive: "DRAG TO TURN · TAP FOR DETAILS",
      night: "Night service", day: "Daylight",
      waiterTitle: "Call staff",
      waiterSub: t => t ? `Table ${t} · we'll come right over` : "We'll come right over",
      waiterK: "What do you need?",
      reasons: { water: "Water", cutlery: "Cutlery", bill: "The bill", help: "Something else" },
      waiterSend: "Notify staff",
      waiterSent: r => `Staff notified${r ? ` · ${r}` : ""}`,

      fAll: "All", fVeg: "Vegetarian", fSpicy: "Spicy", fNoPork: "No pork",
      noResults: "No dishes found. Try another search or clear a filter.",
      waiter: "Call staff",
      waiterToast: "A staff member has been notified.",
      addedToast: n => `${n} — in the steamer`,
      historyTitle: "Ordered so far",
      historyOrder: (no, t) => `Order ${no} · ${t}`,
      soldOut: "Sold out",
      voyageHint: "Scroll to be seated",
      voyageEnd: "The Menu",
      voyageEndSub: "Eleven small chapters",
    },
    zh: {
      tagline: "手工饺子、面条和小菜，现点现做。",
      table: n => `${n}号桌`,
      chapter: n => `第 ${n} 章`,
      steamer: "已选菜品",
      steamerSub: (n, t) => `已选 ${n} 份${t ? ` · ${t}号桌` : ""}`,
      emptyCart: "还没选菜。<br>回到菜单，挑一道喜欢的。",
      kitchenTotal: "合计",
      estCalories: "预估热量",
      steamTime: "预计上桌",
      steamTimeVal: "12–15 分钟",
      send: "确认下单",
      addToSteamer: "加入",
      theFlavor: "菜品介绍",
      fromKitchen: "厨房说明",
      chefSig: "—— 林主厨",
      whatsInside: "主要食材",
      onTheScale: "营养信息",
      spice: "辣度",
      spiceLevels: ["不辣", "微辣", "中辣", "偏辣", "重辣"],
      recSauce: "推荐搭配",
      allergens: "过敏原",
      lovelyWith: "适合搭配",
      handmade: "今日现做",
      bestSeller: "人气",
      chefsChoice: "主厨推荐",
      pieces: "只",
      kcal: "千卡",
      noteLabel: "特殊要求",
      notePlaceholder: "例如：不要香菜、酱料另放",
      ordered: "已下单",
      orderedNote: (t, n) => `${t ? `${t}号桌 · ` : ""}订单 ${n}\n厨房已接单，预计 12–15 分钟上桌。`,
      back: "返回菜单",
      colophon: "每日手工现做",
      search: "搜索菜品…",
      viewCart: "查看已选",
      total: "合计", estCal: "预估热量",
      order: "确认下单", pickStyle: "选择做法",
      added: n => `已加入：${n}`,
      cartSub: (n,t) => `已选 ${n} 份${t?` · ${t}号桌`:""}`,
      orderNote: (t,no) => `${t?`${t}号桌 · `:""}订单 ${no}\n厨房已接单，预计 12–15 分钟上桌。`,
      waiterOntheway: "服务员马上过来。",
      todays: "今日主推",
      dishOf: (i,n) => `${String(i).padStart(2,"0")} / ${String(n).padStart(2,"0")}`,
      scHint: "拖动旋转 · 左右滑动换一道",
      scHintFlat: "左右滑动换一道",
      scHintAlive: "拖动旋转 · 点一下看详情",
      night: "夜场模式", day: "日间模式",
      waiterTitle: "呼叫服务员",
      waiterSub: t => t ? `${t}号桌 · 我们马上过来` : "我们马上过来",
      waiterK: "需要什么",
      reasons: { water: "加水", cutlery: "餐具", bill: "买单", help: "其他" },
      waiterSend: "通知服务员",
      waiterSent: r => `已通知服务员${r ? ` · ${r}` : ""}`,

      fAll: "全部", fVeg: "素食", fSpicy: "香辣", fNoPork: "不含猪肉",
      noResults: "没有找到菜品。试试其他关键词或清除筛选。",
      waiter: "呼叫服务员",
      waiterToast: "已通知服务员。",
      addedToast: n => `已加入：${n}`,
      historyTitle: "本桌已点",
      historyOrder: (no, t) => `单号 ${no} · ${t}`,
      soldOut: "售罄",
      voyageHint: "上滑入席",
      voyageEnd: "菜单",
      voyageEndSub: "十一个小章节",
    },
  },

  sections: {
    "signature": "招牌",
    "diy": "自选",
    "noodles": "面条",
    "buns": "包子",
    "tangzi": "无锡团子",
    "rice": "米饭",
    "soup": "汤",
    "sides": "小食",
    "fried": "炸物",
    "veg": "蔬菜",
    "dessert": "贵州冰浆"
},

  taglines: {
    "signature": "第一次来，可以从招牌菜开始",
    "diy": "选馅料，再选水煮、煎、汤或拌",
    "noodles": "现点现煮，每一碗都热腾腾",
    "buns": "松软面皮，饱满热馅",
    "tangzi": "软糯有嚼劲，咸甜都有",
    "rice": "大火现炒，粒粒分明",
    "soup": "每日慢炖，鲜香暖胃",
    "sides": "清爽开胃，适合分享",
    "fried": "现点现炸，酥脆上桌",
    "veg": "当季蔬菜，大火快炒",
    "dessert": "冰凉细腻，清甜收尾"
},

  allergens: {
    Gluten: "麸质", Soy: "大豆", Shellfish: "甲壳类", Egg: "鸡蛋",
    Sesame: "芝麻", Peanut: "花生", Dairy: "乳制品",
  },

  ingredients: {
    "Berkshire pork": "黑豚肉", "Charred cabbage": "炙烤卷心菜", "Ginger": "姜",
    "Chive": "细香葱", "White pepper": "白胡椒", "Free-range chicken": "散养鸡肉",
    "Sweet corn": "甜玉米", "Scallion": "小葱", "Shaoxing wine": "绍兴酒",
    "Pork shoulder": "猪梅肉", "Three-day chili oil": "三日红油", "Sichuan pepper": "花椒",
    "Black vinegar": "香醋", "Crushed peanut": "花生碎", "Five wild mushrooms": "五种野菌",
    "Black truffle": "黑松露", "Brown butter": "焦化黄油", "Spinach wrapper": "菠菜翠皮",
    "Chicken thigh": "鸡腿肉", "Garlic chive": "韭菜", "Sesame oil": "香油",
    "Short rib": "牛小排", "Charred scallion": "炙烤大葱", "Toasted cumin": "焙香孜然",
    "Napa cabbage": "大白菜", "Shiitake": "香菇", "Glass noodle": "粉丝", "Egg": "鸡蛋",
    "Tiger prawn": "虎虾", "Golden broth": "金汤", "Yellow chive": "韭黄",
    "Flounder dust": "大地鱼粉", "Pork belly & loin": "五花与里脊", "Chinese chive": "韭菜",
    "Ginger water": "姜汁水", "Pork": "猪肉", "Jellied consommé": "皮冻清汤",
    "Young ginger": "嫩姜", "Hand-picked crab": "手拆蟹肉", "Crab roe": "蟹黄",
    "12-hour paitan": "十二小时白汤", "Hand-pulled noodles": "手拉面", "Chicken chashu": "鸡叉烧",
    "Six-minute egg": "六分钟溏心蛋", "Sesame paste": "芝麻酱", "Chili oil": "红油",
    "Crispy pork": "脆臊子", "Ya cai": "芽菜", "Mahogany scallions": "熬透的葱",
    "Sweet soy": "甜酱油", "Thin wheat noodles": "细面", "Hand-torn ribbons": "手撕宽面",
    "Blooming chili": "泼香的辣子", "Raw garlic": "生蒜", "Smoking oil": "滚油",
    "Sesame cutlet": "芝麻脆排", "Soy-cured egg": "酱渍溏心蛋", "Crisped nori": "脆海苔",
    "Brothless noodles": "干拌面", "Pork crumble": "肉燥", "Jammy egg": "溏心蛋",
    "Nori": "海苔", "Day-old jasmine rice": "隔夜香米饭", "Egg yolk": "蛋黄",
    "Wok smoke": "锅气", "House XO": "自制XO酱", "Jasmine rice": "香米",
    "Silk tofu": "嫩豆腐", "Wood ear": "木耳", "Old hen": "老母鸡",
    "Goji berry": "枸杞", "Jujube": "红枣", "Seared white fish": "煎白鱼",
    "Silken tofu": "内酯豆腐", "Kombu broth": "昆布高汤", "Persian cucumber": "小黄瓜",
    "Chinkiang vinegar": "镇江香醋", "Five-spice salt": "五香椒盐", "Fried basil": "炸罗勒",
    "Chinese eggplant": "长茄", "Garlic-soy": "蒜香豉油", "Cilantro": "香菜",
    "Chili salt": "辣椒盐", "Market greens": "当日时蔬", "Garlic": "大蒜",
    "Wok breath": "锅气", "Green beans": "四季豆", "Dried chili": "干辣椒",
    "Baby bok choy": "娃娃菜", "Superior stock": "上汤", "Garlic confit": "油封蒜",
    "Goji": "枸杞", "Ataulfo mango": "小台芒", "Pomelo": "西柚粒",
    "Sago pearls": "西米", "Coconut cream": "椰浆", "Jasmine pearls": "茉莉龙珠",
    "Cream": "淡奶油", "Osmanthus honey": "桂花蜜", "Black sesame": "黑芝麻",
    "Glutinous rice": "糯米", "Ginger syrup": "姜糖水", "Sukiyaki beef": "寿喜牛肉",
    "One perfect yolk": "一颗完美蛋黄", "Sesame nori": "芝麻海苔", "Warm rice": "热米饭",
    "Maine lobster": "缅因龙虾", "Scallion butter": "葱香黄油", "Beet wrapper": "甜菜粉皮",
    "Tea-smoked duck": "樟茶鸭", "Hoisin": "海鲜酱", "Crisp skin crumble": "脆皮碎",
  },

  sauces: {
    "Black vinegar & young ginger": "香醋配嫩姜丝",
    "Light soy & scallion oil": "生抽葱油",
    "Already dressed — bring rice": "已经拌好——记得配饭",
    "Aged soy pearls": "陈年酱油珠",
    "Yuzu ponzu": "柚子酢",
    "Chili crisp & vinegar": "辣椒脆配香醋",
    "Black vinegar & chili crisp": "香醋配辣椒脆",
    "A drop of red vinegar": "一滴红醋足矣",
    "Scallion oil": "葱油",
    "Black vinegar & ginger threads": "香醋姜丝",
    "Chili oil, if you dare": "敢的话，加一勺红油",
    "Already dressed": "已经拌好了",
    "Nothing. Trust it.": "什么都不用加，相信它",
    "Already blooming": "辣子已经泼好了",
    "Toss twelve times": "拌十二下再吃",
    "Mix from the bottom": "从碗底往上拌",
    "White pepper on top": "撒一点白胡椒",
    "It brought its own": "它自带酱汁",
    "Plum dust mayo": "梅子粉蛋黄酱",
    "The chili salt on the side": "旁边那撮辣椒盐",
    "The yolk is the sauce": "蛋黄就是酱",
    "Champagne vinegar pearl": "香槟醋珠",
    "Mandarin hoisin": "陈皮海鲜酱",
  },

  dishes: {
    "beijing-pork-guotie": {
        "flavor": "猪肉与卷心菜调馅，底部煎至金黄。",
        "story": ""
    },
    "jp-chicken-gyoza": {
        "flavor": "鸡肉、韭菜与蒜香，薄皮煎制。",
        "story": ""
    },
    "hk-crab-roe-wonton": {
        "flavor": "蟹肉蟹籽馅云吞，配清鲜金汤。",
        "story": ""
    },
    "grandma-fried-wonton": {
        "flavor": "猪肉馄饨，两面煎至金黄。",
        "story": ""
    },
    "nanjing-beef-guotie": {
        "flavor": "牛肉大葱馅，底部煎脆。",
        "story": ""
    },
    "sichuan-red-oil-chaoshou": {
        "flavor": "猪肉抄手，配红油、花椒与花生碎。",
        "story": ""
    },
    "red-oil-wontons": {
        "flavor": "猪肉云吞，配香辣红油与葱花。",
        "story": ""
    },
    "diy-chicken-cabbage": {
        "flavor": "鸡肉与卷心菜馅，可选水煮、煎、汤或拌。",
        "story": ""
    },
    "diy-beef-curry-onion": {
        "flavor": "牛肉、咖喱与洋葱馅，可选水煮、煎、汤或拌。",
        "story": ""
    },
    "diy-pork-celery-shrimp": {
        "flavor": "猪肉、芹菜与虾仁馅，可选水煮、煎、汤或拌。",
        "story": ""
    },
    "diy-saltedegg-roe-shrimp": {
        "flavor": "咸蛋黄、虾仁与鱼籽馅，可选水煮、煎、汤或拌。",
        "story": ""
    },
    "diy-pork-scallion": {
        "flavor": "猪肉大葱馅，可选水煮、煎、汤或拌。",
        "story": ""
    },
    "diy-chicken-corn-carrot": {
        "flavor": "鸡肉、玉米与胡萝卜馅，可选水煮、煎、汤或拌。",
        "story": ""
    },
    "diy-pork-chive": {
        "flavor": "猪肉韭菜馅，可选水煮、煎、汤或拌。",
        "story": ""
    },
    "diy-tomato-egg": {
        "flavor": "番茄鸡蛋馅，可选水煮、煎、汤或拌。",
        "story": ""
    },
    "diy-four-veg": {
        "flavor": "四种蔬菜调馅，可选水煮、煎、汤或拌。",
        "story": ""
    },
    "diy-veg-pork-wonton": {
        "flavor": "青菜猪肉馄饨馅，可选汤或拌。",
        "story": ""
    },
    "diy-chive-wonton": {
        "flavor": "韭菜馄饨馅，可选汤或拌。",
        "story": ""
    },
    "xian-hot-oil-noodles": {
        "flavor": "手工宽面，配辣椒、蒜末与热油。",
        "story": ""
    },
    "xinjiang-dapanji-noodles": {
        "flavor": "鸡肉、土豆与手工宽面，酱香微辣。",
        "story": ""
    },
    "shanghai-scallion-noodles": {
        "flavor": "细面拌葱油与甜酱油。",
        "story": ""
    },
    "beijing-zhajiang-noodles": {
        "flavor": "面条配猪肉炸酱与时蔬。",
        "story": ""
    },
    "signature-chicken-ramen": {
        "flavor": "手拉面配十二小时鸡汤、鸡叉烧与溏心蛋。",
        "story": ""
    },
    "yangzhou-plain-noodles": {
        "flavor": "细面配清汤与时蔬。",
        "story": ""
    },
    "minced-pork-egg-noodles": {
        "flavor": "干拌面配肉末、煎蛋、香脆小鱼与葱花。",
        "story": ""
    },
    "wonton-soup-noodles": {
        "flavor": "细面配猪肉云吞，浸在清鲜汤底里。",
        "story": ""
    },
    "dry-wonton-noodles": {
        "flavor": "酱油干拌面配猪肉云吞与青菜。",
        "story": ""
    },
    "nanjing-soup-bun": {
        "flavor": "薄皮猪肉汤包，汤汁充足。",
        "story": ""
    },
    "traditional-pork-bun": {
        "flavor": "发面包子，猪肉大葱馅。",
        "story": ""
    },
    "wildrice-pork-tangzi": {
        "flavor": "糯米团子，茭白猪肉馅。",
        "story": ""
    },
    "radish-pork-tangzi": {
        "flavor": "糯米团子，萝卜猪肉馅。",
        "story": ""
    },
    "redbean-tangyuan": {
        "flavor": "糯米汤圆，红豆沙馅。",
        "story": ""
    },
    "sesame-tangyuan": {
        "flavor": "糯米汤圆，黑芝麻馅。",
        "story": ""
    },
    "shrimp-egg-fried-rice": {
        "flavor": "虾仁、鸡蛋与米饭，大火快炒。",
        "story": ""
    },
    "spicy-chicken-fried-rice": {
        "flavor": "鸡肉、辣椒与米饭，大火快炒。",
        "story": ""
    },
    "chaozhou-fishball-soup": {
        "flavor": "潮州鱼丸，配清汤与芹菜。",
        "story": ""
    },
    "tomato-beef-soup": {
        "flavor": "番茄与牛肉慢煮，酸甜清爽。",
        "story": ""
    },
    "lionhead-soup": {
        "flavor": "手打猪肉丸，配清汤与青菜。",
        "story": ""
    },
    "mashed-potato-salad": {
        "flavor": "冷拌土豆泥，口感细腻。",
        "story": ""
    },
    "sweetsour-pork-ribs": {
        "flavor": "猪肋排收浓糖醋汁，酸甜口。",
        "story": ""
    },
    "mouthwatering-chicken": {
        "flavor": "冷切鸡肉，配红油、花椒与芝麻。",
        "story": ""
    },
    "drunken-brine-shrimp": {
        "flavor": "鲜虾浸糟卤，冷食。",
        "story": ""
    },
    "minced-pork-tofu": {
        "flavor": "嫩豆腐烧肉末，咸鲜口。",
        "story": ""
    },
    "big-plate-chicken": {
        "flavor": "鸡肉、土豆与宽粉，酱香微辣。",
        "story": ""
    },
    "egg-luncheon-meat": {
        "flavor": "煎蛋配午餐肉。",
        "story": ""
    },
    "braised-lionhead": {
        "flavor": "手打猪肉丸，红烧入味。",
        "story": ""
    },
    "yunnan-lava-tofu": {
        "flavor": "包浆豆腐，外层煎脆、内里柔软。",
        "story": ""
    },
    "secret-pork-cutlet": {
        "flavor": "腌制猪排，裹粉炸至酥脆。",
        "story": ""
    },
    "13spice-chicken-nuggets": {
        "flavor": "鸡腿肉裹粉炸制，拌十三香料。",
        "story": ""
    },
    "13spice-chicken-wings": {
        "flavor": "鸡翅炸制，拌十三香料。",
        "story": ""
    },
    "old-style-fried-drumstick": {
        "flavor": "带骨鸡腿腌制后裹粉炸制。",
        "story": ""
    },
    "cold-veg-shreds": {
        "flavor": "时蔬切丝，酸香凉拌。",
        "story": ""
    },
    "cold-eggplant-peashoot": {
        "flavor": "可选蒜香凉拌茄子或清炒豆苗。",
        "story": ""
    },
    "veg-with-dip": {
        "flavor": "当季生鲜蔬菜，配自制蘸酱。",
        "story": ""
    },
    "pickled-radish": {
        "flavor": "白萝卜短时腌制，酸甜口。",
        "story": ""
    },
    "garlic-broccoli": {
        "flavor": "西兰花加蒜蓉，大火快炒。",
        "story": ""
    },
    "oyster-lettuce": {
        "flavor": "生菜快炒，淋蚝油汁。",
        "story": ""
    },
    "sesame-spinach": {
        "flavor": "菠菜焯水，配芝麻酱凉拌。",
        "story": ""
    },
    "mango-ice": {
        "flavor": "鲜芒果与碎冰打制。",
        "story": ""
    },
    "watermelon-ice": {
        "flavor": "鲜西瓜与碎冰打制。",
        "story": ""
    },
    "cucumber-ice": {
        "flavor": "鲜黄瓜与碎冰打制，清甜口。",
        "story": ""
    }
},
};
