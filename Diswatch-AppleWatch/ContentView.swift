import SwiftUI

struct ContentView: View {
    @State private var isLinked = false

    var body: some View {
        if isLinked {
            ServerListView()
                .transition(.opacity)
        } else {
            CodeEntryView(isLinked: $isLinked)
                .environment(\.colorScheme, .dark)
        }
    }
}