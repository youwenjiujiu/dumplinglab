import SwiftUI

// MARK: - Menu taxonomy

enum MenuSection: String, CaseIterable, Identifiable, Codable {
    case signatureDumplings = "Signature Dumplings"
    case panFried           = "Pan Fried"
    case wontons            = "Wontons"
    case soupDumplings      = "Soup Dumplings"
    case noodles            = "Noodles"
    case friedRice          = "Fried Rice"
    case soups              = "Soups"
    case sides              = "Side Dishes"
    case vegetables         = "Vegetables"
    case desserts           = "Desserts"
    case chefSpecials       = "Chef Specials"

    var id: String { rawValue }

    var emoji: String {
        switch self {
        case .signatureDumplings, .panFried, .wontons, .soupDumplings: return "🥟"
        case .noodles: return "🍜"
        case .friedRice: return "🍚"
        case .soups: return "🥣"
        case .sides: return "🍗"
        case .vegetables: return "🥬"
        case .desserts: return "🍨"
        case .chefSpecials: return "⭐"
        }
    }

    /// One-line editorial intro shown under each section header.
    var tagline: String {
        switch self {
        case .signatureDumplings: return "Folded by hand, eighteen pleats each"
        case .panFried:           return "Golden lace, crisp underneath"
        case .wontons:            return "Silk-thin wrappers in warm broth"
        case .soupDumplings:      return "Hold the spoon close — they pour"
        case .noodles:            return "Pulled this morning"
        case .friedRice:          return "Day-old rice, screaming-hot wok"
        case .soups:              return "Slow-simmered, never rushed"
        case .sides:              return "Small plates, big opinions"
        case .vegetables:         return "From the market, barely touched"
        case .desserts:           return "A soft landing"
        case .chefSpecials:       return "What the kitchen is proud of this week"
        }
    }
}

// MARK: - Dish attributes

enum SpiceLevel: Int, Codable, CaseIterable {
    case none = 0, mild, medium, hot, fiery

    var label: String {
        switch self {
        case .none: return "Not spicy"
        case .mild: return "Mild"
        case .medium: return "Medium"
        case .hot: return "Hot"
        case .fiery: return "Fiery"
        }
    }
}

enum Allergen: String, Codable, CaseIterable, Identifiable {
    case gluten = "Gluten"
    case soybean = "Soy"
    case shellfish = "Shellfish"
    case egg = "Egg"
    case sesame = "Sesame"
    case peanut = "Peanut"
    case dairy = "Dairy"

    var id: String { rawValue }
    var symbol: String {
        switch self {
        case .gluten: return "🌾"
        case .soybean: return "🫘"
        case .shellfish: return "🦐"
        case .egg: return "🥚"
        case .sesame: return "◦"
        case .peanut: return "🥜"
        case .dairy: return "🥛"
        }
    }
}

enum Protein: String, Codable {
    case pork, chicken, beef, shrimp, fish, vegetarian, vegan
}

struct Ingredient: Identifiable, Codable, Hashable {
    var name: String
    var emoji: String
    var id: String { name }
}

struct Nutrition: Codable, Hashable {
    var calories: Int
    var protein: Int   // grams
    var carbs: Int     // grams
    var fat: Int       // grams
}

/// How the procedural studio-art renderer draws the dish.
enum ArtStyle: String, Codable {
    case pleatedDumpling   // crescent dumpling with visible pleats
    case pleatedDumplingCrisped // pan-fried: golden base
    case soupDumpling      // round purse-shaped xiao long bao
    case wonton            // loose-folded wonton in broth
    case noodleBowl
    case riceBowl
    case soupBowl
    case sidePlate
    case greens
    case dessertCup
}

/// Studio palette for a dish's procedural artwork.
struct DishPalette: Codable, Hashable {
    var skin: ColorTriple      // wrapper / main body
    var accent: ColorTriple    // filling / garnish
    var glow: ColorTriple      // backdrop glow behind the dish

    struct ColorTriple: Codable, Hashable {
        var r: Double, g: Double, b: Double
        var color: Color { Color(red: r, green: g, blue: b) }
    }

    init(skin: (Double, Double, Double), accent: (Double, Double, Double), glow: (Double, Double, Double)) {
        self.skin = .init(r: skin.0, g: skin.1, b: skin.2)
        self.accent = .init(r: accent.0, g: accent.1, b: accent.2)
        self.glow = .init(r: glow.0, g: glow.1, b: glow.2)
    }
}

// MARK: - Dish

struct Dish: Identifiable, Hashable {
    let id: String
    var name: String
    var chineseName: String
    var section: MenuSection
    var price: Decimal
    var pieces: Int?             // e.g. 6 dumplings
    var flavor: String           // one evocative sentence
    var story: String            // short chef story
    var nutrition: Nutrition
    var spice: SpiceLevel
    var allergens: [Allergen]
    var proteinType: Protein
    var ingredients: [Ingredient]
    var recommendedSauce: String?
    var pairings: [String]       // dish ids
    var isBestSeller: Bool = false
    var isChefsChoice: Bool = false
    var isFeatured: Bool = false // appears in the cinematic home reel
    var art: ArtStyle
    var palette: DishPalette
    /// Optional real photograph (asset name, alpha-matted). When present it
    /// replaces the procedural art on the same studio stage.
    var imageName: String? = nil

    var priceLabel: String { price.dlPrice }

    var isVegetarian: Bool { proteinType == .vegetarian || proteinType == .vegan }
    var containsPork: Bool { proteinType == .pork }
}

// MARK: - Meal set (assistant-built menus)

struct MealSet: Identifiable, Hashable {
    let id = UUID()
    var emoji: String
    var title: String
    var subtitle: String       // "Perfect for one person"
    var dishes: [Dish]

    var totalCalories: Int { dishes.reduce(0) { $0 + $1.nutrition.calories } }
    var totalPrice: Decimal { dishes.reduce(0) { $0 + $1.price } }
}
