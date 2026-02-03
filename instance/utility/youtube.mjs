import { Innertube, Platform, UniversalCache } from 'youtubei.js';
import { Cookie } from '../sql';

const exportedVars = {
    nFunction: (n) => { return n; },
    sigFunction: (s) => { return s; }
};

Platform.shim.eval = async (data, env) => {
    const properties = [];
    if (env.n) properties.push(`n: exportedVars.nFunction("${env.n}")`);
    if (env.sig) properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);

    const code = `${data.output}\nreturn { ${properties.join(', ')} }`;
    return new Function('exportedVars', `return (${new Function(code).toString()})() `)(exportedVars);
}

function parseCookies(text) {
    if (!text) return undefined;
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
            const i = line.split('\t');
            if (i.length < 7) return null;
            return `${i[5]}=${i[6]}`;
        })
        .filter(Boolean)
        .join('; ');
}

async function getClient(sessionId) {
    const cookieRecord = await Cookie.findOne({
        where: { sessionId, platform: 'youtube' }
    });

    const parsedCookie = parseCookies(cookieRecord?.value);

    return await Innertube.create({
        cookie: parsedCookie,
        generate_session_locally: true,
        cache: new UniversalCache(true)
    });
}

export async function search(query, sessionId, limit = 5) {
    const client = await getClient(sessionId);
    const results = await client.search(query, { type: 'video' });
    return results.videos?.slice(0, limit) || [];
}

export async function downloadVideo(id, sessionId) {
    const client = await getClient(sessionId);
    const info = await client.getBasicInfo(id);

    const stream = await client.download(id, {
        type: 'video+audio',
        quality: 'bestefficiency',
        format: 'mp4'
    });

    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);

    return {
        buffer: Buffer.concat(chunks),
        info: {
            title: info.basic_info.title,
            duration: info.basic_info.duration,
            author: info.basic_info.author,
            thumbnail: info.basic_info.thumbnail?.[0]?.url
        },
        mimetype: 'video/mp4'
    };
}

export async function downloadAudio(id, sessionId) {
    const client = await getClient(sessionId);
    const info = await client.getBasicInfo(id);
    const stream = await client.download(id, {
        type: 'audio'
    });

    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);

    return {
        buffer: Buffer.concat(chunks),
        info: {
            title: info.basic_info.title,
            duration: info.basic_info.duration,
            author: info.basic_info.author,
            thumbnail: info.basic_info.thumbnail?.[0]?.url
        },
        mimetype: 'audio/mp3'
    };
}

export function extractVideoId(url) {
    const patterns = [
        /(?:(?:music\.)?youtube\.com\/watch\?v=|youtu\.be\/|(?:music\.)?youtube\.com\/embed\/|(?:music\.)?youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

export async function getCookie(sessionId, platform) {
    const record = await Cookie.findOne({ where: { sessionId, platform } });
    return record?.value || null;
}

export async function setCookie(sessionId, platform, value) {
    await Cookie.upsert({
        sessionId,
        platform,
        value,
        updatedAt: new Date()
    });
}

export async function deleteCookie(sessionId, platform) {
    await Cookie.destroy({ where: { sessionId, platform } });
}

function isLoginError(error) {
    const msg = error.message?.toLowerCase() || "";
    return msg.includes("login")
}

export function getErrorMessage(error, type = "video") {
    if (isLoginError(error)) {
        return `⚠️ *Authentication Required*\n\nThis ${type} requires login or your cookie has expired.\n\nPlease update your YouTube cookie:\n\`cookie youtube <your-cookie>\`\n\n_Get cookies from YouTube DevTools (Network tab → Cookie header)_`;
    }
    return `Failed to download ${type}: ${error.message}`;
}