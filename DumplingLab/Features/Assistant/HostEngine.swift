import Foundation

/// The Host — an on-device concierge that knows the menu the way a good
/// maître d' does. It parses intent from natural language and answers
/// with warmth, single dishes, or fully composed meals.
struct HostReply {
    var text: String
    var dishes: [Dish] = []
    var sets: [MealSet] = []
    var followUp: String?
}

enum HostEngine {

    // MARK: Intent

    private struct Intent {
        var spicy = false
        var notSpicy = false
        var vegetarian = false
        var noPork = false
        var onlyChicken = false
        var diet = false
        var highProtein = false
        var forTwo = false
        var sharing = false
        var signature = false
        var dessert = false
        var soup = false
        var noodle = false
        var rice = false
        var dumpling = false
        var seafood = false
        var greeting = false
        var thanks = false
        var surprise = false
        var allergen: Allergen?
    }

    private static func parse(_ raw: String) -> Intent {
        let text = raw.lowercased()
        var i = Intent()
        func has(_ words: String...) -> Bool { words.contains { text.contains($0) } }

        i.greeting = has("hello", "hi ", "hey", "good evening", "good afternoon") || text == "hi"
        i.thanks = has("thank", "thanks")
        i.spicy = has("spicy", "hot ", "heat", "sichuan", "chili", "fire")
        i.notSpicy = has("not spicy", "no spice", "mild", "can't handle spice", "no heat")
        if i.notSpicy { i.spicy = false }
        i.vegetarian = has("vegetarian", "vegan", "no meat", "plant", "veggie")
        i.noPork = has("no pork", "don't eat pork", "dont eat pork", "without pork", "halal", "pork-free")
        i.onlyChicken = has("only eat chicken", "only chicken", "just chicken")
        i.diet = has("diet", "light ", "low cal", "healthy", "watching my weight", "low-cal", "not too heavy")
        i.highProtein = has("protein", "gym", "workout", "muscle", "gains")
        i.forTwo = has("two people", "for two", "for 2", "date", "both of us", "my partner")
        i.sharing = has("share", "sharing", "group", "family", "friends", "table", "party", "everyone")
        i.signature = has("signature", "best", "famous", "must", "recommend", "popular", "what should i", "first time")
        i.dessert = has("dessert", "sweet", "mango", "sesame ball", "after")
        i.soup = has("soup", "broth", "warm", "cold outside", "sick", "under the weather")
        i.noodle = has("noodle", "ramen", "dan dan")
        i.rice = has("rice")
        i.dumpling = has("dumpling", "gyoza", "wonton", "xiao long bao", "xlb", "potsticker")
        i.seafood = has("shrimp", "seafood", "prawn", "lobster", "crab", "fish")
        i.surprise = has("surprise", "chef's choice", "anything", "whatever", "you pick", "you choose")

        if has("gluten") { i.allergen = .gluten }
        if has("peanut") || has("nut allergy") { i.allergen = .peanut }
        if has("shellfish allergy", "allergic to shellfish", "allergic to shrimp") { i.allergen = .shellfish }
        if has("dairy", "lactose") { i.allergen = .dairy }

        return i
    }

    // MARK: Filtering

    private static func pool(for i: Intent) -> [Dish] {
        var dishes = Menu.all
        if i.vegetarian { dishes = dishes.filter(\.isVegetarian) }
        if i.noPork { dishes = dishes.filter { !$0.containsPork } }
        if i.onlyChicken { dishes = dishes.filter { $0.proteinType == .chicken || $0.isVegetarian } }
        if let allergen = i.allergen { dishes = dishes.filter { !$0.allergens.contains(allergen) } }
        if i.notSpicy { dishes = dishes.filter { $0.spice.rawValue <= 1 } }
        return dishes
    }

    private static func top(_ dishes: [Dish], _ n: Int) -> [Dish] {
        Array(
            dishes.sorted {
                ($0.isBestSeller ? 2 : 0) + ($0.isChefsChoice ? 1 : 0) >
                ($1.isBestSeller ? 2 : 0) + ($1.isChefsChoice ? 1 : 0)
            }
            .prefix(n)
        )
    }

    private static func pick(_ dishes: [Dish], section: MenuSection, avoiding used: Set<String>) -> Dish? {
        top(dishes.filter { $0.section == section && !used.contains($0.id) }, 1).first
    }

    /// Compose a balanced meal from a filtered pool: main + vegetable/side + soup (+ dessert).
    private static func composeSet(emoji: String, title: String, subtitle: String, from dishes: [Dish], mains: [MenuSection], dessert: Bool = true) -> MealSet? {
        var used = Set<String>()
        var picked: [Dish] = []
        for section in mains {
            if let d = pick(dishes, section: section, avoiding: used) {
                picked.append(d); used.insert(d.id)
            }
        }
        guard !picked.isEmpty else { return nil }
        for section in [MenuSection.vegetables, .sides] {
            if let d = pick(dishes, section: section, avoiding: used) {
                picked.append(d); used.insert(d.id); break
            }
        }
        if let d = pick(dishes, section: .soups, avoiding: used) { picked.append(d); used.insert(d.id) }
        if dessert, let d = pick(dishes, section: .desserts, avoiding: used) { picked.append(d) }
        return MealSet(emoji: emoji, title: title, subtitle: subtitle, dishes: picked)
    }

    // MARK: Reply

    static func reply(to message: String) -> HostReply {
        let i = parse(message)
        let dishes = pool(for: i)

        // Pure conversation first
        if i.thanks {
            return HostReply(text: "It's a pleasure. I'll be right here if you'd like anything else — the steamer never sleeps.")
        }
        if i.greeting && !i.spicy && !i.vegetarian && !i.signature && !i.sharing && !i.diet && !i.highProtein && !i.dumpling && !i.soup {
            return HostReply(
                text: "Welcome to Dumpling Lab. I'm your host tonight. Tell me how you're feeling — hungry, curious, spicy, gentle — and I'll set the table around it.",
                followUp: "You can say things like “I want something spicy” or “what should two people order?”"
            )
        }

        // Sharing / two people → composed sets
        if i.forTwo || i.sharing {
            var sets: [MealSet] = []
            if let s = composeSet(
                emoji: "👫", title: i.forTwo ? "A Table for Two" : "The Sharing Table",
                subtitle: i.forTwo ? "Built for two people" : "Made to pass around",
                from: dishes,
                mains: [.signatureDumplings, .soupDumplings, .friedRice]
            ) { sets.append(s) }
            if i.sharing, let s = composeSet(
                emoji: "👨‍👩‍👧", title: "The Long Table",
                subtitle: "Four flavors of dumplings and friends",
                from: dishes,
                mains: [.signatureDumplings, .panFried, .wontons, .noodles]
            ) { sets.append(s) }
            return HostReply(
                text: i.forTwo
                    ? "For two, I like a little theater: dumplings to share, one glorious rice, greens for balance, and something sweet to argue over."
                    : "For the table, order wide and shallow — many small joys. Here's how I'd set it.",
                sets: sets,
                followUp: "Tap a set to add the whole spread to your steamer."
            )
        }

        // Diet / high protein
        if i.highProtein {
            let set = composeSet(
                emoji: "💪", title: "The High Protein Set",
                subtitle: "\(dishes.isEmpty ? 0 : 1) of our most protein-dense plates",
                from: dishes.filter { $0.nutrition.protein >= 18 || $0.section == .vegetables },
                mains: [.signatureDumplings, .noodles], dessert: false
            )
            return HostReply(
                text: "Strong choice. These carry the most protein per chopstick — I've kept it lean and kept the flavor.",
                dishes: top(dishes.filter { $0.nutrition.protein >= 24 }, 3),
                sets: set.map { [$0] } ?? [],
                followUp: "Want me to keep it under a calorie number? Just say it."
            )
        }
        if i.diet {
            let light = dishes.filter { $0.nutrition.calories <= 400 }
            let set = composeSet(
                emoji: "🌿", title: "The Light Set",
                subtitle: "Gentle, warm, under 700 kcal",
                from: light, mains: [.wontons], dessert: false
            )
            return HostReply(
                text: "Eating lightly here is easy — steam is our favorite cooking method. These are gentle on the scale and generous everywhere else.",
                dishes: top(light.filter { $0.section != .vegetables }, 3),
                sets: set.map { [$0] } ?? [],
                followUp: "Every dish page shows calories and macros, beautifully — promise."
            )
        }

        // Spicy
        if i.spicy {
            let hot = dishes.filter { $0.spice.rawValue >= 2 }
            let set = composeSet(
                emoji: "🔥", title: "The Spicy Set",
                subtitle: "Heat, then mercy",
                from: dishes, mains: [.signatureDumplings, .noodles]
            ).map { s -> MealSet in
                var s = s
                s.dishes = Array(([hot.first].compactMap { $0 } + s.dishes.filter { $0.spice.rawValue < 2 || $0.id != hot.first?.id }).prefix(4))
                return s
            }
            return HostReply(
                text: "Ah, a heat seeker. Our chili oil steeps for three days — it hums rather than burns. I'd start here, with something cold on the side for mercy.",
                dishes: top(hot, 3),
                sets: set.map { [$0] } ?? [],
                followUp: "The Mango Sago Cloud at the end is the traditional fire extinguisher."
            )
        }

        // Vegetarian / restrictions standalone
        if i.vegetarian {
            let set = composeSet(
                emoji: "🥬", title: "The Garden Set",
                subtitle: "Entirely vegetarian",
                from: dishes, mains: [.signatureDumplings, .panFried, .friedRice]
            )
            return HostReply(
                text: "You're in luck — our vegetarian flagship is the Wild Mushroom & Truffle Dumpling, and it converts carnivores weekly. Here's a whole garden of a meal.",
                dishes: top(dishes.filter { $0.section != .vegetables && $0.section != .desserts }, 3),
                sets: set.map { [$0] } ?? []
            )
        }
        if i.onlyChicken {
            return HostReply(
                text: "A chicken loyalist — respected. The kitchen does beautiful things with a bird.",
                dishes: top(dishes.filter { $0.proteinType == .chicken }, 4),
                followUp: "The Old Hen Chicken Soup with the Chicken & Sweet Corn Dumplings is a quietly perfect pairing."
            )
        }
        if i.noPork {
            return HostReply(
                text: "Of course — no pork anywhere on these. Plenty of joy left over, I assure you.",
                dishes: top(dishes.filter { $0.section.rawValue.contains("Dumpling") || $0.section == .wontons || $0.section == .panFried || $0.section == .noodles }, 4)
            )
        }
        if let allergen = i.allergen {
            return HostReply(
                text: "Thank you for telling me — everything below is free of \(allergen.rawValue.lowercased()), and I'll quietly steer you away from the rest.",
                dishes: top(dishes, 4)
            )
        }

        // Cravings by category
        if i.dessert {
            return HostReply(text: "Saving room for the end — wise. The desserts here are soft landings.", dishes: Menu.section(.desserts))
        }
        if i.soup {
            return HostReply(text: "Something warm, then. Our soups are slow — the old hen pot never boils, it shivers.", dishes: top(dishes.filter { $0.section == .soups || $0.section == .soupDumplings }, 4))
        }
        if i.noodle {
            return HostReply(text: "The noodles are pulled to order — you can hear the slap of the dough from the dining room.", dishes: dishes.filter { $0.section == .noodles })
        }
        if i.rice {
            return HostReply(text: "Our fried rice starts with day-old jasmine and ends in wok smoke. The golden egg version is the one people dream about.", dishes: dishes.filter { $0.section == .friedRice })
        }
        if i.seafood {
            return HostReply(text: "From the water: prawns folded into silk, and this week, butter-poached lobster in a beet-blushed wrapper.", dishes: top(dishes.filter { $0.proteinType == .shrimp || $0.proteinType == .fish }, 4))
        }
        if i.dumpling {
            return HostReply(text: "You've come to the right lab. Every dumpling is folded by hand — eighteen pleats each, counted.", dishes: top(dishes.filter { [.signatureDumplings, .panFried, .wontons, .soupDumplings].contains($0.section) }, 4))
        }

        // Signature / surprise
        if i.signature || i.surprise {
            let stars = top(dishes.filter { $0.isBestSeller || $0.isChefsChoice }, 4)
            return HostReply(
                text: "The dish we're known for is the Black Pork Pan Fried Dumpling — hand-chopped Berkshire pork under a crust like golden glass. If it's your first visit, begin there.",
                dishes: stars,
                followUp: "Or tell me your mood and I'll compose a full table for you."
            )
        }

        // Fallback: warm, useful
        return HostReply(
            text: "Tell me a little more — are you after something spicy, gentle, hearty, or light? Cooking for one, or a table? I'll build the meal around you.",
            dishes: top(dishes.filter { $0.isBestSeller }, 3),
            followUp: "Meanwhile, these are tonight's most-loved plates."
        )
    }

    /// Conversation starters shown as chips.
    static let suggestions: [String] = [
        "I want something spicy",
        "What should two people order?",
        "I'm vegetarian",
        "High protein, please",
        "I don't eat pork",
        "What's your signature dish?",
        "Something light — I'm on a diet",
        "Surprise me",
    ]
}
