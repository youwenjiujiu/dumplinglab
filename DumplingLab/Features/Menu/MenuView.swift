import SwiftUI

/// The Menu — an editorial, image-forward gallery. Eleven chapters,
/// each a calm two-column grid of studio tiles. Tap a tile and it
/// *becomes* the dish page (matched-geometry hero transition);
/// long-press to pick the dish up and carry it to the steamer.
struct MenuView: View {
    @Environment(AppState.self) private var app
    var namespace: Namespace.ID

    @State private var activeSection: MenuSection = .signatureDumplings

    var body: some View {
        ScrollViewReader { proxy in
            ZStack(alignment: .top) {
                DL.canvas.ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    LazyVStack(spacing: 52, pinnedViews: []) {
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

    private let columns = [
        GridItem(.flexible(), spacing: 14),
        GridItem(.flexible(), spacing: 14),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 5) {
                Text("Chapter \(String(format: "%02d", (MenuSection.allCases.firstIndex(of: section) ?? 0) + 1))")
                    .overlineStyle(DL.wood, size: 10)
                    .padding(.bottom, 1)
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

            LazyVGrid(columns: columns, spacing: 22) {
                ForEach(Array(dishes.enumerated()), id: \.element.id) { i, dish in
                    DishTile(dish: dish, namespace: namespace)
                        .floating(amplitude: 1.4, period: 4.8, phase: Double(i) * 0.43)
                }
            }
        }
    }
}

// MARK: - Dish tile

/// One tile of the gallery. The image is the whole story — a studio stage
/// with the dish floating on it; a single quiet line of type below.
struct DishTile: View {
    @Environment(AppState.self) private var app
    var dish: Dish
    var namespace: Namespace.ID

    @State private var lifted = false

    private var isPresented: Bool { app.selectedDish?.id == dish.id }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            stage
            caption
        }
        .contentShape(Rectangle())
        .scaleEffect(lifted ? 1.05 : 1)
        .onTapGesture {
            Haptics.tap()
            withAnimation(.spring(response: 0.48, dampingFraction: 0.86)) { app.selectedDish = dish }
        }
        .gesture(pickUpGesture)
        .animation(.spring(response: 0.35, dampingFraction: 0.7), value: lifted)
    }

    // MARK: The image stage

    private var stage: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [.white, DL.cream],
                        startPoint: .top, endPoint: .bottom
                    )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 26, style: .continuous)
                        .strokeBorder(
                            LinearGradient(
                                colors: [.white, DL.creamDeep.opacity(0.6)],
                                startPoint: .topLeading, endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                )
                .overlay(
                    // A whisper of the dish's own glow behind it
                    RadialGradient(
                        colors: [dish.palette.glow.color.opacity(0.10), .clear],
                        center: .init(x: 0.5, y: 0.55),
                        startRadius: 4, endRadius: 90
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
                )

            DishArtView(dish: dish, backdrop: false, steam: true)
                .padding(10)
                .matchedGeometryEffect(id: "hero-\(dish.id)", in: namespace, isSource: !isPresented)
                .opacity(isPresented ? 0 : 1)

            // Quiet quick-add, tucked into the corner
            VStack {
                HStack {
                    Spacer()
                    Button {
                        withAnimation { app.add(dish) }
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(DL.soy)
                            .frame(width: 26, height: 26)
                            .background(Circle().fill(.ultraThinMaterial))
                            .overlay(Circle().strokeBorder(DL.creamDeep.opacity(0.8), lineWidth: 1))
                    }
                    .buttonStyle(TactileButtonStyle(scale: 0.82))
                }
                Spacer()
            }
            .padding(9)
        }
        .aspectRatio(0.94, contentMode: .fit)
        .dlShadow(radius: 14, y: 9, opacity: lifted ? 0.24 : 0.09)
    }

    // MARK: The caption

    private var caption: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(alignment: .top, spacing: 6) {
                if dish.isBestSeller || dish.isChefsChoice {
                    Circle()
                        .fill(dish.isBestSeller ? DL.red : DL.wood)
                        .frame(width: 5, height: 5)
                        .padding(.top, 6)
                }
                Text(dish.name)
                    .font(DL.display(15, weight: .semibold))
                    .foregroundStyle(DL.ink)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
            }
            .frame(height: 40, alignment: .topLeading)

            HStack(spacing: 6) {
                Text(dish.priceLabel)
                    .font(DL.display(14, weight: .semibold))
                    .foregroundStyle(DL.soy)
                if dish.spice.rawValue > 0 {
                    Text(String(repeating: "🌶", count: min(dish.spice.rawValue, 3)))
                        .font(.system(size: 9))
                }
                Spacer()
                if let pieces = dish.pieces {
                    Text("\(pieces) pc")
                        .font(DL.text(11))
                        .foregroundStyle(DL.inkFaint)
                }
            }
        }
        .padding(.horizontal, 3)
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
