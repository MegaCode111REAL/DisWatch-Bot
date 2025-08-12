import SwiftUI

struct ChannelView: View {
    let channel: Channel

    @State private var messages: [Message] = [
        Message(id: "1", authorName: "UserOne", authorAvatarURL: "https://cdn-icons-png.flaticon.com/512/147/147144.png", content: "Hey, welcome to \(channel.name)!", isSelf: false),
        Message(id: "2", authorName: "You", authorAvatarURL: "https://cdn-icons-png.flaticon.com/512/149/149071.png", content: "Thanks! Glad to be here.", isSelf: true),
        Message(id: "3", authorName: "UserTwo", authorAvatarURL: "https://cdn-icons-png.flaticon.com/512/147/147140.png", content: "This channel rocks.", isSelf: false)
    ]
    @State private var newMessage: String = ""

    var body: some View {
        VStack {
            ScrollViewReader { scrollView in
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(messages) { message in
                            MessageRow(message: message)
                                .id(message.id)
                        }
                    }
                    .padding()
                }
                .background(DiscordColors.background)
                .onChange(of: messages.count) { _ in
                    if let last = messages.last {
                        withAnimation {
                            scrollView.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }
            }

            HStack {
                TextField("Message", text: $newMessage)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .frame(minHeight: 30)

                Button(action: sendMessage) {
                    Text("Send")
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(DiscordColors.discordBlue)
                        .cornerRadius(8)
                }
            }
            .padding()
            .background(Color(white: 0.15))
        }
        .navigationTitle("#\(channel.name)")
        .navigationBarTitleDisplayMode(.inline)
        .background(DiscordColors.background)
    }

    func sendMessage() {
        guard !newMessage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        let msg = Message(id: UUID().uuidString, authorName: "You", authorAvatarURL: "https://cdn-icons-png.flaticon.com/512/149/149071.png", content: newMessage, isSelf: true)
        messages.append(msg)
        newMessage = ""
        // TODO: send message to backend to trigger bot impersonation
    }
}

struct MessageRow: View {
    let message: Message

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            if !message.isSelf {
                AsyncImage(url: URL(string: message.authorAvatarURL)) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Circle().fill(Color.gray)
                }
                .frame(width: 30, height: 30)
                .clipShape(Circle())
            } else {
                Spacer(minLength: 40)
            }

            VStack(alignment: message.isSelf ? .trailing : .leading, spacing: 2) {
                if !message.isSelf {
                    Text(message.authorName)
                        .font(.caption)
                        .foregroundColor(DiscordColors.textPrimary.opacity(0.7))
                }

                Text(message.content)
                    .padding(10)
                    .background(message.isSelf ? DiscordColors.selfBubble : DiscordColors.grayBubble)
                    .foregroundColor(.white)
                    .cornerRadius(15)
                    .frame(maxWidth: 220, alignment: message.isSelf ? .trailing : .leading)
            }

            if message.isSelf {
                AsyncImage(url: URL(string: message.authorAvatarURL)) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Circle().fill(Color.gray)
                }
                .frame(width: 30, height: 30)
                .clipShape(Circle())
            } else {
                Spacer(minLength: 40)
            }
        }
        .padding(message.isSelf ? .leading : .trailing, 40)
    }
}