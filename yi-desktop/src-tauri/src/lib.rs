//! Tauri 入口：桌面 `main.rs` 与 Android / iOS `mobile_entry_point` 共用。
mod http_proxy;
mod settings;

/**
 * 启动应用（Windows / Android / iOS 共用）。
 * Android 与 iOS 由 `#[cfg_attr(mobile, tauri::mobile_entry_point)]` 生成 JNI / iOS 入口。
 */
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![
      http_proxy::ai_http,
      http_proxy::ai_http_stream,
      settings::kv_get,
      settings::kv_set,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
