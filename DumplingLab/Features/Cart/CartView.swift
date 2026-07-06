import SwiftUI

/// The Steamer — the cart as a bamboo basket. Your order sits inside it,
/// steaming, until you send it to the kitchen.
struct CartView: View {
    @Environment(AppState.self) private var app
    @State private var ordered = false

    var body: some View {
        ZStack {
            DL.canvas.ignoresSafeArea()

            if app.cart.isEmpty && !ordered {
                emptyState
            } else if ordered {
                orderedState
            } else {
                filledState
            }
        }
        .animation(.spring(response: 0.5, dampingFraction: 0.85), value: app.cart.isEmpty)
        .animation(.spring(response: 0.5, dampingFraction: 0.85), value: ordered)
    }

    // MARK: Empty

    private var emptyState: some View {
        VStack(spacing: 22) {
            SteamerBasketView(dishes: [])
                .frame(width: 250, height: 190)
            VStack(spacing: 8) {
                Text("The steamer is empty")
                    .font(DL.display(22, weight: .semibold))
                    .foregroundStyle(DL.ink)
                Text("Drag a dish here from the menu,\nor ask the host what's good tonight.")
                    .font(DL.text(14))
                    .foregroundStyle(DL.inkFaint)
                    .multilineTextAlignment(.center)
                    .lineSpacing(3)
            }
            Button {
                Haptics.tap()
                withAnimation(.spring(response: 0.45, dampingFraction: 0.8)) { app.tab = .menu }
            } label: {
                Text("Browse the menu")
                    .font(DL.text(14, weight: .semibold))
                    .foregroundStyle(DL.warmWhite)
                    .padding(.horizontal, 24).padding(.vertical, 13)
                    .background(Capsule().fill(LinearGradient(colors: [DL.soy, DL.soyDark], startPoint: .top, endPoint: .bottom)))
            }
            .buttonStyle(TactileButtonStyle())
        }
        .padding(.bottom, 60)
    }

    // MARK: Filled

    private var filledState: some View {
        VStack(spacing: 0) {
            VStack(spacing: 2) {
                Text("The Steamer")
                    .font(DL.display(26, weight: .semibold))
                    .foregroundStyle(DL.ink)
                Text("\(app.cartCount) pieces, ready for the kitchen")
                    .overlineStyle()
            }
            .padding(.top, 14)

            ScrollView(showsIndicators: false) {
                VStack(spacing: 22) {
                    SteamerBasketView(dishes: app.cart.map(\.dish))
                        .frame(height: 200)
                        .padding(.horizontal, 30)
                        .padding(.top, 10)

                    VStack(spacing: 10) {
                        ForEach(app.cart) { line in
                            CartLineRow(line: line)
                                .transition(.asymmetric(
                                    insertion: .scale(scale: 0.9).combined(with: .opacity),
                                    removal: .move(edge: .trailing).combined(with: .opacity)
                                ))
                        }
                    }
                    .padding(.horizontal, 20)
                    .animation(.spring(response: 0.45, dampingFraction: 0.8), value: app.cart)

                    totals
                        .padding(.horizontal, 20)

                    Color.clear.frame(height: 230)
                }
            }
        }
        .overlay(alignment: .bottom) { checkoutBar }
    }

    private var totals: some View {
        VStack(spacing: 8) {
            row("Kitchen total", app.cartTotal.dlPrice)
            row("Estimated calories", "≈ \(app.cart.reduce(0) { $0 + $1.dish.nutrition.calories * $1.quantity }) kcal")
            row("Steam time", "about 12 min")
        }
        .padding(18)
        .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(DL.warmWhite))
        .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous).strokeBorder(DL.creamDeep.opacity(0.9), lineWidth: 1))
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(DL.text(13)).foregroundStyle(DL.inkFaint)
            Spacer()
            Text(value).font(DL.text(14, weight: .semibold)).foregroundStyle(DL.ink)
        }
    }

    private var checkoutBar: some View {
        Button {
            Haptics.success()
            withAnimation(.spring(response: 0.6, dampingFraction: 0.8)) {
                ordered = true
                app.cart.removeAll()
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.2) {
                withAnimation(.easeOut(duration: 0.5)) { ordered = false }
            }
        } label: {
            HStack {
                Image(systemName: "flame.fill").font(.system(size: 14, weight: .semibold))
                Text("Send to the kitchen")
                    .font(DL.text(15, weight: .semibold))
                Spacer()
                Text(app.cartTotal.dlPrice)
                    .font(DL.display(17, weight: .semibold))
            }
            .foregroundStyle(DL.warmWhite)
            .padding(.horizontal, 24).padding(.vertical, 17)
            .background(Capsule().fill(LinearGradient(colors: [DL.red, DL.redDeep], startPoint: .top, endPoint: .bottom)))
            .lightSweep(intensity: 0.2)
            .clipShape(Capsule())
            .dlShadow(radius: 20, y: 12, opacity: 0.25)
        }
        .buttonStyle(TactileButtonStyle())
        .padding(.horizontal, 20)
        .padding(.bottom, 96)
    }

    // MARK: Ordered

    private var orderedState: some View {
        VStack(spacing: 20) {
            ZStack {
                SteamerBasketView(dishes: [], lidClosed: true)
                    .frame(width: 250, height: 190)
                SteamVeil(opacity: 0.7)
                    .frame(width: 160, height: 180)
                    .offset(y: -110)
            }
            VStack(spacing: 8) {
                Text("It's steaming")
                    .font(DL.display(24, weight: .semibold))
                    .foregroundStyle(DL.ink)
                Text("The kitchen has your order.\nAbout twelve minutes of good things ahead.")
                    .font(DL.text(14))
                    .foregroundStyle(DL.inkFaint)
                    .multilineTextAlignment(.center)
                    .lineSpacing(3)
            }
        }
        .padding(.bottom, 60)
        .transition(.scale(scale: 0.92).combined(with: .opacity))
    }
}

// MARK: - Cart line

private struct CartLineRow: View {
    @Environment(AppState.self) private var app
    var line: CartLine

    var body: some View {
        HStack(spacing: 12) {
            DishArtView(dish: line.dish, backdrop: false, steam: false)
                .frame(width: 58, height: 58)

            VStack(alignment: .leading, spacing: 2) {
                Text(line.dish.name)
                    .font(DL.text(14, weight: .semibold))
                    .foregroundStyle(DL.ink)
                    .lineLimit(2)
                Text(line.dish.priceLabel)
                    .font(DL.text(12))
                    .foregroundStyle(DL.inkFaint)
            }
            Spacer()

            HStack(spacing: 12) {
                stepper("minus") { app.setQuantity(line.quantity - 1, for: line) }
                Text("\(line.quantity)")
                    .font(DL.display(15, weight: .semibold))
                    .foregroundStyle(DL.ink)
                    .frame(minWidth: 16)
                    .contentTransition(.numericText())
                stepper("plus") { app.setQuantity(line.quantity + 1, for: line) }
            }
        }
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(DL.warmWhite))
        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(DL.creamDeep.opacity(0.9), lineWidth: 1))
    }

    private func stepper(_ symbol: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(DL.soy)
                .frame(width: 26, height: 26)
                .background(Circle().fill(DL.cream))
        }
        .buttonStyle(TactileButtonStyle(scale: 0.8))
    }
}

// MARK: - The basket itself

/// A bamboo steamer, drawn — wood rim, slatted base, and the order inside.
struct SteamerBasketView: View {
    var dishes: [Dish]
    var lidClosed: Bool = false

    var body: some View {
        GeometryReader { geo in
            // Design against a clamped module so the basket always fits its frame.
            let w = min(geo.size.width, geo.size.height * 1.55)
            ZStack {
                // Basket wall
                UnevenRoundedRectangle(bottomLeadingRadius: w * 0.07, bottomTrailingRadius: w * 0.07, style: .continuous)
                    .fill(LinearGradient(colors: [DL.woodDeep.darker(-0.06), DL.woodDeep], startPoint: .top, endPoint: .bottom))
                    .frame(width: w * 0.74, height: w * 0.15)
                    .offset(y: w * 0.16)
                    .overlay(
                        // Bamboo binding line
                        Capsule().fill(DL.soyDark.opacity(0.3)).frame(width: w * 0.74, height: 2)
                            .offset(y: w * 0.185)
                    )
                    .dlShadow(radius: w * 0.05, y: w * 0.03, opacity: 0.28)

                // Interior
                Ellipse()
                    .fill(
                        RadialGradient(colors: [DL.sesame, DL.wood.darker(0.05)], center: .init(x: 0.45, y: 0.4), startRadius: 0, endRadius: w * 0.42)
                    )
                    .frame(width: w * 0.86, height: w * 0.30)
                    .overlay(
                        // Slats
                        Canvas { ctx, size in
                            for i in 1..<6 {
                                let x = size.width * CGFloat(i) / 6
                                var p = Path()
                                p.move(to: CGPoint(x: x, y: size.height * 0.12))
                                p.addLine(to: CGPoint(x: x, y: size.height * 0.88))
                                ctx.stroke(p, with: .color(DL.woodDeep.opacity(0.28)), lineWidth: 2)
                            }
                        }
                        .frame(width: w * 0.86, height: w * 0.30)
                        .clipShape(Ellipse())
                    )
                    .overlay(
                        Ellipse().strokeBorder(DL.woodDeep.opacity(0.5), lineWidth: max(2, w * 0.012))
                            .frame(width: w * 0.86, height: w * 0.30)
                    )
                    .offset(y: w * 0.045)

                // The order, nestled inside
                if !dishes.isEmpty {
                    let shown = Array(dishes.prefix(4))
                    HStack(spacing: -w * 0.04) {
                        ForEach(Array(shown.enumerated()), id: \.offset) { i, dish in
                            DishArtView(dish: dish, backdrop: false, steam: false)
                                .frame(width: w * 0.27, height: w * 0.27)
                                .offset(y: CGFloat(i % 2 == 0 ? 0 : -1) * w * 0.015)
                                .floating(amplitude: 1.6, period: 4.0, phase: Double(i) * 0.4)
                        }
                    }
                    .offset(y: -w * 0.015)
                    if dishes.count > 4 {
                        Text("+\(dishes.count - 4)")
                            .font(DL.text(12, weight: .bold))
                            .foregroundStyle(DL.warmWhite)
                            .padding(.horizontal, 9).padding(.vertical, 4)
                            .background(Capsule().fill(DL.soy))
                            .offset(x: w * 0.33, y: -w * 0.14)
                    }
                }

                // Lid, when the order is away
                if lidClosed {
                    Ellipse()
                        .fill(LinearGradient(colors: [DL.wood.darker(-0.05), DL.woodDeep], startPoint: .top, endPoint: .bottom))
                        .frame(width: w * 0.92, height: w * 0.32)
                        .overlay(
                            Ellipse()
                                .strokeBorder(DL.soyDark.opacity(0.3), lineWidth: 2)
                                .frame(width: w * 0.46, height: w * 0.16)
                        )
                        .offset(y: w * 0.01)
                        .dlShadow(radius: 10, y: 6, opacity: 0.2)
                }

                // Ambient steam over the basket
                if !dishes.isEmpty || lidClosed {
                    SteamVeil(opacity: 0.4)
                        .frame(width: w * 0.44, height: w * 0.40)
                        .offset(y: -w * 0.26)
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
    }
}
