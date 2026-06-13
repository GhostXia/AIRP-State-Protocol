// AIRP UI desktop shell. Hosts the Vue WebView. The AgentBus client (talking to
// AIRP-Gateway over IPC) will be wired into the Rust core here later.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running AIRP UI");
}
