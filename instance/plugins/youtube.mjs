import {
    extractVideoId,
    search,
    downloadVideo,
    downloadAudio,
    getErrorMessage
} from "../utility";

const searchSessions = new Map();

export default [
    {
        pattern: "ytv",
        alias: ["ytvideo"],
        category: "download",
        function: async (message, args) => {
            const url = (args ?? "").trim();

            if (!url) {
                return await message.reply(
                    "Please provide a YouTube URL.\nUsage: `ytv <youtube-url>`"
                );
            }

            const videoId = extractVideoId(url);
            if (!videoId) {
                return await message.reply(
                    "Invalid YouTube URL. Please provide a valid YouTube video link."
                );
            }

            await message.react("⏳");

            try {
                const result = await downloadVideo(videoId, message.session);
                await message.send(result.buffer, { caption: `🎬 *${result.info.title}*\n\n👤 ${result.info.author}`, mimetype: result.mimetype });

                await message.react("✅");
            } catch (error) {
                await message.react("❌");
                return await message.reply(getErrorMessage(error, "video"));
            }
        },
    },
    {
        pattern: "yta",
        alias: ["ytaudio"],
        category: "download",
        function: async (message, args) => {
            const url = (args ?? "").trim();

            if (!url) {
                return await message.reply(
                    "Please provide a YouTube URL.\nUsage: `yta <youtube-url>`"
                );
            }

            const videoId = extractVideoId(url);
            if (!videoId) {
                return await message.reply(
                    "Invalid YouTube URL. Please provide a valid YouTube video link."
                );
            }

            await message.react("⏳");

            try {
                const result = await downloadAudio(videoId, message.session);
                await message.client.sendMessage(message.chat, { audio: result.buffer, mimetype: "audio/mp4; codecs=mp4a.40.2" }, { quoted: message });

                await message.react("✅");
            } catch (error) {
                await message.react("❌");
                return await message.reply(getErrorMessage(error, "audio"));
            }
        },
    },
    {
        pattern: "yts",
        alias: ["ytsearch", "youtubesearch"],
        category: "download",
        function: async (message, args) => {
            const query = (args ?? "").trim();

            if (!query) {
                return await message.reply(
                    "Please provide a search query.\nUsage: `yts <search query>`"
                );
            }

            await message.react("🔍");

            try {
                const results = await search(query, 5);

                if (!results.length) {
                    await message.react("❌");
                    return await message.reply("No videos found for your search.");
                }

                let text = `🎵 *YouTube Search Results*\n`;
                text += `🔎 Query: _${query}_\n\n`;

                results.forEach((video, index) => {
                    const duration = video.duration?.text || "N/A";
                    text += `*${index + 1}.* ${video.title}\n`;
                    text += `   ⏱️ ${duration} | 👤 ${video.author?.name || "Unknown"}\n\n`;
                });

                text += `━━━━━━━━━━━━━━━\n`;
                text += `Reply with:\n`;
                text += `• \`1\` - \`5\` for video\n`;
                text += `• \`1a\` - \`5a\` for audio`;

                const sentMessage = await message.reply(text);
                await message.react("✅");

                if (sentMessage?.key?.id) {
                    searchSessions.set(sentMessage.key.id, {
                        results,
                        timestamp: Date.now(),
                    });

                    setTimeout(() => {
                        searchSessions.delete(sentMessage.key.id);
                    }, 5 * 60 * 1000);
                }
            } catch (error) {
                await message.react("❌");
                return await message.reply(`Search failed: ${error.message}`);
            }
        },
    },
    {
        event: true,
        function: async (msg) => {
            const quotedId = msg.quoted?.key?.id;
            if (!quotedId) return;

            const session = searchSessions.get(quotedId);
            if (!session) return;

            if (Date.now() - session.timestamp > 5 * 60 * 1000) {
                searchSessions.delete(quotedId);
                return;
            }

            const text = msg.text?.trim().toLowerCase();
            if (!text) return;

            const match = text.match(/^([1-5])(a|v)?$/);
            if (!match) return;

            const choice = parseInt(match[1]);
            const isAudio = match[2] === "a";

            const video = session.results[choice - 1];
            if (!video) {
                return await msg.reply("Invalid selection.");
            }

            await msg.react("⏳");

            try {
                if (isAudio) {
                    const result = await downloadAudio(video.id, message.session);

                    await msg.send(result.buffer, {
                        mimetype: result.mimetype,
                        fileName: `${result.info.title}.mp3`,
                        ptt: false,
                    });
                } else {
                    const result = await downloadVideo(video.id, message.session);

                    await msg.send(result.buffer, {
                        mimetype: result.mimetype,
                        caption: `🎬 *${result.info.title}*\n👤 ${result.info.author}`,
                        gifPlayback: false,
                    });
                }

                await msg.react("✅");
                searchSessions.delete(quotedId);
            } catch (error) {
                await msg.react("❌");
                return await msg.reply(getErrorMessage(error, isAudio ? "audio" : "video"));
            }
        },
    },
];
