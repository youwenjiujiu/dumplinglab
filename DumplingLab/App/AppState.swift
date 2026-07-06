import SwiftUI
import Observation

enum AppTab: String, CaseIterable, Identifiable {
    case table = "Table"       // cinematic home
    case menu = "Menu"
    case host = "Host"         // AI assistant
    case steamer = "Steamer"   // cart

    var id: String { rawValue }

    var symbol: String {
        switch self {
        case .table: return "sparkles"
        case .menu: return "book.pages"
        case .host: return "bubble.left.and.text.bubble.right"
        case .steamer: return "basket"
        }
    }
}

struct CartLine: Identifiable, Hashable {
    let id = UUID()
    var dish: Dish
    var quantity: Int
}

/// A dish being physically dragged toward the steamer.
struct DragSession {
    var dish: Dish
    var location: CGPoint
}

@Observable
final class AppState {
    var tab: AppTab = .table
    var cart: [CartLine] = []
    var selectedDish: Dish?

    /// Live drag-to-cart session rendered as a floating morsel above everything.
    var drag: DragSession?
    /// Set briefly when something lands in the steamer, to pulse the dock icon.
    var steamerPulse: Bool = false

    var cartCount: Int { cart.reduce(0) { $0 + $1.quantity } }

    var cartTotal: Decimal {
        cart.reduce(Decimal(0)) { $0 + $1.dish.price * Decimal($1.quantity) }
    }

    func add(_ dish: Dish, quantity: Int = 1) {
        if let i = cart.firstIndex(where: { $0.dish.id == dish.id }) {
            cart[i].quantity += quantity
        } else {
            cart.append(CartLine(dish: dish, quantity: quantity))
        }
        Haptics.success()
        pulseSteamer()
    }

    func add(contentsOf set: MealSet) {
        for dish in set.dishes {
            if let i = cart.firstIndex(where: { $0.dish.id == dish.id }) {
                cart[i].quantity += 1
            } else {
                cart.append(CartLine(dish: dish, quantity: 1))
            }
        }
        Haptics.success()
        pulseSteamer()
    }

    func setQuantity(_ q: Int, for line: CartLine) {
        guard let i = cart.firstIndex(where: { $0.id == line.id }) else { return }
        if q <= 0 {
            cart.remove(at: i)
        } else {
            cart[i].quantity = q
        }
        Haptics.selection()
    }

    private func pulseSteamer() {
        withAnimation(.spring(response: 0.35, dampingFraction: 0.5)) { steamerPulse = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            withAnimation(.easeOut(duration: 0.4)) { self.steamerPulse = false }
        }
    }
}
