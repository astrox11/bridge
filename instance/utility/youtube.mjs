import { Innertube, Platform, UniversalCache } from 'youtubei.js';
import { Cookie } from '../sql/models.mjs';

/**
 * Custom Evaluator for deciphering YouTube signatures
 */
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

/**
 * Parse Netscape cookie format to header string
 */
function parseCookies(text) {
    if (!text) return undefined;
    return text
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => {
            const parts = line.split('\t');
            if (parts.length < 7) return null;
            return `${parts[5]}=${parts[6]}`;
        })
        .filter(Boolean)
        .join('; ');
}

/**
 * Core: Get a fresh Innertube instance for a specific session
 */
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

/**
 * Public Functions
 */

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
        mimetype: 'audio/mp4'
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

/**
 * Cookie Management
 */

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