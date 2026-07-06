import SwiftUI

/// A dish's own premium product page. Opens with the signature reveal:
/// the dish drifts in, the camera leans closer, the dumpling opens,
/// steam escapes — and only then does the information fade in.
struct DishDetailView: View {
    @Environment(AppState.self) private var app
    var dish: Dish
    var namespace: Namespace.ID

    // Signature animation staging
    @State private var arrived = false      // dish drifts in
    @State private var leanedIn = false     // camera zoom
    @State private var reveal: CGFloat = 0  // dumpling opens, juice flows
    @State private var infoShown = false    // captions fade in
    @State private var quantity = 1

    var body: some View {
        ZStack(alignment: .top) {
            DL.canvas.ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    hero
                    content
                        .padding(.horizontal, 22)
                        .padding(.top, 26)
                        .opacity(infoShown ? 1 : 0)
                        .offset(y: infoShown ? 0 : 24)
                    Color.clear.frame(height: 130)
                }
            }
            .ignoresSafeArea(edges: .top)

            closeButton

            addBar
        }
        .onAppear(perform: runSignatureSequence)
    }

    private func runSignatureSequence() {
        withAnimation(.spring(response: 0.9, dampingFraction: 0.8).delay(0.1)) { arrived = true }
        withAnimation(.easeInOut(duration: 1.4).delay(0.9)) { leanedIn = true }
        withAnimation(.spring(response: 1.1, dampingFraction: 0.85).delay(1.6)) { reveal = 1 }
        withAnimation(.easeOut(duration: 0.7).delay(2.1)) { infoShown = true }
    }

    // MARK: Hero

    private var hero: some View {
        ZStack {
            LinearGradient(
                stops: [
                    .init(color: Color(red: 0.15, green: 0.12, blue: 0.10), location: 0),
                    .init(color: dish.palette.glow.color.opacity(0.85), location: 0.6),
                    .init(color: Color(red: 0.13, green: 0.10, blue: 0.08), location: 1),
                ],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
            .paperGrain(0.014)

            VStack(spacing: 4) {
                Spacer(minLength: 60)

                TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { context in
                    let t = context.date.timeIntervalSinceReferenceDate
                    // Slow rotation until the camera leans in, then settle.
                    let idleSpin = leanedIn ? 0.0 : sin(t * 0.5) * 3.5
                    DishArtView(dish: dish, backdrop: true, steam: true, reveal: reveal)
                        .rotationEffect(.degrees(idleSpin))
                }
                .lightSweep(intensity: 0.16)
                .frame(maxHeight: 340)
                .scaleEffect(heroScale)
                .offset(y: arrived ? 0 : 46)
                .opacity(arrived ? 1 : 0)

                // The information arrives only after the food has spoken.
                VStack(spacing: 9) {
                    HStack(spacing: 8) {
                        Badge(text: "Handmade Daily", tint: DL.wood)
                        if dish.isBestSeller { Badge(text: "Best Seller", tint: DL.red) }
                        if dish.isChefsChoice { Badge(text: "Chef Recommendation", tint: DL.soy) }
                    }
                    Text(dish.name)
                        .font(DL.display(30, weight: .semibold))
                        .foregroundStyle(DL.warmWhite)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 30)
                        .minimumScaleFactor(0.75)
                    Text(dish.chineseName)
                        .overlineStyle(DL.sesame, size: 12)
                    Text("\(dish.nutrition.calories) kcal · \(dish.priceLabel)\(dish.pieces.map { " · \($0) pieces" } ?? "")")
                        .font(DL.text(13, weight: .medium))
                        .foregroundStyle(DL.sesame.opacity(0.9))
                }
                .opacity(infoShown ? 1 : 0)
                .offset(y: infoShown ? 0 : 14)
                .padding(.bottom, 34)
            }
        }
        .frame(height: 560)
        .clipShape(UnevenRoundedRectangle(bottomLeadingRadius: 36, bottomTrailingRadius: 36, style: .continuous))
        .dlShadow(radius: 26, y: 16, opacity: 0.22)
    }

    private var heroScale: CGFloat {
        if !arrived { return 0.82 }
        return leanedIn ? 1.08 : 1.0
    }

    // MARK: Content

    private var content: some View {
        VStack(alignment: .leading, spacing: 30) {
            // Flavor
            VStack(alignment: .leading, spacing: 8) {
                Text("The Flavor").overlineStyle()
                Text(dish.flavor)
                    .font(DL.display(18, weight: .regular))
                    .foregroundStyle(DL.inkSoft)
                    .lineSpacing(4)
            }

            // Chef story — a warm wood panel
            VStack(alignment: .leading, spacing: 8) {
                Text("From the Kitchen").overlineStyle(DL.sesame)
                Text(dish.story)
                    .font(DL.text(14))
                    .italic()
                    .foregroundStyle(DL.warmWhite.opacity(0.94))
                    .lineSpacing(5)
                Text("— Chef Lin")
                    .font(DL.text(12, weight: .semibold))
                    .foregroundStyle(DL.sesame)
                    .padding(.top, 2)
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .fill(LinearGradient(colors: [DL.soy, DL.soyDark], startPoint: .topLeading, endPoint: .bottomTrailing))
            )
            .dlShadow(radius: 18, y: 12, opacity: 0.18)

            ingredientsSection
            NutritionPanel(nutrition: dish.nutrition, spice: dish.spice)
            detailsSection

            if !pairedDishes.isEmpty {
                pairingsSection
            }
        }
    }

    private var ingredientsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("What's Inside").overlineStyle()
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(Array(dish.ingredients.enumerated()), id: \.element.id) { i, ing in
                        VStack(spacing: 7) {
                            Text(ing.emoji)
                                .font(.system(size: 26))
                                .frame(width: 56, height: 56)
                                .background(Circle().fill(DL.cream))
                                .overlay(Circle().strokeBorder(DL.creamDeep, lineWidth: 1))
                            Text(ing.name)
                                .font(DL.text(11, weight: .medium))
                                .foregroundStyle(DL.inkSoft)
                                .multilineTextAlignment(.center)
                                .frame(width: 78)
                        }
                        .floating(amplitude: 1.8, period: 3.8, phase: Double(i) * 0.5)
                    }
                }
                .padding(.vertical, 4)
            }
        }
    }

    private var detailsSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            if let sauce = dish.recommendedSauce {
                detailRow(icon: "drop.fill", title: "Recommended sauce", value: sauce)
            }
            if !dish.allergens.isEmpty {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "exclamationmark.shield")
                        .font(.system(size: 15))
                        .foregroundStyle(DL.wood)
                        .frame(width: 24)
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Allergens").font(DL.text(12, weight: .semibold)).foregroundStyle(DL.inkFaint)
                        FlowChips(items: dish.allergens.map(\.rawValue))
                    }
                }
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(DL.warmWhite))
        .overlay(RoundedRectangle(cornerRadius: 24, style: .continuous).strokeBorder(DL.creamDeep.opacity(0.8), lineWidth: 1))
    }

    private func detailRow(icon: String, title: String, value: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 15))
                .foregroundStyle(DL.wood)
                .frame(width: 24)
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(DL.text(12, weight: .semibold)).foregroundStyle(DL.inkFaint)
                Text(value).font(DL.text(14, weight: .medium)).foregroundStyle(DL.ink)
            }
        }
    }

    private var pairedDishes: [Dish] {
        dish.pairings.compactMap { Menu.dish($0) }
    }

    private var pairingsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Lovely With").overlineStyle()
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(pairedDishes) { paired in
                        Button {
                            Haptics.tap()
                            withAnimation(.spring(response: 0.5, dampingFraction: 0.85)) {
                                app.selectedDish = paired
                            }
                        } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                DishArtView(dish: paired, backdrop: false, steam: false)
                                    .frame(width: 120, height: 100)
                                Text(paired.name)
                                    .font(DL.text(12, weight: .semibold))
                                    .foregroundStyle(DL.ink)
                                    .lineLimit(2)
                                    .multilineTextAlignment(.leading)
                                Text(paired.priceLabel)
                                    .font(DL.text(12))
                                    .foregroundStyle(DL.soy)
                            }
                            .frame(width: 132)
                            .padding(10)
                            .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(DL.warmWhite))
                            .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(DL.creamDeep.opacity(0.8), lineWidth: 1))
                        }
                        .buttonStyle(TactileButtonStyle())
                    }
                }
                .padding(.vertical, 4)
            }
        }
    }

    // MARK: Chrome

    private var closeButton: some View {
        HStack {
            Button {
                Haptics.tap()
                withAnimation(.spring(response: 0.45, dampingFraction: 0.85)) {
                    app.selectedDish = nil
                }
            } label: {
                Image(systemName: "chevron.down")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(DL.warmWhite)
                    .frame(width: 40, height: 40)
                    .background(Circle().fill(.ultraThinMaterial.opacity(0.9)))
                    .overlay(Circle().strokeBorder(.white.opacity(0.25), lineWidth: 1))
            }
            .buttonStyle(TactileButtonStyle(scale: 0.88))
            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.top, 6)
    }

    private var addBar: some View {
        VStack {
            Spacer()
            HStack(spacing: 14) {
                // Quantity stepper
                HStack(spacing: 16) {
                    stepperButton("minus") { if quantity > 1 { quantity -= 1; Haptics.selection() } }
                    Text("\(quantity)")
                        .font(DL.display(18, weight: .semibold))
                        .foregroundStyle(DL.ink)
                        .frame(minWidth: 20)
                        .contentTransition(.numericText())
                        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: quantity)
                    stepperButton("plus") { quantity += 1; Haptics.selection() }
                }
                .padding(.horizontal, 16).padding(.vertical, 12)
                .background(Capsule().fill(.ultraThinMaterial))
                .overlay(Capsule().strokeBorder(DL.creamDeep, lineWidth: 1))

                Button {
                    app.add(dish, quantity: quantity)
                    withAnimation(.spring(response: 0.45, dampingFraction: 0.85)) {
                        app.selectedDish = nil
                        app.tab = .steamer
                    }
                } label: {
                    HStack {
                        Text("Add to steamer")
                            .font(DL.text(15, weight: .semibold))
                        Spacer()
                        Text((dish.price * Decimal(quantity)).dlPrice)
                            .font(DL.display(16, weight: .semibold))
                            .contentTransition(.numericText())
                            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: quantity)
                    }
                    .foregroundStyle(DL.warmWhite)
                    .padding(.horizontal, 22).padding(.vertical, 17)
                    .background(
                        Capsule().fill(LinearGradient(colors: [DL.red, DL.redDeep], startPoint: .top, endPoint: .bottom))
                    )
                    .lightSweep(intensity: 0.2)
                    .clipShape(Capsule())
                }
                .buttonStyle(TactileButtonStyle())
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 16)
            .dlShadow(radius: 22, y: 12, opacity: 0.2)
            .opacity(infoShown ? 1 : 0)
            .offset(y: infoShown ? 0 : 30)
        }
    }

    private func stepperButton(_ symbol: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(DL.soy)
                .frame(width: 26, height: 26)
        }
        .buttonStyle(TactileButtonStyle(scale: 0.8))
    }
}

// MARK: - Nutrition, beautifully

/// Nutrition as an object of design: a calorie dial and three
/// hand-tinted macro bars, plus the spice meter.
struct NutritionPanel: View {
    var nutrition: Nutrition
    var spice: SpiceLevel

    @State private var animated = false

    private var calorieFraction: Double { min(Double(nutrition.calories) / 900.0, 1) }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("On the Scale").overlineStyle()

            HStack(spacing: 22) {
                // Calorie dial
                ZStack {
                    Circle()
                        .stroke(DL.creamDeep, lineWidth: 9)
                    Circle()
                        .trim(from: 0, to: animated ? calorieFraction : 0)
                        .stroke(
                            AngularGradient(colors: [DL.wood, DL.red], center: .center, startAngle: .degrees(-90), endAngle: .degrees(230)),
                            style: .init(lineWidth: 9, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))
                    VStack(spacing: 0) {
                        Text("\(nutrition.calories)")
                            .font(DL.display(24, weight: .semibold))
                            .foregroundStyle(DL.ink)
                        Text("kcal").font(DL.text(11)).foregroundStyle(DL.inkFaint)
                    }
                }
                .frame(width: 108, height: 108)

                // Macro bars
                VStack(alignment: .leading, spacing: 12) {
                    macroBar("Protein", grams: nutrition.protein, max: 45, tint: DL.red)
                    macroBar("Carbs", grams: nutrition.carbs, max: 80, tint: DL.wood)
                    macroBar("Fat", grams: nutrition.fat, max: 40, tint: DL.sesame.darker(0.15))
                }
            }

            // Spice meter
            HStack(spacing: 10) {
                Text("Spice").font(DL.text(12, weight: .semibold)).foregroundStyle(DL.inkFaint)
                HStack(spacing: 5) {
                    ForEach(1..<5) { level in
                        Image(systemName: "flame.fill")
                            .font(.system(size: 12))
                            .foregroundStyle(level <= spice.rawValue ? DL.red : DL.creamDeep)
                            .scaleEffect(animated && level <= spice.rawValue ? 1 : 0.6)
                            .animation(.spring(response: 0.4, dampingFraction: 0.5).delay(Double(level) * 0.07), value: animated)
                    }
                }
                Text(spice.label).font(DL.text(12)).foregroundStyle(DL.inkSoft)
                Spacer()
            }
        }
        .padding(20)
        .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(DL.warmWhite))
        .overlay(RoundedRectangle(cornerRadius: 24, style: .continuous).strokeBorder(DL.creamDeep.opacity(0.8), lineWidth: 1))
        .onAppear {
            withAnimation(.spring(response: 1.1, dampingFraction: 0.85).delay(0.2)) { animated = true }
        }
    }

    private func macroBar(_ label: String, grams: Int, max maxG: Int, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label).font(DL.text(12, weight: .semibold)).foregroundStyle(DL.inkSoft)
                Spacer()
                Text("\(grams) g").font(DL.text(12, weight: .medium)).foregroundStyle(DL.inkFaint)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(DL.cream)
                    Capsule()
                        .fill(LinearGradient(colors: [tint.opacity(0.8), tint], startPoint: .leading, endPoint: .trailing))
                        .frame(width: animated ? geo.size.width * min(CGFloat(grams) / CGFloat(maxG), 1) : 0)
                }
            }
            .frame(height: 7)
        }
    }
}

// MARK: - Flow chips

struct FlowChips: View {
    var items: [String]

    var body: some View {
        // Simple wrapping layout for short chip lists
        FlexibleHStack(spacing: 6) {
            ForEach(items, id: \.self) { item in
                Text(item)
                    .font(DL.text(11, weight: .medium))
                    .foregroundStyle(DL.soy)
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background(Capsule().fill(DL.cream))
                    .overlay(Capsule().strokeBorder(DL.creamDeep, lineWidth: 1))
            }
        }
    }
}

/// Minimal wrapping layout.
struct FlexibleHStack: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 300
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > width, x > 0 { x = 0; y += rowHeight + spacing; rowHeight = 0 }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: width, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX { x = bounds.minX; y += rowHeight + spacing; rowHeight = 0 }
            view.place(at: CGPoint(x: x, y: y), proposal: .unspecified)
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
