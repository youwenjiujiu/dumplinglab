import SwiftUI

// MARK: - Shader-backed modifiers

private struct LightSweepModifier: ViewModifier {
    var intensity: Double
    func body(content: Content) -> some View {
        TimelineView(.animation(minimumInterval: 1.0 / 40.0)) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            content.visualEffect { view, proxy in
                view.colorEffect(ShaderLibrary.lightSweep(
                    .float2(proxy.size),
                    .float(t.truncatingRemainder(dividingBy: 4000)),
                    .float(intensity)
                ))
            }
        }
    }
}

private struct PaperGrainModifier: ViewModifier {
    var amount: Double
    func body(content: Content) -> some View {
        content.colorEffect(ShaderLibrary.paperGrain(.float(amount)))
    }
}

private struct SoupRippleModifier: ViewModifier {
    var strength: Double
    func body(content: Content) -> some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            content.visualEffect { view, proxy in
                view.distortionEffect(
                    ShaderLibrary.soupRipple(
                        .float2(proxy.size),
                        .float(t.truncatingRemainder(dividingBy: 4000)),
                        .float(strength)
                    ),
                    maxSampleOffset: CGSize(width: 12, height: 12)
                )
            }
        }
    }
}

/// Animated steam wisps. Place over food; it renders white vapor into its bounds.
struct SteamVeil: View {
    var opacity: Double = 0.5
    var drift: Double = 0

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { context in
            let t = context.date.timeIntervalSinceReferenceDate + drift
            Rectangle()
                .fill(.white)
                .visualEffect { view, proxy in
                    view.colorEffect(ShaderLibrary.steamVeil(
                        .float2(proxy.size),
                        .float(t.truncatingRemainder(dividingBy: 4000)),
                        .float(opacity)
                    ))
                }
        }
        .allowsHitTesting(false)
    }
}

extension View {
    /// Slow warm studio light gliding across the view.
    func lightSweep(intensity: Double = 0.18) -> some View {
        modifier(LightSweepModifier(intensity: intensity))
    }

    /// Barely-there paper texture for large flat fields.
    func paperGrain(_ amount: Double = 0.02) -> some View {
        modifier(PaperGrainModifier(amount: amount))
    }

    /// Gentle concentric ripple, as if broth just settled.
    func soupRipple(strength: Double = 2.2) -> some View {
        modifier(SoupRippleModifier(strength: strength))
    }
}

// MARK: - Floating (idle levitation)

private struct FloatingModifier: ViewModifier {
    var amplitude: CGFloat
    var period: Double
    var phase: Double

    func body(content: Content) -> some View {
        TimelineView(.animation(minimumInterval: 1.0 / 40.0)) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            let y = sin((t / period + phase) * 2 * .pi) * amplitude
            let r = sin((t / (period * 1.7) + phase) * 2 * .pi) * 0.6
            content
                .offset(y: y)
                .rotationEffect(.degrees(r))
        }
    }
}

extension View {
    /// Cards should float slightly — a slow breath, never still.
    func floating(amplitude: CGFloat = 3, period: Double = 4.2, phase: Double = 0) -> some View {
        modifier(FloatingModifier(amplitude: amplitude, period: period, phase: phase))
    }
}

// MARK: - Tactile press

/// Buttons compress like something physical: scale + slight dim + haptic.
struct TactileButtonStyle: ButtonStyle {
    var scale: CGFloat = 0.96

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? scale : 1)
            .brightness(configuration.isPressed ? -0.03 : 0)
            .animation(.spring(response: 0.28, dampingFraction: 0.6), value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, pressed in
                if pressed { Haptics.soft() }
            }
    }
}

// MARK: - Parallax tilt

/// Drag anywhere on the card to tilt it in 3D; releases with a spring.
struct TiltModifier: ViewModifier {
    @State private var tilt: CGSize = .zero
    var maxAngle: Double = 7

    func body(content: Content) -> some View {
        content
            .rotation3DEffect(.degrees(-tilt.height * maxAngle), axis: (x: 1, y: 0, z: 0), perspective: 0.6)
            .rotation3DEffect(.degrees(tilt.width * maxAngle), axis: (x: 0, y: 1, z: 0), perspective: 0.6)
            .gesture(
                DragGesture(minimumDistance: 12)
                    .onChanged { value in
                        let w = max(-1, min(1, value.translation.width / 120))
                        let h = max(-1, min(1, value.translation.height / 120))
                        withAnimation(.interactiveSpring) { tilt = CGSize(width: w, height: h) }
                    }
                    .onEnded { _ in
                        withAnimation(.spring(response: 0.45, dampingFraction: 0.55)) { tilt = .zero }
                    }
            )
    }
}

extension View {
    func tiltsInSpace(maxAngle: Double = 7) -> some View {
        modifier(TiltModifier(maxAngle: maxAngle))
    }
}

// MARK: - Scroll parallax

extension View {
    /// Vertical parallax driven by position in the scroll viewport.
    func scrollParallax(_ strength: CGFloat = 26) -> some View {
        visualEffect { view, proxy in
            let frame = proxy.frame(in: .scrollView(axis: .vertical))
            let mid = frame.midY
            let viewport = proxy.bounds(of: .scrollView(axis: .vertical))?.height ?? 800
            let progress = (mid / max(viewport, 1)) - 0.5   // -0.5 top … 0.5 bottom
            return view.offset(y: progress * strength)
        }
    }
}

// MARK: - Soft card shadow

extension View {
    /// The house shadow: two-layer, warm, soft.
    func dlShadow(radius: CGFloat = 22, y: CGFloat = 14, opacity: Double = 0.14) -> some View {
        self
            .shadow(color: DL.soyDark.opacity(opacity), radius: radius, x: 0, y: y)
            .shadow(color: DL.soyDark.opacity(opacity * 0.45), radius: radius * 0.28, x: 0, y: y * 0.3)
    }
}
