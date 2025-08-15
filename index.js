import express from "express";
import session from "express-session";
import fetch from "node-fetch";
import { Client, GatewayIntentBits, Partials, Events, SlashCommandBuilder, Routes, REST } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || `https://diswatch-bot.onrender.com/oauth/callback`;

app.use(express.json());
app.use(session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false
}));

const linkedUsers = new Map();
const pendingCodes = new Map();
const codeToUser = new Map();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel],
});

async function impersonate(channel, username, text) {
  try {
    await channel.send(`**${username}**: ${text}`);
  } catch (err) {
    console.error("Error impersonating user:", err);
  }
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('link')
      .setDescription('Get your 6-digit code to link your watch app')
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    console.log("Slash commands registered.");
  } catch (error) {
    console.error("Failed to register commands:", error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "link") {
    const userId = interaction.user.id;
    const username = interaction.user.username;
    let code = pendingCodes.get(userId);
    if (!code) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      pendingCodes.set(userId, code);
      codeToUser.set(code, userId);
    }

    try {
      await interaction.user.send(`Your 6-digit Diswatch code: **${code}**\nEnter this in your watch app to link.`);
      await interaction.reply({ content: 'I sent you a DM with your 6-digit linking code!', ephemeral: true });
    } catch (err) {
      console.error("Failed to DM user code:", err);
      await interaction.reply({ content: 'I could not DM you. Please enable DMs from server members and try again.', ephemeral: true });
    }
  }
});

app.post("/link-device", (req, res) => {
  const { deviceId, code } = req.body;
  if (!deviceId || !code) return res.status(400).json({ error: "deviceId and code required" });

  const userId = codeToUser.get(code);
  if (!userId) return res.status(400).json({ error: "Invalid code" });

  linkedUsers.set(userId, { deviceId, username: null });
  pendingCodes.delete(userId);
  codeToUser.delete(code);

  res.json({ status: "linked", userId });
});

app.get("/linked-users/:guildId", async (req, res) => {
  const users = [];
  for (const [discordId, info] of linkedUsers.entries()) {
    users.push({ discordId, username: info.username || "Unknown" });
  }
  res.json(users);
});

client.on("guildCreate", async (guild) => {
  console.log(`Joined guild: ${guild.name}`);

  try {
    const response = await fetch(`https://diswatch-bot.onrender.com/linked-users/${guild.id}`);
    const users = await response.json();

    for (const user of users) {
      try {
        const member = await guild.members.fetch(user.discordId).catch(() => null);
        if (!member) continue;

        let channel = guild.systemChannel;
        if (!channel) {
          channel = guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has("SendMessages"));
        }
        if (!channel) continue;

        await impersonate(channel, member.displayName, "can now send messages.");
      } catch (err) {
        console.error("Error sending impersonated message:", err);
      }
    }
  } catch (err) {
    console.error("Error fetching linked users:", err);
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

client.login(process.env.DISCORD_BOT_TOKEN);

// In-memory message storage
const messages = new Map(); // key: channelId, value: array of messages

// Fetch messages for a channel
app.get("/messages/:channelId", (req, res) => {
  const { channelId } = req.params;
  const msgs = messages.get(channelId) || [];
  res.json(msgs);
});

// Send message to a channel
app.post("/messages/:channelId", (req, res) => {
  const { channelId } = req.params;
  const { deviceToken, content } = req.body;
  if (!deviceToken || !content) return res.status(400).json({ error: "Missing deviceToken or content" });

  // Find linked user by deviceToken
  const userEntry = [...linkedUsers.entries()].find(([_, info]) => info.deviceId === deviceToken);
  if (!userEntry) return res.status(401).json({ error: "Device not linked" });

  const [discordId, info] = userEntry;

  const msg = {
    id: Math.random().toString(36).substring(2),
    authorName: info.username || "Unknown",
    authorAvatarURL: "https://cdn-icons-png.flaticon.com/512/147/147144.png",
    content,
    isSelf: false
  };

  if (!messages.has(channelId)) messages.set(channelId, []);
  messages.get(channelId).push(msg);

  // Optional: Send via bot impersonation
  const guild = client.guilds.cache.first(); // adjust to find correct guild
  const channel = guild?.channels.cache.find(c => c.id === channelId && c.isTextBased());
  if (channel) {
    impersonate(channel, msg.authorName, msg.content);
  }

  res.json(msg);
});
app.get("/linked-servers", async (req, res) => {
  const deviceToken = req.headers["device-token"];
  if (!deviceToken) return res.status(400).json({ error: "Missing Device-Token" });

  // Find the linked user
  const userEntry = [...linkedUsers.entries()].find(([_, info]) => info.deviceId === deviceToken);
  if (!userEntry) return res.status(404).json({ error: "Device not linked" });

  const [userId] = userEntry;

  // Get the guilds the bot is in
  const servers = client.guilds.cache.map(guild => ({
    id: guild.id,
    name: guild.name,
    channels: guild.channels.cache
      .filter(c => c.isTextBased())
      .map(c => ({
        id: c.id,
        name: c.name,
        messages: [] // messages will be fetched later
      }))
  }));

  res.json(servers);
});
