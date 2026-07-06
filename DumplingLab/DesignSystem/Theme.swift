import SwiftUI
import UIKit

/// Dumpling Lab design language.
/// Warm white · cream · natural wood · soy brown · sesame · deep red · soft black.
enum DL {
    // MARK: Palette

    static let warmWhite  = Color(red: 0.984, green: 0.976, blue: 0.960)
    static let cream      = Color(red: 0.965, green: 0.945, blue: 0.905)
    static let creamDeep  = Color(red: 0.935, green: 0.905, blue: 0.850)
    static let wood       = Color(red: 0.760, green: 0.620, blue: 0.460)
    static let woodDeep   = Color(red: 0.580, green: 0.435, blue: 0.290)
    static let soy        = Color(red: 0.310, green: 0.215, blue: 0.140)
    static let soyDark    = Color(red: 0.200, green: 0.135, blue: 0.085)
    static let sesame     = Color(red: 0.870, green: 0.800, blue: 0.660)
    static let red        = Color(red: 0.667, green: 0.208, blue: 0.180)
    static let redDeep    = Color(red: 0.510, green: 0.130, blue: 0.115)
    static let ink        = Color(red: 0.130, green: 0.115, blue: 0.100)
    static let inkSoft    = Color(red: 0.290, green: 0.260, blue: 0.230)
    static let inkFaint   = Color(red: 0.470, green: 0.430, blue: 0.385)
    static let jade       = Color(red: 0.390, green: 0.530, blue: 0.400)

    // MARK: Gradients

    static var canvas: LinearGradient {
        LinearGradient(
            colors: [warmWhite, cream],
            startPoint: .top, endPoint: .bottom
        )
    }

    static var heroNight: LinearGradient {
        LinearGradient(
            stops: [
                .init(color: Color(red: 0.145, green: 0.115, blue: 0.095), location: 0),
                .init(color: Color(red: 0.235, green: 0.170, blue: 0.125), location: 0.55),
                .init(color: Color(red: 0.130, green: 0.100, blue: 0.082), location: 1),
            ],
            startPoint: .topLeading, endPoint: .bottomTrailing
        )
    }

    // MARK: Type

    /// Large editorial serif — chapter openers, dish names.
    static func display(_ size: CGFloat, weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .serif)
    }

    /// Body & captions — quiet, modern.
    static func text(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .default)
    }

    /// Wide-tracked overline labels ("HANDMADE DAILY").
    static func overline(_ size: CGFloat = 11) -> Font {
        .system(size: size, weight: .semibold, design: .default)
    }
}

// MARK: - Haptics

enum Haptics {
    static func tap()    { UIImpactFeedbackGenerator(style: .light).impactOccurred() }
    static func soft()   { UIImpactFeedbackGenerator(style: .soft).impactOccurred() }
    static func medium() { UIImpactFeedbackGenerator(style: .medium).impactOccurred() }
    static func success() { UINotificationFeedbackGenerator().notificationOccurred(.success) }
    static func selection() { UISelectionFeedbackGenerator().selectionChanged() }
}

// MARK: - Text helpers

extension View {
    /// Wide-tracked uppercase label used across the app.
    func overlineStyle(_ color: Color = DL.inkFaint, size: CGFloat = 11) -> some View {
        self
            .font(DL.overline(size))
            .textCase(.uppercase)
            .kerning(2.2)
            .foregroundStyle(color)
    }
}
