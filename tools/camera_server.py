# -*- coding: utf-8 -*-
"""网页快门：本地摄像头拍照录入工具。

只监听 127.0.0.1，不联网、不上传。拍到的照片存到项目下的「录入照片」文件夹。
用法：python camera_server.py  （换端口：python camera_server.py --port=8767）
"""
import base64
import json
import sys
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

HERE = Path(__file__).resolve().parent
SAVE_DIR = HERE.parent / "录入照片"
HTML_FILE = HERE / "camera.html"


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # 静音，别刷屏

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlparse(self.path).path
        if path in ("/", "/index.html"):
            body = HTML_FILE.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif path == "/api/ping":
            self._json(200, {"ok": True, "dir": str(SAVE_DIR)})
        elif path == "/api/list":
            self._list()
        else:
            self._json(404, {"ok": False, "error": "not found"})

    def do_POST(self):
        path = urlparse(self.path).path
        if path != "/api/shoot":
            self._json(404, {"ok": False, "error": "not found"})
            return
        n = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(n)
        try:
            d = json.loads(raw.decode("utf-8"))
            data = d.get("data", "")
            if "," in data:
                data = data.split(",", 1)[1]  # 去掉 data:image/jpeg;base64, 前缀
            img = base64.b64decode(data)
            if len(img) < 1000:
                raise ValueError("图片太小，可能是没拍到画面")
            # 连拍编号，只留安全字符，挡住路径穿越
            label = "".join(c for c in str(d.get("label", "")) if c.isalnum() or c in "-_")
            SAVE_DIR.mkdir(parents=True, exist_ok=True)
            ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
            fn = "题目_%s%s.jpg" % (ts, ("_" + label) if label else "")
            (SAVE_DIR / fn).write_bytes(img)
            self._json(200, {"ok": True, "name": fn, "size": len(img)})
        except Exception as e:
            self._json(200, {"ok": False, "error": str(e)})

    def _list(self):
        SAVE_DIR.mkdir(parents=True, exist_ok=True)
        files = sorted(SAVE_DIR.glob("题目_*.jpg"), reverse=True)[:30]
        items = []
        for f in files:
            items.append({
                "name": f.name,
                "size": f.stat().st_size,
                "thumb": "data:image/jpeg;base64," + base64.b64encode(f.read_bytes()).decode("ascii"),
            })
        self._json(200, {"ok": True, "items": items, "dir": str(SAVE_DIR)})


if __name__ == "__main__":
    port = 8766
    for a in sys.argv[1:]:
        if a.startswith("--port="):
            port = int(a.split("=", 1)[1])
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print("网页快门已开： http://127.0.0.1:%d" % port)
    print("照片存到： %s" % SAVE_DIR)
    print("按 Ctrl+C 停止")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
