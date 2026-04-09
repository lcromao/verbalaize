#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::blocking::Client;
use rfd::{MessageButtons, MessageDialog, MessageLevel};
use serde_json::json;
#[cfg(unix)]
use std::os::unix::process::CommandExt;
use std::{
    error::Error,
    fs::{self, OpenOptions},
    io::{BufRead, BufReader, Write},
    net::TcpListener,
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::Mutex,
    thread,
    time::{Duration, Instant},
};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use uuid::Uuid;

struct BackendProcess {
    child: Child,
    log_path: PathBuf,
    pid_file: PathBuf,
}

struct BackendState(Mutex<Option<BackendProcess>>);

fn find_free_port() -> u16 {
    TcpListener::bind("127.0.0.1:0")
        .expect("failed to bind an ephemeral port")
        .local_addr()
        .expect("failed to resolve local address")
        .port()
}

fn current_target_triple() -> &'static str {
    if cfg!(all(target_os = "macos", target_arch = "aarch64")) {
        "aarch64-apple-darwin"
    } else if cfg!(all(target_os = "macos", target_arch = "x86_64")) {
        "x86_64-apple-darwin"
    } else if cfg!(all(target_os = "windows", target_arch = "x86_64")) {
        "x86_64-pc-windows-msvc"
    } else if cfg!(all(target_os = "linux", target_arch = "x86_64")) {
        "x86_64-unknown-linux-gnu"
    } else {
        panic!("unsupported desktop target")
    }
}

fn current_platform() -> &'static str {
    if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "linux") {
        "linux"
    } else {
        panic!("unsupported desktop platform")
    }
}

fn path_separator() -> &'static str {
    if cfg!(target_os = "windows") {
        ";"
    } else {
        ":"
    }
}

fn append_log(log_path: &Path, line: &str) {
    if let Some(parent) = log_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(log_path) {
        let _ = file.write_all(line.as_bytes());
    }
}

fn pipe_stream<R>(reader: R, log_path: PathBuf, prefix: &'static str)
where
    R: std::io::Read + Send + 'static,
{
    thread::spawn(move || {
        let reader = BufReader::new(reader);
        for line in reader.lines() {
            match line {
                Ok(line) => append_log(&log_path, &format!("{prefix} {line}\n")),
                Err(error) => {
                    append_log(&log_path, &format!("[logger-error] {error}\n"));
                    break;
                }
            }
        }
    });
}

fn wait_for_health(port: u16, timeout: Duration) -> Result<(), Box<dyn Error>> {
    let client = Client::builder().timeout(Duration::from_secs(5)).build()?;
    let deadline = Instant::now() + timeout;
    let url = format!("http://127.0.0.1:{port}/health");

    while Instant::now() < deadline {
        if let Ok(response) = client.get(&url).send() {
            if response.status().is_success() {
                return Ok(());
            }
        }

        thread::sleep(Duration::from_millis(500));
    }

    Err(format!("Timed out waiting for backend health at {url}").into())
}

fn show_startup_error(message: &str, log_path: &Path) {
    let description = format!("{message}\n\nLog: {}", log_path.display());
    let _ = MessageDialog::new()
        .set_level(MessageLevel::Error)
        .set_title("Verbalaize failed to start")
        .set_description(&description)
        .set_buttons(MessageButtons::Ok)
        .show();
}

fn sidecar_filename() -> String {
    if cfg!(target_os = "windows") {
        format!("verbalaize-backend-{}.exe", current_target_triple())
    } else {
        format!("verbalaize-backend-{}", current_target_triple())
    }
}

fn release_sidecar_basename() -> &'static str {
    if cfg!(target_os = "windows") {
        "verbalaize-backend.exe"
    } else {
        "verbalaize-backend"
    }
}

fn existing_path(candidates: &[PathBuf]) -> Option<PathBuf> {
    candidates.iter().find(|path| path.exists()).cloned()
}

fn resolve_sidecar_path(app: &tauri::AppHandle) -> Result<PathBuf, Box<dyn Error>> {
    if cfg!(debug_assertions) {
        Ok(PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("binaries")
            .join(sidecar_filename()))
    } else {
        let resource_dir = app.path().resource_dir()?;
        let executable_dir = std::env::current_exe()?
            .parent()
            .map(Path::to_path_buf)
            .ok_or("desktop executable directory not found")?;
        let candidates = [
            executable_dir.join(release_sidecar_basename()),
            executable_dir.join(sidecar_filename()),
            resource_dir.join(release_sidecar_basename()),
            resource_dir.join(sidecar_filename()),
        ];

        existing_path(&candidates).ok_or_else(|| {
            format!(
                "Desktop sidecar not found. Checked: {}",
                candidates
                    .iter()
                    .map(|path| path.display().to_string())
                    .collect::<Vec<_>>()
                    .join(", ")
            )
            .into()
        })
    }
}

fn resolve_ffmpeg_dir(app: &tauri::AppHandle) -> Result<PathBuf, Box<dyn Error>> {
    if cfg!(debug_assertions) {
        Ok(PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("resources")
            .join("ffmpeg")
            .join(current_target_triple()))
    } else {
        let resource_dir = app.path().resource_dir()?;
        let candidates = [
            resource_dir
                .join("resources")
                .join("ffmpeg")
                .join(current_target_triple()),
            resource_dir.join("ffmpeg").join(current_target_triple()),
        ];

        existing_path(&candidates).ok_or_else(|| {
            format!(
                "Bundled FFmpeg directory not found. Checked: {}",
                candidates
                    .iter()
                    .map(|path| path.display().to_string())
                    .collect::<Vec<_>>()
                    .join(", ")
            )
            .into()
        })
    }
}

fn shutdown_backend(app_handle: &tauri::AppHandle) {
    if let Some(state) = app_handle.try_state::<BackendState>() {
        if let Ok(mut backend_guard) = state.0.lock() {
            if let Some(mut backend) = backend_guard.take() {
                append_log(&backend.log_path, "[desktop] shutting down backend\n");
                terminate_backend_pid(backend.child.id());
                let _ = backend.child.wait();
                let _ = fs::remove_file(&backend.pid_file);
            }
        }
    }
}

fn backend_pid_file(app: &tauri::AppHandle) -> Result<PathBuf, Box<dyn Error>> {
    Ok(app.path().app_data_dir()?.join("backend.pid"))
}

fn terminate_backend_pid(pid: u32) {
    if cfg!(target_os = "windows") {
        let _ = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .status();
        return;
    }

    let command_output = Command::new("ps")
        .args(["-p", &pid.to_string(), "-o", "command="])
        .output();

    let Ok(output) = command_output else {
        return;
    };

    let command_line = String::from_utf8_lossy(&output.stdout);
    if !command_line.contains("verbalaize-backend") {
        return;
    }

    let process_group = format!("-{pid}");
    let _ = Command::new("kill")
        .args(["-TERM", &process_group])
        .status();
    thread::sleep(Duration::from_millis(300));
    let _ = Command::new("kill")
        .args(["-KILL", &process_group])
        .status();
}

fn cleanup_stale_backend(app: &tauri::AppHandle, log_path: &Path) {
    let Ok(pid_file) = backend_pid_file(app) else {
        return;
    };

    let Ok(contents) = fs::read_to_string(&pid_file) else {
        return;
    };

    let Ok(pid) = contents.trim().parse::<u32>() else {
        let _ = fs::remove_file(pid_file);
        return;
    };

    append_log(
        log_path,
        &format!("[desktop] cleaning up stale backend pid {pid}\n"),
    );
    terminate_backend_pid(pid);
    let _ = fs::remove_file(pid_file);
}

fn spawn_backend(
    app: &tauri::AppHandle,
) -> Result<(Child, PathBuf, String, u16), Box<dyn Error>> {
    let data_dir = app.path().app_data_dir()?;
    let models_dir = data_dir.join("models");
    let logs_dir = data_dir.join("logs");
    fs::create_dir_all(&models_dir)?;
    fs::create_dir_all(&logs_dir)?;

    let ffmpeg_dir = resolve_ffmpeg_dir(app)?;
    let sidecar_path = resolve_sidecar_path(app)?;

    let port = find_free_port();
    let secret = Uuid::new_v4().to_string();
    let log_path = logs_dir.join("backend.log");
    let pid_file = backend_pid_file(app)?;
    cleanup_stale_backend(app, &log_path);
    append_log(
        &log_path,
        &format!(
            "[desktop] launching sidecar {}\n",
            sidecar_path.display()
        ),
    );

    let existing_path = std::env::var("PATH").unwrap_or_default();
    let combined_path = if existing_path.is_empty() {
        ffmpeg_dir.display().to_string()
    } else {
        format!(
            "{}{}{}",
            ffmpeg_dir.display(),
            path_separator(),
            existing_path
        )
    };

    let mut command = Command::new(&sidecar_path);
    #[cfg(unix)]
    command.process_group(0);
    command
        .env("VBZ_APP_SECRET", &secret)
        .env("VBZ_PORT", port.to_string())
        .env("VBZ_HOST", "127.0.0.1")
        .env("VBZ_DESKTOP_MODE", "true")
        .env("VBZ_DISABLE_STARTUP_PRELOAD", "true")
        .env(
            "VBZ_CORS_ALLOWED_ORIGINS",
            "tauri://localhost,http://tauri.localhost,https://tauri.localhost",
        )
        .env("VBZ_FFMPEG_BIN_DIR", ffmpeg_dir.display().to_string())
        .env(
            "VBZ_WHISPER_MODEL_CACHE_DIR",
            models_dir.display().to_string(),
        )
        .env("PATH", combined_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = command.spawn()?;

    if let Some(stdout) = child.stdout.take() {
        pipe_stream(stdout, log_path.clone(), "[stdout]");
    }
    if let Some(stderr) = child.stderr.take() {
        pipe_stream(stderr, log_path.clone(), "[stderr]");
    }

    if let Some(parent) = pid_file.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&pid_file, child.id().to_string())?;

    Ok((child, log_path, secret, port))
}

fn build_runtime_script(secret: &str, port: u16) -> String {
    let payload = json!({
        "mode": "desktop",
        "apiBaseUrl": format!("http://127.0.0.1:{port}"),
        "wsBaseUrl": format!("ws://127.0.0.1:{port}"),
        "secret": secret,
        "platform": current_platform(),
    });

    format!("window.__VERBALAIZE__ = {payload};")
}

fn setup_app(app: &mut tauri::App) -> Result<(), Box<dyn Error>> {
    let app_handle = app.handle().clone();
    let (child, log_path, secret, port) = match spawn_backend(&app_handle) {
        Ok(result) => result,
        Err(error) => {
            let fallback_log = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join("logs")
                .join("backend.log");
            show_startup_error(&error.to_string(), &fallback_log);
            return Err(error);
        }
    };

    if let Err(error) = wait_for_health(port, Duration::from_secs(45)) {
        append_log(&log_path, &format!("[desktop] startup failure: {error}\n"));
        let mut child = child;
        let _ = child.kill();
        let _ = child.wait();
        show_startup_error(&error.to_string(), &log_path);
        return Err(error);
    }

    {
        let state = app.state::<BackendState>();
        let mut backend_guard = state.0.lock().expect("backend state poisoned");
        *backend_guard = Some(BackendProcess {
            child,
            log_path: log_path.clone(),
            pid_file: backend_pid_file(&app_handle)?,
        });
    }

    let initialization_script = build_runtime_script(&secret, port);

    WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("VerbalAIze")
        .inner_size(1200.0, 800.0)
        .resizable(true)
        .initialization_script(&initialization_script)
        .build()?;

    Ok(())
}

fn main() {
    let app = tauri::Builder::default()
        .manage(BackendState(Mutex::new(None)))
        .setup(|app| setup_app(app).map_err(Into::into))
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                window.app_handle().exit(0);
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building Verbalaize desktop");

    app.run(|app_handle, event| {
        if matches!(
            event,
            tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. }
        ) {
            shutdown_backend(app_handle);
        }
    });
}
