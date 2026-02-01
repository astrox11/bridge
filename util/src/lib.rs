use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{RequestInit, Response};

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

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedResult {
    pub mimetype: String,
    pub content: Option<String>,
    #[serde(with = "serde_wasm_bindgen::preserve")]
    pub buffer: JsValue,
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
pub fn serialize_full(msg: JsValue) -> Result<JsValue, JsValue> {
    // 1. Safe access to 'message' property: msg?.message
    let mut content = if msg.is_object() {
        js_sys::Reflect::get(&msg, &"message".into()).unwrap_or(JsValue::UNDEFINED)
    } else {
        JsValue::UNDEFINED
    };

    // 2. Safely unwrap nested wrappers (viewOnce, ephemeral, etc.)
    for _ in 0..5 {
        let inner = get_future_proof_inner(&content)?;

        // Ternary: (inner is Object) ? inner.message : break
        if inner.is_object() {
            content = js_sys::Reflect::get(&inner, &"message".into()).unwrap_or(JsValue::UNDEFINED);
        } else {
            break;
        }
    }

    // 3. Safe access to 'key' property
    let key = if msg.is_object() {
        js_sys::Reflect::get(&msg, &"key".into()).unwrap_or(JsValue::UNDEFINED)
    } else {
        JsValue::UNDEFINED
    };

    // 4. Safe string extraction for remoteJid
    let remote_jid = if key.is_object() {
        js_sys::Reflect::get(&key, &"remoteJid".into())
            .ok()
            .and_then(|v| v.as_string())
            .unwrap_or_default()
    } else {
        String::new()
    };

    let m_type = get_content_type(content.clone()).unwrap_or_else(|| "unknown".into());

    // 5. Safe access to the specific message content based on type
    let specific_msg = if content.is_object() {
        js_sys::Reflect::get(&content, &m_type.clone().into()).unwrap_or(JsValue::NULL)
    } else {
        JsValue::NULL
    };

    let context_info = if specific_msg.is_object() {
        js_sys::Reflect::get(&specific_msg, &"contextInfo".into()).unwrap_or(JsValue::NULL)
    } else {
        JsValue::NULL
    };

    let mut quoted = None;
    if context_info.is_object() && !context_info.is_null() && !context_info.is_undefined() {
        let quoted_msg = js_sys::Reflect::get(&context_info, &"quotedMessage".into())
            .unwrap_or(JsValue::UNDEFINED);

        if quoted_msg.is_object() && !quoted_msg.is_null() && !quoted_msg.is_undefined() {
            let q_type = get_content_type(quoted_msg.clone()).unwrap_or_default();
            let stanza_id = js_sys::Reflect::get(&context_info, &"stanzaId".into())
                .ok()
                .and_then(|v| v.as_string())
                .unwrap_or_default();
            let participant = js_sys::Reflect::get(&context_info, &"participant".into())
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
                viewonce: false,
                message: quoted_msg,
            });
        }
    }

    let response = FullSerializedResponse {
        chat: remote_jid.clone(),
        sender: extract_normalized_sender(&key, &remote_jid),
        device: get_device(
            &js_sys::Reflect::get(&key, &"id".into())
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
        let val = js_sys::Reflect::get(content, &key.into())?;
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

fn extract_normalized_sender(key: &JsValue, remote_jid: &str) -> String {
    let raw = if remote_jid.ends_with("@g.us") {
        js_sys::Reflect::get(key, &"participant".into())
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
pub fn extract_text_from_message(message: JsValue) -> Option<String> {
    if message.is_null() || message.is_undefined() {
        return None;
    }
    let gp = |o: &JsValue, k: &[&str]| -> Option<String> {
        let mut c = o.clone();
        for &key in k {
            c = js_sys::Reflect::get(&c, &key.into()).ok()?;
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
    if let Ok(p) = js_sys::Reflect::get(&message, &"protocolMessage".into()) {
        if let Ok(e) = js_sys::Reflect::get(&p, &"editedMessage".into()) {
            if !e.is_null() && !e.is_undefined() {
                return extract_text_from_message(e);
            }
        }
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
        if let Some(k) = keys.get(i).as_string() {
            if (k == "conversation" || k.contains("Message")) && k != "senderKeyDistributionMessage"
            {
                return Some(k);
            }
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
            js_sys::Uint8Array::from(input).to_vec(),
            None,
        ))?);
    }
    Ok(JsValue::NULL)
}

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
    let u8a = unsafe { js_sys::Uint8Array::view(&bytes) };
    let buffer = js_sys::Reflect::get(&js_sys::global(), &"Buffer".into())
        .ok()
        .and_then(|b| {
            let from = js_sys::Reflect::get(&b, &"from".into())
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

async fn fetch_and_analyze(url: String) -> Result<ParsedResult, JsValue> {
    let opts = RequestInit::new();
    opts.set_method("GET");
    let request = web_sys::Request::new_with_str_and_init(&url, &opts)?;
    let global = js_sys::global();
    let fetch_fn =
        js_sys::Reflect::get(&global, &"fetch".into())?.dyn_into::<js_sys::Function>()?;
    let promise = fetch_fn.call1(&global, &request.into())?;
    let resp: Response = JsFuture::from(js_sys::Promise::from(promise))
        .await?
        .dyn_into()?;
    let ct = resp
        .headers()
        .get("content-type")?
        .filter(|s| !s.is_empty());
    let ab_promise: js_sys::Promise = resp.array_buffer()?.into();
    let bytes = js_sys::Uint8Array::new(&JsFuture::from(ab_promise).await?).to_vec();
    Ok(create_result_from_bytes(bytes, ct))
}

async fn read_local_file(path: String) -> Result<JsValue, JsValue> {
    let global = js_sys::global();
    let bun = js_sys::Reflect::get(&global, &"Bun".into())?;
    let file = js_sys::Reflect::get(&bun, &"file".into())?
        .dyn_into::<js_sys::Function>()?
        .call1(&bun, &path.into())?;
    let ab_val = js_sys::Reflect::get(&file, &"arrayBuffer".into())?
        .dyn_into::<js_sys::Function>()?
        .call0(&file)?;
    let ab_promise: js_sys::Promise = ab_val.dyn_into()?;
    let bytes = js_sys::Uint8Array::new(&JsFuture::from(ab_promise).await?).to_vec();
    Ok(serde_wasm_bindgen::to_value(&create_result_from_bytes(
        bytes,
        js_sys::Reflect::get(&file, &"type".into())?.as_string(),
    ))?)
}
