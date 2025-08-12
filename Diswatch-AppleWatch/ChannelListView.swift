import SwiftUI

struct ChannelListView: View {
    let server: Server

    var body: some View {
        List(server.channels) { channel in
            NavigationLink(destination: ChannelView(channel: channel)) {
                HStack {
                    GroupChatBubble(channelName: channel.name)
                    Spacer()
                }
                .padding(.vertical, 8)
                .background(Color.clear)
            }
            .listRowBackground(DiscordColors.background)
        }
        .navigationTitle(server.name)
        .background(DiscordColors.background)
        .listStyle(PlainListStyle())
    }
}

struct GroupChatBubble: View {
    let channelName: String

    var body: some View {
        Text(channelName)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(DiscordColors.grayBubble)
            .foregroundColor(DiscordColors.textPrimary)
            .clipShape(Capsule())
    }
}