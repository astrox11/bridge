use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{RequestInit, Response};

// Global Configuration Cache
static CONFIG: Mutex<Option<Config>> = Mutex::new(None);

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuotedKey {
    pub remote_jid: String,
    pub id: String,
    pub participant: Option<String>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuotedMessage {
    pub key: QuotedKey,
    pub stanza_id: String,
    pub sender: String,
    pub mtype: String,
    pub text: Option<String>,
    pub viewonce: bool,
    #[serde(with = "serde_wasm_bindgen::preserve")]
    pub message: JsValue,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FullSerializedResponse {
    pub chat: String,
    pub sender: String,
    pub device: String,
    pub mtype: String,
    pub text: Option<String>,
    pub is_group: bool,
    pub quoted: Option<QuotedMessage>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ParsedResult {
    pub mimetype: String,
    pub content: Option<String>,
    #[serde(with = "serde_wasm_bindgen::preserve")]
    pub buffer: JsValue,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Config {
    pub prefixes: Vec<String>,
    pub mode: String,
    pub sudo: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct CommandParseResult {
    pub command: String,
    pub args: String,
}

#[wasm_bindgen]
pub fn update_config(val: JsValue) -> Result<(), JsValue> {
    let config: Config = serde_wasm_bindgen::from_value(val)?;
    let mut lock = CONFIG.lock().map_err(|_| "Failed to lock config")?;
    *lock = Some(config);
    Ok(())
}

#[wasm_bindgen]
pub fn parse_command(text: String) -> Result<JsValue, JsValue> {
    let lock = CONFIG.lock().map_err(|_| "Failed to lock config")?;
    let config = lock.as_ref().ok_or("Config not initialized")?;

    let mut command_content = None;

    if config.prefixes.is_empty() {
        command_content = Some(text.clone());
    } else {
        let mut best_match: Option<&String> = None;
        for prefix in &config.prefixes {
            if text.starts_with(prefix) {
                if best_match.map_or(true, |p| prefix.len() > p.len()) {
                    best_match = Some(prefix);
                }
            }
        }

        if let Some(prefix) = best_match {
            command_content = Some(text[prefix.len()..].to_string());
        }
    };

    if let Some(content) = command_content {
        let mut parts = content.splitn(2, ' ');
        let command = parts.next().unwrap_or("").to_lowercase();
        let args = parts.next().unwrap_or("").to_string();

        if command.is_empty() {
            return Ok(JsValue::NULL);
        }

        let result = CommandParseResult { command, args };
        return Ok(serde_wasm_bindgen::to_value(&result)?);
    }

    Ok(JsValue::NULL)
}

#[wasm_bindgen]
pub fn to_small_caps(text: String) -> String {
    text.chars()
        .map(|c| match c {
            'A'..='Z' => [
                'ᴀ', 'ʙ', 'ᴄ', 'ᴅ', 'ᴇ', 'ғ', 'ɢ', 'ʜ', 'ɪ', 'ᴊ', 'ᴋ', 'ʟ', 'ᴍ', 'ɴ', 'ᴏ', 'ᴘ',
                'ǫ', 'ʀ', 's', 'ᴛ', 'ᴜ', 'ᴠ', 'ᴡ', 'x', 'ʏ', 'ᴢ',
            ][(c as usize) - 65],
            'a'..='z' => [
                'ᴀ', 'ʙ', 'ᴄ', 'ᴅ', 'ᴇ', 'ғ', 'ɢ', 'ʜ', 'ɪ', 'ᴊ', 'ᴋ', 'ʟ', 'ᴍ', 'ɴ', 'ᴏ', 'ᴘ',
                'ǫ', 'ʀ', 's', 'ᴛ', 'ᴜ', 'ᴠ', 'ᴡ', 'x', 'ʏ', 'ᴢ',
            ][(c as usize) - 97],
            _ => c,
        })
        .collect()
}

#[wasm_bindgen]
#[allow(unused_unsafe)]
pub fn serialize_full(msg: JsValue) -> Result<JsValue, JsValue> {
    let mut content = if msg.is_object() {
        unsafe { js_sys::Reflect::get(&msg, &"message".into()) }.unwrap_or(JsValue::UNDEFINED)
    } else {
        JsValue::UNDEFINED
    };

    for _ in 0..5 {
        let inner = get_future_proof_inner(&content)?;

        if inner.is_object() {
            content = unsafe { js_sys::Reflect::get(&inner, &"message".into()) }
                .unwrap_or(JsValue::UNDEFINED);
        } else {
            break;
        }
    }

    let key = if msg.is_object() {
        unsafe { js_sys::Reflect::get(&msg, &"key".into()) }.unwrap_or(JsValue::UNDEFINED)
    } else {
        JsValue::UNDEFINED
    };

    let remote_jid = if key.is_object() {
        unsafe { js_sys::Reflect::get(&key, &"remoteJid".into()) }
            .ok()
            .and_then(|v| v.as_string())
            .unwrap_or_default()
    } else {
        String::new()
    };

    let m_type = get_content_type(content.clone()).unwrap_or_else(|| "unknown".into());

    let specific_msg = if content.is_object() {
        unsafe { js_sys::Reflect::get(&content, &m_type.clone().into()) }.unwrap_or(JsValue::NULL)
    } else {
        JsValue::NULL
    };

    let context_info = if specific_msg.is_object() {
        unsafe { js_sys::Reflect::get(&specific_msg, &"contextInfo".into()) }
            .unwrap_or(JsValue::NULL)
    } else {
        JsValue::NULL
    };

    let mut quoted = None;
    if context_info.is_object() && !context_info.is_null() && !context_info.is_undefined() {
        let quoted_msg = unsafe { js_sys::Reflect::get(&context_info, &"quotedMessage".into()) }
            .unwrap_or(JsValue::UNDEFINED);

        if quoted_msg.is_object() && !quoted_msg.is_null() && !quoted_msg.is_undefined() {
            let q_type = get_content_type(quoted_msg.clone()).unwrap_or_default();

            let is_view_once = unsafe { js_sys::Reflect::get(&quoted_msg, &q_type.clone().into()) }
                .ok()
                .and_then(|media_obj| {
                    unsafe { js_sys::Reflect::get(&media_obj, &"viewOnce".into()) }.ok()
                })
                .and_then(|vo| vo.as_bool())
                .unwrap_or(false);

            let stanza_id = unsafe { js_sys::Reflect::get(&context_info, &"stanzaId".into()) }
                .ok()
                .and_then(|v| v.as_string())
                .unwrap_or_default();

            let participant = unsafe { js_sys::Reflect::get(&context_info, &"participant".into()) }
                .ok()
                .and_then(|v| v.as_string());

            quoted = Some(QuotedMessage {
                key: QuotedKey {
                    remote_jid: remote_jid.clone(),
                    id: stanza_id.clone(),
                    participant: participant.clone(),
                },
                stanza_id,
                sender: participant.unwrap_or_default(),
                mtype: q_type,
                text: extract_text_from_message(quoted_msg.clone()),
                viewonce: is_view_once,
                message: quoted_msg,
            });
        }
    }

    let response = FullSerializedResponse {
        chat: remote_jid.clone(),
        sender: extract_normalized_sender(&key, &remote_jid),
        device: get_device(
            &unsafe { js_sys::Reflect::get(&key, &"id".into()) }
                .ok()
                .and_then(|v| v.as_string())
                .unwrap_or_default(),
        ),
        mtype: m_type,
        text: extract_text_from_message(content.clone()),
        is_group: remote_jid.ends_with("@g.us"),
        quoted,
    };

    Ok(serde_wasm_bindgen::to_value(&response)?)
}

#[allow(unused_unsafe)]
fn get_future_proof_inner(content: &JsValue) -> Result<JsValue, JsValue> {
    // Immediate return if not an object to prevent Reflect.get crash
    if !content.is_object() || content.is_null() || content.is_undefined() {
        return Ok(JsValue::UNDEFINED);
    }

    let keys = [
        "ephemeralMessage",
        "viewOnceMessage",
        "viewOnceMessageV2",
        "editedMessage",
        "documentWithCaptionMessage",
    ];

    for key in keys {
        let val = unsafe { js_sys::Reflect::get(content, &key.into()) }?;
        if !val.is_null() && !val.is_undefined() {
            return Ok(val);
        }
    }

    Ok(JsValue::UNDEFINED)
}

fn get_device(id: &str) -> String {
    if id.starts_with("3A") && id.len() == 20 {
        "ios".into()
    } else if id.starts_with("3E") && id.len() == 22 {
        "web".into()
    } else if id.len() == 21 || id.len() == 32 {
        "android".into()
    } else if id.starts_with("3F") || id.len() == 18 {
        "desktop".into()
    } else {
        "unknown".into()
    }
}

#[allow(unused_unsafe)]
fn extract_normalized_sender(key: &JsValue, remote_jid: &str) -> String {
    let raw = if remote_jid.ends_with("@g.us") {
        unsafe { js_sys::Reflect::get(key, &"participant".into()) }
            .ok()
            .and_then(|v| v.as_string())
            .unwrap_or_else(|| remote_jid.to_string())
    } else {
        remote_jid.to_string()
    };
    if let Some(at) = raw.find('@') {
        let user = raw[..at]
            .split(':')
            .next()
            .unwrap_or("")
            .split('_')
            .next()
            .unwrap_or("");
        let server = match &raw[at + 1..] {
            "c.us" => "s.whatsapp.net",
            s => s,
        };
        return format!("{}@{}", user, server);
    }
    raw
}

#[wasm_bindgen]
#[allow(unused_unsafe)]
pub fn extract_text_from_message(message: JsValue) -> Option<String> {
    if message.is_null() || message.is_undefined() {
        return None;
    }
    let gp = |o: &JsValue, k: &[&str]| -> Option<String> {
        let mut c = o.clone();
        for &key in k {
            c = unsafe { js_sys::Reflect::get(&c, &key.into()) }.ok()?;
            if c.is_null() || c.is_undefined() {
                return None;
            }
        }
        c.as_string()
    };
    if let Some(t) = gp(&message, &["extendedTextMessage", "text"]) {
        return Some(t);
    }
    if let Some(t) = gp(&message, &["conversation"]) {
        return Some(t);
    }
    if let Some(t) = gp(&message, &["imageMessage", "caption"]) {
        return Some(t);
    }
    if let Some(t) = gp(&message, &["videoMessage", "caption"]) {
        return Some(t);
    }
    if let Some(t) = gp(&message, &["documentMessage", "caption"]) {
        return Some(t);
    }
    if let Ok(p) = unsafe { js_sys::Reflect::get(&message, &"protocolMessage".into()) }
        && let Ok(e) = unsafe { js_sys::Reflect::get(&p, &"editedMessage".into()) }
        && !e.is_null()
        && !e.is_undefined()
    {
        return extract_text_from_message(e);
    }
    None
}

#[wasm_bindgen]
pub fn get_content_type(content: JsValue) -> Option<String> {
    if content.is_null() || content.is_undefined() {
        return None;
    }
    let keys = js_sys::Object::keys(content.unchecked_ref());
    for i in 0..keys.length() {
        if let Some(k) = keys.get(i).as_string()
            && (k == "conversation" || k.contains("Message"))
            && k != "senderKeyDistributionMessage"
        {
            return Some(k);
        }
    }
    None
}

#[wasm_bindgen]
pub async fn parse_content(input: JsValue) -> Result<JsValue, JsValue> {
    if let Some(text) = input.as_string() {
        if text.starts_with("http") {
            return Ok(serde_wasm_bindgen::to_value(
                &fetch_and_analyze(text).await?,
            )?);
        }
        if text.contains('/') || text.contains('.') {
            return read_local_file(text).await;
        }
        return Ok(serde_wasm_bindgen::to_value(&create_result_from_bytes(
            text.as_bytes().to_vec(),
            Some("text/plain".into()),
        ))?);
    }
    if input.is_instance_of::<js_sys::Uint8Array>() {
        return Ok(serde_wasm_bindgen::to_value(&create_result_from_bytes(
            js_sys::Uint8Array::new(&input).to_vec(),
            None,
        ))?);
    }
    Ok(JsValue::NULL)
}

#[allow(unused_unsafe)]
fn create_result_from_bytes(bytes: Vec<u8>, hint: Option<String>) -> ParsedResult {
    let mut mime = infer::get(&bytes)
        .map(|k| k.mime_type().to_string())
        .unwrap_or_else(|| hint.unwrap_or_else(|| "application/octet-stream".into()));
    if (mime.contains("ogg") || mime == "application/octet-stream")
        && bytes.len() > 36
        && &bytes[28..36] == b"OpusHead"
    {
        mime = "audio/opus".into();
    }
    let mut content = None;
    if mime == "text/plain" {
        content = String::from_utf8(bytes.clone()).ok();
    }
    let u8a = js_sys::Uint8Array::new_with_length(bytes.len() as u32);
    u8a.copy_from(&bytes);
    let global: JsValue = js_sys::global().into();
    let buffer = unsafe { js_sys::Reflect::get(&global, &"Buffer".into()) }
        .ok()
        .and_then(|b| {
            let from = unsafe { js_sys::Reflect::get(&b, &"from".into()) }
                .ok()?
                .dyn_into::<js_sys::Function>()
                .ok()?;
            from.call1(&b, &u8a).ok()
        })
        .unwrap_or_else(|| u8a.into());
    ParsedResult {
        mimetype: mime,
        content,
        buffer,
    }
}

#[allow(unused_unsafe)]
async fn fetch_and_analyze(url: String) -> Result<ParsedResult, JsValue> {
    let opts = RequestInit::new();
    opts.set_method("GET");
    let request = web_sys::Request::new_with_str_and_init(&url, &opts)?;
    let global: JsValue = js_sys::global().into();
    let fetch_fn = unsafe { js_sys::Reflect::get(&global, &"fetch".into()) }?
        .dyn_into::<js_sys::Function>()?;
    let promise = fetch_fn.call1(&global, &request.into())?;
    let resp: Response = JsFuture::from(js_sys::Promise::from(promise))
        .await?
        .dyn_into()?;
    let ct = resp
        .headers()
        .get("content-type")?
        .filter(|s| !s.is_empty());
    let ab_promise: js_sys::Promise = resp.array_buffer()?;
    let bytes = js_sys::Uint8Array::new(&JsFuture::from(ab_promise).await?).to_vec();
    Ok(create_result_from_bytes(bytes, ct))
}

#[allow(unused_unsafe)]
async fn read_local_file(path: String) -> Result<JsValue, JsValue> {
    let global: JsValue = js_sys::global().into();
    let bun = unsafe { js_sys::Reflect::get(&global, &"Bun".into()) }?;
    let file = unsafe { js_sys::Reflect::get(&bun, &"file".into()) }?
        .dyn_into::<js_sys::Function>()?
        .call1(&bun, &path.into())?;
    let ab_val = unsafe { js_sys::Reflect::get(&file, &"arrayBuffer".into()) }?
        .dyn_into::<js_sys::Function>()?
        .call0(&file)?;
    let ab_promise: js_sys::Promise = ab_val.dyn_into()?;
    let bytes = js_sys::Uint8Array::new(&JsFuture::from(ab_promise).await?).to_vec();
    Ok(serde_wasm_bindgen::to_value(&create_result_from_bytes(
        bytes,
        unsafe { js_sys::Reflect::get(&file, &"type".into()) }?.as_string(),
    ))?)
}
