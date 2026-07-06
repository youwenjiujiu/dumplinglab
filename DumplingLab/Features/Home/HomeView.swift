import SwiftUI

/// The Table — a cinematic opening. A dark, candlelit reel of the kitchen's
/// proudest dishes: steam rises, light glides, the camera breathes.
struct HomeView: View {
    @Environment(AppState.self) private var app
    var namespace: Namespace.ID

    @State private var page: Int?
    @State private var appeared = false

    private let featured = Menu.featured

    var body: some View {
        ZStack {
            DL.heroNight.ignoresSafeArea()
                .paperGrain(0.015)

            // Ambient candle glow that drifts with the current dish, and
            // flickers faintly, the way real flame light does.
            TimelineView(.animation(minimumInterval: 1.0 / 20.0)) { context in
                let t = context.date.timeIntervalSinceReferenceDate
                let flicker = 0.52 + 0.05 * sin(t * 1.7) + 0.03 * sin(t * 4.3 + 1.2)
                RadialGradient(
                    colors: [currentDish.palette.glow.color.opacity(flicker), .clear],
                    center: .init(x: 0.5, y: 0.44),
                    startRadius: 40, endRadius: 430
                )
            }
            .ignoresSafeArea()
            .animation(.easeInOut(duration: 0.8), value: pageIndex)

            VStack(spacing: 0) {
                header
                    .padding(.top, 8)

                reel

                footer
                    .padding(.bottom, 96)
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 1.2).delay(0.15)) { appeared = true }
        }
    }

    private var pageIndex: Int { page ?? 0 }

    private var currentDish: Dish {
        featured[min(max(pageIndex, 0), featured.count - 1)]
    }

    // MARK: Header

    private var header: some View {
        VStack(spacing: 6) {
            Text("Dumpling Lab")
                .font(DL.display(34, weight: .medium))
                .foregroundStyle(DL.warmWhite)
            Text("A modern dumpling house")
                .overlineStyle(DL.sesame.opacity(0.85))
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 12)
    }

    // MARK: Reel

    private var reel: some View {
        GeometryReader { geo in
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 0) {
                    ForEach(Array(featured.enumerated()), id: \.element.id) { index, dish in
                        FeaturedDishCard(dish: dish, namespace: namespace)
                            .frame(width: geo.size.width)
                            .scrollTransition(axis: .horizontal) { view, phase in
                                view
                                    .scaleEffect(1 - abs(phase.value) * 0.14)
                                    .opacity(1 - abs(phase.value) * 0.5)
                                    .rotation3DEffect(
                                        .degrees(phase.value * -9),
                                        axis: (x: 0, y: 1, z: 0),
                                        perspective: 0.5
                                    )
                            }
                            .onTapGesture {
                                Haptics.tap()
                                withAnimation(.spring(response: 0.5, dampingFraction: 0.85)) {
                                    app.selectedDish = dish
                                }
                            }
                            .id(index)
                    }
                }
                .scrollTargetLayout()
            }
            .scrollTargetBehavior(.paging)
            .scrollPosition(id: $page)
            .onChange(of: page) { _, _ in Haptics.soft() }
        }
        .opacity(appeared ? 1 : 0)
        .scaleEffect(appeared ? 1 : 0.96)
    }

    // MARK: Footer

    private var footer: some View {
        VStack(spacing: 18) {
            // Pleat-style page indicator
            HStack(spacing: 7) {
                ForEach(featured.indices, id: \.self) { i in
                    Capsule()
                        .fill(i == pageIndex ? DL.sesame : DL.sesame.opacity(0.25))
                        .frame(width: i == pageIndex ? 22 : 6, height: 6)
                        .animation(.spring(response: 0.4, dampingFraction: 0.8), value: pageIndex)
                }
            }

            Button {
                Haptics.tap()
                withAnimation(.spring(response: 0.45, dampingFraction: 0.8)) { app.tab = .menu }
            } label: {
                HStack(spacing: 10) {
                    Text("Open the menu")
                        .font(DL.text(15, weight: .semibold))
                    Image(systemName: "arrow.right")
                        .font(.system(size: 13, weight: .semibold))
                }
                .foregroundStyle(DL.soyDark)
                .padding(.horizontal, 26).padding(.vertical, 14)
                .background(
                    Capsule().fill(
                        LinearGradient(colors: [DL.warmWhite, DL.cream], startPoint: .top, endPoint: .bottom)
                    )
                )
                .lightSweep(intensity: 0.25)
                .clipShape(Capsule())
                .dlShadow(radius: 18, y: 10, opacity: 0.35)
            }
            .buttonStyle(TactileButtonStyle())
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 16)
    }
}

// MARK: - Featured dish card

/// A single frame of the reel: studio artwork breathing under moving light,
/// with editorial captions below.
struct FeaturedDishCard: View {
    @Environment(AppState.self) private var app
    var dish: Dish
    var namespace: Namespace.ID

    private var isPresented: Bool { app.selectedDish?.id == dish.id }

    var body: some View {
        VStack(spacing: 4) {
            // The dish itself, slowly breathing (camera glide)
            TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { context in
                let t = context.date.timeIntervalSinceReferenceDate
                let breathe = 1 + 0.028 * sin(t * 0.45 + Double(dish.id.hashValue % 7))
                let sway = 4 * sin(t * 0.3 + Double(dish.id.hashValue % 5))
                DishArtView(dish: dish, backdrop: true)
                    .scaleEffect(breathe)
                    .offset(x: sway)
            }
            .lightSweep(intensity: 0.14)
            .matchedGeometryEffect(id: "hero-\(dish.id)", in: namespace, isSource: !isPresented)
            .opacity(isPresented ? 0 : 1)
            .background(alignment: .bottom) {
                // The table itself: a warm pool of reflected light
                Ellipse()
                    .fill(
                        RadialGradient(
                            colors: [DL.sesame.opacity(0.16), .clear],
                            center: .center, startRadius: 6, endRadius: 150
                        )
                    )
                    .frame(width: 290, height: 64)
                    .offset(y: 10)
                    .blur(radius: 6)
            }
            .frame(maxHeight: 400)
            .padding(.horizontal, 18)

            VStack(spacing: 10) {
                HStack(spacing: 8) {
                    if dish.isBestSeller { Badge(text: "Best Seller", tint: DL.red) }
                    if dish.isChefsChoice { Badge(text: "Chef's Choice", tint: DL.wood) }
                }
                .frame(height: 22)

                Text(dish.name)
                    .font(DL.display(27, weight: .semibold))
                    .foregroundStyle(DL.warmWhite)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)

                Text(dish.chineseName)
                    .overlineStyle(DL.sesame, size: 12)

                Text(dish.flavor)
                    .font(DL.text(14))
                    .foregroundStyle(DL.sesame.opacity(0.9))
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .padding(.horizontal, 40)

                Text(dish.priceLabel)
                    .font(DL.display(20, weight: .semibold))
                    .foregroundStyle(DL.warmWhite)
                    .padding(.top, 2)
            }
            .padding(.horizontal, 16)
        }
    }
}

struct Badge: View {
    var text: String
    var tint: Color

    var body: some View {
        Text(text)
            .font(.system(size: 10, weight: .bold))
            .textCase(.uppercase)
            .kerning(1.4)
            .foregroundStyle(DL.warmWhite)
            .padding(.horizontal, 10).padding(.vertical, 5)
            .background(Capsule().fill(tint))
    }
}

#Preview {
    RootView().environment(AppState())
}
