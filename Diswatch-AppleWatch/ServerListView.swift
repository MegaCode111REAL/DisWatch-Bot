import SwiftUI

struct ServerListView: View {
    // Demo data
    let servers = [
        Server(id: "1", name: "Mega Server", channels: [
            Channel(id: "11", name: "general", messages: []),
            Channel(id: "12", name: "bot-commands", messages: [])
        ]),
        Server(id: "2", name: "Another Server", channels: [
            Channel(id: "21", name: "chat", messages: []),
            Channel(id: "22", name: "random", messages: [])
        ])
    ]

    var body: some View {
        NavigationView {
            List(servers) { server in
                NavigationLink(destination: ChannelListView(server: server)) {
                    Text(server.name)
                        .foregroundColor(DiscordColors.textPrimary)
                }
                .listRowBackground(DiscordColors.background)
            }
            .navigationTitle("Servers")
            .background(DiscordColors.background)
            .listStyle(PlainListStyle())
        }
        .accentColor(DiscordColors.discordBlue)
        .background(DiscordColors.background)
    }
}