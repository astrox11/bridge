use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{Headers, Request, RequestInit, RequestRedirect, Response};

#[derive(Serialize, Deserialize)]
pub struct ParsedResult {
    #[serde(rename = "mimeType")]
    pub mime_type: String,
    pub content: Option<String>,
    #[serde(with = "serde_wasm_bindgen::preserve")]
    pub buffer: JsValue,
}

#[wasm_bindgen]
pub fn extract_text_from_message(message: JsValue) -> Option<String> {
    if message.is_null() || message.is_undefined() {
        return None;
    }

    let get_prop = |obj: &JsValue, keys: &[&str]| -> Option<String> {
        let mut current = obj.clone();
        for &key in keys {
            current = js_sys::Reflect::get(&current, &key.into()).ok()?;
            if current.is_null() || current.is_undefined() {
                return None;
            }
        }
        current.as_string()
    };

    if let Some(t) = get_prop(&message, &["extendedTextMessage", "text"]) {
        return Some(t);
    }
    if let Some(t) = get_prop(&message, &["conversation"]) {
        return Some(t);
    }
    if let Some(t) = get_prop(&message, &["imageMessage", "caption"]) {
        return Some(t);
    }
    if let Some(t) = get_prop(&message, &["videoMessage", "caption"]) {
        return Some(t);
    }
    if let Some(t) = get_prop(&message, &["documentMessage", "caption"]) {
        return Some(t);
    }
    if let Some(t) = get_prop(&message, &["buttonsMessage", "contentText"]) {
        return Some(t);
    }
    if let Some(t) = get_prop(
        &message,
        &["templateMessage", "hydratedTemplate", "hydratedContentText"],
    ) {
        return Some(t);
    }
    if let Some(t) = get_prop(&message, &["listMessage", "description"]) {
        return Some(t);
    }

    // Edited Message Recursion
    if let Ok(protocol) = js_sys::Reflect::get(&message, &"protocolMessage".into()) {
        if let Ok(edited) = js_sys::Reflect::get(&protocol, &"editedMessage".into()) {
            if !edited.is_null() && !edited.is_undefined() {
                return extract_text_from_message(edited);
            }
        }
    }

    None
}

#[wasm_bindgen]
pub async fn parse_content(input: JsValue) -> Result<JsValue, JsValue> {
    if let Some(text) = input.as_string() {
        if text.starts_with("http") {
            let res = fetch_and_analyze(text).await?;
            return Ok(serde_wasm_bindgen::to_value(&res)?);
        }

        if text.contains('/') || text.contains('\\') || text.contains('.') {
            return read_local_file(text).await;
        }

        return Ok(serde_wasm_bindgen::to_value(&create_result_from_bytes(
            text.as_bytes().to_vec(),
            Some("text/plain".into()),
        ))?);
    }

    if input.is_instance_of::<js_sys::Uint8Array>() || input.is_instance_of::<js_sys::ArrayBuffer>()
    {
        let bytes = if input.is_instance_of::<js_sys::Uint8Array>() {
            js_sys::Uint8Array::from(input).to_vec()
        } else {
            js_sys::Uint8Array::new(&input).to_vec()
        };

        return Ok(serde_wasm_bindgen::to_value(&create_result_from_bytes(
            bytes, None,
        ))?);
    }

    Err(JsValue::from_str("Unsupported data type"))
}

#[wasm_bindgen]
pub fn get_content_type(content: JsValue) -> Option<String> {
    if content.is_null() || content.is_undefined() {
        return None;
    }

    // Get all keys from the object
    let keys = js_sys::Object::keys(content.unchecked_ref());

    // Iterate through keys to find the first match
    for i in 0..keys.length() {
        let key_js = keys.get(i);
        if let Some(key) = key_js.as_string() {
            // Logic: (k === 'conversation' || k.includes('Message')) && k !== 'senderKeyDistributionMessage'
            if (key == "conversation" || key.contains("Message"))
                && key != "senderKeyDistributionMessage"
            {
                return Some(key);
            }
        }
    }

    None
}

fn create_result_from_bytes(bytes: Vec<u8>, hint: Option<String>) -> ParsedResult {
    let mut final_mime = if let Some(kind) = infer::get(&bytes) {
        kind.mime_type().to_string()
    } else {
        hint.unwrap_or_else(|| "application/octet-stream".to_string())
    };

    if (final_mime.contains("ogg") || final_mime == "application/octet-stream") && bytes.len() > 36
    {
        if &bytes[28..36] == b"OpusHead" {
            final_mime = "audio/opus".to_string();
        }
    }

    let mut content = None;
    if final_mime == "application/octet-stream" || final_mime == "text/plain" {
        if let Ok(text) = String::from_utf8(bytes.clone()) {
            final_mime = "text/plain".into();
            content = Some(text);
        }
    }

    let uint8_array = unsafe { js_sys::Uint8Array::view(&bytes) };
    let global = js_sys::global();

    let buffer = match js_sys::Reflect::get(&global, &"Buffer".into()) {
        Ok(buffer_class) => {
            let buffer_from = js_sys::Reflect::get(&buffer_class, &"from".into()).unwrap();
            let func = buffer_from.dyn_into::<js_sys::Function>().unwrap();
            func.call1(&buffer_class, &uint8_array)
                .unwrap_or_else(|_| uint8_array.into())
        }
        Err(_) => uint8_array.into(),
    };

    ParsedResult {
        mime_type: final_mime,
        content,
        buffer,
    }
}

async fn fetch_and_analyze(url: String) -> Result<ParsedResult, JsValue> {
    let opts = RequestInit::new();
    opts.set_method("GET");
    opts.set_redirect(RequestRedirect::Follow);

    let headers = Headers::new()?;
    headers.set("DNT", "1")?;
    headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")?;
    opts.set_headers(&headers);

    let request = Request::new_with_str_and_init(&url, &opts)?;
    let global = js_sys::global();
    let fetch_fn =
        js_sys::Reflect::get(&global, &"fetch".into())?.dyn_into::<js_sys::Function>()?;
    let promise = fetch_fn.call1(&global, &request.into())?;
    let resp_val = JsFuture::from(js_sys::Promise::from(promise)).await?;
    let resp: Response = resp_val.dyn_into()?;

    let content_type = resp
        .headers()
        .get("content-type")?
        .filter(|s| !s.is_empty());
    let array_buffer = JsFuture::from(resp.array_buffer()?).await?;
    let bytes = js_sys::Uint8Array::new(&array_buffer).to_vec();

    Ok(create_result_from_bytes(bytes, content_type))
}

async fn read_local_file(path: String) -> Result<JsValue, JsValue> {
    let global = js_sys::global();
    let bun = js_sys::Reflect::get(&global, &"Bun".into())?;
    let file_fn = js_sys::Reflect::get(&bun, &"file".into())?.dyn_into::<js_sys::Function>()?;

    let file_obj = file_fn.call1(&bun, &JsValue::from(path.clone()))?;
    let ab_fn =
        js_sys::Reflect::get(&file_obj, &"arrayBuffer".into())?.dyn_into::<js_sys::Function>()?;
    let promise = ab_fn.call0(&file_obj)?;
    let ab_val = JsFuture::from(js_sys::Promise::from(promise)).await?;

    let bytes = js_sys::Uint8Array::new(&ab_val).to_vec();

    let hint = if path.ends_with(".apk") {
        Some("application/vnd.android.package-archive".to_string())
    } else if path.ends_with(".opus") {
        Some("audio/opus".to_string())
    } else {
        js_sys::Reflect::get(&file_obj, &"type".into())?
            .as_string()
            .filter(|s| !s.is_empty())
    };

    Ok(serde_wasm_bindgen::to_value(&create_result_from_bytes(
        bytes, hint,
    ))?)
}
