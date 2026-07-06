import SwiftUI

/// Procedural studio artwork for every dish — one consistent visual language:
/// soft key light from the upper left, warm glow backdrop, deep contact shadow,
/// minimal ceramics, food built from layered gradients.
struct DishArtView: View {
    var dish: Dish
    /// Dark cinematic backdrop (hero) vs. transparent (cards on cream).
    var backdrop: Bool = true
    var steam: Bool = true
    /// 0…1 — signature "the dumpling opens" reveal (detail page).
    var reveal: CGFloat = 0

    var body: some View {
        GeometryReader { geo in
            let s = min(geo.size.width, geo.size.height)
            ZStack {
                if backdrop {
                    RadialGradient(
                        colors: [dish.palette.glow.color.opacity(0.9), .clear],
                        center: .init(x: 0.5, y: 0.42),
                        startRadius: s * 0.05, endRadius: s * 0.62
                    )
                }

                // Contact shadow — the food sits on something real.
                Ellipse()
                    .fill(Color.black.opacity(backdrop ? 0.42 : 0.16))
                    .frame(width: s * 0.62, height: s * 0.13)
                    .blur(radius: s * 0.035)
                    .offset(y: s * 0.30)

                food(size: s)
                    .frame(width: s * 0.78, height: s * 0.78)

                if steam && isHot {
                    SteamVeil(opacity: backdrop ? 0.42 : 0.25, drift: Double(dish.id.hashValue % 97))
                        .frame(width: s * 0.5, height: s * 0.62)
                        .offset(y: -s * 0.22)
                        .blendMode(backdrop ? .screen : .normal)
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .aspectRatio(1, contentMode: .fit)
    }

    private var isHot: Bool {
        dish.section != .desserts && dish.id != "cucumber-smash" && dish.id != "smacked-eggplant"
    }

    @ViewBuilder
    private func food(size s: CGFloat) -> some View {
        switch dish.art {
        case .pleatedDumpling:
            DumplingFigure(palette: dish.palette, crisped: false, reveal: reveal)
        case .pleatedDumplingCrisped:
            DumplingFigure(palette: dish.palette, crisped: true, reveal: reveal)
        case .soupDumpling:
            SoupDumplingFigure(palette: dish.palette)
        case .wonton:
            BowlFigure(palette: dish.palette, contents: .wontons)
        case .noodleBowl:
            BowlFigure(palette: dish.palette, contents: .noodles)
        case .riceBowl:
            BowlFigure(palette: dish.palette, contents: .rice)
        case .soupBowl:
            BowlFigure(palette: dish.palette, contents: .broth)
        case .sidePlate:
            PlateFigure(palette: dish.palette, contents: .chunks)
        case .greens:
            PlateFigure(palette: dish.palette, contents: .leaves)
        case .dessertCup:
            DessertFigure(palette: dish.palette)
        }
    }
}

// MARK: - Dumpling

/// The house crescent: a plump half-moon with pleats along the crown.
struct DumplingShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        let w = rect.width, h = rect.height
        // Belly (bottom arc)
        p.move(to: CGPoint(x: 0.06 * w, y: 0.62 * h))
        p.addCurve(
            to: CGPoint(x: 0.94 * w, y: 0.62 * h),
            control1: CGPoint(x: 0.18 * w, y: 1.04 * h),
            control2: CGPoint(x: 0.82 * w, y: 1.04 * h)
        )
        // Crown (top arc back to start)
        p.addCurve(
            to: CGPoint(x: 0.06 * w, y: 0.62 * h),
            control1: CGPoint(x: 0.80 * w, y: 0.10 * h),
            control2: CGPoint(x: 0.20 * w, y: 0.10 * h)
        )
        p.closeSubpath()
        return p
    }
}

/// Pleat creases fanned along the crown.
struct PleatsShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        let w = rect.width, h = rect.height
        let center = CGPoint(x: 0.5 * w, y: 0.95 * h)
        for i in 0..<7 {
            let t = CGFloat(i) / 6.0
            let angle = CGFloat(Angle.degrees(Double(210 + t * 120)).radians)
            let rOuter = 0.62 * h
            let ca = cos(angle), sa = sin(angle)
            let outer = CGPoint(x: center.x + ca * rOuter * 1.25, y: center.y + sa * rOuter)
            let inner = CGPoint(
                x: center.x + ca * rOuter * 0.62,
                y: center.y + sa * rOuter * 0.55
            )
            p.move(to: inner)
            p.addQuadCurve(to: outer, control: CGPoint(x: (inner.x + outer.x) / 2, y: inner.y - 0.06 * h))
        }
        return p
    }
}

struct DumplingFigure: View {
    var palette: DishPalette
    var crisped: Bool
    /// 0…1: how "open" the dumpling is (detail-page signature animation).
    var reveal: CGFloat = 0

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width, h = geo.size.height
            ZStack {
                // Two companions resting behind.
                dumpling(w: w * 0.56, opened: false)
                    .offset(x: -w * 0.24, y: h * 0.16)
                    .opacity(0.9)
                dumpling(w: w * 0.52, opened: false)
                    .offset(x: w * 0.26, y: h * 0.18)
                    .opacity(0.85)
                // Hero dumpling.
                dumpling(w: w * 0.80, opened: true)
                    .offset(y: -h * 0.04)
            }
            .frame(width: w, height: h)
        }
    }

    @ViewBuilder
    private func dumpling(w: CGFloat, opened: Bool) -> some View {
        let h = w * 0.62
        ZStack {
            // Body
            DumplingShape()
                .fill(
                    LinearGradient(
                        colors: [
                            palette.skin.color.opacity(1),
                            palette.skin.color.opacity(0.86),
                        ],
                        startPoint: .top, endPoint: .bottom
                    )
                )
                .overlay(
                    // Key light from upper left
                    DumplingShape()
                        .fill(
                            RadialGradient(
                                colors: [.white.opacity(0.55), .clear],
                                center: .init(x: 0.34, y: 0.28),
                                startRadius: 0, endRadius: w * 0.5
                            )
                        )
                )
                .overlay(
                    // Ambient occlusion at the base
                    DumplingShape()
                        .fill(
                            LinearGradient(
                                colors: [.clear, .clear, Color.black.opacity(0.18)],
                                startPoint: .top, endPoint: .bottom
                            )
                        )
                )

            // Golden crisped base for pan-fried — hugs the silhouette
            if crisped {
                DumplingShape()
                    .fill(
                        LinearGradient(
                            stops: [
                                .init(color: .clear, location: 0),
                                .init(color: .clear, location: 0.52),
                                .init(color: palette.accent.color.opacity(0.85), location: 0.86),
                                .init(color: palette.accent.color, location: 1),
                            ],
                            startPoint: .top, endPoint: .bottom
                        )
                    )
            }

            // Filling reveal (signature animation): the wrapper parts and
            // the filling glistens through a clean bite-window.
            if opened, reveal > 0.01 {
                ZStack {
                    Ellipse()
                        .fill(
                            RadialGradient(
                                colors: [
                                    palette.accent.color.darker(-0.06),
                                    palette.accent.color.darker(0.22),
                                ],
                                center: .init(x: 0.38, y: 0.32),
                                startRadius: 0, endRadius: w * 0.13
                            )
                        )
                        .overlay(Ellipse().strokeBorder(palette.skin.color.darker(0.30).opacity(0.8), lineWidth: max(1, w * 0.012)))
                        .overlay(
                            // Gloss — the juice catching the key light
                            Ellipse()
                                .fill(.white.opacity(0.5))
                                .frame(width: w * 0.055, height: h * 0.05)
                                .offset(x: -w * 0.045, y: -h * 0.055)
                                .blur(radius: 1)
                        )
                    // A single bead of juice at the lip
                    Circle()
                        .fill(palette.accent.color.darker(0.10).opacity(0.9))
                        .frame(width: w * 0.045, height: w * 0.045)
                        .offset(x: w * 0.03, y: h * 0.16)
                        .opacity(reveal > 0.7 ? 1 : 0)
                }
                .frame(width: w * 0.24 * reveal, height: h * 0.26 * reveal)
                .offset(x: w * 0.20, y: -h * 0.10)
                .opacity(Double(min(reveal * 1.4, 1)))
            }

            // Pleats
            PleatsShape()
                .stroke(
                    palette.skin.color.darker(0.28),
                    style: StrokeStyle(lineWidth: max(1, w * 0.012), lineCap: .round)
                )
                .opacity(0.7)
        }
        .frame(width: w, height: h)
        .dlShadow(radius: w * 0.10, y: w * 0.05, opacity: 0.28)
    }
}

// MARK: - Soup dumpling (xiao long bao)

struct SoupDumplingFigure: View {
    var palette: DishPalette

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            ZStack {
                // Bamboo steamer base
                SteamerBasketShape()
                    .fill(
                        LinearGradient(
                            colors: [DL.wood, DL.woodDeep],
                            startPoint: .top, endPoint: .bottom
                        )
                    )
                    .frame(width: w * 0.92, height: w * 0.30)
                    .offset(y: w * 0.20)
                    .dlShadow(radius: w * 0.07, y: w * 0.04, opacity: 0.3)

                // Three buns
                bun(w: w * 0.30).offset(x: -w * 0.25, y: w * 0.10)
                bun(w: w * 0.30).offset(x: w * 0.25, y: w * 0.10)
                bun(w: w * 0.38).offset(y: -w * 0.02)
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
    }

    private func bun(w: CGFloat) -> some View {
        ZStack {
            Circle()
                .fill(
                    RadialGradient(
                        colors: [palette.skin.color, palette.skin.color.darker(0.12)],
                        center: .init(x: 0.35, y: 0.3),
                        startRadius: 0, endRadius: w * 0.75
                    )
                )
            // Top swirl
            SwirlShape()
                .stroke(palette.skin.color.darker(0.25), style: .init(lineWidth: max(1, w * 0.03), lineCap: .round))
                .frame(width: w * 0.5, height: w * 0.5)
                .offset(y: -w * 0.16)
                .opacity(0.75)
            // Broth glow at the base — you can almost see the soup inside
            Ellipse()
                .fill(palette.accent.color.opacity(0.35))
                .frame(width: w * 0.8, height: w * 0.32)
                .offset(y: w * 0.28)
                .blur(radius: w * 0.06)
                .mask(Circle())
        }
        .frame(width: w, height: w)
        .dlShadow(radius: w * 0.10, y: w * 0.06, opacity: 0.25)
    }
}

struct SwirlShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        let c = CGPoint(x: rect.midX, y: rect.midY)
        var r = rect.width * 0.08
        var angle: CGFloat = 0
        p.move(to: c)
        while r < rect.width * 0.5 {
            let pt = CGPoint(x: c.x + cos(angle) * r, y: c.y + sin(angle) * r * 0.5)
            p.addLine(to: pt)
            angle += 0.35
            r += rect.width * 0.012
        }
        return p
    }
}

struct SteamerBasketShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        let w = rect.width, h = rect.height
        p.addEllipse(in: CGRect(x: 0, y: 0, width: w, height: h * 0.55))
        p.addRect(CGRect(x: 0, y: h * 0.27, width: w, height: h * 0.55))
        p.addEllipse(in: CGRect(x: 0, y: h * 0.55, width: w, height: h * 0.45))
        return p
    }
}

// MARK: - Bowls (noodles, rice, broth, wontons)

struct BowlFigure: View {
    enum Contents { case noodles, rice, broth, wontons }
    var palette: DishPalette
    var contents: Contents

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            ZStack {
                // Liquid / contents surface
                surface(w: w)
                    .frame(width: w * 0.74, height: w * 0.30)
                    .offset(y: -w * 0.055)

                // Bowl body drawn over the lower half of the surface
                BowlShape()
                    .fill(
                        LinearGradient(
                            colors: [Color(red: 0.99, green: 0.985, blue: 0.97), Color(red: 0.88, green: 0.86, blue: 0.82)],
                            startPoint: .top, endPoint: .bottom
                        )
                    )
                    .overlay(
                        BowlShape().fill(
                            LinearGradient(
                                colors: [.clear, DL.soy.opacity(0.10)],
                                startPoint: .top, endPoint: .bottom
                            )
                        )
                    )
                    .frame(width: w * 0.80, height: w * 0.42)
                    .offset(y: w * 0.13)
                    .dlShadow(radius: w * 0.08, y: w * 0.05, opacity: 0.25)

                // Garnish on top
                garnish(w: w)
                    .offset(y: -w * 0.08)
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
    }

    @ViewBuilder
    private func surface(w: CGFloat) -> some View {
        let base = Ellipse().fill(
            RadialGradient(
                colors: [palette.skin.color, palette.skin.color.darker(0.16)],
                center: .init(x: 0.42, y: 0.35),
                startRadius: 0, endRadius: w * 0.42
            )
        )
        switch contents {
        case .broth:
            base.soupRipple(strength: 2.4)
                .overlay(
                    Ellipse()
                        .fill(RadialGradient(colors: [.white.opacity(0.35), .clear], center: .init(x: 0.35, y: 0.3), startRadius: 0, endRadius: w * 0.25))
                )
        case .noodles:
            base.overlay(NoodleStrands(color: palette.skin.color.darker(0.30)).opacity(0.8))
        case .rice:
            base.overlay(RiceGrains(color: .white.opacity(0.75), accent: palette.accent.color))
        case .wontons:
            base.soupRipple(strength: 1.6)
                .overlay(
                    HStack(spacing: -w * 0.035) {
                        ForEach(0..<3, id: \.self) { i in
                            WontonBlob()
                                .fill(
                                    RadialGradient(
                                        colors: [Color(red: 0.99, green: 0.95, blue: 0.87), palette.skin.color.darker(0.10)],
                                        center: .init(x: 0.4, y: 0.3), startRadius: 0, endRadius: w * 0.12
                                    )
                                )
                                .frame(width: w * 0.20, height: w * 0.15)
                                .rotationEffect(.degrees(Double(i * 24 - 24)))
                                .offset(y: CGFloat(i % 2) * -w * 0.02)
                        }
                    }
                )
        }
    }

    @ViewBuilder
    private func garnish(w: CGFloat) -> some View {
        switch contents {
        case .noodles:
            ZStack {
                // Six-minute egg
                Circle()
                    .fill(RadialGradient(colors: [Color(red: 1, green: 0.98, blue: 0.93), Color(red: 0.92, green: 0.88, blue: 0.80)], center: .init(x: 0.4, y: 0.35), startRadius: 0, endRadius: w * 0.07))
                    .frame(width: w * 0.13, height: w * 0.13)
                    .overlay(
                        Circle().fill(Color(red: 0.98, green: 0.72, blue: 0.25))
                            .frame(width: w * 0.062, height: w * 0.062)
                            .offset(x: w * 0.01, y: w * 0.004)
                    )
                    .offset(x: w * 0.16, y: -w * 0.02)
                greensSprig(w: w).offset(x: -w * 0.18, y: -w * 0.03)
            }
        case .broth, .wontons:
            greensSprig(w: w).offset(x: -w * 0.14, y: -w * 0.05)
        case .rice:
            greensSprig(w: w).offset(x: w * 0.12, y: -w * 0.05)
        }
    }

    private func greensSprig(w: CGFloat) -> some View {
        HStack(spacing: w * 0.008) {
            ForEach(0..<3, id: \.self) { i in
                Capsule()
                    .fill(DL.jade.darker(CGFloat(i) * 0.06))
                    .frame(width: w * 0.02, height: w * 0.07)
                    .rotationEffect(.degrees(Double(i * 18 - 18)))
            }
        }
    }
}

struct BowlShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        let w = rect.width, h = rect.height
        p.move(to: CGPoint(x: 0.03 * w, y: 0.06 * h))
        p.addCurve(
            to: CGPoint(x: 0.97 * w, y: 0.06 * h),
            control1: CGPoint(x: 0.16 * w, y: 1.10 * h),
            control2: CGPoint(x: 0.84 * w, y: 1.10 * h)
        )
        // Rim ellipse top
        p.addCurve(
            to: CGPoint(x: 0.03 * w, y: 0.06 * h),
            control1: CGPoint(x: 0.80 * w, y: -0.06 * h),
            control2: CGPoint(x: 0.20 * w, y: -0.06 * h)
        )
        p.closeSubpath()
        return p
    }
}

struct WontonBlob: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        let w = rect.width, h = rect.height
        p.move(to: CGPoint(x: 0.1 * w, y: 0.7 * h))
        p.addCurve(to: CGPoint(x: 0.5 * w, y: 0.08 * h), control1: CGPoint(x: 0.05 * w, y: 0.3 * h), control2: CGPoint(x: 0.3 * w, y: 0.05 * h))
        p.addCurve(to: CGPoint(x: 0.92 * w, y: 0.62 * h), control1: CGPoint(x: 0.75 * w, y: 0.12 * h), control2: CGPoint(x: 0.98 * w, y: 0.3 * h))
        p.addCurve(to: CGPoint(x: 0.1 * w, y: 0.7 * h), control1: CGPoint(x: 0.8 * w, y: 1.0 * h), control2: CGPoint(x: 0.25 * w, y: 1.0 * h))
        p.closeSubpath()
        return p
    }
}

struct NoodleStrands: View {
    var color: Color
    var body: some View {
        Canvas { ctx, size in
            for i in 0..<9 {
                var path = Path()
                let t = CGFloat(i) / 8.0
                let y0 = size.height * (0.25 + 0.55 * t)
                path.move(to: CGPoint(x: size.width * 0.12, y: y0))
                path.addCurve(
                    to: CGPoint(x: size.width * 0.88, y: y0 + sin(t * 9) * 5),
                    control1: CGPoint(x: size.width * 0.4, y: y0 - 8 - t * 6),
                    control2: CGPoint(x: size.width * 0.6, y: y0 + 8 - t * 4)
                )
                ctx.stroke(path, with: .color(color.opacity(0.55)), style: .init(lineWidth: max(1.5, size.width * 0.014), lineCap: .round))
            }
        }
    }
}

struct RiceGrains: View {
    var color: Color
    var accent: Color
    var body: some View {
        Canvas { ctx, size in
            var seed: UInt64 = 12643
            func rnd() -> CGFloat {
                seed = seed &* 6364136223846793005 &+ 1442695040888963407
                return CGFloat(seed >> 33) / CGFloat(UInt32.max)
            }
            for i in 0..<70 {
                let a = rnd() * 2 * .pi
                let r = sqrt(rnd()) * 0.44
                let x = size.width * (0.5 + cos(a) * r)
                let y = size.height * (0.48 + sin(a) * r * 0.85)
                let grain = CGRect(x: x, y: y, width: size.width * 0.030, height: size.width * 0.014)
                var c = ctx
                c.translateBy(x: grain.midX, y: grain.midY)
                c.rotate(by: .radians(Double(rnd() * .pi)))
                let isAccent = i % 11 == 0
                c.fill(
                    Path(ellipseIn: CGRect(x: -grain.width / 2, y: -grain.height / 2, width: grain.width, height: grain.height)),
                    with: .color(isAccent ? accent : color)
                )
            }
        }
    }
}

// MARK: - Plates (sides, greens)

struct PlateFigure: View {
    enum Contents { case chunks, leaves }
    var palette: DishPalette
    var contents: Contents

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            ZStack {
                // Plate
                Ellipse()
                    .fill(
                        LinearGradient(colors: [Color(red: 0.99, green: 0.985, blue: 0.97), Color(red: 0.90, green: 0.88, blue: 0.84)], startPoint: .top, endPoint: .bottom)
                    )
                    .frame(width: w * 0.86, height: w * 0.34)
                    .offset(y: w * 0.10)
                    .dlShadow(radius: w * 0.07, y: w * 0.045, opacity: 0.22)
                Ellipse()
                    .stroke(DL.soy.opacity(0.08), lineWidth: 1)
                    .frame(width: w * 0.70, height: w * 0.26)
                    .offset(y: w * 0.09)

                pile(w: w).offset(y: -w * 0.01)
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
    }

    @ViewBuilder
    private func pile(w: CGFloat) -> some View {
        Canvas { ctx, size in
            var seed: UInt64 = contents == .chunks ? 777 : 4242
            func rnd() -> CGFloat {
                seed = seed &* 6364136223846793005 &+ 1442695040888963407
                return CGFloat(seed >> 33) / CGFloat(UInt32.max)
            }
            let count = contents == .chunks ? 12 : 14
            for i in 0..<count {
                let a = rnd() * 2 * .pi
                let r = sqrt(rnd()) * 0.20
                let x = size.width * (0.5 + cos(a) * r)
                let y = size.height * (0.52 + sin(a) * r * 0.6 - 0.02 * CGFloat(i % 3))
                var c = ctx
                c.translateBy(x: x, y: y)
                c.rotate(by: .radians(Double(rnd() * .pi)))
                let shade = 0.85 + rnd() * 0.15
                if contents == .chunks {
                    let s = size.width * (0.085 + rnd() * 0.05)
                    let rect = CGRect(x: -s / 2, y: -s * 0.35, width: s, height: s * 0.7)
                    c.fill(Path(roundedRect: rect, cornerRadius: s * 0.25), with: .color(palette.skin.color.opacity(shade)))
                    c.fill(Path(ellipseIn: CGRect(x: -s * 0.3, y: -s * 0.28, width: s * 0.35, height: s * 0.2)), with: .color(.white.opacity(0.35)))
                } else {
                    let s = size.width * (0.10 + rnd() * 0.06)
                    var leaf = Path()
                    leaf.move(to: CGPoint(x: 0, y: s * 0.4))
                    leaf.addQuadCurve(to: CGPoint(x: 0, y: -s * 0.4), control: CGPoint(x: s * 0.42, y: 0))
                    leaf.addQuadCurve(to: CGPoint(x: 0, y: s * 0.4), control: CGPoint(x: -s * 0.42, y: 0))
                    c.fill(leaf, with: .color(palette.skin.color.opacity(shade)))
                }
                if i % 5 == 0 {
                    c.fill(Path(ellipseIn: CGRect(x: -2, y: -2, width: 4, height: 4)), with: .color(palette.accent.color))
                }
            }
        }
        .frame(width: w * 0.7, height: w * 0.5)
    }
}

// MARK: - Dessert

struct DessertFigure: View {
    var palette: DishPalette

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            ZStack {
                // Glass cup
                CupShape()
                    .fill(
                        LinearGradient(
                            colors: [palette.skin.color, palette.skin.color.darker(0.10)],
                            startPoint: .top, endPoint: .bottom
                        )
                    )
                    .overlay(
                        CupShape().fill(
                            LinearGradient(colors: [.white.opacity(0.45), .clear, .white.opacity(0.15)], startPoint: .leading, endPoint: .trailing)
                        )
                    )
                    .frame(width: w * 0.44, height: w * 0.52)
                    .offset(y: w * 0.05)
                    .dlShadow(radius: w * 0.07, y: w * 0.05, opacity: 0.2)

                // Topping layer
                Ellipse()
                    .fill(
                        RadialGradient(colors: [palette.accent.color, palette.accent.color.darker(0.10)], center: .init(x: 0.4, y: 0.3), startRadius: 0, endRadius: w * 0.2)
                    )
                    .frame(width: w * 0.40, height: w * 0.13)
                    .offset(y: -w * 0.20)

                // Pearls
                HStack(spacing: w * 0.02) {
                    ForEach(0..<4, id: \.self) { i in
                        Circle()
                            .fill(Color.white.opacity(0.85))
                            .frame(width: w * 0.045, height: w * 0.045)
                            .offset(y: CGFloat(i % 2) * -w * 0.015)
                    }
                }
                .offset(y: -w * 0.235)

                // Mint
                Capsule()
                    .fill(DL.jade)
                    .frame(width: w * 0.02, height: w * 0.08)
                    .rotationEffect(.degrees(-18))
                    .offset(x: w * 0.10, y: -w * 0.28)
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
    }
}

struct CupShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        let w = rect.width, h = rect.height
        p.move(to: CGPoint(x: 0, y: 0.06 * h))
        p.addCurve(to: CGPoint(x: 0.14 * w, y: h), control1: CGPoint(x: 0.02 * w, y: 0.5 * h), control2: CGPoint(x: 0.06 * w, y: 0.85 * h))
        p.addQuadCurve(to: CGPoint(x: 0.86 * w, y: h), control: CGPoint(x: 0.5 * w, y: 1.06 * h))
        p.addCurve(to: CGPoint(x: w, y: 0.06 * h), control1: CGPoint(x: 0.94 * w, y: 0.85 * h), control2: CGPoint(x: 0.98 * w, y: 0.5 * h))
        p.addQuadCurve(to: CGPoint(x: 0, y: 0.06 * h), control: CGPoint(x: 0.5 * w, y: -0.02 * h))
        p.closeSubpath()
        return p
    }
}

// MARK: - Color helper

extension Color {
    /// Darken by blending toward black in sRGB.
    func darker(_ amount: CGFloat) -> Color {
        let ui = UIColor(self)
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        ui.getRed(&r, green: &g, blue: &b, alpha: &a)
        return Color(red: Double(r * (1 - amount)), green: Double(g * (1 - amount)), blue: Double(b * (1 - amount)), opacity: Double(a))
    }
}

#Preview("Dish art") {
    ScrollView {
        LazyVGrid(columns: [GridItem(), GridItem()]) {
            ForEach(Menu.featured) { dish in
                DishArtView(dish: dish)
                    .background(DL.heroNight)
                    .clipShape(RoundedRectangle(cornerRadius: 24))
            }
        }
        .padding()
    }
}
