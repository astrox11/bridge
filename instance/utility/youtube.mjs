import { Innertube, Platform } from 'youtubei.js';
import { Cookie } from '../sql/models.mjs';


Platform.shim.eval = async (data, env) => {
    const properties = [];

    if (env.n) {
        properties.push(`n: exportedVars.nFunction("${env.n}")`)
    }

    if (env.sig) {
        properties.push(`sig: exportedVars.sigFunction("${env.sig}")`)
    }

    const code = `${data.output}\nreturn { ${properties.join(', ')} }`;

    return new Function(code)();
}


let innertube = await Innertube.create({
    generate_session_locally: true
});
let currentSessionId = null;

/**
 * Parse Netscape cookie format to header string
 * @param {string} text 
 */
function parseCookies(text) {
    if (!text) return undefined;
    return text
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => {
            const parts = line.split('\t');
            return `${parts[5]}=${parts[6]}`;
        })
        .join('; ');
}

/**
 * Initialize or reinitialize Innertube with cookies from database
 * @param {string} sessionId
 */
export async function initWithCookies(sessionId) {
    currentSessionId = sessionId;

    const cookieRecord = await Cookie.findOne({
        where: { sessionId, platform: 'youtube' }
    });

    const parsedCookie = parseCookies(cookieRecord?.value);

    innertube = await Innertube.create({
        cookie: parsedCookie,
        generate_session_locally: true
    });

    return !!cookieRecord;
}

/**
 * Get cookie for a platform
 * @param {string} sessionId
 * @param {string} platform
 */
export async function getCookie(sessionId, platform) {
    const record = await Cookie.findOne({
        where: { sessionId, platform }
    });
    return record?.value || null;
}

/**
 * Set cookie for a platform
 * @param {string} sessionId
 * @param {string} platform
 * @param {string} value
 */
export async function setCookie(sessionId, platform, value) {
    await Cookie.upsert({
        sessionId,
        platform,
        value,
        updatedAt: new Date()
    });

    // Reinitialize innertube if setting youtube cookie
    if (platform === 'youtube') {
        await initWithCookies(sessionId);
    }
}

/**
 * Delete cookie for a platform
 * @param {string} sessionId
 * @param {string} platform
 */
export async function deleteCookie(sessionId, platform) {
    await Cookie.destroy({
        where: { sessionId, platform }
    });

    // Reinitialize innertube without cookie if deleting youtube cookie
    if (platform === 'youtube' && currentSessionId === sessionId) {
        innertube = await Innertube.create({});
    }
}

/**
 * Extract video ID from various YouTube URL formats
 * @param {string} url 
 * @returns {string | null}
 */
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

function parseCookies(text) {
    return text
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => {
            const parts = line.split('\t');
            return `${parts[5]}=${parts[6]}`;
        })
        .join('; ');
}

/**
 * Search YouTube for videos
 * @param {string} query 
 * @param {number} limit 
 * @returns {Promise<Array>} 
 */
export async function search(query, limit = 5) {
    const results = await innertube.search(query, { type: 'video' });
    return results.videos?.slice(0, limit) || [];
}

/**
 * Get video info
 * @param {string} id 
 * @returns {Promise<Object>} 
 */
export async function getInfo(id) {
    return await innertube.getInfo(id);
}

/**
 * Download video
 * @param {string} id
 */
export async function downloadVideo(id) {
    const info = await getInfo(id);
    const format = info.chooseFormat({ type: 'video+audio', quality: 'best' });
    const stream = await innertube.download(id, { format });

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
        mimetype: format.mime_type || 'video/mp4'
    };
}

/**
 * Download audio
 * @param {string} id 
 * @returns {Promise<Object>} 
 */
export async function downloadAudio(id) {
    const info = await getInfo(id);
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });
    const stream = await innertube.download(id, { format });

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
        mimetype: 'audio/mpeg'
    };
}

/**
 * Search and download video
 * @param {string} query 
 * @returns {Promise<Object>} 
 */
export async function searchAndDownload(query) {
    const results = await search(query);
    const video = results[0];

    if (!video) {
        throw new Error('No videos found for query: ' + query);
    }

    return await downloadVideo(video.id);
}