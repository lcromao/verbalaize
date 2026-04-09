fn main() {
    let out_dir = std::env::var_os("OUT_DIR")
        .map(std::path::PathBuf::from)
        .expect("OUT_DIR is required for the desktop build");
    let target_dir = out_dir
        .parent()
        .and_then(|path| path.parent())
        .and_then(|path| path.parent())
        .expect("failed to resolve target dir for the desktop build");

    let _ = std::fs::remove_dir_all(target_dir.join("resources").join("ffmpeg"));
    tauri_build::build()
}
