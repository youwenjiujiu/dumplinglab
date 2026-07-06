import SwiftUI

/// The Menu — an editorial, chaptered browse. Sections read like a magazine;
/// cards float, tilt, and can be physically dragged into the steamer.
struct MenuView: View {
    @Environment(AppState.self) private var app
    var namespace: Namespace.ID

    @State private var activeSection: MenuSection = .signatureDumplings

    var body: some View {
        ScrollViewReader { proxy in
            ZStack(alignment: .top) {
                DL.canvas.ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    LazyVStack(spacing: 44, pinnedViews: []) {
                        menuHeader
                            .padding(.top, 68)

                        ForEach(MenuSection.allCases) { section in
                            let dishes = Menu.section(section)
                            if !dishes.isEmpty {
                                MenuSectionView(section: section, dishes: dishes, namespace: namespace)
                                    .id(section)
                            }
                        }

                        Color.clear.frame(height: 140)
                    }
                    .padding(.horizontal, 20)
                }

                categoryRail(proxy: proxy)
            }
        }
    }

    private var menuHeader: some View {
        VStack(spacing: 8) {
            Text("The Menu")
                .font(DL.display(38, weight: .medium))
                .foregroundStyle(DL.ink)
            Text("Eleven small chapters")
                .overlineStyle()
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: Category rail

    private func categoryRail(proxy: ScrollViewProxy) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(MenuSection.allCases) { section in
                    let selected = activeSection == section
                    Button {
                        Haptics.selection()
                        activeSection = section
                        withAnimation(.spring(response: 0.55, dampingFraction: 0.9)) {
                            proxy.scrollTo(section, anchor: .top)
                        }
                    } label: {
                        HStack(spacing: 6) {
                            Text(section.emoji).font(.system(size: 13))
                            Text(section.rawValue)
                                .font(DL.text(13, weight: selected ? .semibold : .medium))
                        }
                        .foregroundStyle(selected ? DL.warmWhite : DL.inkSoft)
                        .padding(.horizontal, 14).padding(.vertical, 9)
                        .background(
                            Capsule().fill(selected ? AnyShapeStyle(DL.soy) : AnyShapeStyle(.ultraThinMaterial))
                        )
                        .overlay(Capsule().strokeBorder(DL.soy.opacity(selected ? 0 : 0.12), lineWidth: 1))
                    }
                    .buttonStyle(TactileButtonStyle(scale: 0.94))
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
        }
        .background {
            Rectangle()
                .fill(.ultraThinMaterial)
                .overlay(Rectangle().fill(DL.warmWhite.opacity(0.55)))
                .ignoresSafeArea(edges: .top)
                .mask(
                    LinearGradient(
                        stops: [.init(color: .black, location: 0.75), .init(color: .clear, location: 1)],
                        startPoint: .top, endPoint: .bottom
                    )
                    .ignoresSafeArea(edges: .top)
                )
        }
    }
}

// MARK: - Section

struct MenuSectionView: View {
    var section: MenuSection
    var dishes: [Dish]
    var namespace: Namespace.ID

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 9) {
                    Text(section.emoji).font(.system(size: 17))
                    Text(section.rawValue)
                        .font(DL.display(25, weight: .semibold))
                        .foregroundStyle(DL.ink)
                }
                Text(section.tagline)
                    .font(DL.text(13))
                    .italic()
                    .foregroundStyle(DL.inkFaint)
            }

            VStack(spacing: 16) {
                ForEach(Array(dishes.enumerated()), id: \.element.id) { i, dish in
                    DishCard(dish: dish, namespace: namespace)
                        .floating(amplitude: 2.2, period: 4.6, phase: Double(i) * 0.37)
                        .scrollParallax(14)
                }
            }
        }
    }
}

// MARK: - Dish card

/// A living card: art on cream, tilts under the finger, floats at rest,
/// long-press to pick the dish up and carry it to the steamer.
struct DishCard: View {
    @Environment(AppState.self) private var app
    var dish: Dish
    var namespace: Namespace.ID

    @State private var lifted = false

    var body: some View {
        HStack(spacing: 14) {
            DishArtView(dish: dish, backdrop: false, steam: true)
                .frame(width: 118, height: 118)
                .background(
                    RadialGradient(
                        colors: [dish.palette.glow.color.opacity(0.14), .clear],
                        center: .center, startRadius: 6, endRadius: 66
                    )
                )

            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 6) {
                    if dish.isBestSeller { Badge(text: "Best Seller", tint: DL.red) }
                    if dish.isChefsChoice { Badge(text: "Chef", tint: DL.wood) }
                }

                Text(dish.name)
                    .font(DL.display(17, weight: .semibold))
                    .foregroundStyle(DL.ink)
                    .lineLimit(2)
                    .minimumScaleFactor(0.85)

                Text(dish.flavor)
                    .font(DL.text(12))
                    .foregroundStyle(DL.inkFaint)
                    .lineLimit(2)

                HStack {
                    Text(dish.priceLabel)
                        .font(DL.display(16, weight: .semibold))
                        .foregroundStyle(DL.soy)
                    if let pieces = dish.pieces {
                        Text("· \(pieces) pc")
                            .font(DL.text(12))
                            .foregroundStyle(DL.inkFaint)
                    }
                    if dish.spice.rawValue > 0 {
                        Text(String(repeating: "🌶", count: min(dish.spice.rawValue, 3)))
                            .font(.system(size: 10))
                    }
                    Spacer()
                    addButton
                }
                .padding(.top, 2)
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .fill(DL.warmWhite)
                .overlay(
                    RoundedRectangle(cornerRadius: 26, style: .continuous)
                        .strokeBorder(
                            LinearGradient(colors: [.white, DL.creamDeep.opacity(0.7)], startPoint: .topLeading, endPoint: .bottomTrailing),
                            lineWidth: 1
                        )
                )
        )
        .dlShadow(radius: 16, y: 10, opacity: lifted ? 0.26 : 0.10)
        .scaleEffect(lifted ? 1.04 : 1)
        .opacity(app.drag?.dish.id == dish.id ? 0.35 : 1)
        .contentShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
        .onTapGesture {
            Haptics.tap()
            withAnimation(.spring(response: 0.5, dampingFraction: 0.85)) { app.selectedDish = dish }
        }
        .gesture(pickUpGesture)
        .animation(.spring(response: 0.35, dampingFraction: 0.7), value: lifted)
    }

    private var addButton: some View {
        Button {
            withAnimation { app.add(dish) }
        } label: {
            Image(systemName: "plus")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(DL.warmWhite)
                .frame(width: 30, height: 30)
                .background(Circle().fill(LinearGradient(colors: [DL.soy, DL.soyDark], startPoint: .top, endPoint: .bottom)))
        }
        .buttonStyle(TactileButtonStyle(scale: 0.85))
    }

    /// Long-press, then carry the dish anywhere — food physically in hand.
    private var pickUpGesture: some Gesture {
        LongPressGesture(minimumDuration: 0.28)
            .onEnded { _ in
                Haptics.medium()
                lifted = true
            }
            .sequenced(before: DragGesture(coordinateSpace: .global))
            .onChanged { value in
                if case .second(true, let drag?) = value {
                    withAnimation(.interactiveSpring) {
                        app.drag = DragSession(dish: dish, location: drag.location)
                    }
                }
            }
            .onEnded { value in
                lifted = false
                if case .second(true, let drag?) = value {
                    let screenH = UIScreen.main.bounds.height
                    if drag.location.y > screenH - 190 {
                        app.add(dish)
                    }
                }
                withAnimation(.spring(response: 0.4, dampingFraction: 0.75)) {
                    app.drag = nil
                }
            }
    }
}
