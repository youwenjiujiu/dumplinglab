// Generated from DumplingLab/Data/MenuData.swift — single source of truth for the web menu.
const SECTIONS = ["Signature Dumplings", "Pan Fried", "Wontons", "Soup Dumplings", "Noodles", "Fried Rice", "Soups", "Side Dishes", "Vegetables", "Desserts", "Chef Specials"];
const TAGLINES = {"Signature Dumplings": "Folded by hand, eighteen pleats each", "Pan Fried": "Golden lace, crisp underneath", "Wontons": "Silk-thin wrappers in warm broth", "Soup Dumplings": "Hold the spoon close — they pour", "Noodles": "Pulled this morning", "Fried Rice": "Day-old rice, screaming-hot wok", "Soups": "Slow-simmered, never rushed", "Side Dishes": "Small plates, big opinions", "Vegetables": "From the market, barely touched", "Desserts": "A soft landing", "Chef Specials": "What the kitchen is proud of this week"};
const MENU = [
 {
  "id": "black-pork-panfried",
  "name": "Black Pork Pan Fried Dumplings",
  "cn": "黑豚煎饺",
  "section": "Signature Dumplings",
  "price": 14.5,
  "pieces": 6,
  "flavor": "Deep, sweet Berkshire pork with charred cabbage and a whisper of white pepper — under a shattering golden crust.",
  "story": "Chef Lin spent two years on this filling. The pork is hand-chopped, never ground, so each bite keeps its bounce. The lace crust is poured tableside in the kitchen's imagination — a flour slurry that fries into glass.",
  "kcal": 580,
  "protein": 26,
  "carbs": 48,
  "fat": 31,
  "spice": 0,
  "meat": "pork",
  "veg": false,
  "allergens": [
   "Gluten",
   "Soy",
   "Sesame"
  ],
  "ingredients": [
   {
    "name": "Berkshire pork",
    "emoji": "🥩"
   },
   {
    "name": "Charred cabbage",
    "emoji": "🥬"
   },
   {
    "name": "Ginger",
    "emoji": "🫚"
   },
   {
    "name": "Chive",
    "emoji": "🌿"
   },
   {
    "name": "White pepper",
    "emoji": "✨"
   }
  ],
  "sauce": "Black vinegar & young ginger",
  "pairings": [
   "cucumber-smash",
   "hot-sour-soup",
   "jasmine-panna-cotta"
  ],
  "best": true,
  "chef": true,
  "featured": true,
  "soldOut": false,
  "art": "pleatedDumplingCrisped",
  "skin": "#edd19e",
  "accent": "#9e6138",
  "glow": "#5c3d26",
  "img": null
 },
 {
  "id": "chicken-corn",
  "name": "Chicken & Sweet Corn Dumplings",
  "cn": "鸡肉玉米饺",
  "section": "Signature Dumplings",
  "price": 12.5,
  "pieces": 6,
  "flavor": "Bright, gently sweet, and impossibly juicy — summer corn folded into free-range chicken.",
  "story": "A staff-meal experiment that never left the menu. The corn is cut fresh each morning; its milk binds the filling with no starch at all.",
  "kcal": 430,
  "protein": 28,
  "carbs": 44,
  "fat": 15,
  "spice": 0,
  "meat": "chicken",
  "veg": false,
  "allergens": [
   "Gluten",
   "Soy"
  ],
  "ingredients": [
   {
    "name": "Free-range chicken",
    "emoji": "🍗"
   },
   {
    "name": "Sweet corn",
    "emoji": "🌽"
   },
   {
    "name": "Scallion",
    "emoji": "🌿"
   },
   {
    "name": "Shaoxing wine",
    "emoji": "🍶"
   }
  ],
  "sauce": "Light soy & scallion oil",
  "pairings": [
   "chicken-broth",
   "garlic-greens"
  ],
  "best": true,
  "chef": false,
  "featured": true,
  "soldOut": false,
  "art": "pleatedDumpling",
  "skin": "#f7ebc7",
  "accent": "#f2c74c",
  "glow": "#6b5224",
  "img": null
 },
 {
  "id": "sichuan-chili",
  "name": "Sichuan Chili Dumplings",
  "cn": "红油抄手",
  "section": "Signature Dumplings",
  "price": 13.0,
  "pieces": 8,
  "flavor": "Silken pork dumplings drowned — happily — in fragrant chili oil, Sichuan pepper, and black vinegar.",
  "story": "The chili oil steeps for three days with cassia and star anise. It should tingle, then hum, then make you order rice.",
  "kcal": 520,
  "protein": 22,
  "carbs": 42,
  "fat": 29,
  "spice": 3,
  "meat": "pork",
  "veg": false,
  "allergens": [
   "Gluten",
   "Soy",
   "Sesame",
   "Peanut"
  ],
  "ingredients": [
   {
    "name": "Pork shoulder",
    "emoji": "🥩"
   },
   {
    "name": "Three-day chili oil",
    "emoji": "🌶️"
   },
   {
    "name": "Sichuan pepper",
    "emoji": "🔥"
   },
   {
    "name": "Black vinegar",
    "emoji": "🍶"
   },
   {
    "name": "Crushed peanut",
    "emoji": "🥜"
   }
  ],
  "sauce": "Already dressed — bring rice",
  "pairings": [
   "cucumber-smash",
   "egg-fried-rice",
   "mango-sago"
  ],
  "best": true,
  "chef": false,
  "featured": true,
  "soldOut": false,
  "art": "pleatedDumpling",
  "skin": "#f0deb8",
  "accent": "#b82e1f",
  "glow": "#661f14",
  "img": null
 },
 {
  "id": "mushroom-truffle",
  "name": "Wild Mushroom & Truffle Dumplings",
  "cn": "松露野菌饺",
  "section": "Signature Dumplings",
  "price": 15.0,
  "pieces": 6,
  "flavor": "Five mushrooms, brown butter, and a breath of black truffle inside a spinach-jade wrapper.",
  "story": "Our vegetarian flagship. The mushrooms are roasted until they give up every drop of water, then folded warm so the wrapper takes their perfume.",
  "kcal": 390,
  "protein": 12,
  "carbs": 46,
  "fat": 17,
  "spice": 0,
  "meat": "vegetarian",
  "veg": true,
  "allergens": [
   "Gluten",
   "Dairy"
  ],
  "ingredients": [
   {
    "name": "Five wild mushrooms",
    "emoji": "🍄"
   },
   {
    "name": "Black truffle",
    "emoji": "⚫"
   },
   {
    "name": "Brown butter",
    "emoji": "🧈"
   },
   {
    "name": "Spinach wrapper",
    "emoji": "🥬"
   }
  ],
  "sauce": "Aged soy pearls",
  "pairings": [
   "garlic-greens",
   "silk-tofu-soup"
  ],
  "best": false,
  "chef": true,
  "featured": true,
  "soldOut": false,
  "art": "pleatedDumpling",
  "skin": "#b8cc9e",
  "accent": "#6b523d",
  "glow": "#334729",
  "img": null
 },
 {
  "id": "chicken-gyoza",
  "name": "Japanese Chicken Gyoza",
  "cn": "鸡肉煎饺",
  "section": "Pan Fried",
  "price": 11.5,
  "pieces": 6,
  "flavor": "Thin-skinned, garlicky, seared hard on one side and steamed soft on the other.",
  "story": "A bow to our sister izakaya in Osaka. The wrappers are rolled to 0.8 millimeters — thin enough to read a menu through.",
  "kcal": 410,
  "protein": 24,
  "carbs": 40,
  "fat": 16,
  "spice": 1,
  "meat": "chicken",
  "veg": false,
  "allergens": [
   "Gluten",
   "Soy",
   "Sesame"
  ],
  "ingredients": [
   {
    "name": "Chicken thigh",
    "emoji": "🍗"
   },
   {
    "name": "Garlic chive",
    "emoji": "🌿"
   },
   {
    "name": "Ginger",
    "emoji": "🫚"
   },
   {
    "name": "Sesame oil",
    "emoji": "🫗"
   }
  ],
  "sauce": "Yuzu ponzu",
  "pairings": [
   "chicken-ramen",
   "cucumber-smash"
  ],
  "best": true,
  "chef": false,
  "featured": true,
  "soldOut": false,
  "art": "pleatedDumplingCrisped",
  "skin": "#f2e0b8",
  "accent": "#cc944c",
  "glow": "#574224",
  "img": null
 },
 {
  "id": "beef-scallion-panfried",
  "name": "Beef & Charred Scallion Pan Fried",
  "cn": "葱香牛肉锅贴",
  "section": "Pan Fried",
  "price": 13.5,
  "pieces": 6,
  "flavor": "Rich short-rib beef sweetened with scallions blistered over open flame.",
  "story": "The scallions go over the binchotan until their edges blacken. That smoke is the whole dish.",
  "kcal": 560,
  "protein": 27,
  "carbs": 46,
  "fat": 29,
  "spice": 1,
  "meat": "beef",
  "veg": false,
  "allergens": [
   "Gluten",
   "Soy"
  ],
  "ingredients": [
   {
    "name": "Short rib",
    "emoji": "🥩"
   },
   {
    "name": "Charred scallion",
    "emoji": "🌿"
   },
   {
    "name": "Toasted cumin",
    "emoji": "✨"
   }
  ],
  "sauce": "Chili crisp & vinegar",
  "pairings": [
   "hot-sour-soup",
   "smacked-eggplant"
  ],
  "best": false,
  "chef": false,
  "featured": false,
  "soldOut": false,
  "art": "pleatedDumplingCrisped",
  "skin": "#e8cc99",
  "accent": "#7a4c33",
  "glow": "#4c331f",
  "img": null
 },
 {
  "id": "veggie-potsticker",
  "name": "Garden Potstickers",
  "cn": "素锅贴",
  "section": "Pan Fried",
  "price": 10.5,
  "pieces": 6,
  "flavor": "Cabbage, glass noodle, shiitake, and egg — the classic, crisped.",
  "story": "Grandmother Wei's recipe, unchanged since the first Dumpling Lab. We tried to improve it once. We apologized.",
  "kcal": 370,
  "protein": 11,
  "carbs": 48,
  "fat": 14,
  "spice": 0,
  "meat": "vegetarian",
  "veg": true,
  "allergens": [
   "Gluten",
   "Soy",
   "Egg",
   "Sesame"
  ],
  "ingredients": [
   {
    "name": "Napa cabbage",
    "emoji": "🥬"
   },
   {
    "name": "Shiitake",
    "emoji": "🍄"
   },
   {
    "name": "Glass noodle",
    "emoji": "🍜"
   },
   {
    "name": "Egg",
    "emoji": "🥚"
   }
  ],
  "sauce": "Black vinegar & chili crisp",
  "pairings": [
   "silk-tofu-soup",
   "garlic-greens"
  ],
  "best": false,
  "chef": false,
  "featured": false,
  "soldOut": false,
  "art": "pleatedDumplingCrisped",
  "skin": "#f0e3bd",
  "accent": "#8c9e61",
  "glow": "#474c26",
  "img": null
 },
 {
  "id": "shrimp-wonton",
  "name": "Shrimp Wontons in Golden Broth",
  "cn": "鲜虾云吞",
  "section": "Wontons",
  "price": 13.5,
  "pieces": 8,
  "flavor": "Whole tiger prawns in silk wrappers, floating in a broth clarified to amber glass.",
  "story": "The broth starts at 5 a.m. — chicken frames, pork bone, dried flounder — and is rafted clear like consommé. You can read the bottom of the bowl.",
  "kcal": 380,
  "protein": 24,
  "carbs": 38,
  "fat": 12,
  "spice": 0,
  "meat": "shrimp",
  "veg": false,
  "allergens": [
   "Gluten",
   "Shellfish",
   "Egg"
  ],
  "ingredients": [
   {
    "name": "Tiger prawn",
    "emoji": "🦐"
   },
   {
    "name": "Golden broth",
    "emoji": "🥣"
   },
   {
    "name": "Yellow chive",
    "emoji": "🌿"
   },
   {
    "name": "Flounder dust",
    "emoji": "🐟"
   }
  ],
  "sauce": "A drop of red vinegar",
  "pairings": [
   "garlic-greens",
   "egg-fried-rice"
  ],
  "best": true,
  "chef": false,
  "featured": true,
  "soldOut": false,
  "art": "wonton",
  "skin": "#fae6c2",
  "accent": "#f29973",
  "glow": "#734c1f",
  "img": "wonton-soup.png"
 },
 {
  "id": "pork-chive-wonton",
  "name": "Pork & Chive Wontons",
  "cn": "韭菜猪肉云吞",
  "section": "Wontons",
  "price": 11.5,
  "pieces": 8,
  "flavor": "The comfort classic — juicy, green-flecked, endless.",
  "story": "Folded at the window bar every afternoon at four. Regulars set their watches by it.",
  "kcal": 420,
  "protein": 21,
  "carbs": 40,
  "fat": 18,
  "spice": 0,
  "meat": "pork",
  "veg": false,
  "allergens": [
   "Gluten",
   "Soy",
   "Egg"
  ],
  "ingredients": [
   {
    "name": "Pork belly & loin",
    "emoji": "🥩"
   },
   {
    "name": "Chinese chive",
    "emoji": "🌿"
   },
   {
    "name": "Ginger water",
    "emoji": "🫚"
   }
  ],
  "sauce": "Scallion oil",
  "pairings": [
   "hot-sour-soup",
   "cucumber-smash"
  ],
  "best": false,
  "chef": false,
  "featured": false,
  "soldOut": false,
  "art": "wonton",
  "skin": "#f7e8c7",
  "accent": "#809959",
  "glow": "#5c4724",
  "img": null
 },
 {
  "id": "pork-xlb",
  "name": "Pork Soup Dumplings",
  "cn": "小笼包",
  "section": "Soup Dumplings",
  "price": 13.0,
  "pieces": 6,
  "flavor": "Eighteen pleats around a spoonful of hot pork consommé. Bite, sip, then eat.",
  "story": "The soup is a jellied stock folded in cold; steam melts it back to broth. Six minutes, not seven — the timer is sacred.",
  "kcal": 450,
  "protein": 22,
  "carbs": 42,
  "fat": 21,
  "spice": 0,
  "meat": "pork",
  "veg": false,
  "allergens": [
   "Gluten",
   "Soy"
  ],
  "ingredients": [
   {
    "name": "Pork",
    "emoji": "🥩"
   },
   {
    "name": "Jellied consommé",
    "emoji": "✨"
   },
   {
    "name": "Young ginger",
    "emoji": "🫚"
   }
  ],
  "sauce": "Black vinegar & ginger threads",
  "pairings": [
   "garlic-greens",
   "jasmine-panna-cotta"
  ],
  "best": true,
  "chef": true,
  "featured": true,
  "soldOut": false,
  "art": "soupDumpling",
  "skin": "#f5e6c9",
  "accent": "#d9a873",
  "glow": "#664724",
  "img": null
 },
 {
  "id": "crab-pork-xlb",
  "name": "Crab & Pork Soup Dumplings",
  "cn": "蟹粉小笼包",
  "section": "Soup Dumplings",
  "price": 16.5,
  "pieces": 6,
  "flavor": "Sweet crab and golden roe fold into the broth — richer, rounder, unforgettable.",
  "story": "We pick the crab by hand every morning. On days the crab isn't right, this dish simply isn't served.",
  "kcal": 480,
  "protein": 24,
  "carbs": 42,
  "fat": 23,
  "spice": 0,
  "meat": "shrimp",
  "veg": false,
  "allergens": [
   "Gluten",
   "Shellfish",
   "Soy"
  ],
  "ingredients": [
   {
    "name": "Hand-picked crab",
    "emoji": "🦀"
   },
   {
    "name": "Crab roe",
    "emoji": "🟠"
   },
   {
    "name": "Pork",
    "emoji": "🥩"
   }
  ],
  "sauce": "Black vinegar & ginger threads",
  "pairings": [
   "garlic-greens",
   "silk-tofu-soup"
  ],
  "best": false,
  "chef": true,
  "featured": false,
  "soldOut": false,
  "art": "soupDumpling",
  "skin": "#f7e6c2",
  "accent": "#f09e47",
  "glow": "#70471a",
  "img": null
 },
 {
  "id": "chicken-ramen",
  "name": "Chicken Ramen",
  "cn": "鸡汤拉面",
  "section": "Noodles",
  "price": 15.5,
  "pieces": null,
  "flavor": "Paitan broth blended to silk, hand-pulled noodles, chashu-style chicken, and a six-minute egg.",
  "story": "Twelve hours of simmering collapses the whole bird into cream. The noodles are pulled to order — you can hear the slap from the dining room.",
  "kcal": 640,
  "protein": 38,
  "carbs": 62,
  "fat": 24,
  "spice": 1,
  "meat": "chicken",
  "veg": false,
  "allergens": [
   "Gluten",
   "Egg",
   "Sesame"
  ],
  "ingredients": [
   {
    "name": "12-hour paitan",
    "emoji": "🥣"
   },
   {
    "name": "Hand-pulled noodles",
    "emoji": "🍜"
   },
   {
    "name": "Chicken chashu",
    "emoji": "🍗"
   },
   {
    "name": "Six-minute egg",
    "emoji": "🥚"
   }
  ],
  "sauce": "Chili oil, if you dare",
  "pairings": [
   "chicken-gyoza",
   "cucumber-smash"
  ],
  "best": true,
  "chef": false,
  "featured": true,
  "soldOut": false,
  "art": "noodleBowl",
  "skin": "#f5e0b2",
  "accent": "#e6b866",
  "glow": "#6b4c1f",
  "img": null
 },
 {
  "id": "dan-dan",
  "name": "Dan Dan Noodles",
  "cn": "担担面",
  "section": "Noodles",
  "price": 13.5,
  "pieces": null,
  "flavor": "Sesame, chili, crispy pork, and a slow Sichuan-pepper hum under springy noodles.",
  "story": "Mix twelve times before the first bite — chef counts, and yes, she's watching.",
  "kcal": 610,
  "protein": 25,
  "carbs": 64,
  "fat": 28,
  "spice": 3,
  "meat": "pork",
  "veg": false,
  "allergens": [
   "Gluten",
   "Sesame",
   "Peanut",
   "Soy"
  ],
  "ingredients": [
   {
    "name": "Sesame paste",
    "emoji": "🫙"
   },
   {
    "name": "Chili oil",
    "emoji": "🌶️"
   },
   {
    "name": "Crispy pork",
    "emoji": "🥓"
   },
   {
    "name": "Ya cai",
    "emoji": "🥬"
   }
  ],
  "sauce": "Already dressed",
  "pairings": [
   "cucumber-smash",
   "mango-sago"
  ],
  "best": false,
  "chef": false,
  "featured": false,
  "soldOut": false,
  "art": "noodleBowl",
  "skin": "#edd199",
  "accent": "#b2331f",
  "glow": "#5c2414",
  "img": null
 },
 {
  "id": "scallion-oil-noodles",
  "name": "Scallion Oil Noodles",
  "cn": "葱油拌面",
  "section": "Noodles",
  "price": 11.0,
  "pieces": null,
  "flavor": "Four ingredients. Scallions fried to mahogany, sweet soy, thin noodles, patience.",
  "story": "Shanghai's quietest masterpiece. We fry the scallions for forty minutes over the lowest possible flame.",
  "kcal": 480,
  "protein": 12,
  "carbs": 68,
  "fat": 18,
  "spice": 0,
  "meat": "vegan",
  "veg": true,
  "allergens": [
   "Gluten",
   "Soy"
  ],
  "ingredients": [
   {
    "name": "Mahogany scallions",
    "emoji": "🌿"
   },
   {
    "name": "Sweet soy",
    "emoji": "🍶"
   },
   {
    "name": "Thin wheat noodles",
    "emoji": "🍜"
   }
  ],
  "sauce": "Nothing. Trust it.",
  "pairings": [
   "veggie-potsticker",
   "garlic-greens"
  ],
  "best": false,
  "chef": false,
  "featured": false,
  "soldOut": false,
  "art": "noodleBowl",
  "skin": "#ebd6a3",
  "accent": "#738547",
  "glow": "#52421a",
  "img": null
 },
 {
  "id": "hot-oil-ribbons",
  "name": "Hot Oil Hand-Torn Ribbons",
  "cn": "油泼宽面",
  "section": "Noodles",
  "price": 13.5,
  "pieces": null,
  "flavor": "Wide silk ribbons under a heap of chili, garlic, and crushed peanut — finished tableside with smoking oil.",
  "story": "The oil goes on at exactly 190 degrees. It hisses, the chili blooms, and the whole room turns around.",
  "kcal": 540,
  "protein": 14,
  "carbs": 78,
  "fat": 20,
  "spice": 3,
  "meat": "vegan",
  "veg": true,
  "allergens": [
   "Gluten",
   "Soy",
   "Peanut"
  ],
  "ingredients": [
   {
    "name": "Hand-torn ribbons",
    "emoji": "🍜"
   },
   {
    "name": "Blooming chili",
    "emoji": "🌶️"
   },
   {
    "name": "Raw garlic",
    "emoji": "🧄"
   },
   {
    "name": "Smoking oil",
    "emoji": "💨"
   }
  ],
  "sauce": "Already blooming",
  "pairings": [
   "cucumber-smash",
   "silk-tofu-soup",
   "mango-sago"
  ],
  "best": true,
  "chef": false,
  "featured": true,
  "soldOut": false,
  "art": "noodleBowl",
  "skin": "#f5e6c2",
  "accent": "#c7381a",
  "glow": "#6b240f",
  "img": "hot-oil-noodles.png"
 },
 {
  "id": "katsu-mazemen",
  "name": "Sesame Katsu Mazemen",
  "cn": "脆鸡排拌面",
  "section": "Noodles",
  "price": 16.0,
  "pieces": null,
  "flavor": "A shattering sesame-crusted cutlet over springy brothless noodles, with two soy-cured eggs and crisped nori.",
  "story": "The cutlet rests exactly four minutes before it's sliced — long enough to stay crackling, short enough to stay warm.",
  "kcal": 720,
  "protein": 40,
  "carbs": 66,
  "fat": 32,
  "spice": 0,
  "meat": "chicken",
  "veg": false,
  "allergens": [
   "Gluten",
   "Egg",
   "Sesame",
   "Soy"
  ],
  "ingredients": [
   {
    "name": "Sesame cutlet",
    "emoji": "🍗"
   },
   {
    "name": "Soy-cured egg",
    "emoji": "🥚"
   },
   {
    "name": "Crisped nori",
    "emoji": "🟩"
   },
   {
    "name": "Brothless noodles",
    "emoji": "🍜"
   }
  ],
  "sauce": "Toss twelve times",
  "pairings": [
   "cucumber-smash",
   "chicken-broth"
  ],
  "best": false,
  "chef": false,
  "featured": true,
  "soldOut": false,
  "art": "noodleBowl",
  "skin": "#edd19e",
  "accent": "#b87a38",
  "glow": "#5c3d1a",
  "img": "katsu-noodles.png"
 },
 {
  "id": "corn-pork-mazemen",
  "name": "Corn & Pork Mazemen",
  "cn": "玉米肉燥拌面",
  "section": "Noodles",
  "price": 14.5,
  "pieces": null,
  "flavor": "Sweet corn, gingered pork crumble, two jammy eggs, and nori — a quiet bowl that disappears fast.",
  "story": "Our gentlest noodle bowl. The pork simmers in its own broth until it gives up and turns to velvet.",
  "kcal": 640,
  "protein": 32,
  "carbs": 68,
  "fat": 26,
  "spice": 0,
  "meat": "pork",
  "veg": false,
  "allergens": [
   "Gluten",
   "Egg",
   "Soy"
  ],
  "ingredients": [
   {
    "name": "Sweet corn",
    "emoji": "🌽"
   },
   {
    "name": "Pork crumble",
    "emoji": "🥓"
   },
   {
    "name": "Jammy egg",
    "emoji": "🥚"
   },
   {
    "name": "Nori",
    "emoji": "🟩"
   }
  ],
  "sauce": "Mix from the bottom",
  "pairings": [
   "garlic-greens",
   "silk-tofu-soup"
  ],
  "best": false,
  "chef": false,
  "featured": false,
  "soldOut": false,
  "art": "noodleBowl",
  "skin": "#f2e0ad",
  "accent": "#f0c752",
  "glow": "#664c1a",
  "img": "corn-pork-mazemen.png"
 },
 {
  "id": "egg-fried-rice",
  "name": "Golden Egg Fried Rice",
  "cn": "黄金蛋炒饭",
  "section": "Fried Rice",
  "price": 12.0,
  "pieces": null,
  "flavor": "Every grain gilded in yolk before it meets the wok. Smoky, loose, luminous.",
  "story": "Day-old jasmine rice, separated grain by grain, coated in raw yolk so each one fries in its own golden jacket.",
  "kcal": 520,
  "protein": 16,
  "carbs": 70,
  "fat": 19,
  "spice": 0,
  "meat": "vegetarian",
  "veg": true,
  "allergens": [
   "Egg",
   "Soy"
  ],
  "ingredients": [
   {
    "name": "Day-old jasmine rice",
    "emoji": "🍚"
   },
   {
    "name": "Egg yolk",
    "emoji": "🥚"
   },
   {
    "name": "Scallion",
    "emoji": "🌿"
   },
   {
    "name": "Wok smoke",
    "emoji": "💨"
   }
  ],
  "sauce": "White pepper on top",
  "pairings": [
   "sichuan-chili",
   "hot-sour-soup"
  ],
  "best": true,
  "chef": false,
  "featured": true,
  "soldOut": false,
  "art": "riceBowl",
  "skin": "#f7de8c",
  "accent": "#f0b240",
  "glow": "#73571a",
  "img": null
 },
 {
  "id": "shrimp-fried-rice",
  "name": "Shrimp & XO Fried Rice",
  "cn": "XO虾仁炒饭",
  "section": "Fried Rice",
  "price": 15.5,
  "pieces": null,
  "flavor": "Sweet prawns, house XO sauce, and enough wok hei to fog your glasses.",
  "story": "The XO is made in-house each month — dried scallop, ham, and chilies reduced to umami gravel.",
  "kcal": 590,
  "protein": 26,
  "carbs": 68,
  "fat": 23,
  "spice": 2,
  "meat": "shrimp",
  "veg": false,
  "allergens": [
   "Shellfish",
   "Egg",
   "Soy"
  ],
  "ingredients": [
   {
    "name": "Tiger prawn",
    "emoji": "🦐"
   },
   {
    "name": "House XO",
    "emoji": "🫙"
   },
   {
    "name": "Jasmine rice",
    "emoji": "🍚"
   }
  ],
  "sauce": "It brought its own",
  "pairings": [
   "garlic-greens",
   "silk-tofu-soup"
  ],
  "best": false,
  "chef": false,
  "featured": false,
  "soldOut": false,
  "art": "riceBowl",
  "skin": "#f5db94",
  "accent": "#eb8559",
  "glow": "#6b3d1a",
  "img": null
 },
 {
  "id": "hot-sour-soup",
  "name": "Hot & Sour Soup",
  "cn": "酸辣汤",
  "section": "Soups",
  "price": 8.5,
  "pieces": null,
  "flavor": "Black vinegar bite, white pepper heat, silk tofu, wood ear — the wake-up call.",
  "story": "Thickened to exactly the weight of velvet. The pepper goes in off the heat so it stings, not burns.",
  "kcal": 210,
  "protein": 10,
  "carbs": 22,
  "fat": 9,
  "spice": 2,
  "meat": "vegetarian",
  "veg": true,
  "allergens": [
   "Gluten",
   "Soy",
   "Egg"
  ],
  "ingredients": [
   {
    "name": "Black vinegar",
    "emoji": "🍶"
   },
   {
    "name": "White pepper",
    "emoji": "✨"
   },
   {
    "name": "Silk tofu",
    "emoji": "🧊"
   },
   {
    "name": "Wood ear",
    "emoji": "🍄"
   }
  ],
  "sauce": null,
  "pairings": [
   "black-pork-panfried",
   "egg-fried-rice"
  ],
  "best": false,
  "chef": false,
  "featured": false,
  "soldOut": false,
  "art": "soupBowl",
  "skin": "#9e663d",
  "accent": "#d98c4c",
  "glow": "#4c2e14",
  "img": null
 },
 {
  "id": "chicken-broth",
  "name": "Old Hen Chicken Soup",
  "cn": "老母鸡汤",
  "section": "Soups",
  "price": 9.5,
  "pieces": null,
  "flavor": "Clear, deep, restorative. Goji, jujube, and a whole afternoon of simmering.",
  "story": "The pot never boils — it shivers. Four hours later the broth tastes like being taken care of.",
  "kcal": 180,
  "protein": 18,
  "carbs": 8,
  "fat": 8,
  "spice": 0,
  "meat": "chicken",
  "veg": false,
  "allergens": [],
  "ingredients": [
   {
    "name": "Old hen",
    "emoji": "🍗"
   },
   {
    "name": "Goji berry",
    "emoji": "🔴"
   },
   {
    "name": "Jujube",
    "emoji": "🟤"
   },
   {
    "name": "Ginger",
    "emoji": "🫚"
   }
  ],
  "sauce": null,
  "pairings": [
   "chicken-corn",
   "garlic-greens"
  ],
  "best": false,
  "chef": false,
  "featured": true,
  "soldOut": false,
  "art": "soupBowl",
  "skin": "#f2d48c",
  "accent": "#d96640",
  "glow": "#6b4c1f",
  "img": null
 },
 {
  "id": "fish-tofu-soup",
  "name": "Milky Fish & Tofu Soup",
  "cn": "鱼头豆腐汤",
  "section": "Soups",
  "price": 11.5,
  "pieces": null,
  "flavor": "Seared fish blasted with boiling water until the broth turns white as jade.",
  "story": "The sear is the secret — protein and fat emulsify into that famous milky cloud. No dairy, only physics.",
  "kcal": 260,
  "protein": 24,
  "carbs": 10,
  "fat": 13,
  "spice": 0,
  "meat": "fish",
  "veg": false,
  "allergens": [
   "Soy"
  ],
  "ingredients": [
   {
    "name": "Seared white fish",
    "emoji": "🐟"
   },
   {
    "name": "Silken tofu",
    "emoji": "🧊"
   },
   {
    "name": "White pepper",
    "emoji": "✨"
   }
  ],
  "sauce": null,
  "pairings": [
   "sichuan-chili",
   "garlic-greens"
  ],
  "best": false,
  "chef": false,
  "featured": false,
  "soldOut": false,
  "art": "soupBowl",
  "skin": "#f0ebdb",
  "accent": "#bfccb8",
  "glow": "#57523d",
  "img": null
 },
 {
  "id": "silk-tofu-soup",
  "name": "Silk Tofu & Seaweed Soup",
  "cn": "紫菜豆腐汤",
  "section": "Soups",
  "price": 7.5,
  "pieces": null,
  "flavor": "Light as air — kombu broth, silken tofu, a scatter of sesame.",
  "story": "The palate cleanser of the menu. Order it between rounds of dumplings, like a comma.",
  "kcal": 120,
  "protein": 9,
  "carbs": 8,
  "fat": 5,
  "spice": 0,
  "meat": "vegan",
  "veg": true,
  "allergens": [
   "Soy",
   "Sesame"
  ],
  "ingredients": [
   {
    "name": "Kombu broth",
    "emoji": "🌊"
   },
   {
    "name": "Silken tofu",
    "emoji": "🧊"
   },
   {
    "name": "Nori",
    "emoji": "🟩"
   }
  ],
  "sauce": null,
  "pairings": [
   "mushroom-truffle",
   "veggie-potsticker"
  ],
  "best": false,
  "chef": false,
  "featured": false,
  "soldOut": false,
  "art": "soupBowl",
  "skin": "#e0e6d6",
  "accent": "#597361",
  "glow": "#3d4c38",
  "img": null
 },
 {
  "id": "cucumber-smash",
  "name": "Smashed Cucumber",
  "cn": "拍黄瓜",
  "section": "Side Dishes",
  "price": 7.0,
  "pieces": null,
  "flavor": "Cold, crackling, garlic-heavy — dressed in vinegar and a thread of chili oil.",
  "story": "Smashed, never sliced. The rough edges drink the dressing.",
  "kcal": 90,
  "protein": 3,
  "carbs": 10,
  "fat": 5,
  "spice": 1,
  "meat": "vegan",
  "veg": true,
  "allergens": [
   "Soy",
   "Sesame"
  ],
  "ingredients": [
   {
    "name": "Persian cucumber",
    "emoji": "🥒"
   },
   {
    "name": "Raw garlic",
    "emoji": "🧄"
   },
   {
    "name": "Chinkiang vinegar",
    "emoji": "🍶"
   }
  ],
  "sauce": null,
  "pairings": [
   "sichuan-chili",
   "dan-dan"
  ],
  "best": true,
  "chef": false,
  "featured": false,
  "soldOut": false,
  "art": "sidePlate",
  "skin": "#8cad66",
  "accent": "#cc4c33",
  "glow": "#3d5224",
  "img": null
 },
 {
  "id": "crispy-chicken-bites",
  "name": "Five-Spice Crispy Chicken",
  "cn": "五香脆鸡",
  "section": "Side Dishes",
  "price": 10.5,
  "pieces": null,
  "flavor": "Lacquered, shattering bites dusted with five-spice salt and fried basil.",
  "story": "Brined overnight in soy and rock sugar, fried twice, rested once, gone in minutes.",
  "kcal": 440,
  "protein": 28,
  "carbs": 24,
  "fat": 26,
  "spice": 1,
  "meat": "chicken",
  "veg": false,
  "allergens": [
   "Gluten",
   "Soy"
  ],
  "ingredients": [
   {
    "name": "Chicken thigh",
    "emoji": "🍗"
   },
   {
    "name": "Five-spice salt",
    "emoji": "✨"
   },
   {
    "name": "Fried basil",
    "emoji": "🌿"
   }
  ],
  "sauce": "Plum dust mayo",
  "pairings": [
   "egg-fried-rice",
   "cucumber-smash"
  ],
  "best": false,
  "chef": false,
  "featured": false,
  "soldOut": false,
  "art": "sidePlate",
  "skin": "#e0a857",
  "accent": "#8c5926",
  "glow": "#613d14",
  "img": null
 },
 {
  "id": "smacked-eggplant",
  "name": "Smacked Eggplant",
  "cn": "手撕茄子",
  "section": "Side Dishes",
  "price": 9.0,
  "pieces": null,
  "flavor": "Steamed, torn, and doused in garlic-soy dressing — velvet with a spine.",
  "story": "Torn by hand so the flesh stays cloudlike. The dressing pools in every ridge.",
  "kcal": 160,
  "protein": 4,
  "carbs": 18,
  "fat": 9,
  "spice": 1,
  "meat": "vegan",
  "veg": true,
  "allergens": [
   "Soy",
   "Sesame"
  ],
  "ingredients": [
   {
    "name": "Chinese eggplant",
    "emoji": "🍆"
   },
   {
    "name": "Garlic-soy",
    "emoji": "🧄"
   },
   {
    "name": "Cilantro",
    "emoji": "🌿"
   }
  ],
  "sauce": null,
  "pairings": [
   "scallion-oil-noodles",
   "egg-fried-rice"
  ],
  "best": false,
  "chef": false,
  "featured": false,
  "soldOut": false,
  "art": "sidePlate",
  "skin": "#734c7a",
  "accent": "#99a866",
  "glow": "#3d243d",
  "img": null
 },
 {
  "id": "crispy-tofu",
  "name": "Golden Crispy Tofu",
  "cn": "椒盐脆豆腐",
  "section": "Side Dishes",
  "price": 8.5,
  "pieces": null,
  "flavor": "Custard inside, crackling outside — dusted with chili salt and scallion, served on cold steel.",
  "story": "Pressed for an hour, fried for ninety seconds. The contrast is the entire point.",
  "kcal": 280,
  "protein": 14,
  "carbs": 18,
  "fat": 17,
  "spice": 1,
  "meat": "vegan",
  "veg": true,
  "allergens": [
   "Soy",
   "Gluten"
  ],
  "ingredients": [
   {
    "name": "Silken tofu",
    "emoji": "🧊"
   },
   {
    "name": "Chili salt",
    "emoji": "🌶️"
   },
   {
    "name": "Scallion",
    "emoji": "🌿"
   }
  ],
  "sauce": "The chili salt on the side",
  "pairings": [
   "hot-oil-ribbons",
   "chicken-broth"
  ],
  "best": false,
  "chef": false,
  "featured": false,
  "soldOut": false,
  "art": "sidePlate",
  "skin": "#ebd69e",
  "accent": "#bf592e",
  "glow": "#57381a",
  "img": "crispy-tofu.png"
 },
 {
  "id": "garlic-greens",
  "name": "Wok-Kissed Garlic Greens",
  "cn": "蒜蓉时蔬",
  "section": "Vegetables",
  "price": 9.5,
  "pieces": null,
  "flavor": "Whatever the market gave us this morning, flashed with garlic in a screaming wok.",
  "story": "Thirty seconds of violence, then straight to the plate. Green things should still remember the field.",
  "kcal": 110,
  "protein": 5,
  "carbs": 9,
  "fat": 7,
  "spice": 0,
  "meat": "vegan",
  "veg": true,
  "allergens": [
   "Soy"
  ],
  "ingredients": [
   {
    "name": "Market greens",
    "emoji": "🥬"
   },
   {
    "name": "Garlic",
    "emoji": "🧄"
   },
   {
    "name": "Wok breath",
    "emoji": "💨"
   }
  ],
  "sauce": null,
  "pairings": [
   "pork-xlb",
   "shrimp-wonton"
  ],
  "best": false,
  "chef": false,
  "featured": false,
  "soldOut": false,
  "art": "greens",
  "skin": "#6b9457",
  "accent": "#e6e0c7",
  "glow": "#2e471f",
  "img": null
 },
 {
  "id": "blistered-beans",
  "name": "Blistered Green Beans",
  "cn": "干煸四季豆",
  "section": "Vegetables",
  "price": 10.0,
  "pieces": null,
  "flavor": "Wrinkled, smoky beans tossed with preserved vegetable and a little pork crumble.",
  "story": "Dry-fried until the skins pucker like crepe paper. Ask for them vegetarian — the wok won't mind.",
  "kcal": 220,
  "protein": 8,
  "carbs": 16,
  "fat": 14,
  "spice": 2,
  "meat": "pork",
  "veg": false,
  "allergens": [
   "Soy"
  ],
  "ingredients": [
   {
    "name": "Green beans",
    "emoji": "🫛"
   },
   {
    "name": "Ya cai",
    "emoji": "🥬"
   },
   {
    "name": "Pork crumble",
    "emoji": "🥓"
   },
   {
    "name": "Dried chili",
    "emoji": "🌶️"
   }
  ],
  "sauce": null,
  "pairings": [
   "egg-fried-rice",
   "chicken-broth"
  ],
  "best": false,
  "chef": false,
  "featured": false,
  "soldOut": false,
  "art": "greens",
  "skin": "#618047",
  "accent": "#b83d24",
  "glow": "#293d1a",
  "img": null
 },
 {
  "id": "baby-bok-choy",
  "name": "Baby Bok Choy, Golden Broth",
  "cn": "上汤娃娃菜",
  "section": "Vegetables",
  "price": 10.5,
  "pieces": null,
  "flavor": "Tender hearts poached in superior stock with goji and garlic confit.",
  "story": "The gentlest thing we make. The stock does the seasoning; the bok choy does the rest.",
  "kcal": 130,
  "protein": 6,
  "carbs": 10,
  "fat": 7,
  "spice": 0,
  "meat": "chicken",
  "veg": false,
  "allergens": [],
  "ingredients": [
   {
    "name": "Baby bok choy",
    "emoji": "🥬"
   },
   {
    "name": "Superior stock",
    "emoji": "🥣"
   },
   {
    "name": "Garlic confit",
    "emoji": "🧄"
   },
   {
    "name": "Goji",
    "emoji": "🔴"
   }
  ],
  "sauce": null,
  "pairings": [
   "crab-pork-xlb",
   "pork-xlb"
  ],
  "best": false,
  "chef": false,
  "featured": false,
  "soldOut": false,
  "art": "greens",
  "skin": "#8cad6b",
  "accent": "#f2d98c",
  "glow": "#3d4c1f",
  "img": null
 },
 {
  "id": "mango-sago",
  "name": "Mango Sago Cloud",
  "cn": "杨枝甘露",
  "section": "Desserts",
  "price": 8.5,
  "pieces": null,
  "flavor": "Chilled mango cream, pomelo pearls that pop, sago like tiny moons.",
  "story": "Made with Ataulfo mangoes at peak ripeness — we freeze the season so December tastes like June.",
  "kcal": 290,
  "protein": 4,
  "carbs": 52,
  "fat": 8,
  "spice": 0,
  "meat": "vegetarian",
  "veg": true,
  "allergens": [
   "Dairy"
  ],
  "ingredients": [
   {
    "name": "Ataulfo mango",
    "emoji": "🥭"
   },
   {
    "name": "Pomelo",
    "emoji": "🍊"
   },
   {
    "name": "Sago pearls",
    "emoji": "⚪"
   },
   {
    "name": "Coconut cream",
    "emoji": "🥥"
   }
  ],
  "sauce": null,
  "pairings": [
   "sichuan-chili",
   "dan-dan"
  ],
  "best": true,
  "chef": false,
  "featured": true,
  "soldOut": false,
  "art": "dessertCup",
  "skin": "#facc5c",
  "accent": "#fcebbf",
  "glow": "#7a571a",
  "img": null
 },
 {
  "id": "jasmine-panna-cotta",
  "name": "Jasmine Tea Panna Cotta",
  "cn": "茉莉花茶奶冻",
  "section": "Desserts",
  "price": 9.0,
  "pieces": null,
  "flavor": "A trembling cream infused with jasmine pearls, under a whisper of osmanthus honey.",
  "story": "Set so lightly it barely survives the walk from the kitchen. Eat it before it loses its nerve.",
  "kcal": 310,
  "protein": 5,
  "carbs": 30,
  "fat": 19,
  "spice": 0,
  "meat": "vegetarian",
  "veg": true,
  "allergens": [
   "Dairy"
  ],
  "ingredients": [
   {
    "name": "Jasmine pearls",
    "emoji": "🍵"
   },
   {
    "name": "Cream",
    "emoji": "🥛"
   },
   {
    "name": "Osmanthus honey",
    "emoji": "🍯"
   }
  ],
  "sauce": null,
  "pairings": [
   "black-pork-panfried",
   "pork-xlb"
  ],
  "best": false,
  "chef": false,
  "featured": false,
  "soldOut": false,
  "art": "dessertCup",
  "skin": "#f7f0db",
  "accent": "#ebbf66",
  "glow": "#665733",
  "img": null
 },
 {
  "id": "sesame-tang-yuan",
  "name": "Black Sesame Tang Yuan",
  "cn": "黑芝麻汤圆",
  "section": "Desserts",
  "price": 8.0,
  "pieces": 4,
  "flavor": "Chewy rice moons that burst with molten black sesame, in warm ginger syrup.",
  "story": "The filling is ground in a stone mill until it flows like ink. Served warm, always.",
  "kcal": 340,
  "protein": 6,
  "carbs": 56,
  "fat": 11,
  "spice": 0,
  "meat": "vegan",
  "veg": true,
  "allergens": [
   "Sesame"
  ],
  "ingredients": [
   {
    "name": "Black sesame",
    "emoji": "⚫"
   },
   {
    "name": "Glutinous rice",
    "emoji": "🍡"
   },
   {
    "name": "Ginger syrup",
    "emoji": "🫚"
   }
  ],
  "sauce": null,
  "pairings": [
   "sichuan-chili",
   "hot-sour-soup"
  ],
  "best": false,
  "chef": false,
  "featured": false,
  "soldOut": false,
  "art": "dessertCup",
  "skin": "#f0ebe0",
  "accent": "#2e2926",
  "glow": "#4c4233",
  "img": null
 },
 {
  "id": "beef-yolk-bowl",
  "name": "Sukiyaki Beef & Golden Yolk Bowl",
  "cn": "月见牛肉丼",
  "section": "Chef Specials",
  "price": 19.0,
  "pieces": null,
  "flavor": "Sweet soy-glazed beef ribbons circling one perfect yolk, over rice dressed in sesame nori.",
  "story": "Break the yolk. Stir like you mean it. The chef calls this dish 'the moon over the field' — order it and you'll see.",
  "kcal": 690,
  "protein": 36,
  "carbs": 62,
  "fat": 31,
  "spice": 0,
  "meat": "beef",
  "veg": false,
  "allergens": [
   "Soy",
   "Egg",
   "Sesame",
   "Gluten"
  ],
  "ingredients": [
   {
    "name": "Sukiyaki beef",
    "emoji": "🥩"
   },
   {
    "name": "One perfect yolk",
    "emoji": "🌕"
   },
   {
    "name": "Sesame nori",
    "emoji": "🟩"
   },
   {
    "name": "Warm rice",
    "emoji": "🍚"
   }
  ],
  "sauce": "The yolk is the sauce",
  "pairings": [
   "silk-tofu-soup",
   "cucumber-smash"
  ],
  "best": true,
  "chef": true,
  "featured": true,
  "soldOut": false,
  "art": "riceBowl",
  "skin": "#d9b88c",
  "accent": "#f59e1f",
  "glow": "#6b4214",
  "img": "beef-yolk-bowl.png"
 },
 {
  "id": "lobster-dumpling",
  "name": "Butter-Poached Lobster Dumplings",
  "cn": "龙虾饺",
  "section": "Chef Specials",
  "price": 22.0,
  "pieces": 4,
  "flavor": "Maine lobster poached in scallion butter, wrapped in beet-blushed skin.",
  "story": "This week only. The lobster arrives alive at seven; by noon it's the best thing on the menu.",
  "kcal": 420,
  "protein": 26,
  "carbs": 36,
  "fat": 19,
  "spice": 0,
  "meat": "shrimp",
  "veg": false,
  "allergens": [
   "Gluten",
   "Shellfish",
   "Dairy"
  ],
  "ingredients": [
   {
    "name": "Maine lobster",
    "emoji": "🦞"
   },
   {
    "name": "Scallion butter",
    "emoji": "🧈"
   },
   {
    "name": "Beet wrapper",
    "emoji": "🌸"
   }
  ],
  "sauce": "Champagne vinegar pearl",
  "pairings": [
   "garlic-greens",
   "jasmine-panna-cotta"
  ],
  "best": false,
  "chef": true,
  "featured": true,
  "soldOut": false,
  "art": "pleatedDumpling",
  "skin": "#f0b8b2",
  "accent": "#e66b52",
  "glow": "#6b2e24",
  "img": null
 },
 {
  "id": "duck-dumpling",
  "name": "Tea-Smoked Duck Dumplings",
  "cn": "樟茶鸭饺",
  "section": "Chef Specials",
  "price": 18.0,
  "pieces": 5,
  "flavor": "Lapsang-smoked duck with hoisin and crisp skin crumble — Peking duck, folded.",
  "story": "Chef Lin's love letter to Beijing. The duck smokes over jasmine tea leaves and applewood for six hours.",
  "kcal": 510,
  "protein": 27,
  "carbs": 40,
  "fat": 26,
  "spice": 1,
  "meat": "beef",
  "veg": false,
  "allergens": [
   "Gluten",
   "Soy"
  ],
  "ingredients": [
   {
    "name": "Tea-smoked duck",
    "emoji": "🦆"
   },
   {
    "name": "Hoisin",
    "emoji": "🫙"
   },
   {
    "name": "Crisp skin crumble",
    "emoji": "✨"
   }
  ],
  "sauce": "Mandarin hoisin",
  "pairings": [
   "baby-bok-choy",
   "silk-tofu-soup"
  ],
  "best": false,
  "chef": true,
  "featured": false,
  "soldOut": false,
  "art": "pleatedDumpling",
  "skin": "#d19e70",
  "accent": "#733d24",
  "glow": "#522e14",
  "img": null
 }
];
