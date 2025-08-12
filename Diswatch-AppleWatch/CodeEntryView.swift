import SwiftUI

struct CodeEntryView: View {
    @State private var code = ""
    @State private var statusMessage = ""
    @Binding var isLinked: Bool

    var body: some View {
        VStack(spacing: 12) {
            Text("Enter 6-digit code")
                .font(.headline)
                .foregroundColor(DiscordColors.textPrimary)

            TextField("123456", text: $code)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.center)
                .font(.title2)
                .padding()
                .background(DiscordColors.grayBubble)
                .cornerRadius(10)
                .foregroundColor(DiscordColors.textPrimary)
                .frame(width: 120)

            Button("Link Device") {
                linkDevice()
            }
            .padding()
            .background(DiscordColors.discordBlue)
            .foregroundColor(.white)
            .cornerRadius(8)

            Text(statusMessage)
                .foregroundColor(statusMessage.contains("success") ? .green : .red)
                .font(.caption)
        }
        .padding()
        .background(DiscordColors.background)
    }

    func linkDevice() {
        guard code.count == 6 else {
            statusMessage = "Code must be 6 digits"
            return
        }

        let deviceId = "watch-device-001"

        guard let url = URL(string: "http://localhost:3000/link-device") else {
            statusMessage = "Invalid backend URL"
            return
        }

        let body = ["deviceId": deviceId, "code": code]
        guard let jsonData = try? JSONSerialization.data(withJSONObject: body) else {
            statusMessage = "Failed to encode data"
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = jsonData
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        URLSession.shared.dataTask(with: request) { data, _, error in
            if let error = error {
                DispatchQueue.main.async {
                    statusMessage = "Network error: \(error.localizedDescription)"
                }
                return
            }

            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                DispatchQueue.main.async {
                    statusMessage = "Invalid response"
                }
                return
            }

            DispatchQueue.main.async {
                if let errorMsg = json["error"] as? String {
                    statusMessage = "Error: \(errorMsg)"
                } else {
                    statusMessage = "Linking success!"
                    isLinked = true
                }
            }
        }.resume()
    }
}