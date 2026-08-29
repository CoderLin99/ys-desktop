//! AI HTTP 代理：渲染层不直连外网（WebView CORS / 安卓明文限制），改由 Rust reqwest 转发。
use std::collections::{HashMap, HashSet};

use futures_util::StreamExt;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use url::Url;

/// 允许代理的主机名（防任意 URL 转发）
fn allowed_hosts() -> HashSet<&'static str> {
  HashSet::from(["api.deepseek.com", "api.siliconflow.cn", "127.0.0.1", "localhost"])
}

/// 整包 HTTP 响应
#[derive(Serialize)]
pub struct AiHttpResponse {
  /// 是否 2xx
  pub ok: bool,
  /// 状态码
  pub status: u16,
  /// 响应正文
  pub body: String,
}

/// 流式结束回执
#[derive(Serialize)]
pub struct AiHttpStreamResult {
  /// 是否 2xx
  pub ok: bool,
  /// 状态码
  pub status: u16,
  /// 非 2xx 时带回错误正文
  pub body: Option<String>,
}

/// 推给前端的 SSE 分片
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct StreamChunk {
  /// 与前端 session 对应
  stream_id: String,
  /// 原始文本分片
  chunk: String,
}

/**
 * 校验目标 URL 是否允许代理。
 * @param url_str 完整 URL
 */
fn assert_allowed_url(url_str: &str) -> Result<Url, String> {
  let u = Url::parse(url_str).map_err(|_| format!("非法 URL：{url_str}"))?;
  let host = u.host_str().unwrap_or("");
  let https = u.scheme() == "https";
  let local_http = u.scheme() == "http" && allowed_hosts().contains(host);
  if !https && !local_http {
    return Err(format!("仅允许 https（或本地 http）请求，当前：{}", u.scheme()));
  }
  if !allowed_hosts().contains(host) {
    return Err(format!("主机未在白名单：{host}"));
  }
  Ok(u)
}

/**
 * 把前端传入的头转成 reqwest HeaderMap。
 * @param headers 可选请求头
 */
fn to_header_map(headers: &Option<HashMap<String, String>>) -> Result<HeaderMap, String> {
  let mut map = HeaderMap::new();
  if let Some(h) = headers {
    for (k, v) in h {
      if v.is_empty() {
        continue;
      }
      let name = HeaderName::from_bytes(k.as_bytes()).map_err(|e| e.to_string())?;
      let value = HeaderValue::from_str(v).map_err(|e| e.to_string())?;
      map.insert(name, value);
    }
  }
  Ok(map)
}

/**
 * 构建 rustls 客户端（桌面 / 安卓共用，不依赖系统原生 TLS）。
 */
fn http_client() -> Result<reqwest::Client, String> {
  reqwest::Client::builder()
    .use_rustls_tls()
    .build()
    .map_err(|e| e.to_string())
}

/**
 * 整包转发 HTTP（列表模型、非流式补全）。
 * @param url 完整 URL
 * @param method GET/POST
 * @param headers 请求头
 * @param body JSON 字符串
 */
#[tauri::command]
pub async fn ai_http(
  url: String,
  method: Option<String>,
  headers: Option<HashMap<String, String>>,
  body: Option<String>,
) -> Result<AiHttpResponse, String> {
  assert_allowed_url(&url)?;
  let method = method.unwrap_or_else(|| "GET".into()).to_uppercase();
  let client = http_client()?;
  let mut req = client.request(
    method.parse().map_err(|_| format!("非法方法：{method}"))?,
    &url,
  );
  req = req.headers(to_header_map(&headers)?);
  if method != "GET" && method != "HEAD" {
    if let Some(b) = body {
      req = req.body(b);
    }
  }
  let res = req.send().await.map_err(|e| e.to_string())?;
  let status = res.status().as_u16();
  let ok = res.status().is_success();
  let text = res.text().await.map_err(|e| e.to_string())?;
  Ok(AiHttpResponse {
    ok,
    status,
    body: text,
  })
}

/**
 * SSE 真流式转发：分片通过事件 `ai-http-stream-chunk` 推给前端。
 * @param app 用于 emit
 * @param stream_id 前端会话 id（camelCase: streamId）
 * @param url 完整 URL
 * @param method HTTP 方法
 * @param headers 请求头
 * @param body JSON 字符串
 */
#[tauri::command(rename_all = "camelCase")]
pub async fn ai_http_stream(
  app: AppHandle,
  stream_id: String,
  url: String,
  method: Option<String>,
  headers: Option<HashMap<String, String>>,
  body: Option<String>,
) -> Result<AiHttpStreamResult, String> {
  assert_allowed_url(&url)?;
  let method = method.unwrap_or_else(|| "GET".into()).to_uppercase();
  let client = http_client()?;
  let mut req = client.request(
    method.parse().map_err(|_| format!("非法方法：{method}"))?,
    &url,
  );
  req = req.headers(to_header_map(&headers)?);
  if method != "GET" && method != "HEAD" {
    if let Some(b) = body {
      req = req.body(b);
    }
  }
  let res = req.send().await.map_err(|e| e.to_string())?;
  let status = res.status().as_u16();
  let ok = res.status().is_success();
  if !ok {
    let text = res.text().await.unwrap_or_default();
    return Ok(AiHttpStreamResult {
      ok: false,
      status,
      body: Some(text),
    });
  }

  // 跨 TCP 分片缓冲未完成的 UTF-8 尾字节，避免中文被 from_utf8_lossy 打成 �
  let mut pending: Vec<u8> = Vec::new();
  let mut stream = res.bytes_stream();
  while let Some(item) = stream.next().await {
    let bytes = item.map_err(|e| e.to_string())?;
    if bytes.is_empty() {
      continue;
    }
    pending.extend_from_slice(&bytes);
    let (valid, rest) = split_valid_utf8_prefix(&pending);
    if !valid.is_empty() {
      let chunk = String::from_utf8(valid).map_err(|e| e.to_string())?;
      app
        .emit(
          "ai-http-stream-chunk",
          StreamChunk {
            stream_id: stream_id.clone(),
            chunk,
          },
        )
        .map_err(|e| e.to_string())?;
    }
    pending = rest;
  }

  // 流结束仍有残字节：按 lossy 收尾（理论上不应出现）
  if !pending.is_empty() {
    let chunk = String::from_utf8_lossy(&pending).to_string();
    if !chunk.is_empty() {
      app
        .emit(
          "ai-http-stream-chunk",
          StreamChunk {
            stream_id: stream_id.clone(),
            chunk,
          },
        )
        .map_err(|e| e.to_string())?;
    }
  }

  Ok(AiHttpStreamResult {
    ok: true,
    status,
    body: None,
  })
}

/**
 * 从字节缓冲中切出完整 UTF-8 前缀，尾部不完整多字节序列留到下一包。
 * @param buf 当前累计字节
 * @returns (可安全解码的前缀, 待拼接下一批的尾部)
 */
fn split_valid_utf8_prefix(buf: &[u8]) -> (Vec<u8>, Vec<u8>) {
  if buf.is_empty() {
    return (Vec::new(), Vec::new());
  }
  match std::str::from_utf8(buf) {
    Ok(_) => (buf.to_vec(), Vec::new()),
    Err(err) => {
      let valid_up_to = err.valid_up_to();
      // error_len=None 表示末尾是不完整序列，应保留；Some 表示中间有坏字节，跳过该坏段继续
      if let Some(error_len) = err.error_len() {
        let mut valid = buf[..valid_up_to].to_vec();
        let after = &buf[valid_up_to + error_len..];
        let (more, rest) = split_valid_utf8_prefix(after);
        valid.extend_from_slice(&more);
        (valid, rest)
      } else {
        (buf[..valid_up_to].to_vec(), buf[valid_up_to..].to_vec())
      }
    }
  }
}

#[cfg(test)]
mod tests {
  use super::split_valid_utf8_prefix;

  #[test]
  fn utf8_split_keeps_incomplete_chinese_tail() {
    // 「期」= E6 9C 9F，故意只给前两字节，模拟 TCP 截断
    let qi = "期".as_bytes();
    let mut buf = "应".as_bytes().to_vec();
    buf.extend_from_slice(&qi[..2]);
    let (valid, rest) = split_valid_utf8_prefix(&buf);
    assert_eq!(String::from_utf8(valid).unwrap(), "应");
    assert_eq!(rest, qi[..2]);

    let mut next = rest;
    next.push(qi[2]);
    let (valid2, rest2) = split_valid_utf8_prefix(&next);
    assert_eq!(String::from_utf8(valid2).unwrap(), "期");
    assert!(rest2.is_empty());
  }
}
