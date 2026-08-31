//! 本机键值存储：rusqlite bundled，桌面与安卓共用应用数据目录。
use rusqlite::Connection;
use tauri::{AppHandle, Manager};

/**
 * 打开（或创建）应用数据库。
 * @param app Tauri 应用句柄
 */
fn open_db(app: &AppHandle) -> Result<Connection, String> {
  let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
  std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  let path = dir.join("yi-desktop.sqlite");
  let conn = Connection::open(path).map_err(|e| e.to_string())?;
  conn
    .execute(
      "CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY NOT NULL, v TEXT NOT NULL)",
      [],
    )
    .map_err(|e| e.to_string())?;
  Ok(conn)
}

/**
 * 读取键值；不存在则返回 null。
 * @param app 应用句柄
 * @param key 键
 */
#[tauri::command]
pub fn kv_get(app: AppHandle, key: String) -> Result<Option<String>, String> {
  let conn = open_db(&app)?;
  let mut stmt = conn
    .prepare("SELECT v FROM kv WHERE k = ?1")
    .map_err(|e| e.to_string())?;
  let mut rows = stmt.query([&key]).map_err(|e| e.to_string())?;
  if let Some(row) = rows.next().map_err(|e| e.to_string())? {
    Ok(Some(row.get(0).map_err(|e| e.to_string())?))
  } else {
    Ok(None)
  }
}

/**
 * 写入键值（存在则覆盖）。
 * @param app 应用句柄
 * @param key 键
 * @param value 值
 */
#[tauri::command]
pub fn kv_set(app: AppHandle, key: String, value: String) -> Result<(), String> {
  let conn = open_db(&app)?;
  conn
    .execute(
      "INSERT INTO kv(k, v) VALUES(?1, ?2) ON CONFLICT(k) DO UPDATE SET v = excluded.v",
      [&key, &value],
    )
    .map_err(|e| e.to_string())?;
  Ok(())
}
