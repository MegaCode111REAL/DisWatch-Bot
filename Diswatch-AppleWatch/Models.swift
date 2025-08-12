import Foundation

struct Server: Identifiable {
    let id: String
    let name: String
    let channels: [Channel]
}

struct Channel: Identifiable {
    let id: String
    let name: String
    let messages: [Message]
}

struct Message: Identifiable {
    let id: String
    let authorName: String
    let authorAvatarURL: String
    let content: String
    let isSelf: Bool
}