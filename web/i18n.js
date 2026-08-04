/* Dumpling Lab — bilingual copy. Chinese is written as restaurant copy,
   not translated word-for-word: same warmth, same editorial voice. */

const I18N = {
  ui: {
    en: {
      tagline: "A modern dumpling house",
      table: n => `Table ${n} · ${n}号桌`,
      chapter: n => `CHAPTER ${n}`,
      steamer: "The Steamer",
      steamerSub: (n, t) => `${n} pieces, ready for the kitchen${t ? ` · Table ${t}` : ""}`,
      emptyCart: "The steamer is empty.<br>Go pick something good from the menu.",
      kitchenTotal: "Kitchen total",
      estCalories: "Estimated calories",
      steamTime: "Steam time",
      steamTimeVal: "about 12 min",
      send: "Send to the kitchen",
      addToSteamer: "Add to steamer",
      theFlavor: "The Flavor",
      fromKitchen: "From the Kitchen",
      chefSig: "— Chef Lin",
      whatsInside: "What's Inside",
      onTheScale: "On the Scale",
      spice: "Spice",
      spiceLevels: ["Not spicy", "Mild", "Medium", "Hot", "Fiery"],
      recSauce: "Recommended Sauce",
      allergens: "Allergens",
      lovelyWith: "Lovely With",
      handmade: "Handmade Daily",
      bestSeller: "Best Seller",
      chefsChoice: "Chef’s Choice",
      pieces: "pc",
      kcal: "kcal",
      noteLabel: "A note to the kitchen",
      notePlaceholder: "Less spicy, no cilantro, birthday at the table…",
      ordered: "It’s steaming",
      orderedNote: (t, n) => `${t ? `Table ${t} · ` : ""}Order ${n} is with the kitchen.\nAbout twelve minutes of good things ahead.`,
      back: "Back to the table",
      colophon: "Folded by hand, daily",
      search: "Search the menu…",
      fAll: "All", fVeg: "Vegetarian", fSpicy: "Spicy", fNoPork: "No pork",
      noResults: "Nothing matches — try clearing the filters.",
      waiter: "Call a server",
      waiterToast: "A server is on the way 🙌",
      addedToast: n => `${n} — in the steamer`,
      historyTitle: "Ordered so far",
      historyOrder: (no, t) => `Order ${no} · ${t}`,
      soldOut: "Sold out",
      voyageHint: "Scroll to be seated",
      voyageEnd: "The Menu",
      voyageEndSub: "Eleven small chapters",
    },
    zh: {
      tagline: "现代饺子研究所",
      table: n => `${n}号桌 · Table ${n}`,
      chapter: n => `第 ${n} 章`,
      steamer: "蒸笼",
      steamerSub: (n, t) => `${n} 件好菜，只等开火${t ? ` · ${t}号桌` : ""}`,
      emptyCart: "蒸笼还空着。<br>去菜单挑几样好的吧。",
      kitchenTotal: "合计",
      estCalories: "预估热量",
      steamTime: "上桌时间",
      steamTimeVal: "约 12 分钟",
      send: "下单，送去厨房",
      addToSteamer: "放进蒸笼",
      theFlavor: "风味",
      fromKitchen: "后厨的话",
      chefSig: "—— 林主厨",
      whatsInside: "里面有什么",
      onTheScale: "营养一览",
      spice: "辣度",
      spiceLevels: ["不辣", "微辣", "中辣", "偏辣", "重辣"],
      recSauce: "推荐蘸料",
      allergens: "过敏原",
      lovelyWith: "推荐搭配",
      handmade: "每日手作",
      bestSeller: "畅销",
      chefsChoice: "主厨推荐",
      pieces: "只",
      kcal: "千卡",
      noteLabel: "给厨房留句话",
      notePlaceholder: "少辣、不要香菜、今天有人过生日…",
      ordered: "开始蒸了",
      orderedNote: (t, n) => `${t ? `${t}号桌 · ` : ""}单号 ${n} 已送达厨房。\n大约十二分钟后，好东西上桌。`,
      back: "回到菜单",
      colophon: "手工现包 · 每日新鲜",
      search: "搜索菜品…",
      fAll: "全部", fVeg: "素食", fSpicy: "香辣", fNoPork: "不含猪肉",
      noResults: "没有符合的菜品——清除筛选试试。",
      waiter: "呼叫服务员",
      waiterToast: "服务员马上就来 🙌",
      addedToast: n => `${n} 已放进蒸笼`,
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
    "signature": "镇店手作，先从这里点起",
    "diy": "选馅料，选做法——水煮 · 煎 · 清汤 · 辣拌 · 混酱",
    "noodles": "今早现拉，各地一碗",
    "buns": "一口一个，小心汤",
    "tangzi": "糯叽叽，咸甜都有",
    "rice": "隔夜米，滚烫的锅",
    "soup": "小火慢煨，从不着急",
    "sides": "小盘子，大主意",
    "fried": "金黄酥脆，趁热",
    "veg": "清清爽爽，解腻",
    "dessert": "冰冰凉凉的收尾"
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
        "flavor": "鲜嫩猪肉馅，底部煎得金黄酥脆。",
        "story": ""
    },
    "jp-chicken-gyoza": {
        "flavor": "皮薄馅足的鸡肉煎饺，蒜香焦脆。",
        "story": ""
    },
    "hk-crab-roe-wonton": {
        "flavor": "蟹籽云吞浸在金汤里，鲜到眉毛掉。",
        "story": ""
    },
    "grandma-fried-wonton": {
        "flavor": "家常馄饨煎到两面金黄。",
        "story": ""
    },
    "nanjing-beef-guotie": {
        "flavor": "牛肉锅贴，葱香十足，底脆。",
        "story": ""
    },
    "sichuan-red-oil-chaoshou": {
        "flavor": "柔滑猪肉抄手，红油飘香，麻辣上头。",
        "story": ""
    },
    "diy-chicken-cabbage": {
        "flavor": "选好这个馅，再选做法。",
        "story": ""
    },
    "diy-beef-curry-onion": {
        "flavor": "选好这个馅，再选做法。",
        "story": ""
    },
    "diy-pork-celery-shrimp": {
        "flavor": "选好这个馅，再选做法。",
        "story": ""
    },
    "diy-saltedegg-roe-shrimp": {
        "flavor": "选好这个馅，再选做法。",
        "story": ""
    },
    "diy-pork-scallion": {
        "flavor": "选好这个馅，再选做法。",
        "story": ""
    },
    "diy-chicken-corn-carrot": {
        "flavor": "选好这个馅，再选做法。",
        "story": ""
    },
    "diy-pork-chive": {
        "flavor": "选好这个馅，再选做法。",
        "story": ""
    },
    "diy-tomato-egg": {
        "flavor": "选好这个馅，再选做法。",
        "story": ""
    },
    "diy-four-veg": {
        "flavor": "选好这个馅，再选做法。",
        "story": ""
    },
    "diy-veg-pork-wonton": {
        "flavor": "选好这个馅，再选做法。",
        "story": ""
    },
    "diy-chive-wonton": {
        "flavor": "选好这个馅，再选做法。",
        "story": ""
    },
    "xian-hot-oil-noodles": {
        "flavor": "宽面泼上滚油辣子，一声刺啦。",
        "story": ""
    },
    "xinjiang-dapanji-noodles": {
        "flavor": "大盘鸡拌手工宽面，一大盘的满足。",
        "story": ""
    },
    "shanghai-scallion-noodles": {
        "flavor": "熬透的葱、甜酱油、细面，简单到极致。",
        "story": ""
    },
    "beijing-zhajiang-noodles": {
        "flavor": "筋道面条配酱香肉丁。",
        "story": ""
    },
    "signature-chicken-ramen": {
        "flavor": "十二小时鸡汤，手拉面，招牌一碗。",
        "story": ""
    },
    "yangzhou-plain-noodles": {
        "flavor": "最清爽的一碗，清汤细面。",
        "story": ""
    },
    "nanjing-soup-bun": {
        "flavor": "十八道褶收着一口滚汤。",
        "story": ""
    },
    "traditional-pork-bun": {
        "flavor": "松软大包，经典猪肉馅。",
        "story": ""
    },
    "wildrice-pork-tangzi": {
        "flavor": "糯叽叽的团子，茭白肉末馅。",
        "story": ""
    },
    "radish-pork-tangzi": {
        "flavor": "糯团子，萝卜猪肉馅，鲜。",
        "story": ""
    },
    "redbean-tangyuan": {
        "flavor": "温热糯米团，豆沙流心。",
        "story": ""
    },
    "sesame-tangyuan": {
        "flavor": "黑芝麻流心，软糯汤圆。",
        "story": ""
    },
    "shrimp-egg-fried-rice": {
        "flavor": "虾仁蛋炒饭，粒粒裹金。",
        "story": ""
    },
    "spicy-chicken-fried-rice": {
        "flavor": "锅气十足的辣鸡肉炒饭。",
        "story": ""
    },
    "chaozhou-fishball-soup": {
        "flavor": "手打鱼丸，弹牙，清汤见底。",
        "story": ""
    },
    "tomato-beef-soup": {
        "flavor": "番茄牛肉汤，酸甜开胃。",
        "story": ""
    },
    "lionhead-soup": {
        "flavor": "一颗超大狮子头，入口即化。",
        "story": ""
    },
    "mashed-potato-salad": {
        "flavor": "冰凉绵密的土豆泥沙拉。",
        "story": ""
    },
    "sweetsour-pork-ribs": {
        "flavor": "油亮的糖醋排骨，酸甜下饭。",
        "story": ""
    },
    "mouthwatering-chicken": {
        "flavor": "口水鸡，红油浇透，麻辣鲜香。",
        "story": ""
    },
    "drunken-brine-shrimp": {
        "flavor": "糟卤虾，酒香冰凉。",
        "story": ""
    },
    "minced-pork-tofu": {
        "flavor": "嫩豆腐配肉末，家常滋味。",
        "story": ""
    },
    "big-plate-chicken": {
        "flavor": "大盘鸡，土豆宽粉，够几个人分。",
        "story": ""
    },
    "egg-luncheon-meat": {
        "flavor": "鸡蛋午餐肉，简单快乐。",
        "story": ""
    },
    "braised-lionhead": {
        "flavor": "红烧狮子头，酥烂入味。",
        "story": ""
    },
    "yunnan-lava-tofu": {
        "flavor": "外脆内爆浆的包浆豆腐。",
        "story": ""
    },
    "secret-pork-cutlet": {
        "flavor": "秘制猪排，咬下咔哧作响。",
        "story": ""
    },
    "13spice-chicken-nuggets": {
        "flavor": "十三味炸鸡块，越吃越香。",
        "story": ""
    },
    "13spice-chicken-wings": {
        "flavor": "十三味鸡翅，入味到骨。",
        "story": ""
    },
    "old-style-fried-drumstick": {
        "flavor": "老式炸鸡腿，童年的味道。",
        "story": ""
    },
    "cold-veg-shreds": {
        "flavor": "凉拌蔬菜丝，爽脆解腻。",
        "story": ""
    },
    "cold-eggplant-peashoot": {
        "flavor": "凉拌茄子，或清炒豆苗。",
        "story": ""
    },
    "veg-with-dip": {
        "flavor": "新鲜蔬菜配蘸酱。",
        "story": ""
    },
    "pickled-radish": {
        "flavor": "爽脆酸甜的腌萝卜。",
        "story": ""
    },
    "garlic-broccoli": {
        "flavor": "蒜蓉快炒西兰花。",
        "story": ""
    },
    "oyster-lettuce": {
        "flavor": "蚝油生菜，清甜。",
        "story": ""
    },
    "sesame-spinach": {
        "flavor": "麻酱菠菜，凉拌爽口。",
        "story": ""
    },
    "mango-ice": {
        "flavor": "芒果冰浆，冰爽香甜。",
        "story": ""
    },
    "watermelon-ice": {
        "flavor": "西瓜冰浆，整个夏天。",
        "story": ""
    },
    "cucumber-ice": {
        "flavor": "黄瓜冰浆，清凉解渴。",
        "story": ""
    }
},
};
