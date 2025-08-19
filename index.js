import express from "express";
import session from "express-session";
import fetch from "node-fetch";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const commands = [
    { name: "link", description: "Get your Diswatch UUID link code" }
];

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log("Registering slash commands...");
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log("Slash commands registered.");
    } catch (err) {
        console.error(err);
    }
})();

// ===== Backend Setup =====
const app = express();
app.use(express.json());
app.use(session({ secret: "supersecretkey", resave: false, saveUninitialized: false }));

const DB_FILE = "./db.json";

function loadDB() {
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ links: {} }, null, 2));
    return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Watch registers UUID
app.post("/register", (req, res) => {
    const { uuid, discordId } = req.body;
    if (!uuid) return res.status(400).json({ error: "UUID required" });

    const db = loadDB();
    if (discordId) db.links[discordId] = uuid;
    else if (!db.uuids) db.uuids = db.uuids || [];
    if (!db.uuids.includes(uuid)) db.uuids.push(uuid);

    saveDB(db);
    res.json({ success: true });
});

// Bot requests UUID
app.get("/get-uuid", (req, res) => {
    const { discordId } = req.query;
    if (!discordId) return res.status(400).json({ error: "discordId required" });

    const db = loadDB();
    let uuid = db.links[discordId];
    if (!uuid) {
        uuid = uuidv4();
        db.links[discordId] = uuid;
        saveDB(db);
    }
    res.json({ uuid });
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));

// ===== Bot Commands =====
client.on("ready", () => console.log(`Bot logged in as ${client.user.tag}`));

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "link") {
        try {
            const discordId = interaction.user.id;
            const response = await fetch(`${BACKEND_URL}/get-uuid?discordId=${discordId}`);
            const data = await response.json();
            if (data.uuid) await interaction.reply({ content: `🔗 Your Diswatch link code: \`${data.uuid}\``, ephemeral: true });
            else await interaction.reply({ content: "❌ Could not find or create UUID.", ephemeral: true });
        } catch (err) {
            console.error("Error in /link command:", err);
            await interaction.reply({ content: "⚠️ Error fetching UUID.", ephemeral: true });
        }
    }
});

client.login(DISCORD_TOKEN);
