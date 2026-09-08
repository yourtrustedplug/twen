#!/usr/bin/env bash
# Mint a TikTok *user* access token for Display API video.list (view_count).
# Desktop Login Kit requires PKCE (hex SHA256 code_challenge).
#
# Usage:
#   1) TikTok Developer Portal → Login Kit
#        Redirect URI must be exactly: http://localhost:8787/callback
#   2) ./scripts/tiktok-oauth-token.sh
#   3) Approve in browser; script prints tokens
#   4) Add to .env → ./scripts/push-secrets.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

KEY="${TIKTOK_CLIENT_KEY:?Set TIKTOK_CLIENT_KEY in .env}"
SECRET="${TIKTOK_CLIENT_SECRET:?Set TIKTOK_CLIENT_SECRET in .env}"
PORT="${PORT:-8787}"
REDIRECT="http://localhost:${PORT}/callback"
SCOPES="${TIKTOK_OAUTH_SCOPES:-user.info.basic,video.list}"

# Kill stale listener on this port
if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  lsof -tiTCP:"$PORT" -sTCP:LISTEN | xargs kill 2>/dev/null || true
  sleep 0.5
fi

PYTHONUNBUFFERED=1 python3 -u - "$PORT" "$KEY" "$SECRET" "$REDIRECT" "$SCOPES" <<'PY'
import hashlib, http.server, json, os, secrets, ssl, subprocess, sys, tempfile, urllib.parse, urllib.request

port = int(sys.argv[1])
client_key, client_secret, redirect_uri, scopes = sys.argv[2:6]

# PKCE — TikTok desktop: code_challenge = hex(SHA256(code_verifier))
code_verifier = secrets.token_urlsafe(64)[:128]
code_challenge = hashlib.sha256(code_verifier.encode("ascii")).hexdigest()

enc_scope = urllib.parse.quote(scopes)
enc_redirect = urllib.parse.quote(redirect_uri)
auth_url = (
    "https://www.tiktok.com/v2/auth/authorize/"
    f"?client_key={client_key}"
    f"&scope={enc_scope}"
    f"&response_type=code"
    f"&redirect_uri={enc_redirect}"
    f"&state=unignored"
    f"&code_challenge={code_challenge}"
    f"&code_challenge_method=S256"
)

print(f"Redirect URI (must match TikTok app exactly): {redirect_uri}")
print(f"Opening: {auth_url}")
try:
    subprocess.run(["open", auth_url], check=False)
except Exception:
    pass

code_holder = {"code": None, "error": None}

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *_args):
        return

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/callback":
            self.send_response(404)
            self.end_headers()
            return
        qs = urllib.parse.parse_qs(parsed.query)
        code_holder["code"] = (qs.get("code") or [None])[0]
        code_holder["error"] = (qs.get("error") or qs.get("error_type") or [None])[0]
        ok = bool(code_holder["code"]) and not code_holder["error"]
        msg = "Return to the terminal." if ok else f"error={code_holder['error']}"
        title = "TikTok OAuth OK" if ok else "TikTok OAuth failed"
        body = f"<html><body><h1>{title}</h1><p>{msg}</p></body></html>".encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

httpd = http.server.HTTPServer(("127.0.0.1", port), Handler)
print(f"Listening on http://127.0.0.1:{port}/callback …")
while code_holder["code"] is None and code_holder["error"] is None:
    httpd.handle_request()
httpd.server_close()

if code_holder["error"] or not code_holder["code"]:
    print("OAuth failed:", code_holder["error"])
    sys.exit(1)

body = urllib.parse.urlencode({
    "client_key": client_key,
    "client_secret": client_secret,
    "code": code_holder["code"],
    "grant_type": "authorization_code",
    "redirect_uri": redirect_uri,
    "code_verifier": code_verifier,
}).encode()

def exchange(payload: bytes) -> dict:
    try:
        ctx = ssl.create_default_context()
        req = urllib.request.Request(
            "https://open.tiktokapis.com/v2/oauth/token/",
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache"},
        )
        with urllib.request.urlopen(req, context=ctx) as res:
            return json.load(res)
    except Exception:
        with tempfile.NamedTemporaryFile("w", delete=False) as f:
            f.write(payload.decode())
            path = f.name
        try:
            out = subprocess.check_output([
                "curl", "-sS", "-X", "POST", "https://open.tiktokapis.com/v2/oauth/token/",
                "-H", "Content-Type: application/x-www-form-urlencoded",
                "--data-binary", f"@{path}",
            ], text=True)
            return json.loads(out)
        finally:
            os.unlink(path)

data = exchange(body)
token = data.get("access_token")
refresh = data.get("refresh_token")
if not token:
    print("Token exchange failed:")
    print(json.dumps(data, indent=2))
    sys.exit(1)

# Persist into .env for the watcher / push-secrets
env_path = os.path.join(os.getcwd(), ".env")
lines = open(env_path).read().splitlines() if os.path.exists(env_path) else []
updates = {"TIKTOK_ACCESS_TOKEN": token}
if refresh:
    updates["TIKTOK_REFRESH_TOKEN"] = refresh
seen = set()
out = []
for line in lines:
    if "=" in line and not line.strip().startswith("#"):
        k = line.split("=", 1)[0].strip()
        if k in updates:
            out.append(f"{k}={updates[k]}")
            seen.add(k)
            continue
    out.append(line)
for k, v in updates.items():
    if k not in seen:
        out.append(f"{k}={v}")
open(env_path, "w").write("\n".join(out) + "\n")

print()
print("Wrote tokens to .env. Next: ./scripts/push-secrets.sh")
print(f"TIKTOK_ACCESS_TOKEN={token[:12]}…")
if refresh:
    print(f"TIKTOK_REFRESH_TOKEN={refresh[:12]}…")
print(f"# expires_in={data.get('expires_in')} refresh_expires_in={data.get('refresh_expires_in')}")
PY
