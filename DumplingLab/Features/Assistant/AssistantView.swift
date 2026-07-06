import SwiftUI

struct ChatMessage: Identifiable, Equatable {
    enum Role { case guest, host }
    let id = UUID()
    var role: Role
    var text: String
    var dishes: [Dish] = []
    var sets: [MealSet] = []
    var followUp: String?

    static func == (l: ChatMessage, r: ChatMessage) -> Bool { l.id == r.id }
}

/// The Host — a conversation, not a chatbot. Warm typography, dish cards
/// and composed meals appear inline as the host "sets the table".
struct AssistantView: View {
    @Environment(AppState.self) private var app

    @State private var messages: [ChatMessage] = [
        ChatMessage(
            role: .host,
            text: "Good evening — welcome to Dumpling Lab. I'm your host. Tell me what you're in the mood for and I'll compose the meal around you.",
            followUp: "Spicy? Gentle? Feeding two? I know this menu by heart."
        )
    ]
    @State private var draft = ""
    @State private var hostIsThinking = false
    @FocusState private var inputFocused: Bool

    var body: some View {
        ZStack {
            DL.canvas.ignoresSafeArea()

            VStack(spacing: 0) {
                header

                ScrollViewReader { proxy in
                    ScrollView(showsIndicators: false) {
                        LazyVStack(spacing: 18) {
                            ForEach(messages) { message in
                                MessageView(message: message)
                                    .id(message.id)
                                    .transition(.asymmetric(
                                        insertion: .move(edge: .bottom).combined(with: .opacity),
                                        removal: .opacity
                                    ))
                            }
                            if hostIsThinking {
                                TypingIndicator().id("typing")
                            }
                            Color.clear.frame(height: 8).id("bottom")
                        }
                        .padding(.horizontal, 18)
                        .padding(.top, 14)
                    }
                    .onChange(of: messages.count) { _, _ in
                        withAnimation(.spring(response: 0.5, dampingFraction: 0.9)) {
                            proxy.scrollTo("bottom", anchor: .bottom)
                        }
                    }
                    .onChange(of: hostIsThinking) { _, thinking in
                        if thinking {
                            withAnimation { proxy.scrollTo("typing", anchor: .bottom) }
                        }
                    }
                }

                suggestionChips
                inputBar
                    .padding(.bottom, 86)
            }
        }
        .animation(.spring(response: 0.5, dampingFraction: 0.85), value: messages.count)
    }

    private var header: some View {
        VStack(spacing: 3) {
            Text("The Host")
                .font(DL.display(26, weight: .semibold))
                .foregroundStyle(DL.ink)
            Text("Ask like you would at the door")
                .overlineStyle()
        }
        .padding(.top, 14)
        .padding(.bottom, 6)
    }

    private var suggestionChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(HostEngine.suggestions, id: \.self) { suggestion in
                    Button {
                        send(suggestion)
                    } label: {
                        Text(suggestion)
                            .font(DL.text(12, weight: .medium))
                            .foregroundStyle(DL.soy)
                            .padding(.horizontal, 13).padding(.vertical, 8)
                            .background(Capsule().fill(DL.warmWhite))
                            .overlay(Capsule().strokeBorder(DL.creamDeep, lineWidth: 1))
                    }
                    .buttonStyle(TactileButtonStyle(scale: 0.93))
                }
            }
            .padding(.horizontal, 18)
        }
        .padding(.vertical, 8)
    }

    private var inputBar: some View {
        HStack(spacing: 10) {
            TextField("Tell me what you're craving…", text: $draft, axis: .vertical)
                .font(DL.text(15))
                .focused($inputFocused)
                .lineLimit(1...3)
                .padding(.horizontal, 18).padding(.vertical, 13)
                .background(Capsule().fill(DL.warmWhite))
                .overlay(Capsule().strokeBorder(DL.creamDeep, lineWidth: 1))
                .onSubmit { send(draft) }

            Button {
                send(draft)
            } label: {
                Image(systemName: "arrow.up")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(DL.warmWhite)
                    .frame(width: 44, height: 44)
                    .background(
                        Circle().fill(
                            draft.trimmingCharacters(in: .whitespaces).isEmpty
                                ? AnyShapeStyle(DL.inkFaint.opacity(0.4))
                                : AnyShapeStyle(LinearGradient(colors: [DL.red, DL.redDeep], startPoint: .top, endPoint: .bottom))
                        )
                    )
            }
            .buttonStyle(TactileButtonStyle(scale: 0.88))
            .disabled(draft.trimmingCharacters(in: .whitespaces).isEmpty)
        }
        .padding(.horizontal, 18)
        .dlShadow(radius: 14, y: 8, opacity: 0.08)
    }

    private func send(_ text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        Haptics.tap()
        draft = ""
        messages.append(ChatMessage(role: .guest, text: trimmed))
        hostIsThinking = true

        // The host takes a considered breath before answering.
        let delay = Double.random(in: 0.8...1.4)
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            let reply = HostEngine.reply(to: trimmed)
            hostIsThinking = false
            messages.append(ChatMessage(
                role: .host, text: reply.text,
                dishes: reply.dishes, sets: reply.sets, followUp: reply.followUp
            ))
            Haptics.soft()
        }
    }
}

// MARK: - Message rendering

private struct MessageView: View {
    @Environment(AppState.self) private var app
    var message: ChatMessage

    var body: some View {
        VStack(alignment: message.role == .guest ? .trailing : .leading, spacing: 12) {
            bubble

            if !message.dishes.isEmpty {
                dishRow
            }
            ForEach(message.sets) { set in
                MealSetCard(set: set)
            }
            if let followUp = message.followUp {
                Text(followUp)
                    .font(DL.text(12))
                    .italic()
                    .foregroundStyle(DL.inkFaint)
                    .padding(.leading, 6)
            }
        }
        .frame(maxWidth: .infinity, alignment: message.role == .guest ? .trailing : .leading)
    }

    private var bubble: some View {
        Text(message.text)
            .font(message.role == .host ? DL.display(16, weight: .regular) : DL.text(15))
            .lineSpacing(3)
            .foregroundStyle(message.role == .guest ? DL.warmWhite : DL.ink)
            .padding(.horizontal, 17).padding(.vertical, 12)
            .background {
                if message.role == .guest {
                    UnevenRoundedRectangle(topLeadingRadius: 22, bottomLeadingRadius: 22, bottomTrailingRadius: 6, topTrailingRadius: 22, style: .continuous)
                        .fill(LinearGradient(colors: [DL.soy, DL.soyDark], startPoint: .top, endPoint: .bottom))
                } else {
                    UnevenRoundedRectangle(topLeadingRadius: 6, bottomLeadingRadius: 22, bottomTrailingRadius: 22, topTrailingRadius: 22, style: .continuous)
                        .fill(DL.warmWhite)
                        .overlay(
                            UnevenRoundedRectangle(topLeadingRadius: 6, bottomLeadingRadius: 22, bottomTrailingRadius: 22, topTrailingRadius: 22, style: .continuous)
                                .strokeBorder(DL.creamDeep.opacity(0.9), lineWidth: 1)
                        )
                }
            }
            .dlShadow(radius: 10, y: 6, opacity: 0.07)
            .frame(maxWidth: 300, alignment: message.role == .guest ? .trailing : .leading)
    }

    private var dishRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(message.dishes) { dish in
                    Button {
                        Haptics.tap()
                        withAnimation(.spring(response: 0.5, dampingFraction: 0.85)) {
                            app.selectedDish = dish
                        }
                    } label: {
                        VStack(alignment: .leading, spacing: 5) {
                            DishArtView(dish: dish, backdrop: false, steam: false)
                                .frame(width: 116, height: 96)
                            Text(dish.name)
                                .font(DL.text(12, weight: .semibold))
                                .foregroundStyle(DL.ink)
                                .lineLimit(2)
                                .multilineTextAlignment(.leading)
                                .frame(height: 30, alignment: .top)
                            HStack {
                                Text(dish.priceLabel)
                                    .font(DL.text(12, weight: .medium))
                                    .foregroundStyle(DL.soy)
                                Spacer()
                                Button {
                                    withAnimation { app.add(dish) }
                                } label: {
                                    Image(systemName: "plus.circle.fill")
                                        .font(.system(size: 19))
                                        .foregroundStyle(DL.red)
                                }
                            }
                        }
                        .frame(width: 128)
                        .padding(10)
                        .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(DL.warmWhite))
                        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(DL.creamDeep.opacity(0.9), lineWidth: 1))
                    }
                    .buttonStyle(TactileButtonStyle())
                }
            }
            .padding(.vertical, 2)
        }
    }
}

// MARK: - Meal set card

/// A composed meal, presented like a tasting menu card.
struct MealSetCard: View {
    @Environment(AppState.self) private var app
    var set: MealSet

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text(set.emoji).font(.system(size: 22))
                VStack(alignment: .leading, spacing: 2) {
                    Text(set.title)
                        .font(DL.display(18, weight: .semibold))
                        .foregroundStyle(DL.warmWhite)
                    Text(set.subtitle)
                        .font(DL.text(12))
                        .foregroundStyle(DL.sesame)
                }
                Spacer()
            }

            VStack(spacing: 8) {
                ForEach(set.dishes) { dish in
                    Button {
                        Haptics.tap()
                        withAnimation(.spring(response: 0.5, dampingFraction: 0.85)) {
                            app.selectedDish = dish
                        }
                    } label: {
                        HStack(spacing: 10) {
                            DishArtView(dish: dish, backdrop: false, steam: false)
                                .frame(width: 44, height: 44)
                            Text(dish.name)
                                .font(DL.text(13, weight: .medium))
                                .foregroundStyle(DL.warmWhite.opacity(0.95))
                                .lineLimit(1)
                            Spacer()
                            Text(dish.priceLabel)
                                .font(DL.text(12))
                                .foregroundStyle(DL.sesame)
                        }
                    }
                }
            }

            HStack {
                VStack(alignment: .leading, spacing: 1) {
                    Text("≈ \(set.totalCalories) kcal")
                        .font(DL.text(12, weight: .medium))
                        .foregroundStyle(DL.sesame)
                    Text(totalLabel)
                        .font(DL.display(17, weight: .semibold))
                        .foregroundStyle(DL.warmWhite)
                }
                Spacer()
                Button {
                    withAnimation { app.add(contentsOf: set) }
                } label: {
                    HStack(spacing: 7) {
                        Image(systemName: "basket.fill").font(.system(size: 12, weight: .semibold))
                        Text("Add the set").font(DL.text(13, weight: .semibold))
                    }
                    .foregroundStyle(DL.soyDark)
                    .padding(.horizontal, 16).padding(.vertical, 10)
                    .background(Capsule().fill(DL.warmWhite))
                }
                .buttonStyle(TactileButtonStyle())
            }
        }
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .fill(LinearGradient(colors: [DL.soy, DL.soyDark], startPoint: .topLeading, endPoint: .bottomTrailing))
        )
        .dlShadow(radius: 18, y: 12, opacity: 0.2)
    }

    private var totalLabel: String {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "USD"
        f.minimumFractionDigits = 0
        return f.string(from: set.totalPrice as NSDecimalNumber) ?? "$\(set.totalPrice)"
    }
}

// MARK: - Typing indicator

private struct TypingIndicator: View {
    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 20.0)) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            HStack(spacing: 5) {
                ForEach(0..<3, id: \.self) { i in
                    Circle()
                        .fill(DL.inkFaint)
                        .frame(width: 7, height: 7)
                        .offset(y: sin((t * 2.4) + Double(i) * 0.9) * 3)
                }
            }
            .padding(.horizontal, 17).padding(.vertical, 14)
            .background(
                UnevenRoundedRectangle(topLeadingRadius: 6, bottomLeadingRadius: 22, bottomTrailingRadius: 22, topTrailingRadius: 22, style: .continuous)
                    .fill(DL.warmWhite)
            )
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
