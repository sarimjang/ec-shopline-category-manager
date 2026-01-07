#!/usr/bin/env python3
"""
snapshot.py
Purpose: Scan a project and generate a Markdown snapshot (structure, functions, dependencies).
Targets: JS/TS/JSX/TSX/Vue/Node.js/React/Python projects.
Usage:   python snapshot.py [--root .] [--output snapshot.md] [--max-depth 0] [--ext .js,.ts,.jsx,.tsx,.vue,.py]
Notes:   Pure standard library. Heuristic regex-based parsing (not a full AST). Cross‑platform.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import fnmatch
import concurrent.futures
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple, Iterable, Optional, Callable

# ------------------------------
# 1) Config (editable defaults)
# ------------------------------
DEFAULT_EXCLUDES = [
    "node_modules", ".git", "dist", "build", "__pycache__", ".venv", "venv", ".mypy_cache", ".pytest_cache"
]
DEFAULT_EXTENSIONS = [".js", ".ts", ".jsx", ".tsx", ".vue", ".py", ".gs", ".swift"]
DEFAULT_MAX_DEPTH = 0  # 0 or None means unlimited
DEFAULT_MAX_FILE_SIZE = 0  # 0 means unlimited
DEFAULT_MAX_LINES = 0  # 0 means unlimited
DEFAULT_CACHE_FILE = ".snapshot-cache.json"
DEFAULT_DETAIL_LEVEL = "medium"

# ------------------------------
# 1.1) Security - Secrets Filtering
# ------------------------------
# Files that are always excluded (potential secrets)
SECRETS_FILES = [
    ".env", ".env.local", ".env.development", ".env.production", ".env.test",
    ".env.staging", ".env.example",  # Include example to avoid leaking template secrets
    "credentials.json", "service-account.json", "serviceAccountKey.json",
    "secrets.json", "secrets.yaml", "secrets.yml",
    ".npmrc", ".pypirc",  # Package manager credentials
    "id_rsa", "id_ed25519", "id_ecdsa",  # SSH keys
    "*.pem", "*.key", "*.p12", "*.pfx",  # Certificates and keys
    ".htpasswd", ".netrc",
]

# Patterns that indicate a file might contain secrets (used for content scanning)
SECRETS_PATTERNS = [
    r"(?i)(api[_-]?key|apikey)\s*[:=]\s*['\"][^'\"]{10,}",
    r"(?i)(secret[_-]?key|secretkey)\s*[:=]\s*['\"][^'\"]{10,}",
    r"(?i)(access[_-]?token|accesstoken)\s*[:=]\s*['\"][^'\"]{10,}",
    r"(?i)(auth[_-]?token|authtoken)\s*[:=]\s*['\"][^'\"]{10,}",
    r"(?i)(password|passwd|pwd)\s*[:=]\s*['\"][^'\"]{8,}",
    r"(?i)(private[_-]?key|privatekey)\s*[:=]\s*['\"][^'\"]{20,}",
    r"(?i)bearer\s+[a-zA-Z0-9_\-\.]{20,}",
    r"(?i)(aws[_-]?access[_-]?key|aws[_-]?secret)\s*[:=]\s*['\"][^'\"]{10,}",
    r"-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----",
    r"-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----",
    r"ghp_[a-zA-Z0-9]{36}",  # GitHub Personal Access Token
    r"gho_[a-zA-Z0-9]{36}",  # GitHub OAuth Token
    r"sk-[a-zA-Z0-9]{48}",   # OpenAI API Key
    r"xox[baprs]-[a-zA-Z0-9\-]{10,}",  # Slack tokens
]

# Compiled regex for performance
SECRETS_REGEX = [re.compile(p) for p in SECRETS_PATTERNS]

# n8n specific: credential node types to redact
N8N_CREDENTIAL_TYPES = [
    "credentials",
    "oAuth2Api",
    "oAuth1Api",
    "httpBasicAuth",
    "httpDigestAuth",
    "httpHeaderAuth",
    "httpQueryAuth",
]

# n8n node type to service mapping for dependency/integration analysis
N8N_SERVICE_MAP = {
    # Communication
    "n8n-nodes-base.slack": "Slack",
    "n8n-nodes-base.email": "Email",
    "n8n-nodes-base.gmail": "Gmail",
    "n8n-nodes-base.telegram": "Telegram",
    "n8n-nodes-base.discord": "Discord",
    "n8n-nodes-base.twilio": "Twilio",

    # Databases
    "n8n-nodes-base.postgres": "PostgreSQL",
    "n8n-nodes-base.mysql": "MySQL",
    "n8n-nodes-base.mongodb": "MongoDB",
    "n8n-nodes-base.sqlite": "SQLite",
    "n8n-nodes-base.dynamodb": "DynamoDB",

    # APIs & Web
    "n8n-nodes-base.httpRequest": "HTTP API",
    "n8n-nodes-base.webhook": "Webhook",
    "n8n-nodes-base.rest": "REST API",
    "n8n-nodes-base.graphql": "GraphQL",

    # Cloud Services
    "n8n-nodes-base.aws": "AWS",
    "n8n-nodes-base.googleSheets": "Google Sheets",
    "n8n-nodes-base.googleDrive": "Google Drive",
    "n8n-nodes-base.notion": "Notion",
    "n8n-nodes-base.salesforce": "Salesforce",
    "n8n-nodes-base.hubspot": "HubSpot",
    "n8n-nodes-base.stripe": "Stripe",
    "n8n-nodes-base.github": "GitHub",
    "n8n-nodes-base.gitlab": "GitLab",

    # Utilities
    "n8n-nodes-base.if": "Conditional Logic",
    "n8n-nodes-base.splitInBatches": "Loop & Batch",
    "n8n-nodes-base.code": "JavaScript Code",
    "n8n-nodes-base.function": "Function",
    "n8n-nodes-base.set": "Set Variables",
    "n8n-nodes-base.merge": "Merge Data",
    "n8n-nodes-base.schedule": "Schedule Trigger",
    "n8n-nodes-base.manual": "Manual Trigger",
    "n8n-nodes-base.errorHandler": "Error Handling",
}

def is_secrets_file(filename: str) -> bool:
    """Check if a filename matches known secrets file patterns."""
    name = Path(filename).name.lower()
    for pattern in SECRETS_FILES:
        if "*" in pattern:
            if fnmatch.fnmatch(name, pattern.lower()):
                return True
        elif name == pattern.lower():
            return True
    return False

def contains_secrets(content: str, check_patterns: bool = True) -> List[str]:
    """
    Check if content contains potential secrets.
    Returns list of detected secret types (empty if none found).
    """
    if not check_patterns:
        return []

    detected = []
    for i, regex in enumerate(SECRETS_REGEX):
        if regex.search(content):
            # Return pattern description instead of actual match
            pattern_desc = SECRETS_PATTERNS[i][:50] + "..." if len(SECRETS_PATTERNS[i]) > 50 else SECRETS_PATTERNS[i]
            detected.append(f"Pattern match: {pattern_desc}")
    return detected

def redact_secrets(content: str) -> Tuple[str, List[str]]:
    """
    Redact potential secrets from content.
    Returns (redacted_content, list_of_redactions).
    """
    redacted = content
    redactions = []

    for i, regex in enumerate(SECRETS_REGEX):
        matches = list(regex.finditer(redacted))
        for match in matches:
            original = match.group(0)
            # Keep the key name but redact the value
            if "=" in original or ":" in original:
                parts = re.split(r'[:=]', original, maxsplit=1)
                if len(parts) == 2:
                    redacted_value = parts[0] + ": [REDACTED]"
                else:
                    redacted_value = "[REDACTED]"
            else:
                redacted_value = "[REDACTED]"
            redacted = redacted.replace(original, redacted_value, 1)
            redactions.append(f"Redacted: {SECRETS_PATTERNS[i][:30]}...")

    return redacted, redactions

def redact_n8n_credentials(workflow_data: dict) -> Tuple[dict, List[str]]:
    """
    Redact credentials from n8n workflow JSON.
    Returns (redacted_data, list_of_redactions).
    """
    import copy
    data = copy.deepcopy(workflow_data)
    redactions = []

    if "nodes" not in data:
        return data, redactions

    for node in data.get("nodes", []):
        # Redact credentials field
        if "credentials" in node and node["credentials"]:
            for cred_type in node["credentials"]:
                node["credentials"][cred_type] = {"name": "[REDACTED]", "id": "[REDACTED]"}
                redactions.append(f"Redacted credentials in node: {node.get('name', 'unknown')}")

        # Redact sensitive parameters
        if "parameters" in node:
            params = node["parameters"]
            sensitive_keys = ["apiKey", "apiSecret", "token", "password", "secret", "credentials"]
            for key in sensitive_keys:
                if key in params:
                    params[key] = "[REDACTED]"
                    redactions.append(f"Redacted {key} in node: {node.get('name', 'unknown')}")

    return data, redactions

# ------------------------------
# 2) Helpers
# ------------------------------
def is_excluded(path: Path, excludes: List[str], root: Path) -> bool:
    """
    Exclude if any of the path's parts match an excluded base name or if an excluded
    segment appears in its relative path parts. This is a pragmatic approach.
    """
    try:
        rel_parts = path.relative_to(root).parts
    except Exception:
        # If cannot relativize (shouldn't happen), fallback to name check
        rel_parts = path.parts
    ex_set = set(excludes)
    return any(part in ex_set for part in rel_parts)


def load_gitignore_patterns(root: Path) -> List[str]:
    """Load root .gitignore patterns (best-effort, simple glob subset)."""
    gitignore = root / ".gitignore"
    if not gitignore.exists():
        return []
    patterns: List[str] = []
    try:
        for line in gitignore.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            patterns.append(line)
    except Exception:
        return []
    return patterns


def is_gitignored(rel_path: str, patterns: List[str], is_dir: bool) -> bool:
    """
    Very small subset of .gitignore semantics:
    - Supports glob patterns with *, ?, []
    - Trailing / applies to directories
    - Patterns without / match basename
    - ! negation supported in-order
    """
    ignored = False
    basename = rel_path.split("/")[-1]
    for pat in patterns:
        negate = pat.startswith("!")
        raw = pat[1:] if negate else pat
        raw = raw.lstrip("/")
        dir_only = raw.endswith("/")
        raw = raw[:-1] if dir_only else raw
        if not raw:
            continue

        target = rel_path if "/" in raw else basename
        matched = fnmatch.fnmatch(target, raw)
        if matched and (not dir_only or is_dir):
            ignored = not negate
    return ignored



# Python 標準庫列表 (最常見的核心模組)
PYTHON_STDLIB = {
    # 內建模組
    'os', 're', 'sys', 'json', 'pathlib', 'typing', 'collections',
    'itertools', 'functools', 'operator', 'string', 'math', 'random',
    'statistics', 'datetime', 'time', 'calendar', 'zlib', 'gzip', 'bz2',
    'lzma', 'csv', 'configparser', 'hashlib', 'hmac', 'secrets', 'sqlite3',
    'pickle', 'copyreg', 'shelve', 'dbm', 'marshal', 'queue', 'socket',
    'ssl', 'select', 'selectors', 'asyncio', 'threading', 'multiprocessing',
    'subprocess', 'signal', 'mmap', 'argparse', 'optparse', 'getpass',
    'curses', 'platform', 'errno', 'ctypes', 'abc', 'atexit', 'traceback',
    'inspect', 'site', 'code', 'codeop', 'importlib', 'pkgutil', 'modulefinder',
    'runpy', 'ast', 'symtable', 'token', 'keyword', 'tokenize', 'tabnanny',
    'pydoc', 'doctest', 'unittest', 'test', 'bdb', 'faulthandler', 'pdb',
    'profile', 'pstats', 'timeit', 'trace', 'distutils', 'ensurepip', 'venv',
    'zipapp', 'warnings', 'contextlib', 'abc', 'struct', 'codecs', 'locale',
    'gettext', 'io', 'stringio', 'bytesio', 'tempfile', 'glob', 'fnmatch',
    'linecache', 'filecmp', 'difflib', 'shutil', 'dircache', 'macpath',
    'stat', 'fileinput', 'pickle', 'copyreg', 'shelve', 'dbm', 'sqlite3',
    'zlib', 'gzip', 'bz2', 'lzma', 'zipfile', 'tarfile', 'csv', 'configparser',
    'netrc', 'xdrlib', 'plistlib', 'hashlib', 'hmac', 'secrets', 'ssl',
    'certifi', 'pyopenssl', 'urllib', 'urllib2', 'urllib3', 'http', 'ftplib',
    'poplib', 'imaplib', 'smtplib', 'smtpd', 'telnetlib', 'uuid', 'socketserver',
    'http', 'xmlrpc', 'ipaddress', 'audioop', 'aifc', 'sunau', 'wave', 'chunk',
    'colorsys', 'imghdr', 'sndhdr', 'ossaudiodev', 'getopt', 'logging', 'getpass',
    'curses', 'platform', 'errno', 'ctypes', 'threading', 'multiprocessing',
    'concurrent', 'subprocess', 'socket', 'ssl', 'select', 'selectors',
    'asyncio', 'asyncore', 'asynchat', 'signal', 'mmap', 'readline', 'rlcompleter',
    'ast', 'symtable', 'token', 'keyword', 'tokenize', 'tabnanny', 'pydoc',
    'doctest', 'unittest', 'pdb', 'profile', 'pstats', 'timeit', 'trace',
    'distutils', 'ensurepip', 'venv', 'zipapp', 'types', 'copy', 'pprint',
    'reprlib', 'enum', 'numbers', 'cmath', 'decimal', 'fractions',
}

# 常見的包名別名對應 (import name -> 實際包名)
PYTHON_IMPORT_ALIASES = {
    'PIL': 'Pillow',
    'cv2': 'opencv-python',
    'sklearn': 'scikit-learn',
    'yaml': 'PyYAML',
    'bs4': 'beautifulsoup4',
    'lxml': 'lxml',
    'dateutil': 'python-dateutil',
    'dotenv': 'python-dotenv',
}


def is_python_stdlib(module_name: str) -> bool:
    """檢查模組是否為 Python 標準庫"""
    # 取得基礎模組名 (a.b.c -> a)
    base = module_name.split('.')[0]
    return base.lower() in PYTHON_STDLIB


def normalize_python_import(import_str: str) -> str:
    """規範化 import 名稱 (numpy.linalg -> numpy)"""
    # 移除子模組
    base = import_str.split('.')[0]
    # 移除任何特殊字符或版本資訊
    base = base.split('[')[0].split(';')[0].strip()
    return base.lower()


def get_file_external_dependencies(rel_path: str,
                                   external_imports: List[str],
                                   all_project_deps: Dict[str, Dict]) -> List[str]:
    """
    從文件的外部 import 清單確定實際使用的依賴包。
    
    Args:
        rel_path: 文件相對路徑
        external_imports: 文件的外部 import 清單
        all_project_deps: {project_name: {dependencies: {pkg: version}}}
    
    Returns:
        實際使用的外部包名清單 (已去重、已排序)
    """
    if not external_imports:
        return []
    
    actual_deps = set()
    
    # 合併所有項目依賴
    all_deps_set = set()
    for proj_info in all_project_deps.values():
        all_deps_set.update((proj_info.get("dependencies") or {}).keys())
    
    for imp in external_imports:
        normalized = normalize_python_import(imp)
        
        # 檢查是否為標準庫
        if is_python_stdlib(normalized):
            continue
        
        # 精確匹配
        if normalized in all_deps_set:
            actual_deps.add(normalized)
        # 檢查別名
        elif normalized in PYTHON_IMPORT_ALIASES:
            alias = PYTHON_IMPORT_ALIASES[normalized]
            if alias in all_deps_set:
                actual_deps.add(alias)
    
    return sorted(list(actual_deps))


def extract_python_imports(text: str) -> List[str]:
    imports: List[str] = []
    for line in text.splitlines():
        m = re.match(r"^\s*import\s+(.+)$", line)
        if m:
            parts = m.group(1).split("#", 1)[0]
            for part in parts.split(","):
                name = part.strip().split(" as ")[0].strip()
                if name:
                    imports.append(name)
        m = re.match(r"^\s*from\s+([A-Za-z0-9_\.]+|\.+[A-Za-z0-9_\.]*)\s+import\s+.+$", line)
        if m:
            mod = m.group(1).strip()
            if mod:
                imports.append(mod)
    return imports


def extract_js_imports(text: str) -> List[str]:
    imports: List[str] = []
    for m in re.finditer(r"""(?mx)^\s*import\s+.*?\s+from\s+['"]([^'"]+)['"]""", text):
        imports.append(m.group(1))
    for m in re.finditer(r"""(?mx)^\s*import\s+['"]([^'"]+)['"]""", text):
        imports.append(m.group(1))
    for m in re.finditer(r"""require\(\s*['"]([^'"]+)['"]\s*\)""", text):
        imports.append(m.group(1))
    for m in re.finditer(r"""import\(\s*['"]([^'"]+)['"]\s*\)""", text):
        imports.append(m.group(1))
    return imports


def classify_imports(mods: List[str], root: Path, lang: str) -> Tuple[List[str], List[str]]:
    internal: List[str] = []
    external: List[str] = []
    for mod in mods:
        is_internal = False
        if mod.startswith((".", "./", "../")):
            is_internal = True
        elif lang == "py":
            # 檢查是否為 Python 標準庫
            if is_python_stdlib(mod):
                is_internal = True  # 標準庫視為內部
            else:
                mod_path = root / mod.lstrip(".").replace(".", "/")
                if mod_path.exists() or (mod_path.with_suffix(".py")).exists():
                    is_internal = True
        elif lang in ("js", "ts", "jsx", "tsx", "vue", "gs"):
            if mod.startswith(("/",)) or mod.startswith(("./", "../")):
                is_internal = True
        if is_internal:
            internal.append(mod)
        else:
            external.append(mod)
    # Deduplicate stable
    def dedupe(xs: List[str]) -> List[str]:
        seen = set()
        out: List[str] = []
        for x in xs:
            if x not in seen:
                seen.add(x)
                out.append(x)
        return out
    return dedupe(internal), dedupe(external)


def extract_python_module_purpose(text: str) -> str:
    lines = text.splitlines()
    # skip shebang/encoding/comments
    i = 0
    while i < len(lines) and (lines[i].startswith("#!") or re.match(r"^#.*coding[:=]", lines[i]) or lines[i].strip().startswith("#")):
        i += 1
    head = "\n".join(lines[i:i + 60])
    m = re.match(r'^\s*("""|\'\'\')(.+?)\1', head, flags=re.S)
    if not m:
        return ""
    doc = m.group(2).strip()
    first_para = doc.split("\n\n", 1)[0].strip()
    return first_para[:200] + ("..." if len(first_para) > 200 else "")


def extract_js_module_purpose(text: str) -> str:
    head = "\n".join(text.splitlines()[:60])
    m = re.match(r"^\s*/\*\*?(.*?)\*/", head, flags=re.S)
    if m:
        doc = re.sub(r"^\s*\*\s?", "", m.group(1), flags=re.M).strip()
        first_para = doc.split("\n\n", 1)[0].strip()
        return first_para[:200] + ("..." if len(first_para) > 200 else "")
    # fall back to consecutive // comments
    lines = head.splitlines()
    collected: List[str] = []
    for line in lines:
        cm = re.match(r"^\s*//\s*(.*)$", line)
        if cm:
            collected.append(cm.group(1).strip())
        elif collected:
            break
    joined = " ".join(collected).strip()
    return joined[:200] + ("..." if len(joined) > 200 else "")


def extract_swift_module_purpose(text: str) -> str:
    """Extract file purpose from Swift documentation comments."""
    head = "\n".join(text.splitlines()[:60])
    
    # Look for /// documentation comments at start
    lines = head.splitlines()
    collected: List[str] = []
    for line in lines:
        # Match /// or /** style comments
        cm = re.match(r"^\\s*///\\s*(.*)$", line)
        if cm:
            collected.append(cm.group(1).strip())
        elif re.match(r"^\\s*/\\*\\*", line):
            # Start of block comment
            rest = line[line.index("/*"):].replace("/**", "", 1).strip()
            if rest and not rest.startswith("*"):
                collected.append(rest)
            # Continue reading until */
            continue
        elif collected and not line.strip().startswith("///"):
            break
    
    joined = " ".join(collected).strip()
    if not joined:
        # Fallback to /* */ block comment
        m = re.match(r"^\\s*/\\*\\*?(.*?)\\*/", head, flags=re.S)
        if m:
            doc = re.sub(r"^\\s*\\*\\s?", "", m.group(1), flags=re.M).strip()
            joined = doc.split("\\n\\n", 1)[0].strip()
    
    return joined[:200] + ("..." if len(joined) > 200 else "")


def extract_python_function_docs(text: str) -> Dict[str, str]:
    lines = text.splitlines()
    docs: Dict[str, str] = {}
    i = 0
    while i < len(lines):
        line = lines[i]
        m = PY_DEF.match(line)
        if m:
            name = m.group(1)
            base = name
            j = i + 1
            while j < len(lines) and not lines[j].strip():
                j += 1
            if j < len(lines):
                dm = re.match(r'^\s*("""|\'\'\')(.+?)\1', "\n".join(lines[j:j + 10]), flags=re.S)
                if dm:
                    doc = dm.group(2).strip().splitlines()[0].strip()
                    if doc:
                        docs.setdefault(base, doc[:160] + ("..." if len(doc) > 160 else ""))
            i = j
        else:
            i += 1
    return docs


def summarize_params(params_str: str) -> str:
    if not params_str:
        return ""
    parts = []
    for p in params_str.split(","):
        p = p.strip()
        if not p:
            continue
        p = p.split("=", 1)[0].strip()
        p = p.split(":", 1)[0].strip()
        if p:
            parts.append(p)
    return ", ".join(parts[:8]) + ("..." if len(parts) > 8 else "")


def iter_entries_sorted(dir_path: Path) -> List[Path]:
    try:
        entries = list(dir_path.iterdir())
    except Exception:
        return []
    # Sort: directories first, then files; then by name case-insensitive
    entries.sort(key=lambda p: (not p.is_dir(), p.name.lower()))
    return entries


def build_tree(dir_path: Path, root: Path, excludes: List[str], max_depth: Optional[int] = None,
               prefix: str = "", depth: int = 1) -> str:
    """Build an ASCII tree similar to `tree` command."""
    if max_depth and depth > max_depth:
        return ""
    entries = [e for e in iter_entries_sorted(dir_path) if not is_excluded(e, excludes, root)]
    lines: List[str] = []
    for idx, entry in enumerate(entries):
        connector = "└── " if idx == len(entries) - 1 else "├── "
        lines.append(f"{prefix}{connector}{entry.name}")
        if entry.is_dir():
            new_prefix = prefix + ("    " if idx == len(entries) - 1 else "│   ")
            lines.append(build_tree(entry, root, excludes, max_depth, new_prefix, depth + 1))
    return "\n".join([ln for ln in lines if ln != ""])


def scan_files(dir_path: Path, root: Path, excludes: List[str], extensions: List[str]) -> List[Path]:
    """Collect files with given extensions while respecting excludes (by parts)."""
    result: List[Path] = []
    stack = [dir_path]
    while stack:
        current = stack.pop()
        if is_excluded(current, excludes, root):
            continue
        try:
            with os.scandir(current) as it:
                for entry in it:
                    p = Path(entry.path)
                    if is_excluded(p, excludes, root):
                        continue
                    try:
                        if entry.is_dir(follow_symlinks=False):
                            stack.append(p)
                        elif entry.is_file(follow_symlinks=False) and p.suffix.lower() in extensions:
                            result.append(p)
                    except PermissionError:
                        continue
        except (PermissionError, FileNotFoundError):
            continue
    return result


def scan_repo_once(root: Path,
                   excludes: List[str],
                   extensions: List[str],
                   max_depth: Optional[int] = None,
                   gitignore_patterns: Optional[List[str]] = None,
                   include_globs: Optional[List[str]] = None,
                   exclude_globs: Optional[List[str]] = None,
                   filter_secrets: bool = True,
                   secrets_allowlist: Optional[List[str]] = None) -> Tuple[str, List[Path], List[Path], List[Path]]:
    """
    Single-pass repository scan to collect:
    - directory structure for tree rendering
    - eligible source files
    - dependency manifest files
    """
    # rel_dir -> (subdirs, files)
    structure: Dict[str, Tuple[List[str], List[str]]] = {}
    source_files: List[Path] = []
    manifest_files: List[Path] = []
    n8n_files: List[Path] = []
    gitignore_patterns = gitignore_patterns or []
    include_globs = [g for g in (include_globs or []) if g]
    exclude_globs = [g for g in (exclude_globs or []) if g]
    secrets_allowlist = set(secrets_allowlist or [])

    root_rel = ""
    for dirpath, dirnames, filenames in os.walk(root, topdown=True):
        current = Path(dirpath)
        if is_excluded(current, excludes, root):
            dirnames[:] = []
            continue

        rel_dir = str(current.relative_to(root)).replace("\\", "/")
        if rel_dir == ".":
            rel_dir = root_rel

        if rel_dir and is_gitignored(rel_dir, gitignore_patterns, is_dir=True):
            dirnames[:] = []
            continue

        depth = 0 if rel_dir == root_rel else rel_dir.count("/") + 1
        if max_depth is not None and depth >= max_depth:
            dirnames[:] = []

        # Prune excluded directories early
        kept_dirnames = []
        for d in dirnames:
            p = current / d
            rel_p = f"{rel_dir}/{d}" if rel_dir else d
            if is_excluded(p, excludes, root):
                continue
            if is_gitignored(rel_p, gitignore_patterns, is_dir=True):
                continue
            if exclude_globs and any(fnmatch.fnmatch(rel_p, eg) for eg in exclude_globs):
                continue
            kept_dirnames.append(d)
        dirnames[:] = kept_dirnames

        kept_files: List[str] = []
        for f in filenames:
            p = current / f
            rel_p = f"{rel_dir}/{f}" if rel_dir else f
            if is_excluded(p, excludes, root):
                continue
            if is_gitignored(rel_p, gitignore_patterns, is_dir=False):
                continue
            if exclude_globs and any(fnmatch.fnmatch(rel_p, eg) for eg in exclude_globs):
                continue
            if include_globs and not any(fnmatch.fnmatch(rel_p, ig) for ig in include_globs):
                continue
            # Skip known secrets files (security)
            if filter_secrets and is_secrets_file(f) and f not in secrets_allowlist and rel_p not in secrets_allowlist:
                continue
            kept_files.append(f)

            suf = p.suffix.lower()
            if suf in extensions:
                source_files.append(p)
            elif suf == ".json":
                # Candidate n8n workflow files:
                # - common naming: *.n8n.json
                # - explicit include-glob selecting json
                lower_name = f.lower()
                include_json = bool(include_globs) and any(fnmatch.fnmatch(rel_p, ig) for ig in include_globs)
                if lower_name.endswith(".n8n.json") or "n8n" in lower_name or include_json:
                    n8n_files.append(p)

            # Dependency manifest types
            if (
                f == "package.json"
                or f == "package-lock.json"
                or f == "pnpm-lock.yaml"
                or f == "yarn.lock"
                or f == "pyproject.toml"
                or f == "poetry.lock"
                or f == "Pipfile"
                or f == "Pipfile.lock"
                or f == "setup.cfg"
                or f == "setup.py"
                or re.match(r"requirements(\.[\w\-]+)?\.txt$", f)
            ):
                manifest_files.append(p)

        structure[rel_dir] = (sorted(dirnames, key=str.lower), sorted(kept_files, key=str.lower))

    def render_dir(rel_dir: str, prefix: str = "", depth: int = 1) -> List[str]:
        if max_depth is not None and depth > max_depth:
            return []
        subdirs, files = structure.get(rel_dir, ([], []))
        entries: List[Tuple[str, bool]] = [(d, True) for d in subdirs] + [(f, False) for f in files]
        lines: List[str] = []
        for idx, (name, is_dir_flag) in enumerate(entries):
            connector = "└── " if idx == len(entries) - 1 else "├── "
            lines.append(f"{prefix}{connector}{name}")
            if is_dir_flag:
                child_rel = f"{rel_dir}/{name}" if rel_dir else name
                new_prefix = prefix + ("    " if idx == len(entries) - 1 else "│   ")
                lines.extend(render_dir(child_rel, new_prefix, depth + 1))
        return lines

    tree_lines = render_dir(root_rel)
    tree_text = "\n".join(tree_lines)
    return tree_text, source_files, manifest_files, n8n_files


# ------------------------------
# 3) Language parsers (heuristic)
# ------------------------------

# Common patterns
JS_LINE_COMMENT = re.compile(r"^\s*//\s*(.*)$")
PY_LINE_COMMENT = re.compile(r"^\s*#\s*(.*)$")

# JSDoc patterns for type extraction
JSDOC_BLOCK = re.compile(r"/\*\*\s*(.*?)\s*\*/", re.DOTALL)
JSDOC_PARAM = re.compile(r"@param\s+(?:\{([^}]+)\}\s+)?(\w+)(?:\s+-\s*|\s+)?(.*)?")
JSDOC_RETURNS = re.compile(r"@returns?\s+(?:\{([^}]+)\}\s*)?(.*)?")
JSDOC_TYPE = re.compile(r"@type\s+\{([^}]+)\}")

# Google Apps Script trigger functions and their descriptions
GAS_TRIGGERS: Dict[str, str] = {
    "onOpen": "Spreadsheet/Document/Form open event",
    "onEdit": "Spreadsheet cell edit event",
    "onSelectionChange": "Spreadsheet selection change event",
    "onChange": "Spreadsheet structure change event",
    "onInstall": "Add-on install event",
    "onFormSubmit": "Form submission event",
    "doGet": "HTTP GET request handler",
    "doPost": "HTTP POST request handler",
}

# GAS menu/UI creation functions
GAS_UI_FUNCTIONS: Dict[str, str] = {
    "createMenu": "Creates custom menu",
    "showSidebar": "Displays sidebar UI",
    "showDialog": "Displays dialog UI",
    "showModalDialog": "Displays modal dialog",
    "showModelessDialog": "Displays modeless dialog",
}

# ------------------------------
# Entry Point Detection System (Phase 2)
# ------------------------------

# Entry point types
ENTRY_POINT_TYPES = {
    # Python
    "python_main": "Python if __name__ == '__main__'",
    "python_main_func": "Python def main() function",
    "python_main_module": "Python __main__.py package entry",
    "python_click": "Python Click CLI command",
    "python_flask": "Python Flask route",
    "python_fastapi": "Python FastAPI route",
    # GAS
    "gas_trigger": "Google Apps Script trigger function",
    "gas_menu": "Google Apps Script menu function",
    # Swift
    "swift_main": "Swift @main entry point",
    "swift_app": "SwiftUI App protocol",
    "swift_appdelegate": "UIKit AppDelegate",
    "swift_scenedelegate": "UIKit SceneDelegate",
    # JS/TS
    "js_package_main": "package.json main field",
    "js_package_bin": "package.json bin field",
    "js_package_exports": "package.json exports field",
    # n8n
    "n8n_trigger": "n8n workflow trigger node",
    "n8n_webhook": "n8n webhook trigger",
    "n8n_schedule": "n8n schedule trigger",
    # HTML
    "html_script": "HTML script entry",
    "html_module": "HTML ES module script",
}

# Python entry point patterns
PY_MAIN_BLOCK = re.compile(r'''if\s+__name__\s*==\s*['"](\_\_main\_\_|__main__)['"]\s*:''')
PY_CLICK_COMMAND = re.compile(r'''@click\.command|@click\.group|@app\.cli\.command''')
PY_FLASK_ROUTE = re.compile(r'''@app\.route\s*\(\s*['"](/[^'"]*)['"]\s*''')
PY_FASTAPI_ROUTE = re.compile(r'''@app\.(get|post|put|delete|patch)\s*\(\s*['"](/[^'"]*)['"]\s*''')

# Swift UIKit patterns
SWIFT_APPDELEGATE = re.compile(r'''class\s+(\w+)\s*:\s*[^{]*\bUIApplicationDelegate\b''', re.MULTILINE)
SWIFT_SCENEDELEGATE = re.compile(r'''class\s+(\w+)\s*:\s*[^{]*\bUIWindowSceneDelegate\b''', re.MULTILINE)
SWIFT_APP_PROTOCOL = re.compile(r'''struct\s+(\w+)\s*:\s*[^{]*\bApp\b''', re.MULTILINE)

# HTML script patterns
HTML_SCRIPT = re.compile(r'''<script\s+([^>]*)src\s*=\s*["']([^"']+)["']''', re.IGNORECASE)
HTML_SCRIPT_INLINE = re.compile(r'''<script(\s+[^>]*)?>''', re.IGNORECASE)
HTML_MODULE_TYPE = re.compile(r'''type\s*=\s*["']module["']''', re.IGNORECASE)


class EntryPoint:
    """Represents a program entry point."""

    def __init__(
        self,
        entry_type: str,
        name: str,
        file: str,
        line: int = 0,
        trigger: str = "",
        metadata: Optional[Dict] = None
    ):
        self.type = entry_type
        self.name = name
        self.file = file
        self.line = line
        self.trigger = trigger or ENTRY_POINT_TYPES.get(entry_type, entry_type)
        self.metadata = metadata or {}
        self.is_active = True  # For n8n disabled nodes

    def to_dict(self) -> Dict:
        result = {
            "type": self.type,
            "name": self.name,
            "file": self.file,
            "line": self.line,
            "trigger": self.trigger,
        }
        if self.metadata:
            result["metadata"] = self.metadata
        if not self.is_active:
            result["isActive"] = False
        return result


class WorkspaceInfo:
    """表示單一 workspace 的資訊"""

    def __init__(
        self,
        name: str,
        path: str,
        ws_type: str,
        dependencies: Optional[Dict[str, str]] = None,
        internal_deps: Optional[List[str]] = None
    ):
        self.name = name
        self.path = path  # 相對於專案根目錄
        self.type = ws_type  # "npm" | "yarn" | "python"
        self.dependencies = dependencies or {}  # 外部依賴
        self.internalDependencies = internal_deps or []  # workspace 內部依賴

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "path": self.path,
            "type": self.type,
            "externalDependencies": self.dependencies,
            "internalDependencies": self.internalDependencies
        }


def detect_circular_dependencies(graph: Dict[str, List[str]]) -> List[List[str]]:
    """
    偵測圖中的循環依賴。
    使用 DFS 演算法找出所有強連通分量。

    Args:
        graph: 依賴圖 {node: [依賴的 nodes]}

    Returns:
        循環依賴列表，每個循環是一個節點序列
    """
    visited = set()
    rec_stack = set()
    cycles = []

    def dfs(node: str, path: List[str]):
        if node in rec_stack:
            # 找到循環 - 從路徑中提取循環部分
            try:
                cycle_start = path.index(node)
                cycle = path[cycle_start:] + [node]
                # 避免重複記錄相同的循環
                if cycle not in cycles and cycle[::-1] not in cycles:
                    cycles.append(cycle)
            except ValueError:
                pass
            return

        if node in visited:
            return

        visited.add(node)
        rec_stack.add(node)

        for neighbor in graph.get(node, []):
            dfs(neighbor, path + [node])

        rec_stack.discard(node)

    for node in graph:
        if node not in visited:
            dfs(node, [])

    return cycles


# ------------------------------
# Phase 8.1: Call Graph Analysis
# ------------------------------

def detect_python_function_calls(content: str, defined_funcs: List[str]) -> Dict[str, List[str]]:
    """
    偵測 Python 文件中的函式呼叫關係。

    Args:
        content: Python 文件內容
        defined_funcs: 該文件中定義的函式名稱列表

    Returns:
        呼叫圖 {function_name: [called_functions]}
    """
    calls: Dict[str, List[str]] = {}
    lines = content.splitlines()

    # 建立函式定義的映射 {函式名: 所屬類別}
    func_to_class: Dict[str, Optional[str]] = {}
    class_stack: List[Tuple[str, int]] = []

    def indent_level(s: str) -> int:
        m = re.match(r"^(\s*)", s)
        return len(m.group(1).replace("\t", "    ")) if m else 0

    # 第一遍:建立函式定義映射
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        ind = indent_level(line)
        while class_stack and class_stack[-1][1] >= ind:
            class_stack.pop()

        cls_match = re.match(r'^\s*class\s+(\w+)', line)
        if cls_match:
            class_stack.append((cls_match.group(1), ind))
            continue

        fn_match = re.match(r'^\s*def\s+(\w+)', line)
        if fn_match:
            func_name = fn_match.group(1)
            if class_stack:
                full_name = f"{class_stack[-1][0]}.{func_name}"
                func_to_class[func_name] = class_stack[-1][0]
            else:
                full_name = func_name
                func_to_class[func_name] = None
            calls[full_name] = []

    # 第二遍:偵測函式呼叫
    current_func: Optional[str] = None
    class_stack = []

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        ind = indent_level(line)
        while class_stack and class_stack[-1][1] >= ind:
            class_stack.pop()

        cls_match = re.match(r'^\s*class\s+(\w+)', line)
        if cls_match:
            class_stack.append((cls_match.group(1), ind))
            current_func = None
            continue

        fn_match = re.match(r'^\s*def\s+(\w+)', line)
        if fn_match:
            func_name = fn_match.group(1)
            if class_stack:
                current_func = f"{class_stack[-1][0]}.{func_name}"
            else:
                current_func = func_name
            continue

        # 在函式內部尋找函式呼叫
        if current_func:
            # 匹配函式呼叫模式: func_name(...)
            # 排除字串中的呼叫和註解
            if not stripped.startswith("#") and not stripped.startswith("'") and not stripped.startswith('"'):
                # 簡單模式: word(
                call_pattern = r'\b([a-zA-Z_]\w*)\s*\('
                for match in re.finditer(call_pattern, line):
                    called = match.group(1)
                    # 過濾掉內建函式和常見的非函式關鍵字
                    builtins = {'print', 'len', 'range', 'str', 'int', 'float', 'bool', 'list', 'dict',
                               'set', 'tuple', 'open', 'input', 'isinstance', 'type', 'super', 'enumerate',
                               'zip', 'map', 'filter', 'sorted', 'min', 'max', 'sum', 'any', 'all'}
                    if called not in builtins:
                        # 檢查是否是定義的函式
                        if called in func_to_class:
                            # 簡單名稱 - 可能是同一類別或模組層級
                            if func_to_class[called] is None or \
                               (class_stack and func_to_class[called] == class_stack[-1][0]):
                                if called not in calls[current_func]:
                                    calls[current_func].append(called)
                        # 檢查完整名稱 (Class.method)
                        for full_name in calls.keys():
                            if full_name.endswith(f".{called}"):
                                if full_name not in calls[current_func]:
                                    calls[current_func].append(full_name)
                                break

    return calls


def detect_js_function_calls(content: str, defined_funcs: List[str]) -> Dict[str, List[str]]:
    """
    偵測 JavaScript/TypeScript 文件中的函式呼叫關係。

    Args:
        content: JS/TS 文件內容
        defined_funcs: 該文件中定義的函式名稱列表

    Returns:
        呼叫圖 {function_name: [called_functions]}
    """
    calls: Dict[str, List[str]] = {}
    lines = content.splitlines()

    # 建立函式名稱集合以快速查找
    func_set = set(defined_funcs)

    # 找出所有函式定義及其範圍
    func_ranges: List[Tuple[str, int, int]] = []

    # 匹配函式定義模式
    func_patterns = [
        r'(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(',  # function foo(
        r'(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(.*?\)\s*=>',  # const foo = () =>
        r'(\w+)\s*:\s*(?:async\s+)?function\s*\(',  # foo: function(
        r'(?:class\s+\w+\s*{[\s\S]*?)(\w+)\s*\([^)]*\)\s*{',  # class method
    ]

    for i, line in enumerate(lines):
        for pattern in func_patterns:
            match = re.search(pattern, line)
            if match:
                func_name = match.group(1)
                if func_name in func_set:
                    # 簡化:假設函式在當前行開始,在文件結束
                    # 實際上應該追蹤大括號平衡
                    func_ranges.append((func_name, i, len(lines)))
                    calls[func_name] = []

    # 在每個函式範圍內尋找函式呼叫
    for func_name, start, end in func_ranges:
        func_body = "\n".join(lines[start:min(end, start + 500)])  # 限制搜尋範圍

        # 移除字串和註解以避免誤判
        # 簡化版本:只移除單行註解
        cleaned_lines = []
        for line in func_body.splitlines():
            # 移除 // 註解
            comment_idx = line.find('//')
            if comment_idx != -1:
                line = line[:comment_idx]
            cleaned_lines.append(line)
        cleaned_body = "\n".join(cleaned_lines)

        # 尋找函式呼叫: func_name(
        call_pattern = r'\b([a-zA-Z_$][\w$]*)\s*\('
        for match in re.finditer(call_pattern, cleaned_body):
            called = match.group(1)
            # 過濾常見的非函式關鍵字和內建物件
            keywords = {'if', 'for', 'while', 'switch', 'catch', 'typeof', 'return',
                       'console', 'require', 'import', 'export', 'Math', 'Array',
                       'Object', 'String', 'Number', 'Boolean', 'Date', 'Promise'}
            if called not in keywords and called in func_set:
                if called not in calls[func_name]:
                    calls[func_name].append(called)

    return calls


def detect_swift_function_calls(content: str, defined_funcs: List[str]) -> Dict[str, List[str]]:
    """
    偵測 Swift 文件中的函式呼叫關係。

    Args:
        content: Swift 文件內容
        defined_funcs: 該文件中定義的函式名稱列表

    Returns:
        呼叫圖 {function_name: [called_functions]}
    """
    calls: Dict[str, List[str]] = {}
    lines = content.splitlines()

    # 建立函式名稱集合
    func_set = set(defined_funcs)

    # 找出所有函式定義
    current_func: Optional[str] = None

    for i, line in enumerate(lines):
        stripped = line.strip()

        # 匹配 Swift 函式定義
        func_match = re.match(r'^\s*(?:(?:public|private|internal|fileprivate|open)\s+)?'
                             r'(?:(?:static|class)\s+)?'
                             r'(?:override\s+)?'
                             r'func\s+(\w+)', line)
        if func_match:
            current_func = func_match.group(1)
            if current_func not in calls:
                calls[current_func] = []
            continue

        # 在函式內部尋找呼叫
        if current_func and not stripped.startswith('//'):
            # Swift 函式呼叫模式
            call_pattern = r'\b([a-zA-Z_]\w*)\s*\('
            for match in re.finditer(call_pattern, line):
                called = match.group(1)
                # 過濾 Swift 關鍵字
                keywords = {'if', 'for', 'while', 'switch', 'guard', 'return', 'print',
                           'sizeof', 'alignof', 'stride'}
                if called not in keywords and called in func_set:
                    if called not in calls[current_func]:
                        calls[current_func].append(called)

    return calls


def build_call_graph(
    func_map: Dict[str, List[Dict[str, str]]],
    file_contents: Dict[str, str],
    file_meta: Dict[str, Dict]
) -> Dict[str, List[str]]:
    """
    構建整個專案的函式呼叫圖。

    Args:
        func_map: 文件到函式列表的映射
        file_contents: 文件內容映射
        file_meta: 文件元數據(包含語言資訊)

    Returns:
        完整的呼叫圖 {full_func_name: [called_full_func_names]}
    """
    call_graph: Dict[str, List[str]] = {}

    # 建立全局函式名稱到完整路徑的映射
    func_to_file: Dict[str, List[str]] = {}  # {func_name: [file1::func, file2::func, ...]}

    for file_path, funcs in func_map.items():
        for func_info in funcs:
            func_name = func_info.get("name", "")
            if func_name:
                full_name = f"{file_path}::{func_name}"
                call_graph[full_name] = []

                # 記錄簡單名稱到完整名稱的映射
                simple_name = func_name.split(".")[-1]  # 處理 Class.method 的情況
                if simple_name not in func_to_file:
                    func_to_file[simple_name] = []
                func_to_file[simple_name].append(full_name)

    # 對每個文件進行呼叫分析
    for file_path, funcs in func_map.items():
        content = file_contents.get(file_path, "")
        if not content:
            continue

        meta = file_meta.get(file_path, {})
        lang = meta.get("lang", "")

        # 取得該文件中定義的函式名稱
        defined_funcs = [f.get("name", "") for f in funcs if f.get("name")]

        # 根據語言選擇解析器
        file_calls: Dict[str, List[str]] = {}
        if lang == "py":
            file_calls = detect_python_function_calls(content, defined_funcs)
        elif lang in ("js", "ts"):
            file_calls = detect_js_function_calls(content, defined_funcs)
        elif lang == "swift":
            file_calls = detect_swift_function_calls(content, defined_funcs)

        # 將本地呼叫轉換為全局呼叫圖
        for caller, callees in file_calls.items():
            full_caller = f"{file_path}::{caller}"
            if full_caller in call_graph:
                for callee in callees:
                    # 嘗試解析被呼叫者的完整路徑
                    # 優先查找同一文件中的函式
                    full_callee = f"{file_path}::{callee}"
                    if full_callee in call_graph:
                        if full_callee not in call_graph[full_caller]:
                            call_graph[full_caller].append(full_callee)
                    else:
                        # 查找其他文件中的同名函式
                        simple_callee = callee.split(".")[-1]
                        if simple_callee in func_to_file:
                            # 如果有多個同名函式,選擇第一個(可能需要更智能的解析)
                            for candidate in func_to_file[simple_callee]:
                                if candidate not in call_graph[full_caller]:
                                    call_graph[full_caller].append(candidate)
                                break  # 只添加第一個匹配

    return call_graph


def detect_circular_calls(call_graph: Dict[str, List[str]]) -> List[List[str]]:
    """
    偵測呼叫圖中的循環呼叫(例如 A -> B -> A)。

    Args:
        call_graph: 函式呼叫圖

    Returns:
        循環呼叫列表,每個循環是函式名稱的序列
    """
    # 重用現有的 detect_circular_dependencies 邏輯
    return detect_circular_dependencies(call_graph)


def detect_dead_functions(
    call_graph: Dict[str, List[str]],
    entry_points: List[EntryPoint],
    func_map: Dict[str, List[Dict[str, str]]]
) -> List[str]:
    """
    偵測未被使用的函式(死代碼)。

    排除條件:
    - 入口點函式
    - 被其他函式呼叫的函式
    - 公開/導出的函式(以 export 或 public 開頭)
    - 測試函式(名稱包含 test)

    Args:
        call_graph: 函式呼叫圖
        entry_points: 專案入口點列表
        func_map: 文件到函式列表的映射

    Returns:
        未被使用的函式名稱列表
    """
    # 收集所有被呼叫的函式
    referenced = set()
    for callees in call_graph.values():
        referenced.update(callees)

    # 收集入口點函式
    entry_func_names = set()
    for ep in entry_points:
        entry_func_names.add(ep.name)

    # 收集所有定義的函式
    all_funcs = set(call_graph.keys())

    # 未被引用的函式 = 所有函式 - 被呼叫的 - 入口點
    dead_funcs = []
    for func_full_name in all_funcs:
        # 解析完整名稱: file::function
        parts = func_full_name.split("::")
        if len(parts) != 2:
            continue

        file_path, func_name = parts

        # 排除條件
        # 1. 是入口點
        if func_name in entry_func_names or func_name.split(".")[-1] in entry_func_names:
            continue

        # 2. 被其他函式呼叫
        if func_full_name in referenced:
            continue

        # 3. 測試函式
        if "test" in func_name.lower() or "test" in file_path.lower():
            continue

        # 4. 特殊方法(Python __init__, __str__ 等)
        simple_name = func_name.split(".")[-1]
        if simple_name.startswith("__") and simple_name.endswith("__"):
            continue

        # 5. 私有但可能被反射/動態呼叫的函式(保守策略)
        # 對於 Python: 單下劃線開頭的可能是內部 API
        # 對於 JS: 導出的函式
        # 需要檢查原始函式資訊
        is_exported = False
        for func_info in func_map.get(file_path, []):
            if func_info.get("name") == func_name:
                # 檢查是否有 export 關鍵字或 public 修飾符
                scope = func_info.get("scope", "")
                if scope == "module":  # 模組層級通常是公開的
                    is_exported = True
                # 可以進一步檢查原始簽名中的 export/public 關鍵字
                signature = func_info.get("signature", "")
                if "export" in signature or "public" in signature:
                    is_exported = True
                break

        if is_exported:
            continue

        # 如果沒有被排除,則為死代碼
        dead_funcs.append(func_full_name)

    return sorted(dead_funcs)


# ==============================
# Phase 8.2: Cyclomatic Complexity Analysis
# ==============================

def calculate_cyclomatic_complexity_python(content: str) -> int:
    """
    計算 Python 代碼的循環複雜度。

    複雜度 = 分支點數量 + 1
    分支點包括: if, elif, for, while, except, and, or, with (多個上下文管理器)

    Args:
        content: 函式內容文字

    Returns:
        循環複雜度值
    """
    complexity = 1  # 基礎複雜度

    # 計算控制流關鍵字
    control_keywords = [
        r'\bif\b',
        r'\belif\b',
        r'\bfor\b',
        r'\bwhile\b',
        r'\bexcept\b',
        r'\band\b',    # 布林運算符
        r'\bor\b',
    ]

    for keyword in control_keywords:
        complexity += len(re.findall(keyword, content))

    # 統計 with 語句中的逗號(表示多個上下文管理器)
    with_matches = re.findall(r'\bwith\b[^:]+:', content)
    for match in with_matches:
        # 每個額外的上下文管理器增加複雜度
        complexity += match.count(',')

    return complexity


def calculate_cyclomatic_complexity_js(content: str) -> int:
    """
    計算 JavaScript/TypeScript 代碼的循環複雜度。

    複雜度 = 分支點數量 + 1
    分支點包括: if, else if, for, while, case, catch, &&, ||, ?, ternary

    Args:
        content: 函式內容文字

    Returns:
        循環複雜度值
    """
    complexity = 1  # 基礎複雜度

    # 計算控制流關鍵字
    control_keywords = [
        r'\bif\b',
        r'\belse\s+if\b',
        r'\bfor\b',
        r'\bwhile\b',
        r'\bcase\b',
        r'\bcatch\b',
        r'\?',        # 三元運算符
    ]

    for keyword in control_keywords:
        complexity += len(re.findall(keyword, content))

    # 計算邏輯運算符 (&&, ||)
    complexity += len(re.findall(r'&&', content))
    complexity += len(re.findall(r'\|\|', content))

    return complexity


def calculate_cyclomatic_complexity_swift(content: str) -> int:
    """
    計算 Swift 代碼的循環複雜度。

    複雜度 = 分支點數量 + 1
    分支點包括: if, else if, for, while, case, guard, catch, &&, ||, ?, nil coalescing

    Args:
        content: 函式內容文字

    Returns:
        循環複雜度值
    """
    complexity = 1  # 基礎複雜度

    # 計算控制流關鍵字
    control_keywords = [
        r'\bif\b',
        r'\belse\s+if\b',
        r'\bfor\b',
        r'\bwhile\b',
        r'\bcase\b',
        r'\bguard\b',
        r'\bcatch\b',
        r'\?',        # Optional chaining 和三元運算符
        r'\?\?',      # Nil coalescing
    ]

    for keyword in control_keywords:
        complexity += len(re.findall(keyword, content))

    # 計算邏輯運算符
    complexity += len(re.findall(r'&&', content))
    complexity += len(re.findall(r'\|\|', content))

    return complexity


def extract_function_body(content: str, func_name: str, lang: str) -> str:
    """
    從源代碼中提取函式主體。

    Args:
        content: 完整文件內容
        func_name: 函式名稱
        lang: 語言類型 (py, js, ts, swift)

    Returns:
        函式主體內容(如果找不到則返回空字串)
    """
    lines = content.splitlines()

    if lang == "py":
        # Python: 尋找 def function_name
        pattern = rf'^\s*def\s+{re.escape(func_name)}\s*\('
        start_idx = None
        base_indent = 0

        for i, line in enumerate(lines):
            if re.match(pattern, line):
                start_idx = i
                base_indent = len(line) - len(line.lstrip())
                break

        if start_idx is None:
            return ""

        # 收集函式主體(根據縮排判斷)
        body_lines = []
        for i in range(start_idx + 1, len(lines)):
            line = lines[i]
            if not line.strip():
                continue
            current_indent = len(line) - len(line.lstrip())
            if current_indent <= base_indent:
                break
            body_lines.append(line)

        return "\n".join(body_lines)

    elif lang in ("js", "ts", "jsx", "tsx", "vue"):
        # JavaScript/TypeScript: 尋找 function name 或 const name =
        patterns = [
            rf'function\s+{re.escape(func_name)}\s*\(',
            rf'const\s+{re.escape(func_name)}\s*=',
            rf'let\s+{re.escape(func_name)}\s*=',
            rf'{re.escape(func_name)}\s*\(',  # 方法定義
        ]

        start_idx = None
        for i, line in enumerate(lines):
            for pattern in patterns:
                if re.search(pattern, line):
                    start_idx = i
                    break
            if start_idx is not None:
                break

        if start_idx is None:
            return ""

        # 使用大括號匹配找到函式結束
        brace_count = 0
        body_lines = []
        started = False

        for i in range(start_idx, len(lines)):
            line = lines[i]
            for char in line:
                if char == '{':
                    brace_count += 1
                    started = True
                elif char == '}':
                    brace_count -= 1

            if started:
                body_lines.append(line)

            if started and brace_count == 0:
                break

        return "\n".join(body_lines)

    elif lang == "swift":
        # Swift: 尋找 func name
        pattern = rf'func\s+{re.escape(func_name)}\s*[\(<]'
        start_idx = None

        for i, line in enumerate(lines):
            if re.search(pattern, line):
                start_idx = i
                break

        if start_idx is None:
            return ""

        # 使用大括號匹配找到函式結束
        brace_count = 0
        body_lines = []
        started = False

        for i in range(start_idx, len(lines)):
            line = lines[i]
            for char in line:
                if char == '{':
                    brace_count += 1
                    started = True
                elif char == '}':
                    brace_count -= 1

            if started:
                body_lines.append(line)

            if started and brace_count == 0:
                break

        return "\n".join(body_lines)

    return ""


def classify_complexity_risk(complexity: int) -> str:
    """
    根據複雜度值分類風險等級。

    Args:
        complexity: 循環複雜度值

    Returns:
        風險等級: LOW, MEDIUM, HIGH
    """
    if complexity <= 5:
        return "LOW"
    elif complexity <= 10:
        return "MEDIUM"
    else:
        return "HIGH"


def generate_complexity_recommendation(complexity: int, risk: str, func_name: str) -> str:
    """
    根據複雜度和風險等級生成重構建議。

    Args:
        complexity: 循環複雜度值
        risk: 風險等級
        func_name: 函式名稱

    Returns:
        重構建議文字
    """
    if risk == "LOW":
        return "Function is simple and maintainable"
    elif risk == "MEDIUM":
        return "Consider breaking into smaller functions for better testability"
    else:
        recommendations = []
        if complexity > 15:
            recommendations.append("HIGH PRIORITY: Refactor immediately")
        recommendations.append("Break into smaller, single-purpose functions")
        recommendations.append("Extract complex conditions into well-named helper functions")
        recommendations.append("Consider using design patterns (Strategy, State, etc.)")
        return "; ".join(recommendations)


def analyze_code_complexity(
    func_map: Dict[str, List[Dict[str, str]]],
    file_contents: Dict[str, str],
    files_info: Dict[str, Dict]
) -> Dict:
    """
    分析所有函式的循環複雜度。

    Args:
        func_map: 文件到函式列表的映射
        file_contents: 文件路徑到內容的映射
        files_info: 文件元資訊

    Returns:
        包含複雜度分析結果的字典
    """
    complexity_data = {
        "functions": {},
        "summary": {
            "high_risk": 0,
            "medium_risk": 0,
            "low_risk": 0,
            "total_complexity": 0,
            "avg_complexity": 0.0,
        }
    }

    total_funcs = 0
    total_complexity = 0

    for file_path, funcs in func_map.items():
        # 獲取文件內容
        content = file_contents.get(file_path, "")
        if not content:
            continue

        # 獲取語言類型
        file_info = files_info.get(file_path, {})
        lang = file_info.get("lang", "")

        if lang not in ("py", "js", "ts", "jsx", "tsx", "vue", "swift"):
            continue

        # 選擇對應的複雜度計算函式
        if lang == "py":
            calc_func = calculate_cyclomatic_complexity_python
        elif lang in ("js", "ts", "jsx", "tsx", "vue"):
            calc_func = calculate_cyclomatic_complexity_js
        elif lang == "swift":
            calc_func = calculate_cyclomatic_complexity_swift
        else:
            continue

        # 分析每個函式
        for func_info in funcs:
            func_name = func_info.get("name", "")
            if not func_name:
                continue

            # 提取函式主體
            func_body = extract_function_body(content, func_name, lang)

            # 如果提取失敗,使用整個內容(降級處理)
            if not func_body:
                func_body = content

            # 計算複雜度
            complexity = calc_func(func_body)

            # 統計行數(排除空行和註解)
            lines = [
                line for line in func_body.splitlines()
                if line.strip() and not line.strip().startswith(('#', '//', '/*', '*'))
            ]
            line_count = len(lines)

            # 分類風險
            risk = classify_complexity_risk(complexity)

            # 生成建議
            recommendation = generate_complexity_recommendation(complexity, risk, func_name)

            # 計算分支數(複雜度 - 1)
            branches = max(0, complexity - 1)

            # 儲存結果
            full_name = f"{file_path}::{func_name}"
            complexity_data["functions"][full_name] = {
                "complexity": complexity,
                "risk": risk,
                "branches": branches,
                "lines": line_count,
                "recommendation": recommendation,
            }

            # 更新統計
            total_funcs += 1
            total_complexity += complexity

            if risk == "HIGH":
                complexity_data["summary"]["high_risk"] += 1
            elif risk == "MEDIUM":
                complexity_data["summary"]["medium_risk"] += 1
            else:
                complexity_data["summary"]["low_risk"] += 1

    # 計算平均複雜度
    if total_funcs > 0:
        complexity_data["summary"]["avg_complexity"] = round(total_complexity / total_funcs, 2)

    complexity_data["summary"]["total_complexity"] = total_complexity
    complexity_data["summary"]["total_functions"] = total_funcs

    return complexity_data


def detect_python_entry_points(content: str, filename: str) -> List[EntryPoint]:
    """Detect Python entry points: if __name__, @click, @app.route, def main()."""
    entries: List[EntryPoint] = []
    lines = content.splitlines()

    # Check for __main__.py
    if filename == "__main__.py":
        entries.append(EntryPoint(
            entry_type="python_main_module",
            name="__main__",
            file=filename,
            line=1,
            trigger="Package entry point"
        ))

    for i, line in enumerate(lines, 1):
        # if __name__ == '__main__':
        if PY_MAIN_BLOCK.search(line):
            entries.append(EntryPoint(
                entry_type="python_main",
                name="__main__",
                file=filename,
                line=i,
                trigger="if __name__ == '__main__'"
            ))

        # @click.command / @click.group
        if PY_CLICK_COMMAND.search(line):
            # Find the function name on next non-decorator line
            for j in range(i, min(i + 5, len(lines))):
                func_match = re.match(r'\s*def\s+(\w+)', lines[j])
                if func_match:
                    entries.append(EntryPoint(
                        entry_type="python_click",
                        name=func_match.group(1),
                        file=filename,
                        line=j + 1,
                        trigger="Click CLI command"
                    ))
                    break

        # @app.route
        flask_match = PY_FLASK_ROUTE.search(line)
        if flask_match:
            route_path = flask_match.group(1)
            for j in range(i, min(i + 5, len(lines))):
                func_match = re.match(r'\s*def\s+(\w+)', lines[j])
                if func_match:
                    entries.append(EntryPoint(
                        entry_type="python_flask",
                        name=func_match.group(1),
                        file=filename,
                        line=j + 1,
                        trigger=f"Flask route: {route_path}",
                        metadata={"route": route_path}
                    ))
                    break

        # @app.get/post/etc (FastAPI)
        fastapi_match = PY_FASTAPI_ROUTE.search(line)
        if fastapi_match:
            method = fastapi_match.group(1).upper()
            route_path = fastapi_match.group(2)
            for j in range(i, min(i + 5, len(lines))):
                func_match = re.match(r'\s*def\s+(\w+)', lines[j])
                if func_match:
                    entries.append(EntryPoint(
                        entry_type="python_fastapi",
                        name=func_match.group(1),
                        file=filename,
                        line=j + 1,
                        trigger=f"FastAPI {method} {route_path}",
                        metadata={"method": method, "route": route_path}
                    ))
                    break

    # Check for def main() at module level
    main_func = re.search(r'^def\s+main\s*\([^)]*\)\s*:', content, re.MULTILINE)
    if main_func:
        line_num = content[:main_func.start()].count('\n') + 1
        entries.append(EntryPoint(
            entry_type="python_main_func",
            name="main",
            file=filename,
            line=line_num,
            trigger="def main() function"
        ))

    return entries


def detect_gas_entry_points(content: str, filename: str) -> List[EntryPoint]:
    """Detect Google Apps Script entry points: triggers
 and menu functions."""
    entries: List[EntryPoint] = []
    lines = content.splitlines()

    # Find all function definitions
    func_pattern = re.compile(r'function\s+(\w+)\s*\(')

    for i, line in enumerate(lines, 1):
        match = func_pattern.search(line)
        if match:
            func_name = match.group(1)

            # Check if it's a trigger function
            if func_name in GAS_TRIGGERS:
                entries.append(EntryPoint(
                    entry_type="gas_trigger",
                    name=func_name,
                    file=filename,
                    line=i,
                    trigger=GAS_TRIGGERS[func_name]
                ))

            # Check if it's a menu-related function (heuristic)
            elif any(ui_func in line or ui_func in content[max(0, content.find(line)-200):content.find(line)+len(line)]
                     for ui_func in ["createMenu", "addToUi"]):
                if func_name not in GAS_TRIGGERS:
                    entries.append(EntryPoint(
                        entry_type="gas_menu",
                        name=func_name,
                        file=filename,
                        line=i,
                        trigger="Custom menu function"
                    ))

    return entries


def detect_swift_entry_points(content: str, filename: str) -> List[EntryPoint]:
    """Detect Swift entry points: @main, App protocol, AppDelegate, SceneDelegate."""
    entries: List[EntryPoint] = []

    # @main entry point
    main_match = SWIFT_MAIN.search(content)
    if main_match:
        line_num = content[:main_match.start()].count('\n') + 1
        entries.append(EntryPoint(
            entry_type="swift_main",
            name=main_match.group(1),
            file=filename,
            line=line_num,
            trigger="@main entry point"
        ))

    # App protocol (SwiftUI)
    app_match = SWIFT_APP_PROTOCOL.search(content)
    if app_match:
        line_num = content[:app_match.start()].count('\n') + 1
        # Only add if not already added via @main
        if not any(e.name == app_match.group(1) for e in entries):
            entries.append(EntryPoint(
                entry_type="swift_app",
                name=app_match.group(1),
                file=filename,
                line=line_num,
                trigger="SwiftUI App protocol"
            ))

    # UIApplicationDelegate (UIKit)
    appdelegate_match = SWIFT_APPDELEGATE.search(content)
    if appdelegate_match:
        line_num = content[:appdelegate_match.start()].count('\n') + 1
        entries.append(EntryPoint(
            entry_type="swift_appdelegate",
            name=appdelegate_match.group(1),
            file=filename,
            line=line_num,
            trigger="UIKit AppDelegate"
        ))

    # UIWindowSceneDelegate (UIKit)
    scenedelegate_match = SWIFT_SCENEDELEGATE.search(content)
    if scenedelegate_match:
        line_num = content[:scenedelegate_match.start()].count('\n') + 1
        entries.append(EntryPoint(
            entry_type="swift_scenedelegate",
            name=scenedelegate_match.group(1),
            file=filename,
            line=line_num,
            trigger="UIKit SceneDelegate"
        ))

    return entries


def detect_html_entry_points(content: str, filename: str) -> List[EntryPoint]:
    """Detect HTML entry points: script tags."""
    entries: List[EntryPoint] = []

    # External scripts
    for match in HTML_SCRIPT.finditer(content):
        attrs = match.group(1)
        src = match.group(2)
        line_num = content[:match.start()].count('\n') + 1
        is_module = bool(HTML_MODULE_TYPE.search(attrs))

        entries.append(EntryPoint(
            entry_type="html_module" if is_module else "html_script",
            name=src,
            file=filename,
            line=line_num,
            trigger=f"ES Module: {src}" if is_module else f"Script: {src}",
            metadata={"src": src, "isModule": is_module}
        ))

    # Inline scripts (only if significant)
    inline_count = 0
    for match in HTML_SCRIPT_INLINE.finditer(content):
        attrs = match.group(1) or ""
        # Skip if it's an external script (has src)
        if 'src=' in attrs.lower():
            continue

        line_num = content[:match.start()].count('\n') + 1
        is_module = bool(HTML_MODULE_TYPE.search(attrs))
        inline_count += 1

        entries.append(EntryPoint(
            entry_type="html_module" if is_module else "html_script",
            name=f"inline-script-{inline_count}",
            file=filename,
            line=line_num,
            trigger=f"Inline {'module' if is_module else 'script'}",
            metadata={"isInline": True, "isModule": is_module}
        ))

    return entries


def detect_package_json_entry_points(content: str, filename: str) -> List[EntryPoint]:
    """Detect JS/TS entry points from package.json."""
    entries: List[EntryPoint] = []

    try:
        pkg = json.loads(content)
    except json.JSONDecodeError:
        return entries

    # main field
    if "main" in pkg:
        entries.append(EntryPoint(
            entry_type="js_package_main",
            name=pkg["main"],
            file=filename,
            line=1,
            trigger=f"package.json main: {pkg['main']}",
            metadata={"field": "main", "value": pkg["main"]}
        ))

    # bin field
    if "bin" in pkg:
        bin_val = pkg["bin"]
        if isinstance(bin_val, str):
            entries.append(EntryPoint(
                entry_type="js_package_bin",
                name=pkg.get("name", "bin"),
                file=filename,
                line=1,
                trigger=f"package.json bin: {bin_val}",
                metadata={"field": "bin", "value": bin_val}
            ))
        elif isinstance(bin_val, dict):
            for cmd_name, cmd_path in bin_val.items():
                entries.append(EntryPoint(
                    entry_type="js_package_bin",
                    name=cmd_name,
                    file=filename,
                    line=1,
                    trigger=f"package.json bin: {cmd_name} -> {cmd_path}",
                    metadata={"field": "bin", "command": cmd_name, "value": cmd_path}
                ))

    # exports field
    if "exports" in pkg:
        exports = pkg["exports"]
        if isinstance(exports, str):
            entries.append(EntryPoint(
                entry_type="js_package_exports",
                name=".",
                file=filename,
                line=1,
                trigger=f"package.json exports: {exports}",
                metadata={"field": "exports", "value": exports}
            ))
        elif isinstance(exports, dict):
            for export_path, export_val in exports.items():
                val_str = export_val if isinstance(export_val, str) else str(export_val)[:50]
                entries.append(EntryPoint(
                    entry_type="js_package_exports",
                    name=export_path,
                    file=filename,
                    line=1,
                    trigger=f"package.json exports: {export_path}",
                    metadata={"field": "exports", "path": export_path, "value": export_val}
                ))

    return entries


def detect_n8n_entry_points(content: str, filename: str) -> List[EntryPoint]:
    """Detect n8n workflow entry points: trigger nodes, webhooks, schedules."""
    entries: List[EntryPoint] = []

    try:
        workflow = json.loads(content)
    except json.JSONDecodeError:
        return entries

    nodes = workflow.get("nodes", [])

    for node in nodes:
        node_type = node.get("type", "")
        node_name = node.get("name", "Unknown")
        node_id = node.get("id", "")
        is_disabled = node.get("disabled", False)
        params = node.get("parameters", {})

        entry: Optional[EntryPoint] = None

        # Webhook triggers
        if "webhook" in node_type.lower():
            webhook_path = params.get("path", "")
            http_method = params.get("httpMethod", "GET")
            entry = EntryPoint(
                entry_type="n8n_webhook",
                name=node_name,
                file=filename,
                line=0,
                trigger=f"Webhook: {http_method} /{webhook_path}",
                metadata={"nodeId": node_id, "nodeType": node_type, "path": webhook_path, "method": http_method}
            )

        # Schedule triggers
        elif "schedule" in node_type.lower() or "cron" in node_type.lower():
            rule = params.get("rule", {})
            cron_expr = rule.get("cronExpression", "") if isinstance(rule, dict) else str(rule)
            entry = EntryPoint(
                entry_type="n8n_schedule",
                name=node_name,
                file=filename,
                line=0,
                trigger=f"Schedule: {cron_expr}" if cron_expr else "Schedule trigger",
                metadata={"nodeId": node_id, "nodeType": node_type, "schedule": cron_expr}
            )

        # Other trigger types
        elif "trigger" in node_type.lower() or node_type.endswith("Trigger"):
            entry = EntryPoint(
                entry_type="n8n_trigger",
                name=node_name,
                file=filename,
                line=0,
                trigger=f"Trigger: {node_type}",
                metadata={"nodeId": node_id, "nodeType": node_type}
            )

        # Manual trigger
        elif "manualTrigger" in node_type.lower() or node_type == "n8n-nodes-base.manualTrigger":
            entry = EntryPoint(
                entry_type="n8n_trigger",
                name=node_name,
                file=filename,
                line=0,
                trigger="Manual trigger",
                metadata={"nodeId": node_id, "nodeType": node_type}
            )

        if entry:
            entry.is_active = not is_disabled
            entries.append(entry)

    return entries


def detect_entry_points(content: str, filename: str, file_path: Path) -> List[EntryPoint]:
    """
    Main entry point detection function. Routes to language-specific detectors.
    """
    entries: List[EntryPoint] = []
    ext = file_path.suffix.lower()
    name = file_path.name.lower()

    if ext == ".py":
        entries.extend(detect_python_entry_points(content, filename))
    elif ext == ".gs":
        entries.extend(detect_gas_entry_points(content, filename))
    elif ext == ".swift":
        entries.extend(detect_swift_entry_points(content, filename))
    elif ext in [".html", ".htm"]:
        entries.extend(detect_html_entry_points(content, filename))
    elif name == "package.json":
        entries.extend(detect_package_json_entry_points(content, filename))
    elif ext == ".json" and ("workflow" in name or "n8n" in name):
        entries.extend(detect_n8n_entry_points(content, filename))

    return entries


def render_entries_json(all_entries: List[EntryPoint]) -> Dict:
    """Render all entry points to entries.json format."""
    return {
        "entries": [e.to_dict() for e in all_entries]
    }


# ------------------------------
# Phase 3: Atlas Architecture
# ------------------------------

ATLAS_SCHEMA_VERSION = "2.0"
ATLAS_TOOL_VERSION = "2.0.0"

import hashlib
from datetime import datetime, timezone


def get_content_hash(content: str) -> str:
    """Generate SHA-256 hash of content for cache validation."""
    return hashlib.sha256(content.encode('utf-8')).hexdigest()[:16]


# Cache Schema Versioning
CACHE_SCHEMA_VERSION = "1.0"

def validate_cache_schema(cache_data: Dict) -> bool:
    """驗證快取架構版本是否相容."""
    if "_schema_version" in cache_data:
        return cache_data["_schema_version"] == CACHE_SCHEMA_VERSION
    return True  # 舊版快取，允許升級

def upgrade_cache_schema(old_cache: Dict) -> Dict:
    """將舊快取升級到新架構."""
    if "_schema_version" in old_cache and old_cache.get("_schema_version") == CACHE_SCHEMA_VERSION:
        return old_cache
    
    # 舊快取結構升級到新架構
    upgraded = {
        "_schema_version": CACHE_SCHEMA_VERSION,
        "_created_at": datetime.now(timezone.utc).isoformat(),
        "files": {}
    }
    
    for path, data in old_cache.items():
        if path.startswith("_"):
            # 跳過元資料字段
            continue
        upgraded["files"][path] = {
            **data,
            "contentHash": data.get("contentHash"),
            "parsedAt": data.get("parsedAt"),
            "actualDependencies": data.get("actualDependencies", []),
            "summaryMetadata": data.get("summaryMetadata", {})
        }
    
    return upgraded


def path_to_atlas_filename(rel_path: str) -> str:
    """
    Convert a relative path to an atlas filename.
    Example: src/utils/helper.py -> src__utils__helper.py.json
    """
    # Replace path separators with double underscore
    safe_name = rel_path.replace("/", "__").replace("\\", "__")
    return f"{safe_name}.json"


def atlas_filename_to_path(filename: str) -> str:
    """
    Convert an atlas filename back to a relative path.
    Example: src__utils__helper.py -> src/utils/helper.py
    Inverse of path_to_atlas_filename().
    """
    # Remove .json extension if present
    if filename.endswith(".json"):
        filename = filename[:-5]
    # Replace double underscores with forward slashes
    return filename.replace("__", "/")


def render_meta_json(
    root: Path,
    file_count: int,
    function_count: int,
    entry_point_count: int,
    languages: Dict[str, int],
    extensions: List[str],
    excludes: List[str],
    cache_enabled: bool,
) -> Dict:
    """Generate meta.json with snapshot metadata."""
    return {
        "schemaVersion": ATLAS_SCHEMA_VERSION,
        "toolVersion": ATLAS_TOOL_VERSION,
        "generated": datetime.now(timezone.utc).isoformat(),
        "project": {
            "name": root.name,
            "root": str(root),
        },
        "config": {
            "extensions": extensions,
            "excludes": excludes,
            "cacheEnabled": cache_enabled,
        },
        "stats": {
            "fileCount": file_count,
            "functionCount": function_count,
            "entryPointCount": entry_point_count,
            "languages": languages,
        },
    }


def extract_services_from_files_info(files_info: Dict[str, Dict], func_map: Dict[str, List[Dict]]) -> List[str]:
    """
    Extract unique services used from n8n workflow files.
    Returns sorted list of service names discovered.
    """
    services: set = set()

    # Check for n8n files and extract services from node types
    for rel_path, info in files_info.items():
        if info.get("lang") == "n8n":
            funcs = func_map.get(rel_path, [])
            for func in funcs:
                node_type_full = func.get("params", "")  # For n8n, params field contains nodeType with version
                # Extract node type without version (e.g., "n8n-nodes-base.webhook v2" -> "n8n-nodes-base.webhook")
                node_type = node_type_full.split(" v")[0] if node_type_full else ""
                if node_type and node_type in N8N_SERVICE_MAP:
                    service = N8N_SERVICE_MAP[node_type]
                    services.add(service)

    return sorted(list(services))


def build_summary_by_language(
    files_info: Dict[str, Dict],
    func_map: Dict[str, List[Dict]],
    deps_merged: Optional[Dict[str, Dict]] = None,
) -> Dict[str, Dict]:
    """按語言統計檔案、函式、依賴."""
    deps_merged = deps_merged or {}
    lang_summary: Dict[str, Dict] = {}
    
    for rel_path, info in files_info.items():
        lang = info.get("lang", "unknown")
        
        if lang not in lang_summary:
            lang_summary[lang] = {
                "fileCount": 0,
                "functionCount": 0,
                "actualDependencies": set(),
                "externalImports": set(),
            }
        
        lang_summary[lang]["fileCount"] += 1
        lang_summary[lang]["functionCount"] += len(func_map.get(rel_path, []))
        
        # Collect dependencies
        actual_deps = info.get("actualDependencies", [])
        if actual_deps:
            lang_summary[lang]["actualDependencies"].update(actual_deps)
        
        # Collect external imports
        external_imports = info.get("importsExternal", [])
        if external_imports:
            lang_summary[lang]["externalImports"].update(external_imports)
    
    # Convert sets to sorted lists
    result = {}
    for lang, stats in lang_summary.items():
        result[lang] = {
            "fileCount": stats["fileCount"],
            "functionCount": stats["functionCount"],
            "actualDependencies": sorted(list(stats["actualDependencies"])),
            "externalImports": sorted(list(stats["externalImports"])),
        }
    
    return result


def build_dependency_graph(files_info: Dict[str, Dict]) -> Dict[str, List[str]]:
    """構建文件-包依賴關係圖."""
    dependencies: Dict[str, List[str]] = {}
    
    for rel_path, info in files_info.items():
        actual_deps = info.get("actualDependencies", [])
        if actual_deps:
            dependencies[rel_path] = sorted(actual_deps)
    
    return dependencies


def build_function_index(func_map: Dict[str, List[Dict]]) -> Dict[str, Dict]:
    """建立函式快速搜尋索引（僅公開函式）."""
    function_index: Dict[str, Dict] = {}
    
    for rel_path, funcs in func_map.items():
        for func in funcs:
            name = func.get("name", "")
            if not name or name.startswith("_"):
                continue  # Skip private functions
            
            # Handle duplicates by storing first occurrence only
            if name in function_index:
                continue
            
            function_index[name] = {
                "file": rel_path,
                "line": func.get("line", 0),
            }
            
            # Add optional fields if available
            if func.get("signature"):
                function_index[name]["signature"] = func["signature"]
            if func.get("purpose"):
                function_index[name]["purpose"] = func["purpose"]
    
    return function_index


def build_entry_points_summary(entry_points: List[EntryPoint]) -> Dict[str, int]:
    """統計進入點類型."""
    summary: Dict[str, int] = {}
    
    for entry in entry_points:
        entry_type = entry.type
        summary[entry_type] = summary.get(entry_type, 0) + 1
    
    return summary


def render_index_json(
    files_info: Dict[str, Dict],
    summary: Dict[str, object],
    entry_points: List[EntryPoint],
    func_map: Optional[Dict[str, List[Dict]]] = None,
    deps_merged: Optional[Dict[str, Dict]] = None,
) -> Dict:
    """
    Generate index.json - the main directory for AI to read first.
    Enhanced in Task 1.8 with structured summaries for better LLM consumption.
    """
    func_map = func_map or {}
    deps_merged = deps_merged or {}

    # Build file list with essential info only
    file_list = []
    for rel_path, info in sorted(files_info.items()):
        entry = {
            "path": rel_path,
            "snapshotFile": f"files/{path_to_atlas_filename(rel_path)}",
            "lang": info.get("lang", ""),
            "functionCount": len(info.get("allFunctions", [])),
        }
        # Only include purpose if non-empty
        purpose = info.get("purpose", "")
        if purpose:
            entry["purpose"] = purpose[:200]  # Truncate for index
        # Mark if this file has entry points
        file_entries = [e for e in entry_points if e.file == rel_path]
        if file_entries:
            entry["isEntryPoint"] = True
            entry["entryTypes"] = list(set(e.type for e in file_entries))
        file_list.append(entry)

    # Language distribution
    lang_counts: Dict[str, int] = {}
    for info in files_info.values():
        lang = info.get("lang", "unknown")
        lang_counts[lang] = lang_counts.get(lang, 0) + 1

    # Extract services from n8n workflows
    services = extract_services_from_files_info(files_info, func_map)

    # Build enhanced summaries (Task 1.8)
    summary_by_language = build_summary_by_language(files_info, func_map, deps_merged)
    dependency_graph = build_dependency_graph(files_info)
    function_index = build_function_index(func_map)
    entry_points_summary = build_entry_points_summary(entry_points)

    result: Dict = {
        "version": ATLAS_SCHEMA_VERSION,
        "generated": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "fileCount": len(files_info),
            "functionCount": summary.get("functionCount", 0),
            "entryPointCount": len(entry_points),
            "languages": lang_counts,
        },
        # NEW: Enhanced summaries (Task 1.8)
        "summaryByLanguage": summary_by_language,
        "dependencyGraph": {"dependencies": dependency_graph},
        "functionIndex": function_index,
        "entryPointsSummary": entry_points_summary,
    }

    # Add services if any found
    if services:
        result["summary"]["servicesUsed"] = services

    result["files"] = file_list
    return result


def render_file_snapshot(
    rel_path: str,
    content: str,
    info: Dict,
    entry_points: List[EntryPoint],
    max_content_chars: int = 50000,
) -> Dict:
    """
    Generate per-file snapshot JSON.
    Contains detailed info about a single source file.
    Note: wasTruncated flag is set if content exceeded max_content_chars OR if parsing was truncated by max_lines.
    """
    # File was truncated either by max_content_chars or by max_lines during parsing
    content_truncated = len(content) > max_content_chars
    parsing_truncated = info.get("wasTruncated", False)
    was_truncated = content_truncated or parsing_truncated

    # Build functions list with full detail
    functions = []
    for f in info.get("allFunctions", []):
        func_entry = {
            "name": f.get("name", ""),
            "line": f.get("line", 0),
            "scope": f.get("scope", ""),
        }
        # Include signature if available
        if f.get("signature"):
            func_entry["signature"] = f["signature"]
        # Include params/returns if available
        if f.get("paramsTyped"):
            func_entry["params"] = f["paramsTyped"]
        if f.get("returnType"):
            func_entry["returnType"] = f["returnType"]
        # Include purpose/doc if available
        purpose = f.get("purpose", "")
        if purpose:
            func_entry["purpose"] = purpose

        # Include n8n-specific fields (params = node type, comment = conditions/config)
        if f.get("params"):
            func_entry["nodeType"] = f["params"]
        if f.get("comment"):
            func_entry["config"] = f["comment"]

        functions.append(func_entry)

    # Get file-specific entry points
    file_entries = [e.to_dict() for e in entry_points if e.file == rel_path]

    result: Dict = {
        "path": rel_path,
        "lang": info.get("lang", ""),
        "contentHash": get_content_hash(content),
    }

    # Only include non-empty fields
    purpose = info.get("purpose", "")
    if purpose:
        result["purpose"] = purpose

    internal = info.get("importsInternal", [])
    external = info.get("importsExternal", [])
    if internal or external:
        result["imports"] = {}
        if internal:
            result["imports"]["internal"] = internal
        if external:
            result["imports"]["external"] = external

    if functions:
        result["functions"] = functions

    if file_entries:
        result["entryPoints"] = file_entries

    # Include actualDependencies for Python files
    actual_deps = info.get("actualDependencies", [])
    if actual_deps:
        result["dependencies"] = {
            "actual": actual_deps,
            "external": external,  # also include all external imports for reference
        }

    if was_truncated:
        result["wasTruncated"] = True

    return result


def write_atlas_output(
    output_dir: Path,
    tree_text: str,
    files_info: Dict[str, Dict],
    file_contents: Dict[str, str],
    entry_points: List[EntryPoint],
    summary: Dict[str, object],
    meta_info: Dict,
    cache_data: Dict[str, Dict],
    cache_enabled: bool,
    root: Optional[Path] = None,
    redact_secrets_enabled: bool = False,
    func_map: Optional[Dict[str, List[Dict]]] = None,
    deps_merged: Optional[Dict[str, Dict]] = None,
    workspaces: Optional[Dict[str, WorkspaceInfo]] = None,
    ws_graph: Optional[Dict[str, List[str]]] = None,
) -> Tuple[int, int, int]:
    """
    Write the complete atlas output to a directory.
    Returns (files_written, files_skipped, secrets_redacted) for stats.
    """
    func_map = func_map or {}
    # Create directory structure
    output_dir.mkdir(parents=True, exist_ok=True)
    files_dir = output_dir / "files"
    files_dir.mkdir(exist_ok=True)

    files_written = 0
    files_skipped = 0

    # 1. Write meta.json
    meta_path = output_dir / "meta.json"
    meta_path.write_text(
        json.dumps(meta_info, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8"
    )

    # 2. Write index.json
    index_data = render_index_json(files_info, summary, entry_points, func_map=func_map, deps_merged=deps_merged)
    index_path = output_dir / "index.json"
    index_path.write_text(
        json.dumps(index_data, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8"
    )

    # 3. Write entries.json
    entries_data = render_entries_json(entry_points)
    entries_path = output_dir / "entries.json"
    entries_path.write_text(
        json.dumps(entries_data, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8"
    )

    # 4. Write tree.txt (human-friendly)
    tree_path = output_dir / "tree.txt"
    tree_path.write_text(tree_text, encoding="utf-8")

    # 5. Write connections.json (import graph + workspaces + call graph)
    if root:
        import_edges = build_import_graph(files_info, root)

        # Phase 8.1: Build call graph
        call_graph = None
        if func_map and file_contents:
            try:
                call_graph = build_call_graph(func_map, file_contents, files_info)
                print(f"[info] Call graph built: {len(call_graph)} functions analyzed", file=sys.stderr)
            except Exception as e:
                print(f"[warn] Call graph construction failed: {e}", file=sys.stderr)

        connections_data = render_connections_json(
            import_edges,
            files_info,
            workspaces=workspaces,
            ws_graph=ws_graph,
            call_graph=call_graph,
            entry_points=entry_points,
            func_map=func_map,
            file_contents=file_contents
        )
        connections_path = output_dir / "connections.json"
        connections_path.write_text(
            json.dumps(connections_data, ensure_ascii=False, indent=2, sort_keys=True),
            encoding="utf-8"
        )

    # Track secrets redactions for summary
    total_redactions = 0

    # 6. Clean up stale snapshot files (from deleted source files)
    # Get set of files being written this run
    current_files_set = set(files_info.keys())

    # Check existing snapshot files and remove ones that no longer exist in source
    if files_dir.exists():
        for snapshot_json in files_dir.glob("*.json"):
            # Convert snapshot filename back to source path
            source_path = atlas_filename_to_path(snapshot_json.stem)
            if source_path not in current_files_set:
                # Source file has been deleted, remove stale snapshot
                try:
                    snapshot_json.unlink()
                except OSError:
                    pass  # Silently ignore if cleanup fails

    # 7. Write per-file snapshots with incremental update support
    for rel_path, info in files_info.items():
        content = file_contents.get(rel_path, "")

        # Apply secrets redaction if enabled
        redactions = []
        if redact_secrets_enabled and content:
            content, redactions = redact_secrets(content)
            total_redactions += len(redactions)

        content_hash = get_content_hash(content)
        atlas_filename = path_to_atlas_filename(rel_path)
        file_snapshot_path = files_dir / atlas_filename

        # Check if we can skip (incremental update)
        if cache_enabled and file_snapshot_path.exists():
            cached = cache_data.get(rel_path, {})
            if cached.get("contentHash") == content_hash:
                files_skipped += 1
                continue

        # Generate and write file snapshot
        file_entry_points = [e for e in entry_points if e.file == rel_path]
        file_data = render_file_snapshot(rel_path, content, info, file_entry_points)

        # Add redaction info if any
        if redactions:
            file_data["secretsRedacted"] = len(redactions)

        file_snapshot_path.write_text(
            json.dumps(file_data, ensure_ascii=False, indent=2, sort_keys=True),
            encoding="utf-8"
        )
        files_written += 1

        # Update cache with content hash
        if cache_enabled:
            if rel_path not in cache_data:
                cache_data[rel_path] = {}
            cache_data[rel_path]["contentHash"] = content_hash

    return files_written, files_skipped, total_redactions


# ------------------------------
# Phase 4: Import Graph (Semantic Connections)
# ------------------------------

def resolve_import_to_file(
    import_path: str,
    from_file: str,
    root: Path,
    lang: str,
    all_files: List[str],
) -> Optional[str]:
    """
    Resolve an import path to an actual file in the project.
    Returns the relative file path if found, None otherwise.
    """
    from_dir = str(Path(from_file).parent)
    all_files_set = set(all_files)

    if lang == "py":
        # Python imports
        candidates = []

        if import_path.startswith("."):
            # Relative import
            parts = import_path.lstrip(".")
            levels = len(import_path) - len(parts)
            parent = Path(from_dir)
            for _ in range(levels - 1):
                parent = parent.parent
            base = str(parent / parts.replace(".", "/"))
            candidates.append(base)
        else:
            # Absolute import - try multiple strategies
            mod_path = import_path.replace(".", "/")

            # Strategy 1: Direct from root
            candidates.append(mod_path)

            # Strategy 2: Relative to from_file's directory (same package)
            candidates.append(str(Path(from_dir) / mod_path))

            # Strategy 3: Check if from_file is in a src/ or lib/ directory
            # and try relative to that
            parts = from_dir.split("/")
            for i, part in enumerate(parts):
                if part in ("src", "lib", "app", "pkg"):
                    prefix = "/".join(parts[:i+1])
                    candidates.append(f"{prefix}/{mod_path}")

        # Try different extensions for each candidate
        for candidate in candidates:
            for suffix in ["", ".py", "/__init__.py"]:
                test_path = candidate + suffix
                # Normalize path
                test_path = test_path.lstrip("/")
                if test_path in all_files_set:
                    return test_path

    elif lang in ("js", "ts", "jsx", "tsx", "vue", "gs"):
        # JavaScript/TypeScript imports
        if import_path.startswith("./") or import_path.startswith("../"):
            # Relative import
            try:
                resolved = str((Path(from_dir) / import_path).resolve().relative_to(root.resolve()))
            except ValueError:
                resolved = str(Path(from_dir) / import_path)

            # Try different extensions
            for suffix in ["", ".js", ".ts", ".jsx", ".tsx", ".vue", "/index.js", "/index.ts"]:
                test_path = resolved + suffix
                if test_path in all_files_set:
                    return test_path
        else:
            # Could be absolute from src or node_modules - skip external
            return None

    return None


def build_import_graph(
    files_info: Dict[str, Dict],
    root: Path,
) -> List[Dict]:
    """
    Build an import graph from files_info.
    Returns a list of import edges: { from, to, symbols (if known) }
    """
    all_files = list(files_info.keys())
    imports: List[Dict] = []
    seen_edges: set = set()

    for from_file, info in files_info.items():
        lang = info.get("lang", "")
        # Check both internal and external imports
        # (because classify_imports may misclassify some imports)
        all_imports = info.get("importsInternal", []) + info.get("importsExternal", [])

        for import_path in all_imports:
            to_file = resolve_import_to_file(
                import_path, from_file, root, lang, all_files
            )
            if to_file and to_file != from_file:
                edge_key = (from_file, to_file)
                if edge_key not in seen_edges:
                    seen_edges.add(edge_key)
                    imports.append({
                        "from": from_file,
                        "to": to_file,
                        "importPath": import_path,
                    })

    return imports


def render_connections_json(
    import_edges: List[Dict],
    files_info: Dict[str, Dict],
    workspaces: Optional[Dict[str, WorkspaceInfo]] = None,
    ws_graph: Optional[Dict[str, List[str]]] = None,
    call_graph: Optional[Dict[str, List[str]]] = None,
    entry_points: Optional[List[EntryPoint]] = None,
    func_map: Optional[Dict[str, List[Dict[str, str]]]] = None,
    file_contents: Optional[Dict[str, str]] = None
) -> Dict:
    """
    Generate connections.json with import graph.
    Enhanced with workspace dependencies, function call graph (Phase 8.1),
    and cyclomatic complexity analysis (Phase 8.2).
    Future: can extend with 'uses' and 'renders' edges.
    """
    # Group imports by source file for better readability
    imports_by_file: Dict[str, List[Dict]] = {}
    for edge in import_edges:
        from_file = edge["from"]
        if from_file not in imports_by_file:
            imports_by_file[from_file] = []
        imports_by_file[from_file].append({
            "to": edge["to"],
            "importPath": edge["importPath"],
        })

    # Build adjacency list style output
    connections = []
    for from_file, edges in sorted(imports_by_file.items()):
        connections.append({
            "file": from_file,
            "imports": edges,
        })

    # Also compute reverse dependencies (who imports me?)
    imported_by: Dict[str, List[str]] = {}
    for edge in import_edges:
        to_file = edge["to"]
        if to_file not in imported_by:
            imported_by[to_file] = []
        imported_by[to_file].append(edge["from"])

    reverse_deps = []
    for to_file, from_files in sorted(imported_by.items()):
        reverse_deps.append({
            "file": to_file,
            "importedBy": sorted(list(set(from_files))),
        })

    result = {
        "schemaVersion": ATLAS_SCHEMA_VERSION,
        "generated": datetime.now(timezone.utc).isoformat(),
        "imports": connections,
        "importedBy": reverse_deps,
        "stats": {
            "totalEdges": len(import_edges),
            "filesWithImports": len(imports_by_file),
            "filesImported": len(imported_by),
        },
    }

    # Add workspace information if available
    if workspaces and ws_graph:
        result["workspaces"] = render_workspace_graph(workspaces, ws_graph)

    # Phase 8.1: Add call graph analysis
    if call_graph is not None:
        # Detect circular calls
        circular_calls = detect_circular_calls(call_graph)

        # Detect dead functions
        dead_funcs = []
        if entry_points is not None and func_map is not None:
            dead_funcs = detect_dead_functions(call_graph, entry_points, func_map)

        # Calculate statistics
        total_funcs = len(call_graph)
        referenced_funcs = len(set(callee for callees in call_graph.values() for callee in callees))

        result["callGraph"] = {
            # 只保留有呼叫關係的函式,以減小輸出大小
            # 注意: 沒有呼叫其他函式的函式不會出現在這裡,但會在統計中計算
            "functions": {k: v for k, v in sorted(call_graph.items()) if v},
            "circularCalls": circular_calls,
            "deadFunctions": dead_funcs,
            "stats": {
                "totalFunctions": total_funcs,
                "functionsWithCalls": len([v for v in call_graph.values() if v]),
                "referencedFunctions": referenced_funcs,
                "deadCount": len(dead_funcs),
                "circularCount": len(circular_calls),
            }
        }

    # Phase 8.2: Add cyclomatic complexity analysis
    if func_map is not None and file_contents is not None:
        complexity_data = analyze_code_complexity(func_map, file_contents, files_info)
        result["complexity"] = complexity_data

    return result


# TypeScript function with return type
TS_FN_WITH_RETURN = re.compile(
    r"""(?x)
    (?:export\s+)?(?:async\s+)?function\s+(\w+)\s*   # function name
    (?:<[^>]+>)?\s*                                  # optional generics
    \(([^)]*)\)\s*                                   # parameters
    (?::\s*([^{]+?))?                               # optional return type
    \s*\{
    """
)

# TypeScript arrow function with types
TS_ARROW_WITH_RETURN = re.compile(
    r"""(?x)
    (?:export\s+)?(?:const|let|var)\s+(\w+)\s*      # variable name
    (?::\s*[^=]+?)?\s*=\s*                          # optional type annotation
    (?:async\s+)?                                    # optional async
    (?:<[^>]+>)?\s*                                  # optional generics
    \(([^)]*)\)\s*                                   # parameters
    (?::\s*([^=]+?))?                               # optional return type
    \s*=>
    """
)

# JS/TS/JSX/TSX export function or const arrow export
JS_EXPORT_FN = re.compile(
    r"""(?x)
    export\s+(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\) |     # export function foo(...)
    export\s+const\s+(\w+)\s*=\s*(?:async\s*)?\(?([^)]*)\)?\s*=>  # export const foo = (...) =>
    """
)

# JS/TS classic function declarations (with optional export)
JS_FN_DECL = re.compile(
    r"""(?x)
    (?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)
    """
)

# JS object "controller-like": name: function (...) or name: (...) => or name(...) { } (method shorthand)
JS_OBJ_METHOD = re.compile(
    r"""(?x)
    (\w+)\s*:\s*(?:async\s*)?function\s*\w*\s*\(([^)]*)\) |   # foo: function (a,b)
    (\w+)\s*:\s*(?:async\s*)?\(([^)]*)\)\s*=> |               # foo: (a,b) =>
    (\w+)\s*\(([^)]*)\)\s*\{                                  # foo(a,b) { ... } method shorthand
    """
)

# JS/TS export default function
JS_EXPORT_DEFAULT_FN = re.compile(
    r"""(?sx)
    export\s+default\s+(?:async\s+)?function\s+(\w+)?\s*\(([^)]*?)\)
    """
)

# JS function expressions assigned to const/let/var (optionally exported)
JS_FN_EXPR = re.compile(
    r"""(?sx)
    (?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(([^)]*?)\)
    """
)

# JS named re-exports: export { foo, bar as baz }
JS_EXPORT_LIST = re.compile(r"^\s*export\s*\{\s*([^}]+)\s*\}\s*;?", re.M)

# JS class methods (very heuristic)
JS_CLASS_METHOD = re.compile(
    r"""(?mx)
    ^\s*(?:public|private|protected)?\s*(?:static\s+)?(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*\{
    """
)

# Swift function pattern - captures function start, then we extract params separately
SWIFT_FUNC_START = re.compile(
    r"""(?x)
    ^\s*                                           # leading whitespace
    (?:@\w+(?:\([^)]*\))?\s+)*                    # attributes like @main, @available(...)
    (?:(?:public|private|internal|fileprivate|open)\s+)?  # access modifier
    (?:(?:static|class)\s+)?                       # static/class modifier
    (?:(?:override)\s+)?                           # override keyword
    (?:(?:mutating|nonmutating)\s+)?              # mutating keyword
    func\s+(\w+)                                   # function name
    (?:<[^>]+>)?                                   # generic parameters
    \s*\(                                          # opening paren
    """,
    re.MULTILINE
)

# Multi-line Swift function pattern (uses DOTALL for params spanning lines)
SWIFT_FUNC = re.compile(
    r"""(?x)
    ^\s*                                           # leading whitespace
    (?:@\w+(?:\([^)]*\))?\s+)*                    # attributes like @main, @available(...)
    (?:(?:public|private|internal|fileprivate|open)\s+)?  # access modifier
    (?:(?:static|class)\s+)?                       # static/class modifier
    (?:(?:override)\s+)?                           # override keyword
    (?:(?:mutating|nonmutating)\s+)?              # mutating keyword
    func\s+(\w+)                                   # function name
    (?:<[^>]+>)?                                   # generic parameters
    \s*\(([^)]*)\)                                 # parameters (single line)
    (?:\s*(?:throws|rethrows))?                   # throws keyword
    (?:\s*->\s*([^\{]+?))?                        # return type
    \s*(?:\{|where)                               # opening brace or where clause
    """,
    re.MULTILINE
)

# Swift struct/class/enum pattern
SWIFT_TYPE_DECL = re.compile(
    r"""(?x)
    ^\s*
    (?:@\w+(?:\([^)]*\))?\s+)*                    # attributes
    (?:(?:public|private|internal|fileprivate|open)\s+)?  # access modifier
    (?:(?:final)\s+)?                              # final keyword
    (struct|class|enum|protocol|actor)\s+(\w+)    # type keyword and name
    (?:<[^>]+>)?                                   # generic parameters
    (?:\s*:\s*([^{\n]+))?                         # inheritance/conformance
    """,
    re.MULTILINE
)

# SwiftUI View pattern (struct conforming to View)
SWIFT_VIEW = re.compile(
    r"""(?x)
    ^\s*
    (?:@\w+(?:\([^)]*\))?\s+)*                    # attributes
    (?:(?:public|private|internal|fileprivate)\s+)?
    struct\s+(\w+)\s*:\s*[^{]*\bView\b
    """,
    re.MULTILINE
)

# Swift @main entry point
SWIFT_MAIN = re.compile(r"^\s*@main\s*\n?\s*(?:struct|class|enum)\s+(\w+)", re.MULTILINE)

# Swift computed property pattern
SWIFT_PROPERTY = re.compile(
    r"""(?x)
    ^\s*
    (?:(?:public|private|internal|fileprivate|open)\s+)?
    (?:(?:static|class)\s+)?
    (?:(?:override)\s+)?
    (?:var|let)\s+(\w+)\s*:\s*([^{\n=]+)
    """,
    re.MULTILINE
)

# Python def / async def - now captures return type
PY_DEF = re.compile(
    r"""(?x)
    ^\s*(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?\s*:
    """
)

# Python type hint patterns for parameter parsing
PY_PARAM_WITH_TYPE = re.compile(
    r"""(?x)
    (\*{0,2}\w+)           # param name (may have * or **)
    \s*:\s*                # colon separator
    ([^=,]+?)              # type annotation
    (?:\s*=\s*[^,]+)?      # optional default value
    (?:,|$)                # comma or end
    """
)

# Docstring param/return patterns (Google, Sphinx, NumPy styles)
PY_DOCSTRING_PARAM = re.compile(
    r"""(?x)
    (?:
        :param\s+(\w+):\s*(.+?)(?=\n\s*:|$) |           # Sphinx :param name: desc
        :type\s+(\w+):\s*(.+?)(?=\n|$) |               # Sphinx :type name: type
        Args:\s*\n((?:\s+\w+.*\n)+) |                  # Google Args: block
        Parameters\s*\n-+\s*\n((?:\s+\w+.*\n)+)        # NumPy Parameters block
    )
    """,
    re.MULTILINE
)

PY_DOCSTRING_RETURN = re.compile(
    r"""(?x)
    (?:
        :returns?:\s*(.+?)(?=\n\s*:|$) |               # Sphinx :return: desc
        :rtype:\s*(.+?)(?=\n|$) |                      # Sphinx :rtype: type
        Returns:\s*\n\s*(.+?)(?=\n\n|\n\s*\w+:|\Z) |   # Google Returns: block
        Returns\s*\n-+\s*\n\s*(.+?)(?=\n\n|\Z)         # NumPy Returns block
    )
    """,
    re.MULTILINE | re.DOTALL
)

# Python class method (we will just treat like normal def since scanning file line-by-line)
# Additional heuristic: capture preceding class for context
PY_CLASS = re.compile(r"^\s*class\s+(\w+)\s*(?:\([^)]*\))?\s*:")


def parse_python_params_with_types(params_str: str) -> List[Dict[str, str]]:
    """
    Parse Python function parameters and extract type annotations.
    Returns list of {name, type, default} for each parameter.
    """
    if not params_str or not params_str.strip():
        return []

    result: List[Dict[str, str]] = []
    # Handle multi-line params by normalizing whitespace
    params_str = " ".join(params_str.split())

    # Split by comma, but be careful with nested brackets
    depth = 0
    current = ""
    parts: List[str] = []
    for ch in params_str:
        if ch in "([{":
            depth += 1
            current += ch
        elif ch in ")]}":
            depth -= 1
            current += ch
        elif ch == "," and depth == 0:
            parts.append(current.strip())
            current = ""
        else:
            current += ch
    if current.strip():
        parts.append(current.strip())

    for part in parts:
        part = part.strip()
        if not part:
            continue

        # Skip *args, **kwargs style without type
        param_info: Dict[str, str] = {"name": "", "type": "", "default": ""}

        # Check for default value
        if "=" in part:
            param_part, default_part = part.split("=", 1)
            param_info["default"] = default_part.strip()
            part = param_part.strip()

        # Check for type annotation
        if ":" in part:
            name_part, type_part = part.split(":", 1)
            param_info["name"] = name_part.strip()
            param_info["type"] = type_part.strip()
        else:
            param_info["name"] = part.strip()

        if param_info["name"]:
            result.append(param_info)

    return result


def extract_python_docstring(lines: List[str], func_line_idx: int) -> str:
    """
    Extract the docstring following a function definition.
    Returns the docstring content or empty string.
    """
    # Look for docstring starting after the def line
    i = func_line_idx + 1
    while i < len(lines) and not lines[i].strip():
        i += 1

    if i >= len(lines):
        return ""

    line = lines[i].strip()

    # Check for triple-quoted string
    for quote in ['"""', "'''"]:
        if line.startswith(quote):
            # Single-line docstring
            if line.count(quote) >= 2 and line.endswith(quote) and len(line) > 6:
                return line[3:-3].strip()

            # Multi-line docstring
            docstring_lines = [line[3:]]  # Remove opening quotes
            i += 1
            while i < len(lines):
                curr_line = lines[i]
                if quote in curr_line:
                    # Found closing quotes
                    end_idx = curr_line.find(quote)
                    docstring_lines.append(curr_line[:end_idx])
                    break
                docstring_lines.append(curr_line)
                i += 1
            return "\n".join(docstring_lines).strip()

    return ""


def parse_python_docstring_types(docstring: str) -> Dict[str, Dict[str, str]]:
    """
    Parse docstring to extract parameter types and return type.
    Supports Sphinx, Google, and NumPy docstring styles.
    Returns: {"params": {name: {type, description}}, "returns": {type, description}}
    """
    result: Dict[str, Dict[str, str]] = {"params": {}, "returns": {"type": "", "description": ""}}

    if not docstring:
        return result

    # Sphinx style: :param name: description, :type name: type, :returns:, :rtype:
    for m in re.finditer(r":param\s+(\w+):\s*(.+?)(?=\n\s*:|$)", docstring, re.DOTALL):
        name, desc = m.group(1), m.group(2).strip()
        if name not in result["params"]:
            result["params"][name] = {"type": "", "description": ""}
        result["params"][name]["description"] = desc.split("\n")[0].strip()

    for m in re.finditer(r":type\s+(\w+):\s*(.+?)(?=\n|$)", docstring):
        name, ptype = m.group(1), m.group(2).strip()
        if name not in result["params"]:
            result["params"][name] = {"type": "", "description": ""}
        result["params"][name]["type"] = ptype

    # Sphinx returns
    m = re.search(r":returns?:\s*(.+?)(?=\n\s*:|$)", docstring, re.DOTALL)
    if m:
        result["returns"]["description"] = m.group(1).strip().split("\n")[0].strip()

    m = re.search(r":rtype:\s*(.+?)(?=\n|$)", docstring)
    if m:
        result["returns"]["type"] = m.group(1).strip()

    # Google style: Args: block, Returns: block
    args_match = re.search(r"Args:\s*\n((?:\s+.+\n?)+)", docstring)
    if args_match:
        args_block = args_match.group(1)
        for line in args_block.split("\n"):
            line = line.strip()
            if not line:
                continue
            # Pattern: name (type): description or name: description
            m = re.match(r"(\w+)\s*\(([^)]+)\):\s*(.+)?", line)
            if m:
                name, ptype, desc = m.group(1), m.group(2), m.group(3) or ""
                result["params"][name] = {"type": ptype.strip(), "description": desc.strip()}
            else:
                m = re.match(r"(\w+):\s*(.+)?", line)
                if m:
                    name, desc = m.group(1), m.group(2) or ""
                    if name not in result["params"]:
                        result["params"][name] = {"type": "", "description": ""}
                    result["params"][name]["description"] = desc.strip()

    # Google Returns
    returns_match = re.search(r"Returns:\s*\n?\s*(.+?)(?=\n\n|\n\s*\w+:|\Z)", docstring, re.DOTALL)
    if returns_match and not result["returns"]["description"]:
        ret_text = returns_match.group(1).strip()
        # Check if format is "type: description"
        m = re.match(r"([^:]+):\s*(.+)", ret_text, re.DOTALL)
        if m:
            result["returns"]["type"] = m.group(1).strip()
            result["returns"]["description"] = m.group(2).strip().split("\n")[0]
        else:
            result["returns"]["description"] = ret_text.split("\n")[0]

    return result


def build_python_signature(name: str, params: List[Dict[str, str]], return_type: str) -> str:
    """
    Build a full function signature string with types.
    Example: process_data(data: List[dict], config: Config) -> DataFrame
    """
    param_strs: List[str] = []
    for p in params:
        if p["type"]:
            param_strs.append(f"{p['name']}: {p['type']}")
        else:
            param_strs.append(p["name"])

    sig = f"{name}({', '.join(param_strs)})"
    if return_type:
        sig += f" -> {return_type}"
    return sig


def extract_jsdoc_before_line(lines: List[str], line_idx: int) -> str:
    """
    Extract JSDoc comment block immediately preceding a function definition.
    Returns the JSDoc content or empty string.
    """
    if line_idx <= 0:
        return ""

    # Look backwards for JSDoc block ending with */
    i = line_idx - 1
    while i >= 0 and not lines[i].strip():
        i -= 1

    if i < 0:
        return ""

    # Check if this line ends a JSDoc block
    if not lines[i].strip().endswith("*/"):
        return ""

    # Find the start of the JSDoc block
    end_idx = i
    while i >= 0:
        if "/**" in lines[i]:
            # Found the start
            jsdoc_lines = lines[i:end_idx + 1]
            jsdoc_text = "\n".join(jsdoc_lines)
            # Clean up: remove /** and */ and leading *
            jsdoc_text = re.sub(r"^\s*/\*\*\s*", "", jsdoc_text)
            jsdoc_text = re.sub(r"\s*\*/\s*$", "", jsdoc_text)
            jsdoc_text = re.sub(r"^\s*\*\s?", "", jsdoc_text, flags=re.MULTILINE)
            return jsdoc_text.strip()
        i -= 1

    return ""


def parse_jsdoc_types(jsdoc: str) -> Dict[str, object]:
    """
    Parse JSDoc comment to extract parameter types and return type.
    Returns: {"params": {name: {type, description}}, "returns": {type, description}}
    """
    result: Dict[str, object] = {"params": {}, "returns": {"type": "", "description": ""}}

    if not jsdoc:
        return result

    # Extract @param tags
    for m in JSDOC_PARAM.finditer(jsdoc):
        ptype = (m.group(1) or "").strip()
        pname = m.group(2).strip()
        pdesc = (m.group(3) or "").strip()
        result["params"][pname] = {"type": ptype, "description": pdesc}

    # Extract @returns/@return tag
    m = JSDOC_RETURNS.search(jsdoc)
    if m:
        result["returns"] = {
            "type": (m.group(1) or "").strip(),
            "description": (m.group(2) or "").strip()
        }

    return result


def parse_ts_params_with_types(params_str: str) -> List[Dict[str, str]]:
    """
    Parse TypeScript function parameters and extract type annotations.
    Returns list of {name, type, default} for each parameter.
    """
    if not params_str or not params_str.strip():
        return []

    result: List[Dict[str, str]] = []
    params_str = " ".join(params_str.split())

    # Split by comma, handling nested brackets
    depth = 0
    current = ""
    parts: List[str] = []
    for ch in params_str:
        if ch in "(<{":
            depth += 1
            current += ch
        elif ch in ")>}":
            depth -= 1
            current += ch
        elif ch == "," and depth == 0:
            parts.append(current.strip())
            current = ""
        else:
            current += ch
    if current.strip():
        parts.append(current.strip())

    for part in parts:
        part = part.strip()
        if not part:
            continue

        param_info: Dict[str, str] = {"name": "", "type": "", "default": ""}

        # Check for default value
        if "=" in part:
            # Be careful: could be `param: Type = default` or `param = default`
            eq_idx = part.find("=")
            param_info["default"] = part[eq_idx + 1:].strip()
            part = part[:eq_idx].strip()

        # Check for type annotation (param: Type or param?: Type)
        if ":" in part:
            colon_idx = part.find(":")
            param_info["name"] = part[:colon_idx].strip().rstrip("?")
            param_info["type"] = part[colon_idx + 1:].strip()
        else:
            param_info["name"] = part.strip().rstrip("?")

        # Handle destructuring: {a, b}: Type
        if param_info["name"].startswith("{") or param_info["name"].startswith("["):
            param_info["name"] = param_info["name"]  # Keep as-is for now

        if param_info["name"]:
            result.append(param_info)

    return result


def extract_function_purpose(jsdoc: str = "", docstring: str = "", comment: str = "") -> str:
    """
    從 JSDoc/docstring/inline comment 提取函式用途摘要（首行或簡短描述）。
    優先順序: docstring > jsdoc > comment
    限制長度為 100 字元以內。
    """
    source = docstring or jsdoc or comment
    if not source:
        return ""
    
    lines = source.split('\n')
    purpose_lines = []
    
    for line in lines:
        line = line.strip()
        if line.startswith('@') or not line:
            if purpose_lines:
                break
            continue
        if line.startswith('* '):
            line = line[2:]
        elif line.startswith('*'):
            line = line[1:].lstrip()
        
        if line:
            purpose_lines.append(line)
            if docstring and len(purpose_lines) == 1 and line.endswith('.'):
                break
    
    purpose = ' '.join(purpose_lines).strip()
    
    if len(purpose) > 100:
        purpose = purpose[:97] + "..."
    
    return purpose



def build_js_signature(name: str, params: List[Dict[str, str]], return_type: str) -> str:
    """
    Build a full function signature string with types (TypeScript style).
    Example: processData(data: Array<object>, config?: Config): DataFrame
    """
    param_strs: List[str] = []
    for p in params:
        if p["type"]:
            param_strs.append(f"{p['name']}: {p['type']}")
        else:
            param_strs.append(p["name"])

    sig = f"{name}({', '.join(param_strs)})"
    if return_type:
        sig += f": {return_type}"
    return sig


def extract_prev_comment(lines: List[str], idx: int, lang: str) -> str:
    if idx <= 0:
        return ""
    prev = lines[idx - 1]
    m = (JS_LINE_COMMENT if lang in ("js", "ts", "jsx", "tsx", "vue") else PY_LINE_COMMENT).match(prev)
    return m.group(1).strip() if m else ""


def parse_vue_script(content: str) -> str:
    """
    Extract <script> ... </script> blocks (including <script setup>)
    Return concatenated JS/TS content (without HTML). Very simple heuristic.
    """
    # Handle multiple <script> blocks; naive regex but works for typical SFCs
    blocks = re.findall(r"<script[^>]*>(.*?)</script>", content, flags=re.S | re.I)
    return "\n\n".join(blocks)


def parse_js_family(content: str, filename: str) -> List[Dict[str, str]]:
    """
    Parse JS/TS/JSX/TSX heuristically with type extraction.
    Returns list of {name, params, comment, signature, paramsTyped, returnType}
    """
    lang = "js"
    suf = Path(filename).suffix.lower()
    if suf == ".ts":
        lang = "ts"
    elif suf == ".jsx":
        lang = "jsx"
    elif suf == ".tsx":
        lang = "tsx"
    elif suf == ".vue":
        lang = "vue"
    elif suf == ".gs":
        lang = "gs"

    is_typescript = lang in ("ts", "tsx")

    # If Vue, first extract script content
    src = parse_vue_script(content) if lang == "vue" else content
    lines = src.splitlines()
    out: List[Dict[str, str]] = []

    def find_line_idx(match_start: int) -> int:
        """Find line index for a match position."""
        pos = 0
        for idx, line in enumerate(lines):
            pos += len(line) + 1  # +1 for newline
            if pos > match_start:
                return idx
        return len(lines) - 1

    def enrich_with_types(entry: Dict[str, str], line_idx: int, params_raw: str, return_type_raw: str = "") -> Dict[str, str]:
        """Enrich a function entry with type information from JSDoc and TS annotations."""
        # Extract JSDoc if present
        jsdoc = extract_jsdoc_before_line(lines, line_idx)
        jsdoc_types = parse_jsdoc_types(jsdoc)

        # Extract function purpose from JSDoc or comments
        purpose = extract_function_purpose(jsdoc=jsdoc)
        if purpose:
            entry["purpose"] = purpose

        # Parse params (TS style if typescript, otherwise basic)
        if is_typescript or ":" in params_raw:
            parsed_params = parse_ts_params_with_types(params_raw)
        else:
            # Basic param parsing without types
            parsed_params = []
            for p in params_raw.split(","):
                p = p.strip()
                if p:
                    parsed_params.append({"name": p.split("=")[0].strip(), "type": "", "default": ""})

        # Merge JSDoc types into parsed params
        jsdoc_params = jsdoc_types.get("params", {})
        for p in parsed_params:
            param_name = p["name"]
            if param_name in jsdoc_params:
                jsdoc_info = jsdoc_params[param_name]
                if not p["type"] and jsdoc_info.get("type"):
                    p["type"] = jsdoc_info["type"]
                if jsdoc_info.get("description"):
                    p["description"] = jsdoc_info["description"]

        # Determine return type
        return_type = return_type_raw.strip() if return_type_raw else ""
        jsdoc_returns = jsdoc_types.get("returns", {})
        if not return_type and jsdoc_returns.get("type"):
            return_type = jsdoc_returns["type"]

        # Build signature
        signature = build_js_signature(entry["name"], parsed_params, return_type)

        # Build params output
        params_output = []
        for p in parsed_params:
            param_entry = {"name": p["name"]}
            if p.get("type"):
                param_entry["type"] = p["type"]
            if p.get("description"):
                param_entry["description"] = p["description"]
            if p.get("default"):
                param_entry["default"] = p["default"]
            params_output.append(param_entry)

        entry["signature"] = signature
        entry["paramsTyped"] = params_output
        entry["returnType"] = return_type
        if jsdoc_returns.get("description"):
            entry["returnDescription"] = jsdoc_returns["description"]

        return entry

    # TypeScript-specific patterns with return types
    if is_typescript:
        for m in TS_FN_WITH_RETURN.finditer(src):
            name = m.group(1)
            params = (m.group(2) or "").strip()
            return_type = (m.group(3) or "").strip()
            line_idx = find_line_idx(m.start())
            comment = extract_prev_comment(lines, line_idx, lang)
            entry = {"name": name, "params": params, "comment": comment}
            entry = enrich_with_types(entry, line_idx, params, return_type)
            out.append(entry)

        for m in TS_ARROW_WITH_RETURN.finditer(src):
            name = m.group(1)
            params = (m.group(2) or "").strip()
            return_type = (m.group(3) or "").strip()
            line_idx = find_line_idx(m.start())
            comment = extract_prev_comment(lines, line_idx, lang)
            entry = {"name": name, "params": params, "comment": comment}
            entry = enrich_with_types(entry, line_idx, params, return_type)
            out.append(entry)

    # Multi-line / file-level patterns
    for m in JS_EXPORT_DEFAULT_FN.finditer(src):
        name = m.group(1)
        params = (m.group(2) or "").strip()
        if name:
            line_idx = find_line_idx(m.start())
            entry = {"name": name, "params": params, "comment": ""}
            entry = enrich_with_types(entry, line_idx, params)
            out.append(entry)

    for m in JS_FN_EXPR.finditer(src):
        name = m.group(1)
        params = (m.group(2) or "").strip()
        line_idx = find_line_idx(m.start())
        entry = {"name": name, "params": params, "comment": ""}
        entry = enrich_with_types(entry, line_idx, params)
        out.append(entry)

    for m in JS_EXPORT_LIST.finditer(src):
        exports = m.group(1)
        for part in exports.split(","):
            token = part.strip()
            if not token:
                continue
            name = token.split(" as ")[0].strip()
            if name:
                out.append({"name": name, "params": "", "comment": "exported", "signature": name, "paramsTyped": [], "returnType": ""})

    for m in JS_CLASS_METHOD.finditer(src):
        name = m.group(1)
        params = (m.group(2) or "").strip()
        if name and name not in ("constructor",):
            line_idx = find_line_idx(m.start())
            entry = {"name": name, "params": params, "comment": ""}
            entry = enrich_with_types(entry, line_idx, params)
            out.append(entry)

    # Line-level patterns (fast prefilter)
    for i, line in enumerate(lines):
        if not ("function" in line or "=>" in line or "export" in line or ":" in line):
            continue

        for m in JS_EXPORT_FN.finditer(line):
            name = m.group(1) or m.group(3)
            params = (m.group(2) or m.group(4) or "").strip()
            comment = extract_prev_comment(lines, i, lang)
            entry = {"name": name, "params": params, "comment": comment}
            entry = enrich_with_types(entry, i, params)
            out.append(entry)

        for m in JS_FN_DECL.finditer(line):
            name = m.group(1)
            params = (m.group(2) or "").strip()
            comment = extract_prev_comment(lines, i, lang)
            entry = {"name": name, "params": params, "comment": comment}
            entry = enrich_with_types(entry, i, params)
            out.append(entry)

        for m in JS_OBJ_METHOD.finditer(line):
            name = m.group(1) or m.group(3) or m.group(5)
            params = (m.group(2) or m.group(4) or m.group(6) or "").strip()
            comment = extract_prev_comment(lines, i, lang)
            entry = {"name": name, "params": params, "comment": comment}
            entry = enrich_with_types(entry, i, params)
            out.append(entry)

    # Deduplicate by (name, signature) while preserving order
    seen = set()
    deduped = []
    for f in out:
        key = (f["name"], f.get("signature", f["params"]))
        if key not in seen:
            seen.add(key)
            deduped.append(f)

    # For GAS files, mark trigger functions and UI functions
    if lang == "gs":
        for f in deduped:
            func_name = f["name"]
            if func_name in GAS_TRIGGERS:
                f["isTrigger"] = True
                f["triggerType"] = GAS_TRIGGERS[func_name]
            elif func_name in GAS_UI_FUNCTIONS:
                f["isUIFunction"] = True
                f["uiFunctionType"] = GAS_UI_FUNCTIONS[func_name]

    return deduped


def parse_python(content: str, filename: str) -> List[Dict[str, str]]:
    """
    Heuristic Python def/class parsing with type extraction.
    Captures def ... and prefixes className.method with ClassName if adjacent.
    Now extracts: signature, params (with types), returnType from type hints and docstrings.
    """
    lines = content.splitlines()
    out: List[Dict[str, str]] = []
    class_stack: List[Tuple[str, int]] = []

    def indent_level(s: str) -> int:
        m = re.match(r"^(\s*)", s)
        if not m:
            return 0
        return len(m.group(1).replace("\t", "    "))

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        ind = indent_level(line)
        # Pop scopes that are not parents of current line
        while class_stack and class_stack[-1][1] >= ind:
            class_stack.pop()

        cls = PY_CLASS.match(line)
        if cls:
            class_stack.append((cls.group(1), ind))
            continue

        m = PY_DEF.match(line)
        if m:
            name = m.group(1)
            params_raw = (m.group(2) or "").strip()
            return_type_hint = (m.group(3) or "").strip()  # Now captured from regex
            comment = extract_prev_comment(lines, i, "py")

            if class_stack:
                full_name = f"{class_stack[-1][0]}.{name}"
                scope = "class"
            else:
                full_name = name
                scope = "module" if ind == 0 else "nested"

            # Parse parameters with type annotations
            parsed_params = parse_python_params_with_types(params_raw)

            # Extract and parse docstring for additional type info
            docstring = extract_python_docstring(lines, i)
            docstring_types = parse_python_docstring_types(docstring)

            # Merge docstring types into parsed params (docstring fills gaps)
            for p in parsed_params:
                param_name = p["name"].lstrip("*")  # Remove * or ** prefix for lookup
                if param_name in docstring_types["params"]:
                    ds_info = docstring_types["params"][param_name]
                    if not p["type"] and ds_info.get("type"):
                        p["type"] = ds_info["type"]
                    if not p.get("description") and ds_info.get("description"):
                        p["description"] = ds_info["description"]

            # Determine final return type (type hint takes precedence over docstring)
            return_type = return_type_hint
            if not return_type and docstring_types["returns"].get("type"):
                return_type = docstring_types["returns"]["type"]

            # Build full signature
            signature = build_python_signature(name, parsed_params, return_type)

            # Build params list for output
            params_output: List[Dict[str, str]] = []
            for p in parsed_params:
                param_entry = {"name": p["name"]}
                if p.get("type"):
                    param_entry["type"] = p["type"]
                if p.get("description"):
                    param_entry["description"] = p["description"]
                if p.get("default"):
                    param_entry["default"] = p["default"]
                params_output.append(param_entry)

            out.append({
                "name": full_name,
                "params": params_raw,  # Keep original for backward compat
                "comment": comment,
                "scope": scope,
                "signature": signature,
                "paramsTyped": params_output,
                "returnType": return_type,
                "returnDescription": docstring_types["returns"].get("description", ""),
                "purpose": extract_function_purpose(docstring=docstring, comment=comment),
            })

    return out


def parse_swift_params(params_str: str) -> List[Dict[str, str]]:
    """
    Parse Swift function parameters with types.
    Swift uses format: label name: Type = default or _ name: Type
    """
    if not params_str.strip():
        return []

    params: List[Dict[str, str]] = []
    # Handle nested generics and closures in parameter types
    depth = 0
    current = ""

    for char in params_str:
        if char in "(<[":
            depth += 1
            current += char
        elif char in ")>]":
            depth -= 1
            current += char
        elif char == "," and depth == 0:
            if current.strip():
                params.append(_parse_single_swift_param(current.strip()))
            current = ""
        else:
            current += char

    if current.strip():
        params.append(_parse_single_swift_param(current.strip()))

    return params


def _parse_single_swift_param(param: str) -> Dict[str, str]:
    """Parse a single Swift parameter like 'label name: Type = default' or '_ name: Type'."""
    result: Dict[str, str] = {}

    # Remove @escaping, @autoclosure, inout, etc.
    param = re.sub(r"@\w+\s+", "", param)
    param = re.sub(r"\b(inout)\s+", "", param)

    # Check for default value
    default_match = re.search(r"\s*=\s*(.+)$", param)
    if default_match:
        result["default"] = default_match.group(1).strip()
        param = param[:default_match.start()]

    # Parse label, name, and type
    # Patterns: "label name: Type", "_ name: Type", "name: Type"
    colon_idx = param.find(":")
    if colon_idx != -1:
        before_colon = param[:colon_idx].strip()
        result["type"] = param[colon_idx + 1:].strip()

        parts = before_colon.split()
        if len(parts) >= 2:
            # Has label and name (e.g., "with value" or "_ value")
            result["label"] = parts[0] if parts[0] != "_" else ""
            result["name"] = parts[1]
        elif len(parts) == 1:
            # Only name (e.g., "value")
            result["name"] = parts[0]
        else:
            result["name"] = before_colon
    else:
        result["name"] = param.strip()
        result["type"] = ""

    return result


def build_swift_signature(name: str, params: List[Dict[str, str]], return_type: str, throws: bool = False) -> str:
    """Build Swift function signature string."""
    param_strs = []
    for p in params:
        if p.get("label") and p["label"] != "_":
            s = f"{p['label']} {p['name']}: {p.get('type', 'Any')}"
        elif p.get("label") == "":
            s = f"_ {p['name']}: {p.get('type', 'Any')}"
        else:
            s = f"{p['name']}: {p.get('type', 'Any')}"
        param_strs.append(s)

    sig = f"func {name}({', '.join(param_strs)})"
    if throws:
        sig += " throws"
    if return_type:
        sig += f" -> {return_type}"

    return sig


def parse_swift(content: str, filename: str) -> List[Dict[str, str]]:
    """
    Swift parser with full type extraction.
    Extracts functions, SwiftUI Views, and @main entry points.
    """
    lines = content.splitlines()
    out: List[Dict[str, str]] = []

    # Track type declarations for scope
    type_stack: List[Tuple[str, int]] = []  # (type_name, indent)

    # Find @main entry point
    main_match = SWIFT_MAIN.search(content)
    main_type = main_match.group(1) if main_match else None

    # Find SwiftUI Views
    view_types = set()
    for m in SWIFT_VIEW.finditer(content):
        view_types.add(m.group(1))

    def indent_level(s: str) -> int:
        m = re.match(r"^(\s*)", s)
        if not m:
            return 0
        return len(m.group(1).replace("\t", "    "))

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped or stripped.startswith("//"):
            continue

        ind = indent_level(line)

        # Pop scopes that are not parents of current line
        while type_stack and type_stack[-1][1] >= ind:
            type_stack.pop()

        # Check for type declarations (struct, class, enum, etc.)
        type_match = SWIFT_TYPE_DECL.match(line)
        if type_match:
            type_kind = type_match.group(1)  # struct, class, enum, etc.
            type_name = type_match.group(2)
            conformance = (type_match.group(3) or "").strip()

            type_stack.append((type_name, ind))

            # Add type declaration as an entry
            entry: Dict[str, Any] = {
                "name": type_name,
                "params": "",
                "comment": extract_prev_comment(lines, i, "swift"),
                "scope": "type",
                "kind": type_kind,
            }

            if type_name in view_types:
                entry["isSwiftUIView"] = True

            if type_name == main_type:
                entry["isEntryPoint"] = True
                entry["entryType"] = "@main"

            if conformance:
                entry["conformance"] = conformance

            out.append(entry)
            continue

        # Check for functions - try single-line first, then multi-line
        func_match = SWIFT_FUNC.match(line)
        if func_match:
            name = func_match.group(1)
            params_raw = (func_match.group(2) or "").strip()
            return_type = (func_match.group(3) or "").strip()
            func_text = line
        else:
            # Try multi-line: look for func start
            start_match = SWIFT_FUNC_START.match(line)
            if start_match:
                name = start_match.group(1)
                # Collect the full function signature across lines
                func_text = line
                j = i
                paren_depth = line.count("(") - line.count(")")

                # Scan forward until we find the closing ) and {
                while paren_depth > 0 and j + 1 < len(lines):
                    j += 1
                    func_text += "\n" + lines[j]
                    paren_depth += lines[j].count("(") - lines[j].count(")")

                # Now extract params and return type from func_text
                # Find the parameter section
                open_paren = func_text.find("(")
                # Find matching close paren
                depth = 0
                close_paren = -1
                for idx, ch in enumerate(func_text[open_paren:], open_paren):
                    if ch == "(":
                        depth += 1
                    elif ch == ")":
                        depth -= 1
                        if depth == 0:
                            close_paren = idx
                            break

                if close_paren != -1:
                    params_raw = func_text[open_paren + 1:close_paren].strip()
                    # Clean up whitespace in params
                    params_raw = re.sub(r"\s+", " ", params_raw)

                    # Extract return type (after ) and before {)
                    after_params = func_text[close_paren + 1:]
                    return_match = re.search(r"->\s*([^{]+)", after_params)
                    return_type = return_match.group(1).strip() if return_match else ""
                else:
                    params_raw = ""
                    return_type = ""
            else:
                continue  # Not a function, skip

        # Check for throws keyword
        throws = "throws" in func_text or "rethrows" in func_text

        # Parse parameters
        parsed_params = parse_swift_params(params_raw)

        # Build signature
        signature = build_swift_signature(name, parsed_params, return_type, throws)

        # Determine scope
        if type_stack:
            full_name = f"{type_stack[-1][0]}.{name}"
            scope = "method"
        else:
            full_name = name
            scope = "function"

        # Build params output
        params_output: List[Dict[str, str]] = []
        for p in parsed_params:
            param_entry = {"name": p.get("name", "")}
            if p.get("type"):
                param_entry["type"] = p["type"]
            if p.get("label"):
                param_entry["label"] = p["label"]
            if p.get("default"):
                param_entry["default"] = p["default"]
            params_output.append(param_entry)

        entry = {
            "name": full_name,
            "params": params_raw,
            "comment": extract_prev_comment(lines, i, "swift"),
            "scope": scope,
            "signature": signature,
            "paramsTyped": params_output,
            "returnType": return_type,
        }

        if throws:
            entry["throws"] = True

        out.append(entry)

    return out



# ================================================================================
# 6) Parser Registry Architecture (Phase 1.2)
# ================================================================================

# ParserCapabilities: 語言能力元數據
@dataclass
class ParserCapabilities:
    """描述 parser 支持的功能和特性"""
    extensions: List[str]           # 支持的副檔名
    language_name: str              # 語言名稱
    supports_types: bool            # 是否支持型別提取
    supports_imports: bool          # 是否支持 import 提取  
    supports_purpose: bool          # 是否支持 purpose 提取
    supports_entry_points: bool     # 是否支持 entry point 檢測
    default_extension: str          # 主要副檔名


class ParserRegistry:
    """中央 parser 註冊表 - 管理所有語言 parser 和其能力"""
    
    def __init__(self) -> None:
        self.parsers: Dict[str, ParserFn] = {}
        self.capabilities: Dict[str, ParserCapabilities] = {}
    
    def register(self, 
                 ext: str, 
                 parser_fn: ParserFn, 
                 capabilities: Optional[ParserCapabilities] = None) -> None:
        """
        註冊 parser 和其能力。
        如果 capabilities 為 None，則只使用基本註冊（向後兼容）。
        """
        ext_lower = ext.lower()
        self.parsers[ext_lower] = parser_fn
        if capabilities:
            self.capabilities[ext_lower] = capabilities
    
    def get_parser(self, ext: str) -> Optional[ParserFn]:
        """獲取副檔名的 parser"""
        return self.parsers.get(ext.lower())
    
    def get_capabilities(self, ext: str) -> Optional[ParserCapabilities]:
        """獲取副檔名的能力"""
        return self.capabilities.get(ext.lower())
    
    def list_languages(self) -> Dict[str, ParserCapabilities]:
        """列出所有已註冊的語言（有 capabilities 的）"""
        return self.capabilities.copy()
    
    def supports_feature(self, ext: str, feature: str) -> bool:
        """
        檢查某副檔名是否支持某功能。
        feature: "types", "imports", "purpose", "entry_points"
        """
        cap = self.get_capabilities(ext)
        if not cap:
            return False
        
        feature_map = {
            "types": cap.supports_types,
            "imports": cap.supports_imports,
            "purpose": cap.supports_purpose,
            "entry_points": cap.supports_entry_points,
        }
        return feature_map.get(feature, False)


def initialize_builtin_parsers() -> ParserRegistry:
    """初始化所有內置 parser 和其能力"""
    registry = ParserRegistry()
    
    # Python
    registry.register(".py", parse_python, ParserCapabilities(
        extensions=[".py"],
        language_name="Python",
        supports_types=True,
        supports_imports=True,
        supports_purpose=True,
        supports_entry_points=True,
        default_extension=".py"
    ))
    
    # JavaScript/TypeScript (共享 parse_js_family)
    js_ts_cap = ParserCapabilities(
        extensions=[".js", ".ts", ".jsx", ".tsx", ".vue"],
        language_name="JavaScript/TypeScript",
        supports_types=True,
        supports_imports=True,
        supports_purpose=True,
        supports_entry_points=True,
        default_extension=".js"
    )
    for ext in [".js", ".ts", ".jsx", ".tsx", ".vue"]:
        registry.register(ext, parse_js_family, js_ts_cap)
    
    # Swift
    registry.register(".swift", parse_swift, ParserCapabilities(
        extensions=[".swift"],
        language_name="Swift",
        supports_types=True,
        supports_imports=False,  # TODO: Swift import extraction (Phase 7)
        supports_purpose=True,
        supports_entry_points=True,
        default_extension=".swift"
    ))
    
    # Google Apps Script (使用 parse_js_family)
    registry.register(".gs", parse_js_family, ParserCapabilities(
        extensions=[".gs"],
        language_name="Google Apps Script",
        supports_types=True,
        supports_imports=False,  # GAS 沒有標準 import
        supports_purpose=True,
        supports_entry_points=True,
        default_extension=".gs"
    ))
    
    return registry


# 全局 parser registry - 初始化一次
_PARSER_REGISTRY: Optional[ParserRegistry] = None

def get_parser_registry() -> ParserRegistry:
    """取得全局 parser registry，使用 lazy initialization"""
    global _PARSER_REGISTRY
    if _PARSER_REGISTRY is None:
        _PARSER_REGISTRY = initialize_builtin_parsers()
    return _PARSER_REGISTRY



ParserFn = Callable[[str, str], List[Dict[str, str]]]


PARSERS: Dict[str, ParserFn] = {
    ".js": parse_js_family,
    ".ts": parse_js_family,
    ".jsx": parse_js_family,
    ".tsx": parse_js_family,
    ".vue": parse_js_family,
    ".py": parse_python,
    ".gs": parse_js_family,
    ".swift": parse_swift,
}


def register_parser(ext: str, fn: ParserFn) -> None:
    """
    Register/override a parser for a given extension.
    注意：這個函數為了向後兼容保留，現在也會更新全局 registry。
    """
    # 保留對舊 PARSERS dict 的更新（向後兼容）
    PARSERS[ext.lower()] = fn
    # 也更新新 registry
    registry = get_parser_registry()
    registry.register(ext, fn)


def parse_functions_for_file(path: Path, root: Path) -> List[Dict[str, str]]:
    return parse_functions_for_text(path, None)


def parse_functions_for_text(path: Path, text_override: Optional[str]) -> List[Dict[str, str]]:
    try:
        text = text_override if text_override is not None else path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return []
    # 使用新 parser registry
    registry = get_parser_registry()
    parser_fn = registry.get_parser(path.suffix.lower())
    if not parser_fn:
        return []
    try:
        return parser_fn(text, str(path))
    except Exception:
        return []


# ------------------------------
# 4) Dependency collectors
# ------------------------------

def collect_package_jsons_from_files(manifest_files: List[Path]) -> Dict[str, Dict[str, Dict[str, str]]]:
    """
    Parse package.json manifests from a pre-collected list.
    Returns: projectName -> { dependencies, devDependencies }
    """
    result: Dict[str, Dict[str, Dict[str, str]]] = {}
    for pkg_path in manifest_files:
        if pkg_path.name != "package.json":
            continue
        p = pkg_path.parent
        try:
            data = json.loads(pkg_path.read_text(encoding="utf-8"))
            proj = data.get("name") or p.name
            result[proj] = {
                "dependencies": data.get("dependencies", {}) or {},
                "devDependencies": data.get("devDependencies", {}) or {},
            }
        except Exception as e:
            print(f"[warn] Failed to parse {pkg_path}: {e}", file=sys.stderr)
    return result


def collect_node_lockfiles_from_files(manifest_files: List[Path]) -> Dict[str, Dict[str, Dict[str, str]]]:
    """
    Best-effort parsing for Node lockfiles. Returns:
    projectKey -> { dependencies, devDependencies }
    """
    result: Dict[str, Dict[str, Dict[str, str]]] = {}

    for fpath in manifest_files:
        name = fpath.name
        parent = fpath.parent

        if name == "package-lock.json":
            try:
                data = json.loads(fpath.read_text(encoding="utf-8"))
                deps = data.get("dependencies", {}) or {}
                parsed: Dict[str, str] = {}
                for pkg, info in deps.items():
                    if isinstance(info, dict):
                        parsed[pkg] = info.get("version") or "*"
                    else:
                        parsed[pkg] = "*"
                key = f"{parent.name} (package-lock)"
                result[key] = {"dependencies": parsed, "devDependencies": {}}
            except Exception as e:
                print(f"[warn] Failed to parse {fpath}: {e}", file=sys.stderr)

        elif name == "pnpm-lock.yaml":
            # Heuristic: lines like "  /pkg@1.2.3:" or "  /@scope/name@1.2.3:"
            deps: Dict[str, str] = {}
            try:
                for line in fpath.read_text(encoding="utf-8", errors="ignore").splitlines():
                    m = re.match(r"^\s*/?(@?[^@\s/]+(?:/[^@\s:]+)?)@([^\s:]+):\s*$", line)
                    if m:
                        pkg, ver = m.group(1), m.group(2)
                        deps[pkg] = ver or "*"
                if deps:
                    key = f"{parent.name} (pnpm-lock)"
                    result[key] = {"dependencies": deps, "devDependencies": {}}
            except Exception as e:
                print(f"[warn] Failed to parse {fpath}: {e}", file=sys.stderr)

        elif name == "yarn.lock":
            deps: Dict[str, str] = {}
            try:
                current_pkg: Optional[str] = None
                for line in fpath.read_text(encoding="utf-8", errors="ignore").splitlines():
                    header = re.match(r'^"?(@?[^@":\s]+(?:/[^@":\s]+)?)@[^:]+:\s*$', line)
                    if header:
                        current_pkg = header.group(1)
                        deps.setdefault(current_pkg, "*")
                        continue
                    if current_pkg:
                        vm = re.match(r'^\s*version\s+"([^"]+)"\s*$', line)
                        if vm:
                            deps[current_pkg] = vm.group(1)
                            current_pkg = None
                if deps:
                    key = f"{parent.name} (yarn-lock)"
                    result[key] = {"dependencies": deps, "devDependencies": {}}
            except Exception as e:
                print(f"[warn] Failed to parse {fpath}: {e}", file=sys.stderr)

    return result


def collect_python_requirements_from_files(manifest_files: List[Path]) -> Dict[str, Dict[str, Dict[str, str]]]:
    """
    Parse requirements*.txt and pyproject.toml from a pre-collected list.
    Returns: projectKey -> { dependencies, devDependencies }
    """
    result: Dict[str, Dict[str, Dict[str, str]]] = {}
    # Group manifests by directory
    by_dir: Dict[Path, List[Path]] = {}
    for fpath in manifest_files:
        if fpath.name == "package.json":
            continue
        by_dir.setdefault(fpath.parent, []).append(fpath)

    for p, files in by_dir.items():
        deps_req: Dict[str, str] = {}
        dev_deps_req: Dict[str, str] = {}
        deps_py: Dict[str, str] = {}
        dev_deps_py: Dict[str, str] = {}
        deps_poetry: Dict[str, str] = {}
        dev_deps_poetry: Dict[str, str] = {}
        deps_pipfile: Dict[str, str] = {}
        dev_deps_pipfile: Dict[str, str] = {}

        for fpath in files:
            fname = fpath.name
            if re.match(r"requirements(\.[\w\-]+)?\.txt$", fname):
                try:
                    for line in fpath.read_text(encoding="utf-8", errors="ignore").splitlines():
                        line = line.strip()
                        if not line or line.startswith("#") or line.startswith("-r "):
                            continue
                        m = re.match(r"([A-Za-z0-9_\-\.]+)\s*([<>=!~]=?.*)?$", line)
                        if m:
                            name = m.group(1)
                            ver = (m.group(2) or "").strip()
                            deps_req[name] = ver or "*"
                except Exception as e:
                    print(f"[warn] Failed to parse {fpath}: {e}", file=sys.stderr)

            if fname == "pyproject.toml":
                try:
                    import tomllib  # type: ignore
                    data = tomllib.loads(fpath.read_text(encoding="utf-8"))
                    project = data.get("project", {})
                    name = project.get("name") or p.name
                    for spec in project.get("dependencies", []) or []:
                        pkg, _, ver = spec.partition(" ")
                        deps_py[pkg] = ver.strip() or "*"
                    opt = project.get("optional-dependencies", {}) or {}
                    for group, items in opt.items():
                        for spec in items or []:
                            pkg, _, ver = spec.partition(" ")
                            dev_deps_py[pkg] = ver.strip() or "*"
                    key = f"{name} (pyproject)"
                    if deps_py or dev_deps_py:
                        result[key] = {"dependencies": deps_py, "devDependencies": dev_deps_py}
                    else:
                        result.setdefault(key, {"dependencies": {}, "devDependencies": {}})

                    # Poetry-style dependencies (best-effort)
                    tool = data.get("tool", {}) or {}
                    poetry = tool.get("poetry", {}) or {}
                    poetry_name = poetry.get("name") or name or p.name
                    for pkg, ver in (poetry.get("dependencies", {}) or {}).items():
                        if pkg.lower() == "python":
                            continue
                        if isinstance(ver, str):
                            deps_poetry[pkg] = ver or "*"
                        else:
                            deps_poetry[pkg] = "*"
                    group_dev = (((poetry.get("group", {}) or {}).get("dev", {}) or {}).get("dependencies", {}) or {})
                    legacy_dev = poetry.get("dev-dependencies", {}) or {}
                    for pkg, ver in {**legacy_dev, **group_dev}.items():
                        if isinstance(ver, str):
                            dev_deps_poetry[pkg] = ver or "*"
                        else:
                            dev_deps_poetry[pkg] = "*"
                    if deps_poetry or dev_deps_poetry:
                        key_poetry = f"{poetry_name} (poetry)"
                        result[key_poetry] = {"dependencies": deps_poetry, "devDependencies": dev_deps_poetry}
                except Exception as e:
                    print(f"[warn] Failed to parse {fpath}: {e}", file=sys.stderr)

            if fname == "Pipfile":
                try:
                    import tomllib  # type: ignore
                    data = tomllib.loads(fpath.read_text(encoding="utf-8"))
                    packages = data.get("packages", {}) or {}
                    dev_packages = data.get("dev-packages", {}) or {}
                    for pkg, ver in packages.items():
                        deps_pipfile[pkg] = ver if isinstance(ver, str) else "*"
                    for pkg, ver in dev_packages.items():
                        dev_deps_pipfile[pkg] = ver if isinstance(ver, str) else "*"
                    if deps_pipfile or dev_deps_pipfile:
                        key_pf = f"{p.name} (pipfile)"
                        result[key_pf] = {"dependencies": deps_pipfile, "devDependencies": dev_deps_pipfile}
                except Exception as e:
                    print(f"[warn] Failed to parse {fpath}: {e}", file=sys.stderr)

        if deps_req or dev_deps_req:
            key = f"{p.name} (requirements)"
            result[key] = {"dependencies": deps_req, "devDependencies": dev_deps_req}

    return result


# ------------------------------
# 4.5) Workspace Support
# ------------------------------

def extract_npm_workspaces(
    root_path: Path,
    manifest_files: List[Path]
) -> Tuple[Dict[str, WorkspaceInfo], Dict[str, List[str]]]:
    """
    解析 npm/yarn workspaces 配置並建立 workspace 依賴圖。

    Args:
        root_path: 專案根目錄
        manifest_files: 掃描到的所有 manifest 檔案列表

    Returns:
        (workspaces_dict, dependency_graph)
        - workspaces_dict: {workspace_name: WorkspaceInfo}
        - dependency_graph: {workspace_name: [依賴的 workspace names]}
    """
    workspaces: Dict[str, WorkspaceInfo] = {}
    workspace_paths: Dict[str, Path] = {}  # name -> 絕對路徑

    # Step 1: 找到根 package.json 並解析 workspaces 配置
    root_pkg_json: Optional[Path] = None
    workspace_patterns: List[str] = []

    for manifest in manifest_files:
        if manifest.name == "package.json":
            try:
                data = json.loads(manifest.read_text(encoding="utf-8"))
                ws_config = data.get("workspaces")

                if ws_config:
                    # workspaces 可以是陣列或物件
                    if isinstance(ws_config, list):
                        workspace_patterns = ws_config
                    elif isinstance(ws_config, dict):
                        workspace_patterns = ws_config.get("packages", [])

                    if workspace_patterns:
                        root_pkg_json = manifest
                        break
            except Exception as e:
                print(f"[warn] Failed to parse {manifest}: {e}", file=sys.stderr)

    if not root_pkg_json or not workspace_patterns:
        return {}, {}  # 沒有 workspaces 配置

    # Step 2: 展開 glob patterns 找到所有 workspace 目錄
    workspace_dirs: List[Path] = []
    for pattern in workspace_patterns:
        # 支援 glob patterns 如 "packages/*" 或 "apps/**"
        try:
            for ws_dir in root_path.glob(pattern):
                if ws_dir.is_dir():
                    pkg_json = ws_dir / "package.json"
                    if pkg_json.exists():
                        workspace_dirs.append(ws_dir)
        except Exception as e:
            print(f"[warn] Failed to glob pattern {pattern}: {e}", file=sys.stderr)

    # Step 3: 收集所有 workspace 的 name
    workspace_names: set = set()
    for ws_dir in workspace_dirs:
        pkg_json = ws_dir / "package.json"
        try:
            data = json.loads(pkg_json.read_text(encoding="utf-8"))
            name = data.get("name")
            if name:
                workspace_names.add(name)
                workspace_paths[name] = ws_dir
        except Exception:
            pass

    # Step 4: 解析每個 workspace 的依賴
    dependency_graph: Dict[str, List[str]] = {}

    for ws_dir in workspace_dirs:
        pkg_json = ws_dir / "package.json"
        try:
            data = json.loads(pkg_json.read_text(encoding="utf-8"))
            name = data.get("name")
            if not name:
                continue

            all_deps = {
                **(data.get("dependencies", {}) or {}),
                **(data.get("devDependencies", {}) or {})
            }

            # 分類依賴: 內部 vs 外部
            internal_deps = []
            external_deps = {}

            for dep_name, version in all_deps.items():
                if dep_name in workspace_names:
                    internal_deps.append(dep_name)
                else:
                    external_deps[dep_name] = version

            # 建立 WorkspaceInfo
            rel_path = str(ws_dir.relative_to(root_path)).replace("\\", "/")
            ws_info = WorkspaceInfo(
                name=name,
                path=rel_path,
                ws_type="npm",  # 或根據 yarn.lock 存在判斷
                dependencies=external_deps,
                internal_deps=internal_deps
            )

            workspaces[name] = ws_info
            dependency_graph[name] = internal_deps

        except Exception as e:
            print(f"[warn] Failed to process workspace {ws_dir}: {e}", file=sys.stderr)

    return workspaces, dependency_graph


def extract_python_workspaces(
    root_path: Path,
    manifest_files: List[Path]
) -> Tuple[Dict[str, WorkspaceInfo], Dict[str, List[str]]]:
    """
    解析 Python monorepo 的 local path dependencies。
    支援 Poetry 和 PEP 621 (pyproject.toml) 格式。

    Args:
        root_path: 專案根目錄
        manifest_files: 掃描到的所有 manifest 檔案列表

    Returns:
        (workspaces_dict, dependency_graph)
    """
    workspaces: Dict[str, WorkspaceInfo] = {}
    workspace_paths: Dict[str, Path] = {}  # name -> 絕對路徑

    # Step 1: 收集所有 pyproject.toml 並建立 name -> path 映射
    pyproject_files: List[Path] = [
        f for f in manifest_files if f.name == "pyproject.toml"
    ]

    for pyproj_path in pyproject_files:
        try:
            import tomllib  # type: ignore
            data = tomllib.loads(pyproj_path.read_text(encoding="utf-8"))

            # 嘗試多種方式獲取專案名稱
            name = None
            if "project" in data:
                name = data["project"].get("name")
            if not name and "tool" in data and "poetry" in data["tool"]:
                name = data["tool"]["poetry"].get("name")

            if name:
                workspace_paths[name] = pyproj_path.parent
        except Exception as e:
            print(f"[warn] Failed to parse {pyproj_path}: {e}", file=sys.stderr)

    if not workspace_paths:
        return {}, {}  # 沒有 Python packages

    # Step 2: 解析每個 package 的依賴
    dependency_graph: Dict[str, List[str]] = {}

    for name, pkg_path in workspace_paths.items():
        pyproj_path = pkg_path / "pyproject.toml"
        try:
            import tomllib  # type: ignore
            data = tomllib.loads(pyproj_path.read_text(encoding="utf-8"))

            internal_deps = []
            external_deps = {}

            # PEP 621 格式
            if "project" in data:
                deps = data["project"].get("dependencies", []) or []
                for dep_spec in deps:
                    # 簡單解析 "package-name>=1.0.0"
                    pkg_name = re.split(r'[<>=!~\[]', dep_spec.strip())[0].strip()
                    if pkg_name in workspace_paths:
                        internal_deps.append(pkg_name)
                    else:
                        external_deps[pkg_name] = dep_spec

            # Poetry 格式
            if "tool" in data and "poetry" in data["tool"]:
                poetry_deps = data["tool"]["poetry"].get("dependencies", {}) or {}
                for dep_name, dep_value in poetry_deps.items():
                    if dep_name.lower() == "python":
                        continue

                    # 檢查是否為 path dependency
                    if isinstance(dep_value, dict) and "path" in dep_value:
                        # 解析相對路徑
                        dep_path = Path(dep_value["path"])
                        target_path = (pkg_path / dep_path).resolve()

                        # 查找對應的 workspace name
                        for ws_name, ws_path in workspace_paths.items():
                            if ws_path.resolve() == target_path:
                                internal_deps.append(ws_name)
                                break
                    else:
                        # 外部依賴
                        if dep_name in workspace_paths:
                            internal_deps.append(dep_name)
                        else:
                            ver = dep_value if isinstance(dep_value, str) else "*"
                            external_deps[dep_name] = ver

            # 建立 WorkspaceInfo
            rel_path = str(pkg_path.relative_to(root_path)).replace("\\", "/")
            ws_info = WorkspaceInfo(
                name=name,
                path=rel_path,
                ws_type="python",
                dependencies=external_deps,
                internal_deps=internal_deps
            )

            workspaces[name] = ws_info
            dependency_graph[name] = internal_deps

        except Exception as e:
            print(f"[warn] Failed to process Python workspace {name}: {e}", file=sys.stderr)

    return workspaces, dependency_graph


def render_workspace_graph(
    workspaces: Dict[str, WorkspaceInfo],
    dependency_graph: Dict[str, List[str]]
) -> Dict:
    """
    生成 workspace 層級的依賴視圖，包含循環依賴偵測。

    Args:
        workspaces: {workspace_name: WorkspaceInfo}
        dependency_graph: {workspace_name: [依賴的 workspace names]}

    Returns:
        完整的 workspace 圖資訊 (JSON-serializable)
    """
    if not workspaces:
        return {}

    # 偵測循環依賴
    circular_deps = detect_circular_dependencies(dependency_graph)

    # 計算統計資訊
    total_internal_edges = sum(len(deps) for deps in dependency_graph.values())

    # 計算每種類型的 workspace 數量
    type_counts: Dict[str, int] = {}
    for ws in workspaces.values():
        type_counts[ws.type] = type_counts.get(ws.type, 0) + 1

    # 建立反向依賴圖 (誰依賴我)
    reverse_deps: Dict[str, List[str]] = {}
    for ws_name, deps in dependency_graph.items():
        for dep in deps:
            if dep not in reverse_deps:
                reverse_deps[dep] = []
            reverse_deps[dep].append(ws_name)

    return {
        "workspaces": [ws.to_dict() for ws in sorted(workspaces.values(), key=lambda w: w.name)],
        "dependencyGraph": {
            name: sorted(deps) for name, deps in sorted(dependency_graph.items())
        },
        "reverseDependencies": {
            name: sorted(deps) for name, deps in sorted(reverse_deps.items())
        },
        "circularDependencies": circular_deps,
        "stats": {
            "totalWorkspaces": len(workspaces),
            "workspaceTypes": type_counts,
            "internalEdges": total_internal_edges,
            "circularDependencyCount": len(circular_deps)
        }
    }


# ------------------------------
# 5) Markdown rendering
# ------------------------------

def get_language_from_path(file_path: str) -> str:
    """
    從文件路徑確定語言名稱。
    使用 ParserRegistry 如果可用，否則使用副檔名推測。
    """
    from pathlib import Path
    suffix = Path(file_path).suffix.lower()
    
    try:
        registry = get_parser_registry()
        cap = registry.get_capabilities(suffix)
        if cap:
            return cap.language_name
    except Exception:
        pass
    
    # Fallback：副檔名對應
    lang_map = {
        '.py': 'Python',
        '.js': 'JavaScript',
        '.ts': 'TypeScript',
        '.jsx': 'JavaScript/JSX',
        '.tsx': 'TypeScript/TSX',
        '.vue': 'Vue',
        '.swift': 'Swift',
        '.gs': 'Google Apps Script',
    }
    return lang_map.get(suffix, 'Unknown')


def group_files_by_language(func_map: dict) -> dict:
    """
    按語言分組文件。
    返回: {language_name: [(file_path, funcs), ...]}
    """
    lang_files = {}
    for file_path in sorted(func_map.keys(), key=str.lower):
        lang = get_language_from_path(file_path)
        if lang not in lang_files:
            lang_files[lang] = []
        lang_files[lang].append((file_path, func_map[file_path]))
    return lang_files


def render_functions_section_nested(func_map: dict,
                                     file_meta: dict,
                                     key_functions_by_file: dict,
                                     detail_level: str) -> List[str]:
    """
    生成嵌套結構的函式清單。
    依據 detail_level 控制輸出細節。
    """
    md_lines = []
    
    if not func_map:
        md_lines.append("_（未偵測到符合規則的函式）_")
        return md_lines
    
    # 按語言分組
    lang_files = group_files_by_language(func_map)
    
    # 語言摘要（僅 medium 和 high）
    if detail_level in ("medium", "high"):
        md_lines.append("### 語言分佈")
        for lang in sorted(lang_files.keys()):
            files = lang_files[lang]
            total_funcs = sum(len(funcs) for _, funcs in files)
            md_lines.append(f"- **{lang}**: {len(files)} 檔案，{total_funcs} 函式")
        md_lines.append("")
    
    # 按語言輸出嵌套結構
    for lang in sorted(lang_files.keys()):
        files = lang_files[lang]
        md_lines.append(f"### {lang}\n")
        
        for file_path, funcs_all in files:
            meta = file_meta.get(file_path, {}) or {}
            purpose = str(meta.get("purpose") or "")
            internal_imports = meta.get("importsInternal") or []
            external_imports = meta.get("importsExternal") or []
            
            # 文件標題
            md_lines.append(f"#### {file_path}")
            
            # 文件元數據（detail_level 控制）
            if detail_level in ("medium", "high") and purpose:
                md_lines.append(f"- purpose: {purpose}")
            if detail_level == "high":
                if internal_imports:
                    md_lines.append(f"- imports internal: {', '.join(internal_imports[:12])}{'...' if len(internal_imports) > 12 else ''}")
                if external_imports:
                    md_lines.append(f"- imports external: {', '.join(external_imports[:12])}{'...' if len(external_imports) > 12 else ''}")
            
            # 函式列表
            key_funcs = key_functions_by_file.get(file_path) or funcs_all
            if not key_funcs:
                md_lines.append("_（無函式）_")
                md_lines.append("")
                continue
            
            if detail_level in ("medium", "high"):
                md_lines.append("##### 函式")
            
            for f in key_funcs:
                name = str(f.get("name") or "")
                params = str(f.get("params") or "")
                comment = str(f.get("comment") or "")
                purpose_fn = str(f.get("purpose") or "")
                
                if detail_level == "low":
                    # 最小化：只顯示函式名
                    md_lines.append(f"- {name}")
                else:
                    # medium 和 high：完整簽名
                    line = f"- **{name}({params})**"
                    if purpose_fn and detail_level in ("medium", "high"):
                        line += f" - {purpose_fn}"
                    if comment and detail_level == "high":
                        line += f" [{comment}]"
                    md_lines.append(line)
            
            md_lines.append("")
    
    return md_lines


def render_markdown(tree_text: str,
                    func_map: Dict[str, List[Dict[str, str]]],
                    deps_map: Dict[str, Dict[str, Dict[str, str]]],
                    summary: Optional[Dict[str, object]] = None,
                    sections: Optional[List[str]] = None,
                    file_meta: Optional[Dict[str, Dict[str, object]]] = None,
                    key_functions_by_file: Optional[Dict[str, List[Dict[str, str]]]] = None,
                    detail_level: str = DEFAULT_DETAIL_LEVEL) -> str:
    md_lines: List[str] = []
    sections = [s.lower() for s in (sections or ["tree", "functions", "deps", "summary"])]
    file_meta = file_meta or {}
    key_functions_by_file = key_functions_by_file or {}
    detail_level = (detail_level or DEFAULT_DETAIL_LEVEL).lower()

    if "tree" in sections:
        md_lines.append("## 專案目錄結構\n")
        md_lines.append("```text")
        md_lines.append(tree_text)
        md_lines.append("```\n")

    if "functions" in sections:
        md_lines.append("## 函式清單 / 檔案摘要\n")
        # 使用新的嵌套結構渲染
        nested_lines = render_functions_section_nested(
            func_map,
            file_meta,
            key_functions_by_file,
            detail_level
        )
        md_lines.extend(nested_lines)

    if "deps" in sections:
        md_lines.append("## 依賴清單\n")
        if not deps_map:
            md_lines.append("_（未找到相依檔案）_\n")
        else:
            for proj, info in sorted(deps_map.items(), key=lambda kv: kv[0].lower()):
                md_lines.append(f"### {proj}\n")
                dev = info.get("devDependencies", {}) or {}
                deps = info.get("dependencies", {}) or {}

                md_lines.append("#### devDependencies")
                if dev:
                    md_lines.append("```json")
                    md_lines.append(json.dumps(dev, ensure_ascii=False, indent=2))
                    md_lines.append("```")
                else:
                    md_lines.append("無")
                md_lines.append("")

                md_lines.append("#### dependencies")
                if deps:
                    md_lines.append("```json")
                    md_lines.append(json.dumps(deps, ensure_ascii=False, indent=2))
                    md_lines.append("```")
                else:
                    md_lines.append("無")
                md_lines.append("")

    if "summary" in sections and summary is not None:
        md_lines.append("## 摘要\n")
        md_lines.append(f"- 檔案數：{summary.get('fileCount', 0)}")
        md_lines.append(f"- 函式數：{summary.get('functionCount', 0)}")
        md_lines.append(f"- 依賴數：{summary.get('dependencyCount', 0)}")
        exts = summary.get("extensions", {}) or {}
        if isinstance(exts, dict) and exts:
            md_lines.append("- 語言/副檔名分佈：")
            for k, v in sorted(exts.items()):
                md_lines.append(f"  - {k}: {v}")

    return "\n".join(md_lines).strip() + "\n"


def render_json(tree_text: str,
                func_map: Dict[str, List[Dict[str, str]]],
                deps_map: Dict[str, Dict[str, Dict[str, str]]],
                summary: Dict[str, object],
                files_info: Optional[Dict[str, object]] = None,
                entry_points: Optional[List[EntryPoint]] = None) -> str:
    """
    Render legacy JSON output with enhanced summaries.
    Enhanced in Task 1.8 with structured summaries for better LLM consumption.
    """
    files_info = files_info or {}
    entry_points = entry_points or []

    # Build enhanced summaries (Task 1.8)
    summary_by_language = build_summary_by_language(files_info, func_map, deps_map)
    dependency_graph = build_dependency_graph(files_info)
    function_index = build_function_index(func_map)
    entry_points_summary = build_entry_points_summary(entry_points)

    # Compute total dependencies
    total_dependencies = len(set(
        dep for deps in dependency_graph.values() for dep in deps
    ))

    payload = {
        "tree": tree_text,
        "functions": func_map,
        "dependencies": deps_map,
        "summary": {
            **summary,  # Keep existing fields
            "totalDependencies": total_dependencies,
        },
        "files": files_info,
        # NEW: Enhanced summaries (Task 1.8)
        "summaryByLanguage": summary_by_language,
        "dependencyGraph": {"dependencies": dependency_graph},
        "functionIndex": function_index,
        "entryPointsSummary": entry_points_summary,
    }
    return json.dumps(payload, ensure_ascii=False, indent=2) + "\n"


def parse_n8n_workflow(path: Path) -> List[Dict[str, str]]:
    """
    Parse an n8n workflow JSON file and return pseudo-function entries for nodes.
    """
    try:
        data = json.loads(path.read_text(encoding="utf-8", errors="ignore"))
    except Exception:
        return []
    if not isinstance(data, dict):
        return []
    nodes = data.get("nodes")
    connections = data.get("connections")
    if not isinstance(nodes, list) or not isinstance(connections, dict):
        return []

    def summarize_parameters(ntype: str, params: Dict[str, object]) -> str:
        selected_keys = [
            "resource",
            "operation",
            "url",
            "httpMethod",
            "method",
            "path",
            "endpoint",
            "query",
            "table",
            "sheetId",
            "spreadsheetId",
            "documentId",
            "fileId",
            "bucket",
            "collection",
            "model",
        ]
        # Keys that must be redacted due to security (API keys, tokens, etc.)
        secret_keys = {
            "apiKey", "api_key", "key",
            "token", "accessToken", "access_token",
            "password", "passwd",
            "secret", "secretKey", "secret_key",
            "Authorization", "authorization",
            "Bearer", "bearer",
            "credential", "credentials",
            "auth", "apiToken", "api_token",
        }

        summary_parts: List[str] = []

        for k in selected_keys:
            if k in params:
                v = params.get(k)
                if isinstance(v, (str, int, float, bool)):
                    sv = str(v)
                    if len(sv) > 80:
                        sv = sv[:77] + "..."
                    # Don't expose sensitive keys
                    if k.lower() not in {sk.lower() for sk in secret_keys}:
                        summary_parts.append(f"{k}={sv}")

        # Triggers/special nodes
        if "scheduleTrigger" in ntype:
            rule = params.get("rule")
            trigger_times = params.get("triggerTimes")
            if rule:
                summary_parts.append(f"rule={rule}")
            if trigger_times:
                summary_parts.append("triggerTimes=present")
        if "code" in ntype and "jsCode" in params:
            js = params.get("jsCode")
            if isinstance(js, str):
                summary_parts.append(f"jsCode_len={len(js)}")

        if not summary_parts and params:
            summary_parts.append(f"params_keys={len(params)}")

        return ", ".join(summary_parts)

    def summarize_credentials(creds: object) -> str:
        # Summarize credentials WITHOUT exposing actual values
        # Only report that credentials are present and their types/names
        if not isinstance(creds, dict):
            return ""
        names: List[str] = []
        for k, v in creds.items():
            if isinstance(v, dict):
                n = v.get("name")
                if isinstance(n, str):
                    # Report type:name but never the actual credential values
                    names.append(f"{k}:[redacted]")
                else:
                    names.append(f"{k}:[redacted]")
            else:
                # Primitive values in credentials are always redacted
                names.append(f"{k}:[redacted]")
        return "credentials=" + "|".join(names) if names else ""

    def detect_if_node_logic(params: Dict[str, object]) -> str:
        """
        Extract IF node condition logic for better workflow understanding.
        Based on n8n IF node structure from docs.
        """
        conditions_obj = params.get("conditions")
        if not isinstance(conditions_obj, dict):
            return ""
        
        conditions_list = conditions_obj.get("conditions")
        if not isinstance(conditions_list, list) or not conditions_list:
            return ""
        
        combinator = conditions_obj.get("combinator", "and").upper()
        
        condition_strs = []
        for cond in conditions_list:
            if not isinstance(cond, dict):
                continue
            
            left = cond.get("leftValue", "")
            operator_obj = cond.get("operator", {})
            operator_name = operator_obj.get("operation", "unknown") if isinstance(operator_obj, dict) else str(operator_obj)
            right = cond.get("rightValue", "")
            
            # Clean up expressions (remove {{ }} wrapping)
            if isinstance(left, str):
                left = left.replace("{{ ", "").replace(" }}", "").replace("{{", "").replace("}}", "")
            if isinstance(right, str):
                right = right.replace("{{ ", "").replace(" }}", "").replace("{{", "").replace("}}", "")
            
            # Limit length for display
            if len(str(left)) > 30:
                left = str(left)[:27] + "..."
            if len(str(right)) > 30:
                right = str(right)[:27] + "..."
            
            cond_str = f"{left} {operator_name} {right}"
            condition_strs.append(cond_str)
        
        if not condition_strs:
            return ""
        
        # Format as readable condition string
        if len(condition_strs) == 1:
            logic = condition_strs[0]
        else:
            logic = f"({' {0} '.format(combinator).join(condition_strs)})"
        
        return f"conditions={logic}"


    def detect_http_node_config(params: Dict[str, object]) -> str:
        """
        Extract HTTP Request node configuration details.
        Supports v3 and v4 HTTP node versions.
        """
        details = []
        
        # HTTP method
        method = params.get("method", "GET")
        if method:
            details.append(f"method={method}")
        
        # URL (truncated for display)
        url = params.get("url", "")
        if url:
            url_str = str(url)
            if len(url_str) > 40:
                url_str = url_str[:37] + "..."
            details.append(f"url={url_str}")
        
        # Authentication type
        auth_type = params.get("authentication", "none")
        if auth_type and auth_type != "none":
            details.append(f"auth={auth_type}")
        
        # Request/Response handling
        send_body = params.get("sendBody", False)
        if send_body:
            body_type = params.get("bodyContentType", "json")
            details.append(f"body={body_type}")
        
        # Response handling
        response_format = params.get("responseFormat", "json")
        if response_format and response_format != "json":
            details.append(f"response={response_format}")
        
        # Special options
        if params.get("continueOnFail"):
            details.append("continueOnFail")
        if params.get("retryOnFail"):
            details.append("retryOnFail")
        
        return ", ".join(details) if details else ""


    def detect_loop_node_config(params: Dict[str, object]) -> str:
        """
        Extract Loop Over Items node configuration.
        Helps analyze workflow performance and iteration logic.
        """
        details = []
        
        # Item batching (important for performance)
        batch_size = params.get("batchSize")
        if batch_size:
            details.append(f"batch={batch_size}")
        
        # Wait time between batches
        wait_between = params.get("waitBetweenBatches")
        if wait_between:
            details.append(f"wait={wait_between}ms")
        
        # Concurrency control
        max_concurrent = params.get("maxConcurrentExecutions")
        if max_concurrent:
            details.append(f"concurrency={max_concurrent}")
        
        # Item path (custom property to iterate)
        item_path = params.get("itemPath")
        if item_path and item_path != "$index":
            # Truncate for readability
            path_str = str(item_path)
            if len(path_str) > 30:
                path_str = path_str[:27] + "..."
            details.append(f"path={path_str}")
        
        return ", ".join(details) if details else "mode=iterate"

    out: List[Dict[str, str]] = []
    for node in nodes:
        if not isinstance(node, dict):
            continue
        name = str(node.get("name") or node.get("id") or "node")
        ntype = str(node.get("type") or "")
        tver = node.get("typeVersion")
        params_raw = node.get("parameters") or {}
        params = params_raw if isinstance(params_raw, dict) else {}

        descriptor = ntype
        if isinstance(tver, (int, float, str)) and str(tver):
            descriptor = f"{ntype} v{tver}"

        comment_parts: List[str] = []

        # Special handling for HTTP Request nodes (skip generic summary)
        if "http" in ntype.lower() and "request" in ntype.lower():
            http_config = detect_http_node_config(params)
            if http_config:
                comment_parts.append(http_config)
        # Special handling for Loop/Split in Batches nodes (skip generic summary)
        elif ("loop" in ntype.lower() and "items" in ntype.lower()) or "splitinbatches" in ntype.lower():
            loop_config = detect_loop_node_config(params)
            if loop_config:
                comment_parts.append(loop_config)
        else:
            # Generic parameter summary for other nodes
            param_summary = summarize_parameters(ntype, params)
            if param_summary:
                comment_parts.append(param_summary)

        # Special handling for IF condition nodes
        if "if" in ntype.lower():
            if_logic = detect_if_node_logic(params)
            if if_logic:
                comment_parts.append(if_logic)

        if node.get("disabled") is True:
            comment_parts.append("disabled")

        notes = node.get("notes")
        if isinstance(notes, str) and notes.strip():
            s = notes.strip()
            if len(s) > 80:
                s = s[:77] + "..."
            comment_parts.append(f"notes={s}")

        creds_summary = summarize_credentials(node.get("credentials"))
        if creds_summary:
            comment_parts.append(creds_summary)

        if node.get("continueOnFail") is True:
            comment_parts.append("continueOnFail")
        if node.get("retryOnFail") is True:
            comment_parts.append("retryOnFail")

        comment = "; ".join(comment_parts)
        out.append({"name": name, "params": descriptor, "comment": comment})

    return out


# ------------------------------
# 5.5) Interactive HTML Dashboard (Phase 8.3)
# ------------------------------
def generate_dashboard_html(atlas_dir: Path) -> None:
    """
    生成互動式 HTML 儀表板用於視覺化專案分析結果。

    Phase 8.3 實作: Interactive HTML Dashboard

    功能:
    - 專案概覽統計
    - 互動式呼叫圖視覺化
    - 複雜度熱力圖
    - 依賴關係樹
    - 搜尋和過濾功能
    - 響應式設計 + 深色模式支援

    Args:
        atlas_dir: snapshot_atlas 目錄路徑
    """
    try:
        # Read data files
        index_path = atlas_dir / "index.json"
        connections_path = atlas_dir / "connections.json"
        meta_path = atlas_dir / "meta.json"

        if not index_path.exists():
            print("[warn] index.json not found, skipping dashboard generation", file=sys.stderr)
            return

        index_data = json.loads(index_path.read_text(encoding="utf-8"))
        connections_data = json.loads(connections_path.read_text(encoding="utf-8")) if connections_path.exists() else {}
        meta_info = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}

        # Extract stats
        stats = index_data.get("summary", {})
        files = index_data.get("files", [])
        function_index = index_data.get("functionIndex", {})
        dep_graph = index_data.get("dependencyGraph", {})
        call_graph_data = connections_data.get("callGraph", {})

        # Prepare function complexity data
        functions_with_complexity = []
        for func_name, func_info in function_index.items():
            complexity = func_info.get("complexity", {})
            functions_with_complexity.append({
                "name": func_name,
                "file": func_info.get("file", ""),
                "complexity": complexity.get("score", 0) if isinstance(complexity, dict) else 0,
                "risk": complexity.get("risk", "LOW") if isinstance(complexity, dict) else "LOW",
                "signature": func_info.get("signature", ""),
                "purpose": func_info.get("purpose", "")
            })

        # Prepare call graph nodes and edges
        call_graph_nodes = []
        call_graph_edges = []
        if call_graph_data:
            functions = call_graph_data.get("functions", {})
            # Limit nodes for performance (max 100 nodes)
            func_list = list(functions.items())[:100]
            for func, callees in func_list:
                call_graph_nodes.append({"id": func, "label": func.split("::")[-1]})
                for callee in callees:
                    call_graph_edges.append({"from": func, "to": callee})

        project_name = meta_info.get("project", {}).get("name", "Project")

        # Generate dashboard HTML using safe JSON encoding
        dashboard_html = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{project_name} - Snapshot Atlas Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/cytoscape@3.28.1/dist/cytoscape.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        :root {{
            --bg-primary: #ffffff; --bg-secondary: #f5f5f5; --bg-tertiary: #e0e0e0;
            --text-primary: #212121; --text-secondary: #757575; --border-color: #e0e0e0;
            --accent-color: #2196F3; --success-color: #4CAF50; --warning-color: #FF9800;
            --danger-color: #F44336; --shadow: rgba(0, 0, 0, 0.1);
        }}
        [data-theme="dark"] {{
            --bg-primary: #1a1a1a; --bg-secondary: #2d2d2d; --bg-tertiary: #404040;
            --text-primary: #e0e0e0; --text-secondary: #a0a0a0; --border-color: #404040;
            --shadow: rgba(0, 0, 0, 0.3);
        }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
               background: var(--bg-secondary); color: var(--text-primary); line-height: 1.6; }}
        .header {{ background: var(--bg-primary); border-bottom: 1px solid var(--border-color);
                   padding: 1.5rem 2rem; box-shadow: 0 2px 8px var(--shadow); position: sticky; top: 0; z-index: 100; }}
        .header-content {{ max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }}
        .header h1 {{ font-size: 1.75rem; font-weight: 600; }}
        .header-controls {{ display: flex; gap: 1rem; align-items: center; }}
        .search-box input {{ padding: 0.6rem 1rem; border: 1px solid var(--border-color); border-radius: 8px;
                             background: var(--bg-secondary); color: var(--text-primary); font-size: 0.95rem; width: 300px; }}
        .search-box input:focus {{ outline: none; border-color: var(--accent-color);
                                    box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1); }}
        .theme-toggle {{ padding: 0.6rem 1.2rem; border: 1px solid var(--border-color); border-radius: 8px;
                         background: var(--bg-secondary); cursor: pointer; }}
        .container {{ max-width: 1400px; margin: 0 auto; padding: 2rem; }}
        .stats-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }}
        .stat-card {{ background: var(--bg-primary); padding: 1.5rem; border-radius: 12px;
                     box-shadow: 0 2px 8px var(--shadow); border: 1px solid var(--border-color); }}
        .stat-card h3 {{ color: var(--text-secondary); font-size: 0.875rem; text-transform: uppercase; margin-bottom: 0.5rem; }}
        .stat-card .value {{ font-size: 2.5rem; font-weight: 700; color: var(--accent-color); }}
        .tabs {{ display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 2px solid var(--border-color); }}
        .tab {{ padding: 0.75rem 1.5rem; background: transparent; border: none; border-bottom: 3px solid transparent;
                color: var(--text-secondary); cursor: pointer; font-size: 0.95rem; transition: all 0.3s ease; }}
        .tab.active {{ color: var(--accent-color); border-bottom-color: var(--accent-color); }}
        .tab-content {{ display: none; }}
        .tab-content.active {{ display: block; }}
        .panel {{ background: var(--bg-primary); border-radius: 12px; padding: 1.5rem;
                  box-shadow: 0 2px 8px var(--shadow); border: 1px solid var(--border-color); }}
        .panel h2 {{ font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; }}
        #cy {{ width: 100%; height: 600px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-secondary); }}
        .chart-container {{ position: relative; height: 400px; margin-top: 1rem; }}
        .function-list {{ max-height: 600px; overflow-y: auto; }}
        .function-item {{ padding: 1rem; border-bottom: 1px solid var(--border-color); cursor: pointer; }}
        .function-item:hover {{ background: var(--bg-secondary); }}
        .function-item .name {{ font-weight: 600; margin-bottom: 0.25rem; }}
        .function-item .file {{ color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.5rem; }}
        .function-item .signature {{ font-family: 'Monaco', monospace; font-size: 0.875rem;
                                     background: var(--bg-secondary); padding: 0.5rem; border-radius: 4px; overflow-x: auto; }}
        .complexity-badge {{ display: inline-block; padding: 0.25rem 0.75rem; border-radius: 12px;
                            font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }}
        .complexity-low {{ background: var(--success-color); color: white; }}
        .complexity-medium {{ background: var(--warning-color); color: white; }}
        .complexity-high {{ background: var(--danger-color); color: white; }}
        .dependency-tree {{ font-family: 'Monaco', monospace; font-size: 0.875rem; line-height: 1.8; }}
        .dependency-item {{ padding: 0.25rem 0; cursor: pointer; }}
        .no-data {{ text-align: center; padding: 3rem; color: var(--text-secondary); }}
        @media (max-width: 768px) {{
            .header-content {{ flex-direction: column; gap: 1rem; }}
            .search-box input {{ width: 100%; }}
            .stats-grid {{ grid-template-columns: 1fr; }}
            #cy {{ height: 400px; }}
        }}
    </style>
</head>
<body>
    <header class="header">
        <div class="header-content">
            <h1>{project_name} Dashboard</h1>
            <div class="header-controls">
                <div class="search-box">
                    <input type="text" id="searchInput" placeholder="搜尋函式、文件..." />
                </div>
                <button class="theme-toggle" id="themeToggle">🌓 主題</button>
            </div>
        </div>
    </header>
    <div class="container">
        <div class="stats-grid">
            <div class="stat-card"><h3>文件數</h3><div class="value">{stats.get('fileCount', 0)}</div></div>
            <div class="stat-card"><h3>函式數</h3><div class="value">{stats.get('functionCount', 0)}</div></div>
            <div class="stat-card"><h3>進入點</h3><div class="value">{stats.get('entryPointCount', 0)}</div></div>
            <div class="stat-card"><h3>語言</h3><div class="value">{len(stats.get('languages', {}))}</div></div>
        </div>
        <div class="tabs">
            <button class="tab active" data-tab="overview">概覽</button>
            <button class="tab" data-tab="callgraph">呼叫圖</button>
            <button class="tab" data-tab="complexity">複雜度</button>
            <button class="tab" data-tab="dependencies">依賴</button>
            <button class="tab" data-tab="functions">函式列表</button>
        </div>
        <div id="overview" class="tab-content active">
            <div class="panel"><h2>專案概覽</h2><div class="chart-container"><canvas id="languageChart"></canvas></div></div>
        </div>
        <div id="callgraph" class="tab-content">
            <div class="panel"><h2>函式呼叫圖</h2><div id="cy"></div></div>
        </div>
        <div id="complexity" class="tab-content">
            <div class="panel"><h2>複雜度熱力圖</h2><div class="chart-container"><canvas id="complexityChart"></canvas></div></div>
        </div>
        <div id="dependencies" class="tab-content">
            <div class="panel"><h2>依賴關係樹</h2><div class="dependency-tree" id="dependencyTree"></div></div>
        </div>
        <div id="functions" class="tab-content">
            <div class="panel"><h2>函式列表</h2><div class="function-list" id="functionList"></div></div>
        </div>
    </div>
    <script>
        const projectData = {json.dumps({
            'stats': stats,
            'files': files,
            'functions': functions_with_complexity,
            'callGraph': {'nodes': call_graph_nodes, 'edges': call_graph_edges},
            'dependencies': dep_graph
        })};

        const themeToggle = document.getElementById('themeToggle');
        const currentTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        themeToggle.addEventListener('click', () => {{
            const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        }});

        document.querySelectorAll('.tab').forEach(tab => {{
            tab.addEventListener('click', () => {{
                const targetTab = tab.dataset.tab;
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(targetTab).classList.add('active');
                if (targetTab === 'callgraph' && !window.cyInitialized) initCallGraph();
                if (targetTab === 'complexity' && !window.complexityChartInitialized) initComplexityChart();
            }});
        }});

        document.getElementById('searchInput').addEventListener('input', (e) => {{
            const query = e.target.value.toLowerCase();
            document.querySelectorAll('.function-item').forEach(item => {{
                item.style.display = item.textContent.toLowerCase().includes(query) ? 'block' : 'none';
            }});
        }});

        function initLanguageChart() {{
            const ctx = document.getElementById('languageChart').getContext('2d');
            new Chart(ctx, {{
                type: 'doughnut',
                data: {{
                    labels: Object.keys(projectData.stats.languages || {{}}),
                    datasets: [{{
                        data: Object.values(projectData.stats.languages || {{}}),
                        backgroundColor: ['#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0', '#00BCD4']
                    }}]
                }},
                options: {{ responsive: true, maintainAspectRatio: false, plugins: {{ legend: {{ position: 'bottom' }}, title: {{ display: true, text: '語言分佈' }} }} }}
            }});
        }}

        function initCallGraph() {{
            if (projectData.callGraph.nodes.length === 0) {{
                const noData = document.createElement('div');
                noData.className = 'no-data';
                noData.textContent = '暫無呼叫圖數據';
                document.getElementById('cy').appendChild(noData);
                window.cyInitialized = true;
                return;
            }}
            cytoscape({{
                container: document.getElementById('cy'),
                elements: [
                    ...projectData.callGraph.nodes.map(n => ({{ data: n }})),
                    ...projectData.callGraph.edges.map(e => ({{ data: {{ source: e.from, target: e.to }} }}))
                ],
                style: [
                    {{ selector: 'node', style: {{ 'background-color': '#2196F3', 'label': 'data(label)',
                       'color': '#fff', 'text-valign': 'center', 'font-size': '10px' }} }},
                    {{ selector: 'edge', style: {{ 'width': 2, 'line-color': '#ccc',
                       'target-arrow-color': '#ccc', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier' }} }}
                ],
                layout: {{ name: 'cose', animate: true, animationDuration: 1000 }}
            }});
            window.cyInitialized = true;
        }}

        function initComplexityChart() {{
            const ctx = document.getElementById('complexityChart').getContext('2d');
            const functions = projectData.functions.sort((a, b) => b.complexity - a.complexity).slice(0, 20);
            if (functions.length === 0) {{
                const noData = document.createElement('div');
                noData.className = 'no-data';
                noData.textContent = '暫無複雜度數據';
                document.querySelector('#complexity .panel').appendChild(noData);
                window.complexityChartInitialized = true;
                return;
            }}
            new Chart(ctx, {{
                type: 'bar',
                data: {{
                    labels: functions.map(f => f.name.split('::').pop()),
                    datasets: [{{
                        label: '複雜度分數',
                        data: functions.map(f => f.complexity),
                        backgroundColor: functions.map(f => f.risk === 'HIGH' ? '#F44336' : f.risk === 'MEDIUM' ? '#FF9800' : '#4CAF50')
                    }}]
                }},
                options: {{ responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                    plugins: {{ legend: {{ display: false }}, title: {{ display: true, text: '前 20 個最複雜的函式' }} }},
                    scales: {{ x: {{ beginAtZero: true }} }} }}
            }});
            window.complexityChartInitialized = true;
        }}

        function initDependencyTree() {{
            const tree = document.getElementById('dependencyTree');
            const deps = projectData.dependencies.dependencies || {{}};
            if (Object.keys(deps).length === 0) {{
                const noData = document.createElement('div');
                noData.className = 'no-data';
                noData.textContent = '暫無依賴數據';
                tree.appendChild(noData);
                return;
            }}
            for (const [file, dependencies] of Object.entries(deps)) {{
                const fileDiv = document.createElement('div');
                fileDiv.className = 'dependency-item';
                const strong = document.createElement('strong');
                strong.textContent = file;
                fileDiv.appendChild(strong);
                tree.appendChild(fileDiv);
                dependencies.forEach(dep => {{
                    const depDiv = document.createElement('div');
                    depDiv.className = 'dependency-item';
                    depDiv.style.paddingLeft = '2rem';
                    depDiv.textContent = '→ ' + dep;
                    tree.appendChild(depDiv);
                }});
            }}
        }}

        function initFunctionList() {{
            const list = document.getElementById('functionList');
            const functions = projectData.functions;
            if (functions.length === 0) {{
                const noData = document.createElement('div');
                noData.className = 'no-data';
                noData.textContent = '暫無函式數據';
                list.appendChild(noData);
                return;
            }}
            functions.forEach(func => {{
                const item = document.createElement('div');
                item.className = 'function-item';
                const nameDiv = document.createElement('div');
                nameDiv.className = 'name';
                nameDiv.textContent = func.name + ' ';
                const badge = document.createElement('span');
                badge.className = 'complexity-badge complexity-' + func.risk.toLowerCase();
                badge.textContent = func.risk;
                nameDiv.appendChild(badge);
                item.appendChild(nameDiv);
                const fileDiv = document.createElement('div');
                fileDiv.className = 'file';
                fileDiv.textContent = func.file;
                item.appendChild(fileDiv);
                const sigDiv = document.createElement('div');
                sigDiv.className = 'signature';
                sigDiv.textContent = func.signature || 'No signature';
                item.appendChild(sigDiv);
                if (func.purpose) {{
                    const purposeDiv = document.createElement('div');
                    purposeDiv.style.marginTop = '0.5rem';
                    purposeDiv.style.color = 'var(--text-secondary)';
                    purposeDiv.textContent = func.purpose;
                    item.appendChild(purposeDiv);
                }}
                list.appendChild(item);
            }});
        }}

        document.addEventListener('DOMContentLoaded', () => {{
            initLanguageChart();
            initDependencyTree();
            initFunctionList();
        }});
    </script>
</body>
</html>
"""

        dashboard_path = atlas_dir / "dashboard.html"
        dashboard_path.write_text(dashboard_html, encoding="utf-8")
        print(f"[info] Generated interactive dashboard: {dashboard_path}", file=sys.stderr)

    except Exception as e:
        print(f"[warn] Failed to generate dashboard: {e}", file=sys.stderr)


# ------------------------------
# 6) Main
# ------------------------------


# ============================================================================
# Phase 8 Snapshot Integration - Core Functions
# ============================================================================
# These functions automatically integrate Phase 8 analysis results
# (complexity, call graph) into snapshot.md

def calculate_risk_percentages(functions_data: dict) -> dict:
    """計算複雜度風險百分比。
    
    Args:
        functions_data: 從 connections.json 的 complexity.functions
        
    Returns:
        {
            'low': count,
            'medium': count,
            'high': count,
            'low_pct': percentage,
            'medium_pct': percentage,
            'high_pct': percentage,
            'total': count
        }
    """
    low = sum(1 for f in functions_data.values() if f.get('risk') == 'LOW')
    medium = sum(1 for f in functions_data.values() if f.get('risk') == 'MEDIUM')
    high = sum(1 for f in functions_data.values() if f.get('risk') == 'HIGH')
    
    total = low + medium + high
    if total == 0:
        return {'low': 0, 'medium': 0, 'high': 0, 'low_pct': 0, 'medium_pct': 0, 'high_pct': 0, 'total': 0}
    
    return {
        'low': low,
        'medium': medium,
        'high': high,
        'low_pct': round(low * 100 / total, 1),
        'medium_pct': round(medium * 100 / total, 1),
        'high_pct': round(high * 100 / total, 1),
        'total': total
    }


def get_risk_emoji(risk: str) -> str:
    """根據風險等級返回 emoji。
    
    Args:
        risk: 'LOW', 'MEDIUM', or 'HIGH'
        
    Returns:
        對應的 emoji: 🟢, 🟡, or 🔴
    """
    return {'LOW': '🟢', 'MEDIUM': '🟡', 'HIGH': '🔴'}.get(risk, '⚪')


def find_phase8_section(content: str) -> tuple:
    """找出 snapshot.md 中現存的 Phase 8 摘要章節。
    
    Args:
        content: snapshot.md 的完整內容
        
    Returns:
        (start_pos, end_pos) 或 (None, None) 如果不存在
        start_pos: "## Phase 8 分析摘要" 的起始位置
        end_pos: 下一個 "## " 或檔案末尾的位置
    """
    start = content.find("## Phase 8 分析摘要")
    if start == -1:
        return None, None
    
    # 找下一個同級標頭 (## ) 或檔案末尾
    end = content.find("\n## ", start + 1)
    if end == -1:
        end = len(content)
    else:
        end += 1  # 包含換行符
    
    return start, end


def extract_analysis_from_connections(connections_path: Path) -> dict:
    """從 connections.json 提取分析數據。
    
    Args:
        connections_path: connections.json 的路徑
        
    Returns:
        {
            'callGraph': {
                'totalFunctions': int,
                'circularDependencies': int,
                'deadFunctions': int
            },
            'complexity': {
                'distribution': {...},
                'topFunctions': [(name, cc, risk), ...]
            },
            'timestamp': '2025-12-15T...'
        }
    """
    import json
    from datetime import datetime
    
    try:
        with open(connections_path) as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"[warn] 無法讀取 connections.json: {e}", file=sys.stderr)
        return None
    
    # 提取呼叫圖統計
    call_graph = data.get('callGraph', {})
    call_graph_stats = call_graph.get('stats', {})
    
    circular_deps = len(call_graph.get('circularCalls', []))
    dead_funcs = len(call_graph.get('deadFunctions', []))
    total_funcs = call_graph_stats.get('totalFunctions', 0)
    
    # 提取複雜度數據
    complexity_data = data.get('complexity', {})
    functions_data = complexity_data.get('functions', {})
    
    # 計算風險分佈
    risk_dist = calculate_risk_percentages(functions_data)
    
    # 找出 Top 5 最高複雜度函式
    top_5 = sorted(
        functions_data.items(),
        key=lambda x: x[1].get('complexity', 0),
        reverse=True
    )[:5]
    
    top_functions = [
        (name, info.get('complexity', 0), info.get('risk', 'UNKNOWN'))
        for name, info in top_5
    ]
    
    return {
        'callGraph': {
            'totalFunctions': total_funcs,
            'circularDependencies': circular_deps,
            'deadFunctions': dead_funcs
        },
        'complexity': {
            'distribution': risk_dist,
            'topFunctions': top_functions
        },
        'timestamp': datetime.now().isoformat()
    }


def format_analysis_summary(analysis: dict) -> str:
    """將分析結果格式化為 Markdown。
    
    Args:
        analysis: extract_analysis_from_connections() 的返回值
        
    Returns:
        Markdown 格式的分析摘要
    """
    if not analysis:
        return ""
    
    call_graph = analysis['callGraph']
    complexity = analysis['complexity']
    dist = complexity['distribution']
    
    # 組建 Markdown
    lines = [
        "## Phase 8 分析摘要",
        "",
        "### 呼叫圖分析",
        f"- 函式節點: {call_graph['totalFunctions']} 個",
        f"- 圓形呼叫: {call_graph['circularDependencies']} 個 ({'✅ 健康' if call_graph['circularDependencies'] == 0 else '⚠️ 需要檢查'})",
        f"- 死代碼函式: {call_graph['deadFunctions']} 個 ({'✅ 健康' if call_graph['deadFunctions'] == 0 else '⚠️ 需要清理'})",
        "",
        "### 複雜度分析",
        f"- 🟢 LOW (≤5): {dist['low']} 個 ({dist['low_pct']}%)",
        f"- 🟡 MEDIUM (6-10): {dist['medium']} 個 ({dist['medium_pct']}%)",
        f"- 🔴 HIGH (>10): {dist['high']} 個 ({dist['high_pct']}%)",
        "",
        "### 最高風險函式 (Top 5)",
    ]
    
    for idx, (name, cc, risk) in enumerate(complexity['topFunctions'], 1):
        emoji = get_risk_emoji(risk)
        # 簡化函式名稱（去掉路徑前綴）
        short_name = name.split("::")[-1] if "::" in name else name
        lines.append(f"{idx}. {short_name} | CC: {cc} | {emoji} {risk}")
    
    # 添加儀表板引用
    lines.extend([
        "",
        "### 儀表板",
        "- 互動式分析工具: `snapshot_atlas/dashboard.html` (68.7 KB)",
        "- 分析數據: `snapshot_atlas/connections.json` (56 KB)",
        "",
        f"<!-- Phase 8 v1.0 | Generated: {analysis['timestamp']} -->",
    ])
    
    return "\n".join(lines)


def update_snapshot_with_analysis(snapshot_path: Path, analysis_markdown: str) -> None:
    """智能更新 snapshot.md，實現冪等性。
    
    Args:
        snapshot_path: snapshot.md 的路徑
        analysis_markdown: 格式化後的分析摘要
    """
    try:
        if snapshot_path.exists():
            with open(snapshot_path) as f:
                content = f.read()
        else:
            content = ""
        
        # 檢查是否存在現有摘要
        start, end = find_phase8_section(content)
        
        if start is not None and end is not None:
            # 替換現有摘要
            new_content = content[:start] + analysis_markdown + "\n" + content[end:]
        else:
            # 追加新摘要
            if content and not content.endswith("\n"):
                content += "\n"
            new_content = content + "\n" + analysis_markdown + "\n"
        
        # 寫回檔案
        with open(snapshot_path, 'w') as f:
            f.write(new_content)

        print(f"[info] 已更新 {snapshot_path} 的 Phase 8 分析摘要", file=sys.stderr)

    except Exception as e:
        print(f"[error] 更新 snapshot.md 失敗: {e}", file=sys.stderr)
        raise


def append_phase8_summary_to_snapshot(atlas_dir: Path, snapshot_path: Path) -> None:
    """整合所有函式，自動追加/更新 Phase 8 分析摘要到 snapshot.md。
    
    這是主要的公開入口函式。
    
    Args:
        atlas_dir: snapshot_atlas 目錄
        snapshot_path: snapshot.md 的路徑
    """
    try:
        # 找 connections.json
        connections_file = atlas_dir / "connections.json"
        if not connections_file.exists():
            print("[debug] connections.json 不存在，跳過 Phase 8 分析整合", file=sys.stderr)
            return

        # 提取分析數據
        analysis = extract_analysis_from_connections(connections_file)
        if not analysis:
            print("[warn] 無法提取分析數據", file=sys.stderr)
            return

        # 格式化為 Markdown
        markdown = format_analysis_summary(analysis)
        if not markdown:
            print("[warn] 無法格式化分析摘要", file=sys.stderr)
            return

        # 更新 snapshot.md
        update_snapshot_with_analysis(snapshot_path, markdown)

    except Exception as e:
        print(f"[error] Phase 8 分析整合失敗: {e}", file=sys.stderr)
        # 不中斷主流程，優雅降級

def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Project Snapshot Generator (JS/TS/Vue/React/Node/Python)")
    parser.add_argument("--root", default=".", help="Project root directory (default: .)")
    parser.add_argument("--output", default="snapshot.md", help="Output Markdown file name (default: snapshot.md)")
    parser.add_argument("--max-depth", type=int, default=DEFAULT_MAX_DEPTH,
                        help="Max directory depth for tree (0 = unlimited)")
    parser.add_argument("--ext", default=",".join(DEFAULT_EXTENSIONS),
                        help="Comma-separated extensions to scan (default: .js,.ts,.jsx,.tsx,.vue,.py)")
    parser.add_argument("--exclude", default=",".join(DEFAULT_EXCLUDES),
                        help="Comma-separated names to exclude (directory/file base names)")
    parser.add_argument("--include-glob", default="", help="Comma-separated glob patterns to include (default: all)")
    parser.add_argument("--exclude-glob", default="", help="Comma-separated glob patterns to exclude")
    parser.add_argument("--max-file-size", type=int, default=DEFAULT_MAX_FILE_SIZE,
                        help="Skip files larger than this size in bytes (0 = unlimited)")
    parser.add_argument("--max-lines", type=int, default=DEFAULT_MAX_LINES,
                        help="Only parse first N lines of each file (0 = unlimited)")
    parser.add_argument("--jobs", type=int, default=0,
                        help="Parallel parsing workers (0 = auto)")
    parser.add_argument("--cache", action="store_true", help="Enable incremental cache")
    parser.add_argument("--cache-file", default=DEFAULT_CACHE_FILE, help="Cache file path (default: .snapshot-cache.json)")
    parser.add_argument("--format", default="md", choices=["md", "json"], help="Output format (md or json)")
    parser.add_argument("--sections", default="", help="Comma-separated sections: tree,functions,deps,summary")
    parser.add_argument("--detail-level", default=DEFAULT_DETAIL_LEVEL, choices=["low", "medium", "high"],
                        help="LLM-friendly detail level")
    parser.add_argument("--topk-key-functions", type=int, default=0,
                        help="Override Top-K referenced functions for key selection (0=auto)")
    parser.add_argument("--atlas", action="store_true",
                        help="Output as atlas directory structure (snapshot_atlas/)")
    parser.add_argument("--atlas-output", default="snapshot_atlas",
                        help="Atlas output directory name (default: snapshot_atlas)")
    parser.add_argument("--legacy", action="store_true",
                        help="Force legacy single-file output (for backward compatibility)")
    # Security options
    parser.add_argument("--no-secrets-filter", action="store_true",
                        help="Disable automatic secrets file filtering (not recommended)")
    parser.add_argument("--redact-secrets", action="store_true",
                        help="Scan and redact potential secrets in file contents")
    parser.add_argument("--secrets-allowlist", default="",
                        help="Comma-separated files to allow even if they match secrets patterns")
    args = parser.parse_args(argv)

    root = Path(args.root).resolve()
    if not root.exists():
        print(f"[error] Root does not exist: {root}", file=sys.stderr)
        return 2

    # Normalize config
    extensions = [e.strip().lower() for e in args.ext.split(",") if e.strip()]
    excludes = [e.strip() for e in args.exclude.split(",") if e.strip()]
    max_depth = None if args.max_depth in (None, 0) else args.max_depth

    # 1) Single-pass scan: tree + files + manifests
    gitignore_patterns = load_gitignore_patterns(root)
    include_globs = [g.strip() for g in args.include_glob.split(",") if g.strip()]
    exclude_globs = [g.strip() for g in args.exclude_glob.split(",") if g.strip()]
    secrets_allowlist = [s.strip() for s in args.secrets_allowlist.split(",") if s.strip()]
    filter_secrets = not args.no_secrets_filter
    tree_text, files, manifest_files, n8n_files = scan_repo_once(
        root,
        excludes,
        extensions,
        max_depth=max_depth,
        gitignore_patterns=gitignore_patterns,
        include_globs=include_globs,
        exclude_globs=exclude_globs,
        filter_secrets=filter_secrets,
        secrets_allowlist=secrets_allowlist,
    )

    # 2) Parse functions (parallel, with guards)
    max_file_size = args.max_file_size or 0
    max_lines = args.max_lines or 0
    workers = args.jobs if args.jobs and args.jobs > 0 else (os.cpu_count() or 4)

    cache_enabled = bool(args.cache)
    cache_path = root / args.cache_file
    cache_data: Dict[str, Dict[str, object]] = {}
    if cache_enabled and cache_path.exists():
        try:
            loaded_cache = json.loads(cache_path.read_text(encoding="utf-8")) or {}
            # 驗證和升級快取架構
            if validate_cache_schema(loaded_cache):
                cache_data = loaded_cache
            else:
                # 舊版快取，自動升級
                cache_data = upgrade_cache_schema(loaded_cache)
        except Exception:
            cache_data = {}

    file_texts: Dict[str, str] = {}
    file_meta: Dict[str, Dict[str, object]] = {}

    def parse_one(fp: Path) -> Tuple[str, str, List[Dict[str, str]], Dict[str, object]]:
        """Parse a single file and return (rel_path, file_content, funcs, meta).
        
        This function is called from worker threads and MUST NOT write to shared dicts.
        All writes happen in main thread after collection.
        """
        rel = str(fp.relative_to(root)).replace("\\", "/")
        try:
            st = fp.stat()
            file_content = ""
            
            if cache_enabled:
                cached = cache_data.get(rel)
                # 先讀取檔案內容以計算 contentHash
                try:
                    file_content = fp.read_text(encoding="utf-8", errors="ignore")
                    current_hash = get_content_hash(file_content)
                except Exception:
                    current_hash = None
                
                # 使用 contentHash 驗證快取（改進自 mtime+size）
                if cached and current_hash and cached.get("contentHash") == current_hash:
                    funcs_cached = cached.get("funcs")
                    meta_cached = cached.get("meta") if isinstance(cached.get("meta"), dict) else {}
                    if isinstance(funcs_cached, list):
                        return rel, file_content, funcs_cached, meta_cached  # type: ignore
                
                # 降級支援：如果沒有 contentHash，使用舊的 mtime+size 驗證
                if not current_hash and cached and cached.get("mtime") == st.st_mtime and cached.get("size") == st.st_size:
                    funcs_cached = cached.get("funcs")
                    meta_cached = cached.get("meta") if isinstance(cached.get("meta"), dict) else {}
                    if isinstance(funcs_cached, list):
                        try:
                            file_content = fp.read_text(encoding="utf-8", errors="ignore")
                        except Exception:
                            pass
                        return rel, file_content, funcs_cached, meta_cached  # type: ignore

            if max_file_size:
                if st.st_size > max_file_size:
                    print(f"[warn] Skip oversized file {rel} ({st.st_size} bytes)", file=sys.stderr)
                    return rel, "", [], {}
            
            if max_lines:
                text = fp.read_text(encoding="utf-8", errors="ignore")
                text_lines = text.splitlines()
                limited = "\n".join(text_lines[:max_lines])
                text_used = limited
                was_truncated = len(text_lines) > max_lines
                funcs = parse_functions_for_text(fp, limited)
            else:
                text = fp.read_text(encoding="utf-8", errors="ignore")
                text_used = text
                was_truncated = False
                funcs = parse_functions_for_text(fp, text_used)

            file_content = text_used
            lang = "py" if fp.suffix.lower() == ".py" else "js"
            if fp.suffix.lower() in (".ts", ".tsx"):
                lang = "ts"
            if fp.suffix.lower() in (".gs",):
                lang = "gs"
            if fp.suffix.lower() in (".swift",):
                lang = "swift"

            # Extract language-specific metadata (purpose, imports, docs)
            if lang == "py":
                mods = extract_python_imports(text_used)
                purpose = extract_python_module_purpose(text_used)
                fn_docs = extract_python_function_docs(text_used)
            elif lang == "swift":
                mods = []  # Swift imports not yet parsed
                purpose = extract_swift_module_purpose(text_used)
                fn_docs = {}
            else:
                mods = extract_js_imports(text_used)
                purpose = extract_js_module_purpose(text_used)
                fn_docs = {}
            internal_imports, external_imports = classify_imports(mods, root, lang)
            meta = {
                "lang": lang,
                "importsInternal": internal_imports,
                "importsExternal": external_imports,
                "purpose": purpose,
                "functionDocs": fn_docs,
                "wasTruncated": was_truncated,
            }

            # Note: cache_data write deferred to main thread to avoid race conditions
            return rel, file_content, funcs, meta
        except Exception:
            return rel, "", [], {}

    func_map: Dict[str, List[Dict[str, str]]] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
        for rel, file_content, funcs, meta in ex.map(parse_one, files):
            # Store file content in main thread (not in worker thread)
            if file_content:
                file_texts[rel] = file_content
            if funcs:
                func_map[rel] = funcs
            if meta:
                file_meta[rel] = meta

            # Update cache in main thread (thread-safe dict writes)
            if cache_enabled and file_content:
                try:
                    fp = root / rel.replace("/", os.sep)
                    st = fp.stat()
                    content_hash = get_content_hash(file_content)
                    cache_data[rel] = {
                        "mtime": st.st_mtime,
                        "size": st.st_size,
                        "contentHash": content_hash,
                        "parsedAt": datetime.now(timezone.utc).isoformat(),
                        "funcs": funcs,
                        "meta": meta
                    }
                except Exception:
                    pass  # Cache update failure is non-critical

    # 2b) Parse n8n workflow files (json)
    for fp in n8n_files:
        funcs = parse_n8n_workflow(fp)
        if funcs:
            rel = str(fp.relative_to(root)).replace("\\", "/")
            func_map[rel] = funcs
            file_meta.setdefault(rel, {"lang": "n8n", "importsInternal": [], "importsExternal": [], "purpose": "", "functionDocs": {}})

    # 3) Dependencies
    deps_node = collect_package_jsons_from_files(manifest_files)
    deps_locks = collect_node_lockfiles_from_files(manifest_files)
    deps_py = collect_python_requirements_from_files(manifest_files)
    deps_merged = {**deps_node, **deps_locks, **deps_py}

    # 3a) Workspaces extraction
    npm_workspaces, npm_ws_graph = extract_npm_workspaces(root, manifest_files)
    py_workspaces, py_ws_graph = extract_python_workspaces(root, manifest_files)

    # Merge all workspace information
    all_workspaces = {**npm_workspaces, **py_workspaces}
    all_ws_graph = {**npm_ws_graph, **py_ws_graph}

    # Log workspace detection summary
    if all_workspaces:
        print(f"[info] Detected {len(all_workspaces)} workspaces", file=sys.stderr)
        if npm_workspaces:
            print(f"  - npm/yarn: {len(npm_workspaces)}", file=sys.stderr)
        if py_workspaces:
            print(f"  - python: {len(py_workspaces)}", file=sys.stderr)
        # Check for circular dependencies
        circular_deps = detect_circular_dependencies(all_ws_graph)
        if circular_deps:
            print(f"  [warn] Detected {len(circular_deps)} circular dependencies in workspaces", file=sys.stderr)
            for cycle in circular_deps:
                print(f"    - {' -> '.join(cycle)}", file=sys.stderr)

    # 計算每個 Python 文件的實際依賴
    for rel_path, meta in file_meta.items():
        if meta.get("lang") == "py":
            external_imports = meta.get("importsExternal", []) or []
            actual_deps = get_file_external_dependencies(rel_path, external_imports, deps_merged)
            meta["actualDependencies"] = actual_deps


    # 3b) Key function selection (rule C): public/exported + Top-K referenced
    candidate_names: List[str] = []
    for rel, funcs in func_map.items():
        for f in funcs:
            name = str(f.get("name") or "")
            base = name.split(".")[-1]
            if base and not base.startswith("_"):
                candidate_names.append(base)

    unique_candidates = []
    seen = set()
    for n in candidate_names:
        if n not in seen:
            seen.add(n)
            unique_candidates.append(n)

    ref_counts: Dict[str, int] = {n: 0 for n in unique_candidates}
    if unique_candidates:
        if len(unique_candidates) <= 200:
            pattern = re.compile(r"\b(" + "|".join(re.escape(n) for n in unique_candidates) + r")\b")
            for text in file_texts.values():
                for m in pattern.finditer(text):
                    ref_counts[m.group(1)] += 1
        else:
            for n in unique_candidates:
                pat = re.compile(r"\b" + re.escape(n) + r"\b")
                for text in file_texts.values():
                    ref_counts[n] += len(pat.findall(text))

    auto_k = max(5, min(20, max(1, len(unique_candidates) // 10)))
    top_k = args.topk_key_functions if args.topk_key_functions and args.topk_key_functions > 0 else auto_k
    top_by_refs = set([n for n, _ in sorted(ref_counts.items(), key=lambda kv: kv[1], reverse=True)[:top_k]])

    key_functions_by_file: Dict[str, List[Dict[str, str]]] = {}
    for rel, funcs in func_map.items():
        meta = file_meta.get(rel, {})
        lang = str(meta.get("lang") or "")
        fn_docs = meta.get("functionDocs") if isinstance(meta.get("functionDocs"), dict) else {}
        selected: List[Dict[str, str]] = []
        for f in funcs:
            name = str(f.get("name") or "")
            base = name.split(".")[-1]
            publicish = base and not base.startswith("_")
            scope = str(f.get("scope") or "")
            exportedish = lang == "n8n" or (publicish and (lang != "py" or scope in ("module", "class")))
            if exportedish or base in top_by_refs:
                purpose = ""
                if isinstance(fn_docs, dict):
                    purpose = str(fn_docs.get(base) or "")
                params_summary = summarize_params(str(f.get("params") or ""))
                selected.append({
                    **f,
                    "purpose": purpose,
                    "paramsSummary": params_summary,
                })
        key_functions_by_file[rel] = selected

    # 4) Render & write
    summary: Dict[str, object] = {
        "fileCount": len(files),
        "functionCount": sum(len(v) for v in func_map.values()),
        "dependencyCount": sum(
            len((info.get("dependencies") or {})) + len((info.get("devDependencies") or {}))
            for info in deps_merged.values()
        ),
        "extensions": {},
    }
    ext_counts: Dict[str, int] = {}
    for fp in files:
        ext_counts[fp.suffix.lower()] = ext_counts.get(fp.suffix.lower(), 0) + 1
    summary["extensions"] = ext_counts

    sections = [s.strip().lower() for s in args.sections.split(",") if s.strip()] or None

    # Build files_info for both atlas and legacy modes
    # Include ALL scanned files, not just those with functions
    # This ensures entry point scripts without functions are still included in atlas
    files_info_full = {}

    # First, add all files with functions
    for rel in func_map.keys():
        meta = file_meta.get(rel, {})
        info_dict = {
            "purpose": meta.get("purpose", ""),
            "importsInternal": meta.get("importsInternal", []),
            "importsExternal": meta.get("importsExternal", []),
            "keyFunctions": key_functions_by_file.get(rel, []),
            "allFunctions": func_map.get(rel, []),
            "lang": meta.get("lang", ""),
        }
        if meta.get("actualDependencies"):
            info_dict["actualDependencies"] = meta.get("actualDependencies", [])
        files_info_full[rel] = info_dict

    # Then, add files with zero functions (entry point scripts, configs, etc.)
    # These have file_meta but no functions in func_map
    for rel, meta in file_meta.items():
        if rel not in files_info_full:  # Skip if already added above
            info_dict = {
                "purpose": meta.get("purpose", ""),
                "importsInternal": meta.get("importsInternal", []),
                "importsExternal": meta.get("importsExternal", []),
                "keyFunctions": [],  # No functions found
                "allFunctions": [],   # No functions found
                "lang": meta.get("lang", ""),
            }
            if meta.get("actualDependencies"):
                info_dict["actualDependencies"] = meta.get("actualDependencies", [])
            files_info_full[rel] = info_dict

    # Detect entry points for all files
    all_entry_points: List[EntryPoint] = []
    for rel, content in file_texts.items():
        fp = root / rel
        entries = detect_entry_points(content, rel, fp)
        all_entry_points.extend(entries)

    # Also detect from n8n files
    for fp in n8n_files:
        rel = str(fp.relative_to(root)).replace("\\", "/")
        try:
            content = fp.read_text(encoding="utf-8", errors="ignore")
            entries = detect_n8n_entry_points(content, rel)
            all_entry_points.extend(entries)
        except Exception:
            pass

    # Determine output mode: atlas vs legacy
    use_atlas = args.atlas and not args.legacy

    if use_atlas:
        # Atlas mode: output to directory structure
        atlas_dir = root / args.atlas_output

        # Build language counts
        lang_counts: Dict[str, int] = {}
        for info in files_info_full.values():
            lang = info.get("lang", "unknown")
            lang_counts[lang] = lang_counts.get(lang, 0) + 1

        # Generate meta.json data
        meta_info = render_meta_json(
            root=root,
            file_count=len(files),
            function_count=sum(len(v) for v in func_map.values()),
            entry_point_count=len(all_entry_points),
            languages=lang_counts,
            extensions=extensions,
            excludes=excludes,
            cache_enabled=cache_enabled,
        )

        try:
            files_written, files_skipped, secrets_redacted = write_atlas_output(
                output_dir=atlas_dir,
                tree_text=tree_text,
                files_info=files_info_full,
                file_contents=file_texts,
                entry_points=all_entry_points,
                summary=summary,
                meta_info=meta_info,
                cache_data=cache_data,
                cache_enabled=cache_enabled,
                root=root,
                redact_secrets_enabled=args.redact_secrets,
                func_map=func_map,
                deps_merged=deps_merged,
                workspaces=all_workspaces if all_workspaces else None,
                ws_graph=all_ws_graph if all_ws_graph else None,
            )

            if cache_enabled:
                try:
                    # 添加快取架構版本號
                    cache_to_write = dict(cache_data)
                    cache_to_write["_schema_version"] = CACHE_SCHEMA_VERSION
                    cache_to_write["_created_at"] = datetime.now(timezone.utc).isoformat()
                    cache_path.write_text(json.dumps(cache_to_write, ensure_ascii=False, indent=2), encoding="utf-8")
                except Exception as e:
                    print(f"[warn] Failed to write cache {cache_path}: {e}", file=sys.stderr)

            print(f"已生成 Atlas 輸出: {atlas_dir}/")
            print(f"  - index.json, entries.json, meta.json, tree.txt, connections.json")
            print(f"  - files/ ({files_written} 檔案寫入, {files_skipped} 略過)")
            if secrets_redacted > 0:
                print(f"  - 安全性: {secrets_redacted} 個潛在 secrets 已遮蔽")

            # Phase 8.3: Generate interactive HTML dashboard
            generate_dashboard_html(atlas_dir)

            # Phase 8: Integrate analysis summary into snapshot.md
            snapshot_md_path = atlas_dir / "snapshot.md"
            append_phase8_summary_to_snapshot(atlas_dir, snapshot_md_path)

            return 0
        except Exception as e:
            print(f"[error] Failed to write atlas output: {e}", file=sys.stderr)
            return 3

    else:
        # Legacy mode: single file output
        if args.format == "json":
            output_text = render_json(tree_text, func_map, deps_merged, summary, files_info=files_info_full, entry_points=all_entry_points)
        else:
            output_text = render_markdown(
                tree_text,
                func_map,
                deps_merged,
                summary=summary,
                sections=sections,
                file_meta=file_meta,
                key_functions_by_file=key_functions_by_file,
                detail_level=args.detail_level,
            )

        out_path = root / args.output
        try:
            out_path.write_text(output_text, encoding="utf-8")
        except Exception as e:
            print(f"[error] Failed to write {out_path}: {e}", file=sys.stderr)
            return 3

        if cache_enabled:
            try:
                # 添加快取架構版本號
                cache_to_write = dict(cache_data)
                cache_to_write["_schema_version"] = CACHE_SCHEMA_VERSION
                cache_to_write["_created_at"] = datetime.now(timezone.utc).isoformat()
                cache_path.write_text(json.dumps(cache_to_write, ensure_ascii=False, indent=2), encoding="utf-8")
            except Exception as e:
                print(f"[warn] Failed to write cache {cache_path}: {e}", file=sys.stderr)

        print(f"已生成 {out_path}")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
