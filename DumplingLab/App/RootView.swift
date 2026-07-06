import SwiftUI

struct RootView: View {
    @Environment(AppState.self) private var app
    @Namespace private var heroNamespace

    var body: some View {
        ZStack {
            DL.canvas.ignoresSafeArea()

            Group {
                switch app.tab {
                case .table:   HomeView(namespace: heroNamespace)
                case .menu:    MenuView(namespace: heroNamespace)
                case .host:    AssistantView()
                case .steamer: CartView()
                }
            }
            .transition(.opacity)

            // Floating glass dock
            VStack {
                Spacer()
                GlassDock()
                    .padding(.bottom, 12)
            }
            .ignoresSafeArea(.keyboard)
            .opacity(app.selectedDish == nil ? 1 : 0)

            // Drag-to-steamer layer
            DragLayer()

            // Dish detail, presented as a full canvas takeover
            if let dish = app.selectedDish {
                DishDetailView(dish: dish, namespace: heroNamespace)
                    .zIndex(10)
                    .transition(.asymmetric(
                        insertion: .opacity.animation(.easeOut(duration: 0.22)),
                        removal: .opacity.animation(.easeIn(duration: 0.18))
                    ))
            }
        }
        .animation(.spring(response: 0.5, dampingFraction: 0.86), value: app.tab)
        .animation(.spring(response: 0.5, dampingFraction: 0.86), value: app.selectedDish?.id)
    }
}

// MARK: - Glass dock

private struct GlassDock: View {
    @Environment(AppState.self) private var app
    @Namespace private var indicator

    var body: some View {
        HStack(spacing: 6) {
            ForEach(AppTab.allCases) { tab in
                dockItem(tab)
            }
        }
        .padding(6)
        .background {
            Capsule()
                .fill(.ultraThinMaterial)
                .overlay(
                    Capsule().strokeBorder(
                        LinearGradient(colors: [.white.opacity(0.65), .white.opacity(0.1)], startPoint: .topLeading, endPoint: .bottomTrailing),
                        lineWidth: 1
                    )
                )
        }
        .dlShadow(radius: 24, y: 12, opacity: 0.18)
        .padding(.horizontal, 24)
    }

    @ViewBuilder
    private func dockItem(_ tab: AppTab) -> some View {
        let selected = app.tab == tab
        Button {
            guard app.tab != tab else { return }
            Haptics.selection()
            withAnimation(.spring(response: 0.45, dampingFraction: 0.8)) { app.tab = tab }
        } label: {
            VStack(spacing: 3) {
                ZStack {
                    Image(systemName: tab.symbol)
                        .font(.system(size: 17, weight: .medium))
                        .symbolVariant(selected ? .fill : .none)
                    if tab == .steamer && app.cartCount > 0 {
                        Text("\(app.cartCount)")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 5).padding(.vertical, 2)
                            .background(Capsule().fill(DL.red))
                            .offset(x: 13, y: -11)
                    }
                }
                Text(tab.rawValue)
                    .font(.system(size: 10, weight: selected ? .semibold : .medium))
            }
            .foregroundStyle(selected ? DL.warmWhite : DL.inkSoft)
            .frame(width: 74, height: 52)
            .background {
                if selected {
                    Capsule()
                        .fill(LinearGradient(colors: [DL.soy, DL.soyDark], startPoint: .top, endPoint: .bottom))
                        .matchedGeometryEffect(id: "dock", in: indicator)
                }
            }
            .scaleEffect(tab == .steamer && app.steamerPulse ? 1.14 : 1)
        }
        .buttonStyle(TactileButtonStyle(scale: 0.92))
    }
}

// MARK: - Drag-to-steamer layer

/// Renders the floating morsel while a dish is being dragged,
/// plus a bamboo drop zone that rises from the bottom edge.
private struct DragLayer: View {
    @Environment(AppState.self) private var app

    var body: some View {
        GeometryReader { geo in
            ZStack {
                if let drag = app.drag {
                    // Drop zone
                    VStack {
                        Spacer()
                        SteamerDropZone(active: isOverDropZone(drag.location, in: geo.size))
                            .padding(.bottom, 8)
                    }
                    .transition(.move(edge: .bottom).combined(with: .opacity))

                    // The travelling morsel — food physically in your hand
                    DishArtView(dish: drag.dish, backdrop: false, steam: true)
                        .frame(width: 110, height: 110)
                        .scaleEffect(isOverDropZone(drag.location, in: geo.size) ? 0.7 : 1)
                        .position(drag.location)
                        .allowsHitTesting(false)
                        .transition(.scale(scale: 0.6).combined(with: .opacity))
                }
            }
            .animation(.spring(response: 0.35, dampingFraction: 0.75), value: app.drag == nil)
        }
        .ignoresSafeArea()
    }

    private func isOverDropZone(_ p: CGPoint, in size: CGSize) -> Bool {
        p.y > size.height - 190
    }
}

/// Where a drag lands: the steamer basket rendered as a warm target.
struct SteamerDropZone: View {
    var active: Bool

    var body: some View {
        VStack(spacing: 10) {
            ZStack {
                Circle()
                    .fill(LinearGradient(colors: [DL.wood, DL.woodDeep], startPoint: .top, endPoint: .bottom))
                    .frame(width: active ? 96 : 78, height: active ? 96 : 78)
                Circle()
                    .strokeBorder(DL.sesame.opacity(0.8), style: .init(lineWidth: 2, dash: [5, 6]))
                    .frame(width: active ? 78 : 62, height: active ? 78 : 62)
                Image(systemName: "basket.fill")
                    .font(.system(size: active ? 30 : 24))
                    .foregroundStyle(DL.warmWhite)
            }
            .dlShadow(radius: 18, y: 10, opacity: 0.3)
            Text(active ? "Release to steam" : "Drop it in the steamer")
                .overlineStyle(DL.soy)
        }
        .animation(.spring(response: 0.3, dampingFraction: 0.6), value: active)
    }
}

extension DragSession: Equatable {
    static func == (l: DragSession, r: DragSession) -> Bool {
        l.dish.id == r.dish.id && l.location == r.location
    }
}
