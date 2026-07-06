import Foundation

/// The Dumpling Lab menu. Single source of truth for every screen and the host AI.
enum Menu {
    static let all: [Dish] = signature + panFried + wontons + soupDumplings + noodles
        + friedRice + soups + sides + vegetables + desserts + specials

    static func dish(_ id: String) -> Dish? { all.first { $0.id == id } }

    static func section(_ s: MenuSection) -> [Dish] { all.filter { $0.section == s } }

    static var featured: [Dish] { all.filter(\.isFeatured) }

    // MARK: Signature Dumplings

    static let signature: [Dish] = [
        Dish(
            id: "black-pork-panfried",
            name: "Black Pork Pan Fried Dumplings",
            chineseName: "黑豚煎饺",
            section: .signatureDumplings,
            price: 14.5, pieces: 6,
            flavor: "Deep, sweet Berkshire pork with charred cabbage and a whisper of white pepper — under a shattering golden crust.",
            story: "Chef Lin spent two years on this filling. The pork is hand-chopped, never ground, so each bite keeps its bounce. The lace crust is poured tableside in the kitchen's imagination — a flour slurry that fries into glass.",
            nutrition: .init(calories: 580, protein: 26, carbs: 48, fat: 31),
            spice: .none,
            allergens: [.gluten, .soybean, .sesame],
            proteinType: .pork,
            ingredients: [
                .init(name: "Berkshire pork", emoji: "🥩"),
                .init(name: "Charred cabbage", emoji: "🥬"),
                .init(name: "Ginger", emoji: "🫚"),
                .init(name: "Chive", emoji: "🌿"),
                .init(name: "White pepper", emoji: "✨"),
            ],
            recommendedSauce: "Black vinegar & young ginger",
            pairings: ["cucumber-smash", "hot-sour-soup", "jasmine-panna-cotta"],
            isBestSeller: true, isChefsChoice: true, isFeatured: true,
            art: .pleatedDumplingCrisped,
            palette: .init(skin: (0.93, 0.82, 0.62), accent: (0.62, 0.38, 0.22), glow: (0.36, 0.24, 0.15))
        ),
        Dish(
            id: "chicken-corn",
            name: "Chicken & Sweet Corn Dumplings",
            chineseName: "鸡肉玉米饺",
            section: .signatureDumplings,
            price: 12.5, pieces: 6,
            flavor: "Bright, gently sweet, and impossibly juicy — summer corn folded into free-range chicken.",
            story: "A staff-meal experiment that never left the menu. The corn is cut fresh each morning; its milk binds the filling with no starch at all.",
            nutrition: .init(calories: 430, protein: 28, carbs: 44, fat: 15),
            spice: .none,
            allergens: [.gluten, .soybean],
            proteinType: .chicken,
            ingredients: [
                .init(name: "Free-range chicken", emoji: "🍗"),
                .init(name: "Sweet corn", emoji: "🌽"),
                .init(name: "Scallion", emoji: "🌿"),
                .init(name: "Shaoxing wine", emoji: "🍶"),
            ],
            recommendedSauce: "Light soy & scallion oil",
            pairings: ["chicken-broth", "garlic-greens"],
            isBestSeller: true, isFeatured: true,
            art: .pleatedDumpling,
            palette: .init(skin: (0.97, 0.92, 0.78), accent: (0.95, 0.78, 0.30), glow: (0.42, 0.32, 0.14))
        ),
        Dish(
            id: "sichuan-chili",
            name: "Sichuan Chili Dumplings",
            chineseName: "红油抄手",
            section: .signatureDumplings,
            price: 13, pieces: 8,
            flavor: "Silken pork dumplings drowned — happily — in fragrant chili oil, Sichuan pepper, and black vinegar.",
            story: "The chili oil steeps for three days with cassia and star anise. It should tingle, then hum, then make you order rice.",
            nutrition: .init(calories: 520, protein: 22, carbs: 42, fat: 29),
            spice: .hot,
            allergens: [.gluten, .soybean, .sesame, .peanut],
            proteinType: .pork,
            ingredients: [
                .init(name: "Pork shoulder", emoji: "🥩"),
                .init(name: "Three-day chili oil", emoji: "🌶️"),
                .init(name: "Sichuan pepper", emoji: "🔥"),
                .init(name: "Black vinegar", emoji: "🍶"),
                .init(name: "Crushed peanut", emoji: "🥜"),
            ],
            recommendedSauce: "Already dressed — bring rice",
            pairings: ["cucumber-smash", "egg-fried-rice", "mango-sago"],
            isBestSeller: true, isFeatured: true,
            art: .pleatedDumpling,
            palette: .init(skin: (0.94, 0.87, 0.72), accent: (0.72, 0.18, 0.12), glow: (0.40, 0.12, 0.08))
        ),
        Dish(
            id: "mushroom-truffle",
            name: "Wild Mushroom & Truffle Dumplings",
            chineseName: "松露野菌饺",
            section: .signatureDumplings,
            price: 15, pieces: 6,
            flavor: "Five mushrooms, brown butter, and a breath of black truffle inside a spinach-jade wrapper.",
            story: "Our vegetarian flagship. The mushrooms are roasted until they give up every drop of water, then folded warm so the wrapper takes their perfume.",
            nutrition: .init(calories: 390, protein: 12, carbs: 46, fat: 17),
            spice: .none,
            allergens: [.gluten, .dairy],
            proteinType: .vegetarian,
            ingredients: [
                .init(name: "Five wild mushrooms", emoji: "🍄"),
                .init(name: "Black truffle", emoji: "⚫"),
                .init(name: "Brown butter", emoji: "🧈"),
                .init(name: "Spinach wrapper", emoji: "🥬"),
            ],
            recommendedSauce: "Aged soy pearls",
            pairings: ["garlic-greens", "silk-tofu-soup"],
            isChefsChoice: true, isFeatured: true,
            art: .pleatedDumpling,
            palette: .init(skin: (0.72, 0.80, 0.62), accent: (0.42, 0.32, 0.24), glow: (0.20, 0.28, 0.16))
        ),
    ]

    // MARK: Pan Fried

    static let panFried: [Dish] = [
        Dish(
            id: "chicken-gyoza",
            name: "Japanese Chicken Gyoza",
            chineseName: "鸡肉煎饺",
            section: .panFried,
            price: 11.5, pieces: 6,
            flavor: "Thin-skinned, garlicky, seared hard on one side and steamed soft on the other.",
            story: "A bow to our sister izakaya in Osaka. The wrappers are rolled to 0.8 millimeters — thin enough to read a menu through.",
            nutrition: .init(calories: 410, protein: 24, carbs: 40, fat: 16),
            spice: .mild,
            allergens: [.gluten, .soybean, .sesame],
            proteinType: .chicken,
            ingredients: [
                .init(name: "Chicken thigh", emoji: "🍗"),
                .init(name: "Garlic chive", emoji: "🌿"),
                .init(name: "Ginger", emoji: "🫚"),
                .init(name: "Sesame oil", emoji: "🫗"),
            ],
            recommendedSauce: "Yuzu ponzu",
            pairings: ["chicken-ramen", "cucumber-smash"],
            isBestSeller: true, isFeatured: true,
            art: .pleatedDumplingCrisped,
            palette: .init(skin: (0.95, 0.88, 0.72), accent: (0.80, 0.58, 0.30), glow: (0.34, 0.26, 0.14))
        ),
        Dish(
            id: "beef-scallion-panfried",
            name: "Beef & Charred Scallion Pan Fried",
            chineseName: "葱香牛肉锅贴",
            section: .panFried,
            price: 13.5, pieces: 6,
            flavor: "Rich short-rib beef sweetened with scallions blistered over open flame.",
            story: "The scallions go over the binchotan until their edges blacken. That smoke is the whole dish.",
            nutrition: .init(calories: 560, protein: 27, carbs: 46, fat: 29),
            spice: .mild,
            allergens: [.gluten, .soybean],
            proteinType: .beef,
            ingredients: [
                .init(name: "Short rib", emoji: "🥩"),
                .init(name: "Charred scallion", emoji: "🌿"),
                .init(name: "Toasted cumin", emoji: "✨"),
            ],
            recommendedSauce: "Chili crisp & vinegar",
            pairings: ["hot-sour-soup", "smacked-eggplant"],
            art: .pleatedDumplingCrisped,
            palette: .init(skin: (0.91, 0.80, 0.60), accent: (0.48, 0.30, 0.20), glow: (0.30, 0.20, 0.12))
        ),
        Dish(
            id: "veggie-potsticker",
            name: "Garden Potstickers",
            chineseName: "素锅贴",
            section: .panFried,
            price: 10.5, pieces: 6,
            flavor: "Cabbage, glass noodle, shiitake, and egg — the classic, crisped.",
            story: "Grandmother Wei's recipe, unchanged since the first Dumpling Lab. We tried to improve it once. We apologized.",
            nutrition: .init(calories: 370, protein: 11, carbs: 48, fat: 14),
            spice: .none,
            allergens: [.gluten, .soybean, .egg, .sesame],
            proteinType: .vegetarian,
            ingredients: [
                .init(name: "Napa cabbage", emoji: "🥬"),
                .init(name: "Shiitake", emoji: "🍄"),
                .init(name: "Glass noodle", emoji: "🍜"),
                .init(name: "Egg", emoji: "🥚"),
            ],
            recommendedSauce: "Black vinegar & chili crisp",
            pairings: ["silk-tofu-soup", "garlic-greens"],
            art: .pleatedDumplingCrisped,
            palette: .init(skin: (0.94, 0.89, 0.74), accent: (0.55, 0.62, 0.38), glow: (0.28, 0.30, 0.15))
        ),
    ]

    // MARK: Wontons

    static let wontons: [Dish] = [
        Dish(
            id: "shrimp-wonton",
            name: "Shrimp Wontons in Golden Broth",
            chineseName: "鲜虾云吞",
            section: .wontons,
            price: 13.5, pieces: 8,
            flavor: "Whole tiger prawns in silk wrappers, floating in a broth clarified to amber glass.",
            story: "The broth starts at 5 a.m. — chicken frames, pork bone, dried flounder — and is rafted clear like consommé. You can read the bottom of the bowl.",
            nutrition: .init(calories: 380, protein: 24, carbs: 38, fat: 12),
            spice: .none,
            allergens: [.gluten, .shellfish, .egg],
            proteinType: .shrimp,
            ingredients: [
                .init(name: "Tiger prawn", emoji: "🦐"),
                .init(name: "Golden broth", emoji: "🥣"),
                .init(name: "Yellow chive", emoji: "🌿"),
                .init(name: "Flounder dust", emoji: "🐟"),
            ],
            recommendedSauce: "A drop of red vinegar",
            pairings: ["garlic-greens", "egg-fried-rice"],
            isBestSeller: true, isFeatured: true,
            art: .wonton,
            palette: .init(skin: (0.98, 0.90, 0.76), accent: (0.95, 0.60, 0.45), glow: (0.45, 0.30, 0.12))
        ),
        Dish(
            id: "pork-chive-wonton",
            name: "Pork & Chive Wontons",
            chineseName: "韭菜猪肉云吞",
            section: .wontons,
            price: 11.5, pieces: 8,
            flavor: "The comfort classic — juicy, green-flecked, endless.",
            story: "Folded at the window bar every afternoon at four. Regulars set their watches by it.",
            nutrition: .init(calories: 420, protein: 21, carbs: 40, fat: 18),
            spice: .none,
            allergens: [.gluten, .soybean, .egg],
            proteinType: .pork,
            ingredients: [
                .init(name: "Pork belly & loin", emoji: "🥩"),
                .init(name: "Chinese chive", emoji: "🌿"),
                .init(name: "Ginger water", emoji: "🫚"),
            ],
            recommendedSauce: "Scallion oil",
            pairings: ["hot-sour-soup", "cucumber-smash"],
            art: .wonton,
            palette: .init(skin: (0.97, 0.91, 0.78), accent: (0.50, 0.60, 0.35), glow: (0.36, 0.28, 0.14))
        ),
    ]

    // MARK: Soup Dumplings

    static let soupDumplings: [Dish] = [
        Dish(
            id: "pork-xlb",
            name: "Pork Soup Dumplings",
            chineseName: "小笼包",
            section: .soupDumplings,
            price: 13, pieces: 6,
            flavor: "Eighteen pleats around a spoonful of hot pork consommé. Bite, sip, then eat.",
            story: "The soup is a jellied stock folded in cold; steam melts it back to broth. Six minutes, not seven — the timer is sacred.",
            nutrition: .init(calories: 450, protein: 22, carbs: 42, fat: 21),
            spice: .none,
            allergens: [.gluten, .soybean],
            proteinType: .pork,
            ingredients: [
                .init(name: "Pork", emoji: "🥩"),
                .init(name: "Jellied consommé", emoji: "✨"),
                .init(name: "Young ginger", emoji: "🫚"),
            ],
            recommendedSauce: "Black vinegar & ginger threads",
            pairings: ["garlic-greens", "jasmine-panna-cotta"],
            isBestSeller: true, isChefsChoice: true, isFeatured: true,
            art: .soupDumpling,
            palette: .init(skin: (0.96, 0.90, 0.79), accent: (0.85, 0.66, 0.45), glow: (0.40, 0.28, 0.14))
        ),
        Dish(
            id: "crab-pork-xlb",
            name: "Crab & Pork Soup Dumplings",
            chineseName: "蟹粉小笼包",
            section: .soupDumplings,
            price: 16.5, pieces: 6,
            flavor: "Sweet crab and golden roe fold into the broth — richer, rounder, unforgettable.",
            story: "We pick the crab by hand every morning. On days the crab isn't right, this dish simply isn't served.",
            nutrition: .init(calories: 480, protein: 24, carbs: 42, fat: 23),
            spice: .none,
            allergens: [.gluten, .shellfish, .soybean],
            proteinType: .shrimp,
            ingredients: [
                .init(name: "Hand-picked crab", emoji: "🦀"),
                .init(name: "Crab roe", emoji: "🟠"),
                .init(name: "Pork", emoji: "🥩"),
            ],
            recommendedSauce: "Black vinegar & ginger threads",
            pairings: ["garlic-greens", "silk-tofu-soup"],
            isChefsChoice: true,
            art: .soupDumpling,
            palette: .init(skin: (0.97, 0.90, 0.76), accent: (0.94, 0.62, 0.28), glow: (0.44, 0.28, 0.10))
        ),
    ]

    // MARK: Noodles

    static let noodles: [Dish] = [
        Dish(
            id: "chicken-ramen",
            name: "Chicken Ramen",
            chineseName: "鸡汤拉面",
            section: .noodles,
            price: 15.5, pieces: nil,
            flavor: "Paitan broth blended to silk, hand-pulled noodles, chashu-style chicken, and a six-minute egg.",
            story: "Twelve hours of simmering collapses the whole bird into cream. The noodles are pulled to order — you can hear the slap from the dining room.",
            nutrition: .init(calories: 640, protein: 38, carbs: 62, fat: 24),
            spice: .mild,
            allergens: [.gluten, .egg, .sesame],
            proteinType: .chicken,
            ingredients: [
                .init(name: "12-hour paitan", emoji: "🥣"),
                .init(name: "Hand-pulled noodles", emoji: "🍜"),
                .init(name: "Chicken chashu", emoji: "🍗"),
                .init(name: "Six-minute egg", emoji: "🥚"),
            ],
            recommendedSauce: "Chili oil, if you dare",
            pairings: ["chicken-gyoza", "cucumber-smash"],
            isBestSeller: true, isFeatured: true,
            art: .noodleBowl,
            palette: .init(skin: (0.96, 0.88, 0.70), accent: (0.90, 0.72, 0.40), glow: (0.42, 0.30, 0.12))
        ),
        Dish(
            id: "dan-dan",
            name: "Dan Dan Noodles",
            chineseName: "担担面",
            section: .noodles,
            price: 13.5, pieces: nil,
            flavor: "Sesame, chili, crispy pork, and a slow Sichuan-pepper hum under springy noodles.",
            story: "Mix twelve times before the first bite — chef counts, and yes, she's watching.",
            nutrition: .init(calories: 610, protein: 25, carbs: 64, fat: 28),
            spice: .hot,
            allergens: [.gluten, .sesame, .peanut, .soybean],
            proteinType: .pork,
            ingredients: [
                .init(name: "Sesame paste", emoji: "🫙"),
                .init(name: "Chili oil", emoji: "🌶️"),
                .init(name: "Crispy pork", emoji: "🥓"),
                .init(name: "Ya cai", emoji: "🥬"),
            ],
            recommendedSauce: "Already dressed",
            pairings: ["cucumber-smash", "mango-sago"],
            art: .noodleBowl,
            palette: .init(skin: (0.93, 0.82, 0.60), accent: (0.70, 0.20, 0.12), glow: (0.36, 0.14, 0.08))
        ),
        Dish(
            id: "scallion-oil-noodles",
            name: "Scallion Oil Noodles",
            chineseName: "葱油拌面",
            section: .noodles,
            price: 11, pieces: nil,
            flavor: "Four ingredients. Scallions fried to mahogany, sweet soy, thin noodles, patience.",
            story: "Shanghai's quietest masterpiece. We fry the scallions for forty minutes over the lowest possible flame.",
            nutrition: .init(calories: 480, protein: 12, carbs: 68, fat: 18),
            spice: .none,
            allergens: [.gluten, .soybean],
            proteinType: .vegan,
            ingredients: [
                .init(name: "Mahogany scallions", emoji: "🌿"),
                .init(name: "Sweet soy", emoji: "🍶"),
                .init(name: "Thin wheat noodles", emoji: "🍜"),
            ],
            recommendedSauce: "Nothing. Trust it.",
            pairings: ["veggie-potsticker", "garlic-greens"],
            art: .noodleBowl,
            palette: .init(skin: (0.92, 0.84, 0.64), accent: (0.45, 0.52, 0.28), glow: (0.32, 0.26, 0.10))
        ),
    ]

    // MARK: Fried Rice

    static let friedRice: [Dish] = [
        Dish(
            id: "egg-fried-rice",
            name: "Golden Egg Fried Rice",
            chineseName: "黄金蛋炒饭",
            section: .friedRice,
            price: 12, pieces: nil,
            flavor: "Every grain gilded in yolk before it meets the wok. Smoky, loose, luminous.",
            story: "Day-old jasmine rice, separated grain by grain, coated in raw yolk so each one fries in its own golden jacket.",
            nutrition: .init(calories: 520, protein: 16, carbs: 70, fat: 19),
            spice: .none,
            allergens: [.egg, .soybean],
            proteinType: .vegetarian,
            ingredients: [
                .init(name: "Day-old jasmine rice", emoji: "🍚"),
                .init(name: "Egg yolk", emoji: "🥚"),
                .init(name: "Scallion", emoji: "🌿"),
                .init(name: "Wok smoke", emoji: "💨"),
            ],
            recommendedSauce: "White pepper on top",
            pairings: ["sichuan-chili", "hot-sour-soup"],
            isBestSeller: true, isFeatured: true,
            art: .riceBowl,
            palette: .init(skin: (0.97, 0.87, 0.55), accent: (0.94, 0.70, 0.25), glow: (0.45, 0.34, 0.10))
        ),
        Dish(
            id: "shrimp-fried-rice",
            name: "Shrimp & XO Fried Rice",
            chineseName: "XO虾仁炒饭",
            section: .friedRice,
            price: 15.5, pieces: nil,
            flavor: "Sweet prawns, house XO sauce, and enough wok hei to fog your glasses.",
            story: "The XO is made in-house each month — dried scallop, ham, and chilies reduced to umami gravel.",
            nutrition: .init(calories: 590, protein: 26, carbs: 68, fat: 23),
            spice: .medium,
            allergens: [.shellfish, .egg, .soybean],
            proteinType: .shrimp,
            ingredients: [
                .init(name: "Tiger prawn", emoji: "🦐"),
                .init(name: "House XO", emoji: "🫙"),
                .init(name: "Jasmine rice", emoji: "🍚"),
            ],
            recommendedSauce: "It brought its own",
            pairings: ["garlic-greens", "silk-tofu-soup"],
            art: .riceBowl,
            palette: .init(skin: (0.96, 0.86, 0.58), accent: (0.92, 0.52, 0.35), glow: (0.42, 0.24, 0.10))
        ),
    ]

    // MARK: Soups

    static let soups: [Dish] = [
        Dish(
            id: "hot-sour-soup",
            name: "Hot & Sour Soup",
            chineseName: "酸辣汤",
            section: .soups,
            price: 8.5, pieces: nil,
            flavor: "Black vinegar bite, white pepper heat, silk tofu, wood ear — the wake-up call.",
            story: "Thickened to exactly the weight of velvet. The pepper goes in off the heat so it stings, not burns.",
            nutrition: .init(calories: 210, protein: 10, carbs: 22, fat: 9),
            spice: .medium,
            allergens: [.gluten, .soybean, .egg],
            proteinType: .vegetarian,
            ingredients: [
                .init(name: "Black vinegar", emoji: "🍶"),
                .init(name: "White pepper", emoji: "✨"),
                .init(name: "Silk tofu", emoji: "🧊"),
                .init(name: "Wood ear", emoji: "🍄"),
            ],
            recommendedSauce: nil,
            pairings: ["black-pork-panfried", "egg-fried-rice"],
            art: .soupBowl,
            palette: .init(skin: (0.62, 0.40, 0.24), accent: (0.85, 0.55, 0.30), glow: (0.30, 0.18, 0.08))
        ),
        Dish(
            id: "chicken-broth",
            name: "Old Hen Chicken Soup",
            chineseName: "老母鸡汤",
            section: .soups,
            price: 9.5, pieces: nil,
            flavor: "Clear, deep, restorative. Goji, jujube, and a whole afternoon of simmering.",
            story: "The pot never boils — it shivers. Four hours later the broth tastes like being taken care of.",
            nutrition: .init(calories: 180, protein: 18, carbs: 8, fat: 8),
            spice: .none,
            allergens: [],
            proteinType: .chicken,
            ingredients: [
                .init(name: "Old hen", emoji: "🍗"),
                .init(name: "Goji berry", emoji: "🔴"),
                .init(name: "Jujube", emoji: "🟤"),
                .init(name: "Ginger", emoji: "🫚"),
            ],
            recommendedSauce: nil,
            pairings: ["chicken-corn", "garlic-greens"],
            isFeatured: true,
            art: .soupBowl,
            palette: .init(skin: (0.95, 0.83, 0.55), accent: (0.85, 0.40, 0.25), glow: (0.42, 0.30, 0.12))
        ),
        Dish(
            id: "fish-tofu-soup",
            name: "Milky Fish & Tofu Soup",
            chineseName: "鱼头豆腐汤",
            section: .soups,
            price: 11.5, pieces: nil,
            flavor: "Seared fish blasted with boiling water until the broth turns white as jade.",
            story: "The sear is the secret — protein and fat emulsify into that famous milky cloud. No dairy, only physics.",
            nutrition: .init(calories: 260, protein: 24, carbs: 10, fat: 13),
            spice: .none,
            allergens: [.soybean],
            proteinType: .fish,
            ingredients: [
                .init(name: "Seared white fish", emoji: "🐟"),
                .init(name: "Silken tofu", emoji: "🧊"),
                .init(name: "White pepper", emoji: "✨"),
            ],
            recommendedSauce: nil,
            pairings: ["sichuan-chili", "garlic-greens"],
            art: .soupBowl,
            palette: .init(skin: (0.94, 0.92, 0.86), accent: (0.75, 0.80, 0.72), glow: (0.34, 0.32, 0.24))
        ),
        Dish(
            id: "silk-tofu-soup",
            name: "Silk Tofu & Seaweed Soup",
            chineseName: "紫菜豆腐汤",
            section: .soups,
            price: 7.5, pieces: nil,
            flavor: "Light as air — kombu broth, silken tofu, a scatter of sesame.",
            story: "The palate cleanser of the menu. Order it between rounds of dumplings, like a comma.",
            nutrition: .init(calories: 120, protein: 9, carbs: 8, fat: 5),
            spice: .none,
            allergens: [.soybean, .sesame],
            proteinType: .vegan,
            ingredients: [
                .init(name: "Kombu broth", emoji: "🌊"),
                .init(name: "Silken tofu", emoji: "🧊"),
                .init(name: "Nori", emoji: "🟩"),
            ],
            recommendedSauce: nil,
            pairings: ["mushroom-truffle", "veggie-potsticker"],
            art: .soupBowl,
            palette: .init(skin: (0.88, 0.90, 0.84), accent: (0.35, 0.45, 0.38), glow: (0.24, 0.30, 0.22))
        ),
    ]

    // MARK: Side Dishes

    static let sides: [Dish] = [
        Dish(
            id: "cucumber-smash",
            name: "Smashed Cucumber",
            chineseName: "拍黄瓜",
            section: .sides,
            price: 7, pieces: nil,
            flavor: "Cold, crackling, garlic-heavy — dressed in vinegar and a thread of chili oil.",
            story: "Smashed, never sliced. The rough edges drink the dressing.",
            nutrition: .init(calories: 90, protein: 3, carbs: 10, fat: 5),
            spice: .mild,
            allergens: [.soybean, .sesame],
            proteinType: .vegan,
            ingredients: [
                .init(name: "Persian cucumber", emoji: "🥒"),
                .init(name: "Raw garlic", emoji: "🧄"),
                .init(name: "Chinkiang vinegar", emoji: "🍶"),
            ],
            recommendedSauce: nil,
            pairings: ["sichuan-chili", "dan-dan"],
            isBestSeller: true,
            art: .sidePlate,
            palette: .init(skin: (0.55, 0.68, 0.40), accent: (0.80, 0.30, 0.20), glow: (0.24, 0.32, 0.14))
        ),
        Dish(
            id: "crispy-chicken-bites",
            name: "Five-Spice Crispy Chicken",
            chineseName: "五香脆鸡",
            section: .sides,
            price: 10.5, pieces: nil,
            flavor: "Lacquered, shattering bites dusted with five-spice salt and fried basil.",
            story: "Brined overnight in soy and rock sugar, fried twice, rested once, gone in minutes.",
            nutrition: .init(calories: 440, protein: 28, carbs: 24, fat: 26),
            spice: .mild,
            allergens: [.gluten, .soybean],
            proteinType: .chicken,
            ingredients: [
                .init(name: "Chicken thigh", emoji: "🍗"),
                .init(name: "Five-spice salt", emoji: "✨"),
                .init(name: "Fried basil", emoji: "🌿"),
            ],
            recommendedSauce: "Plum dust mayo",
            pairings: ["egg-fried-rice", "cucumber-smash"],
            art: .sidePlate,
            palette: .init(skin: (0.88, 0.66, 0.34), accent: (0.55, 0.35, 0.15), glow: (0.38, 0.24, 0.08))
        ),
        Dish(
            id: "smacked-eggplant",
            name: "Smacked Eggplant",
            chineseName: "手撕茄子",
            section: .sides,
            price: 9, pieces: nil,
            flavor: "Steamed, torn, and doused in garlic-soy dressing — velvet with a spine.",
            story: "Torn by hand so the flesh stays cloudlike. The dressing pools in every ridge.",
            nutrition: .init(calories: 160, protein: 4, carbs: 18, fat: 9),
            spice: .mild,
            allergens: [.soybean, .sesame],
            proteinType: .vegan,
            ingredients: [
                .init(name: "Chinese eggplant", emoji: "🍆"),
                .init(name: "Garlic-soy", emoji: "🧄"),
                .init(name: "Cilantro", emoji: "🌿"),
            ],
            recommendedSauce: nil,
            pairings: ["scallion-oil-noodles", "egg-fried-rice"],
            art: .sidePlate,
            palette: .init(skin: (0.45, 0.30, 0.48), accent: (0.60, 0.66, 0.40), glow: (0.24, 0.14, 0.24))
        ),
    ]

    // MARK: Vegetables

    static let vegetables: [Dish] = [
        Dish(
            id: "garlic-greens",
            name: "Wok-Kissed Garlic Greens",
            chineseName: "蒜蓉时蔬",
            section: .vegetables,
            price: 9.5, pieces: nil,
            flavor: "Whatever the market gave us this morning, flashed with garlic in a screaming wok.",
            story: "Thirty seconds of violence, then straight to the plate. Green things should still remember the field.",
            nutrition: .init(calories: 110, protein: 5, carbs: 9, fat: 7),
            spice: .none,
            allergens: [.soybean],
            proteinType: .vegan,
            ingredients: [
                .init(name: "Market greens", emoji: "🥬"),
                .init(name: "Garlic", emoji: "🧄"),
                .init(name: "Wok breath", emoji: "💨"),
            ],
            recommendedSauce: nil,
            pairings: ["pork-xlb", "shrimp-wonton"],
            art: .greens,
            palette: .init(skin: (0.42, 0.58, 0.34), accent: (0.90, 0.88, 0.78), glow: (0.18, 0.28, 0.12))
        ),
        Dish(
            id: "blistered-beans",
            name: "Blistered Green Beans",
            chineseName: "干煸四季豆",
            section: .vegetables,
            price: 10, pieces: nil,
            flavor: "Wrinkled, smoky beans tossed with preserved vegetable and a little pork crumble.",
            story: "Dry-fried until the skins pucker like crepe paper. Ask for them vegetarian — the wok won't mind.",
            nutrition: .init(calories: 220, protein: 8, carbs: 16, fat: 14),
            spice: .medium,
            allergens: [.soybean],
            proteinType: .pork,
            ingredients: [
                .init(name: "Green beans", emoji: "🫛"),
                .init(name: "Ya cai", emoji: "🥬"),
                .init(name: "Pork crumble", emoji: "🥓"),
                .init(name: "Dried chili", emoji: "🌶️"),
            ],
            recommendedSauce: nil,
            pairings: ["egg-fried-rice", "chicken-broth"],
            art: .greens,
            palette: .init(skin: (0.38, 0.50, 0.28), accent: (0.72, 0.24, 0.14), glow: (0.16, 0.24, 0.10))
        ),
        Dish(
            id: "baby-bok-choy",
            name: "Baby Bok Choy, Golden Broth",
            chineseName: "上汤娃娃菜",
            section: .vegetables,
            price: 10.5, pieces: nil,
            flavor: "Tender hearts poached in superior stock with goji and garlic confit.",
            story: "The gentlest thing we make. The stock does the seasoning; the bok choy does the rest.",
            nutrition: .init(calories: 130, protein: 6, carbs: 10, fat: 7),
            spice: .none,
            allergens: [],
            proteinType: .chicken,
            ingredients: [
                .init(name: "Baby bok choy", emoji: "🥬"),
                .init(name: "Superior stock", emoji: "🥣"),
                .init(name: "Garlic confit", emoji: "🧄"),
                .init(name: "Goji", emoji: "🔴"),
            ],
            recommendedSauce: nil,
            pairings: ["crab-pork-xlb", "pork-xlb"],
            art: .greens,
            palette: .init(skin: (0.55, 0.68, 0.42), accent: (0.95, 0.85, 0.55), glow: (0.24, 0.30, 0.12))
        ),
    ]

    // MARK: Desserts

    static let desserts: [Dish] = [
        Dish(
            id: "mango-sago",
            name: "Mango Sago Cloud",
            chineseName: "杨枝甘露",
            section: .desserts,
            price: 8.5, pieces: nil,
            flavor: "Chilled mango cream, pomelo pearls that pop, sago like tiny moons.",
            story: "Made with Ataulfo mangoes at peak ripeness — we freeze the season so December tastes like June.",
            nutrition: .init(calories: 290, protein: 4, carbs: 52, fat: 8),
            spice: .none,
            allergens: [.dairy],
            proteinType: .vegetarian,
            ingredients: [
                .init(name: "Ataulfo mango", emoji: "🥭"),
                .init(name: "Pomelo", emoji: "🍊"),
                .init(name: "Sago pearls", emoji: "⚪"),
                .init(name: "Coconut cream", emoji: "🥥"),
            ],
            recommendedSauce: nil,
            pairings: ["sichuan-chili", "dan-dan"],
            isBestSeller: true, isFeatured: true,
            art: .dessertCup,
            palette: .init(skin: (0.98, 0.80, 0.36), accent: (0.99, 0.92, 0.75), glow: (0.48, 0.34, 0.10))
        ),
        Dish(
            id: "jasmine-panna-cotta",
            name: "Jasmine Tea Panna Cotta",
            chineseName: "茉莉花茶奶冻",
            section: .desserts,
            price: 9, pieces: nil,
            flavor: "A trembling cream infused with jasmine pearls, under a whisper of osmanthus honey.",
            story: "Set so lightly it barely survives the walk from the kitchen. Eat it before it loses its nerve.",
            nutrition: .init(calories: 310, protein: 5, carbs: 30, fat: 19),
            spice: .none,
            allergens: [.dairy],
            proteinType: .vegetarian,
            ingredients: [
                .init(name: "Jasmine pearls", emoji: "🍵"),
                .init(name: "Cream", emoji: "🥛"),
                .init(name: "Osmanthus honey", emoji: "🍯"),
            ],
            recommendedSauce: nil,
            pairings: ["black-pork-panfried", "pork-xlb"],
            art: .dessertCup,
            palette: .init(skin: (0.97, 0.94, 0.86), accent: (0.92, 0.75, 0.40), glow: (0.40, 0.34, 0.20))
        ),
        Dish(
            id: "sesame-tang-yuan",
            name: "Black Sesame Tang Yuan",
            chineseName: "黑芝麻汤圆",
            section: .desserts,
            price: 8, pieces: 4,
            flavor: "Chewy rice moons that burst with molten black sesame, in warm ginger syrup.",
            story: "The filling is ground in a stone mill until it flows like ink. Served warm, always.",
            nutrition: .init(calories: 340, protein: 6, carbs: 56, fat: 11),
            spice: .none,
            allergens: [.sesame],
            proteinType: .vegan,
            ingredients: [
                .init(name: "Black sesame", emoji: "⚫"),
                .init(name: "Glutinous rice", emoji: "🍡"),
                .init(name: "Ginger syrup", emoji: "🫚"),
            ],
            recommendedSauce: nil,
            pairings: ["sichuan-chili", "hot-sour-soup"],
            art: .dessertCup,
            palette: .init(skin: (0.94, 0.92, 0.88), accent: (0.18, 0.16, 0.15), glow: (0.30, 0.26, 0.20))
        ),
    ]

    // MARK: Chef Specials

    static let specials: [Dish] = [
        Dish(
            id: "lobster-dumpling",
            name: "Butter-Poached Lobster Dumplings",
            chineseName: "龙虾饺",
            section: .chefSpecials,
            price: 22, pieces: 4,
            flavor: "Maine lobster poached in scallion butter, wrapped in beet-blushed skin.",
            story: "This week only. The lobster arrives alive at seven; by noon it's the best thing on the menu.",
            nutrition: .init(calories: 420, protein: 26, carbs: 36, fat: 19),
            spice: .none,
            allergens: [.gluten, .shellfish, .dairy],
            proteinType: .shrimp,
            ingredients: [
                .init(name: "Maine lobster", emoji: "🦞"),
                .init(name: "Scallion butter", emoji: "🧈"),
                .init(name: "Beet wrapper", emoji: "🌸"),
            ],
            recommendedSauce: "Champagne vinegar pearl",
            pairings: ["garlic-greens", "jasmine-panna-cotta"],
            isChefsChoice: true, isFeatured: true,
            art: .pleatedDumpling,
            palette: .init(skin: (0.94, 0.72, 0.70), accent: (0.90, 0.42, 0.32), glow: (0.42, 0.18, 0.14))
        ),
        Dish(
            id: "duck-dumpling",
            name: "Tea-Smoked Duck Dumplings",
            chineseName: "樟茶鸭饺",
            section: .chefSpecials,
            price: 18, pieces: 5,
            flavor: "Lapsang-smoked duck with hoisin and crisp skin crumble — Peking duck, folded.",
            story: "Chef Lin's love letter to Beijing. The duck smokes over jasmine tea leaves and applewood for six hours.",
            nutrition: .init(calories: 510, protein: 27, carbs: 40, fat: 26),
            spice: .mild,
            allergens: [.gluten, .soybean],
            proteinType: .beef,
            ingredients: [
                .init(name: "Tea-smoked duck", emoji: "🦆"),
                .init(name: "Hoisin", emoji: "🫙"),
                .init(name: "Crisp skin crumble", emoji: "✨"),
            ],
            recommendedSauce: "Mandarin hoisin",
            pairings: ["baby-bok-choy", "silk-tofu-soup"],
            isChefsChoice: true,
            art: .pleatedDumpling,
            palette: .init(skin: (0.82, 0.62, 0.44), accent: (0.45, 0.24, 0.14), glow: (0.32, 0.18, 0.08))
        ),
    ]
}
