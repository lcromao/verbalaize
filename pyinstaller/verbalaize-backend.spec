# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path

from PyInstaller.utils.hooks import (
    collect_data_files,
    collect_dynamic_libs,
    collect_submodules,
)

PROJECT_ROOT = Path(SPEC).resolve().parents[1]
ENTRYPOINT = PROJECT_ROOT / "desktop" / "scripts" / "backend_entry.py"

hiddenimports = collect_submodules("app") + [
    "numba._devicearray",
    "whisper",
    "whisper.__main__",
    "whisper.audio",
    "whisper.decoding",
    "whisper.normalizers",
    "whisper.timing",
    "whisper.tokenizer",
    "whisper.transcribe",
    "whisper.utils",
]

datas = collect_data_files("whisper")
binaries = collect_dynamic_libs("torch")

excludes = [
    "IPython",
    "PIL",
    "altair",
    "av",
    "boto3",
    "dask",
    "datasets",
    "h5py",
    "jax",
    "jedi",
    "jinja2",
    "jupyter",
    "langchain",
    "langchain_classic",
    "langchain_core",
    "langsmith",
    "lxml",
    "matplotlib",
    "nltk",
    "notebook",
    "numba.cuda",
    "onnxruntime",
    "openpyxl",
    "pandas",
    "plotly",
    "pyarrow",
    "pytest",
    "scipy",
    "seaborn",
    "sklearn",
    "spacy",
    "sqlalchemy",
    "statsmodels",
    "sympy",
    "tensorflow",
    "thinc",
    "torch.testing._internal.opinfo",
    "torchaudio",
    "torchvision",
    "transformers",
    "xarray",
]

a = Analysis(
    [str(ENTRYPOINT)],
    pathex=[str(PROJECT_ROOT)],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes,
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="verbalaize-backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
