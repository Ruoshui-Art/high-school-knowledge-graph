# -*- coding: utf-8 -*-
"""手机传照片到电脑：手机浏览器选照片，原图存进「录入照片」文件夹。

只监听局域网（0.0.0.0），供同一 WiFi 下的手机访问；不连外网、不上传云端、不压缩图片。
用法：双击「手机传照片.bat」，或 python phone_upload_server.py
换端口：python phone_upload_server.py --port=8768
"""
import base64
import json
import re
import socket
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
MAX_BYTES = 60 * 1024 * 1024  # 单张上限 60MB，够 2 亿像素原图

PAGE = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>传照片到电脑 · 拾页</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#f5f7fa;color:#1f2733;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;
  line-height:1.6;padding-bottom:40px}
.hero{background:linear-gradient(135deg,#1e40af,#2563eb);color:#fff;padding:30px 22px 26px;border-radius:0 0 16px 16px}
.hero .k{font-size:12px;opacity:.85;letter-spacing:2px}
.hero h1{font-size:25px;margin:6px 0 5px}
.hero p{font-size:13px;opacity:.92}
.wrap{max-width:640px;margin:auto;padding:0 18px}
.card{background:#fff;border:1px solid #e3e8ef;border-radius:14px;padding:22px 20px;margin-top:18px;
  box-shadow:0 2px 10px rgba(20,30,50,.04)}
.card h2{font-size:18px;color:#2563eb;margin-bottom:12px}
.tip{font-size:13px;color:#5a6675}
input[type=file]{width:100%;padding:12px;background:#eef2f9;border:1px dashed #2563eb;border-radius:10px;
  font-size:14px;color:#1f2733;margin:12px 0}
button{width:100%;padding:14px;background:#2563eb;color:#fff;border:0;border-radius:10px;font-size:16px;
  font-weight:600;cursor:pointer}
button:disabled{background:#9db4e8;cursor:default}
#log{margin-top:14px;font-size:13px;color:#5a6675;white-space:pre-wrap;word-break:break-all;
  background:#f5f7fa;border-radius:8px;padding:12px;min-height:44px}
.item{display:flex;justify-content:space-between;gap:10px;font-size:13px;padding:9px 0;
  border-bottom:1px solid #eef1f6;color:#5a6675}
.item:last-child{border-bottom:0}
.item b{color:#1f2733;font-weight:500;word-break:break-all}
.ok{color:#1e7a4d}.err{color:#c0392b}
.foot{font-size:12px;color:#8d97a6;text-align:center;margin-top:20px}
</style>
</head>
<body>
<div class="hero">
  <div class="k">拾页 · 手机传照片</div>
  <h1>拍完的书页，一键到电脑</h1>
  <p>原图传送，不压缩 · 照片存进电脑的「录入照片」文件夹</p>
</div>
<div class="wrap">
  <div class="card">
    <h2>① 选照片</h2>
    <div class="tip">可以一次选多张。选完点下面的按钮。</div>
    <input type="file" id="files" accept="image/*" multiple>
    <button id="btn" type="button">上传到电脑</button>
    <div id="log">等待上传…</div>
  </div>
  <div class="card">
    <h2>② 电脑已收到的照片</h2>
    <div id="list"></div>
  </div>
  <div class="foot">只在你自己的 WiFi 下能用 · 照片不经过任何外部服务器</div>
</div>
<script>
var $=function(id){return document.getElementById(id)};
function log(s){$('log').textContent=s}
function fmt(n){return n>1048576?(n/1048576).toFixed(1)+' MB':(n/1024).toFixed(0)+' KB'}
function refresh(){
  fetch('/api/list').then(function(r){return r.json()}).then(function(d){
    var box=$('list'); box.innerHTML='';
    if(!d.ok||!d.items.length){box.innerHTML='<div class="tip">还没有照片</div>';return}
    d.items.forEach(function(it){
      var row=document.createElement('div'); row.className='item';
      row.innerHTML='<b>'+it.name+'</b><span>'+fmt(it.size)+'</span>';
      box.appendChild(row);
    });
  }).catch(function(){});
}
$('btn').onclick=function(){
  var fs=$('files').files;
  if(!fs.length){log('先选照片，再点上传');return}
  this.disabled=true;
  var done=0,fail=0;
  function finish(){
    $('btn').disabled=false;
    log('完成：成功 '+done+' 张'+(fail?'，失败 '+fail+' 张':'')+'。可以回电脑看「录入照片」文件夹了。');
    refresh();
  }
  Array.prototype.forEach.call(fs,function(f){
    var fd=new FormData(); fd.append('photo',f,f.name);
    log('正在传 '+(done+fail+1)+' / '+fs.length+'：'+f.name);
    fetch('/api/upload',{method:'POST',body:fd}).then(function(r){return r.json()}).then(function(d){
      if(d.ok){done++}else{fail++;log('失败：'+f.name+' — '+d.error)}
      if(done+fail===fs.length)finish();
    }).catch(function(e){fail++;if(done+fail===fs.length)finish();});
  });
};
refresh();
</script>
</body>
</html>"""

# 图片魔数：只认这些后缀，文件名一律自己生成，不信客户端给的
MAGIC = [
    (b"\xff\xd8\xff", ".jpg"),
    (b"\x89PNG\r\n\x1a\n", ".png"),
    (b"RIFF", ".webp"),
]


def sniff_ext(data):
    for magic, ext in MAGIC:
        if data.startswith(magic):
            if ext == ".webp" and data[8:12] != b"WEBP":
                continue
            return ext
    # HEIC / HEIF：ftyp 在偏移 4
    if len(data) > 12 and data[4:8] == b"ftyp":
        return ".heic"
    return None


def lan_ips():
    ips = set()
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith("127."):
                ips.add(ip)
    except Exception:
        pass
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("223.5.5.5", 80))  # 不实际发包，只让系统选出口网卡
        ip = s.getsockname()[0]
        if ip and not ip.startswith("127."):
            ips.add(ip)
        s.close()
    except Exception:
        pass
    return sorted(ips)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlparse(self.path).path
        if path in ("/", "/index.html"):
            body = PAGE.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
        elif path == "/api/ping":
            self._json(200, {"ok": True, "dir": str(SAVE_DIR), "ips": lan_ips()})
        elif path == "/api/list":
            self._list()
        else:
            self._json(404, {"ok": False, "error": "没有这个地址"})

    def do_POST(self):
        if urlparse(self.path).path != "/api/upload":
            self._json(404, {"ok": False, "error": "没有这个地址"})
            return
        n = int(self.headers.get("Content-Length", "0"))
        if n <= 0 or n > MAX_BYTES + 1024 * 1024:
            self._json(200, {"ok": False, "error": "文件太大或为空"})
            return
        raw = self.rfile.read(n)
        ctype = self.headers.get("Content-Type", "")
        m = re.search(r"boundary=(?:\"([^\"]+)\"|([^;]+))", ctype)
        if not m:
            self._json(200, {"ok": False, "error": "上传格式不对"})
            return
        boundary = (m.group(1) or m.group(2)).strip().encode("utf-8")
        try:
            parts = raw.split(b"--" + boundary)
            blobs = []
            for part in parts:
                part = part.lstrip(b"\r\n")
                if part.endswith(b"\r\n"):
                    part = part[:-2]
                head, sep, content = part.partition(b"\r\n\r\n")
                if not sep or b"filename=" not in head:
                    continue
                blobs.append(content)
            if not blobs:
                raise ValueError("没读到照片，换个浏览器试试")
            saved = []
            SAVE_DIR.mkdir(parents=True, exist_ok=True)
            for data in blobs:
                if len(data) > MAX_BYTES:
                    raise ValueError("有一张超过 60MB，太大了")
                ext = sniff_ext(data)
                if not ext:
                    raise ValueError("有一张不是常见图片（jpg/png/webp/heic）")
                ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
                fn = "手机_%s%s" % (ts, ext)
                (SAVE_DIR / fn).write_bytes(data)  # 原样写盘，一个字节不动
                saved.append({"name": fn, "size": len(data)})
            self._json(200, {"ok": True, "saved": saved})
        except Exception as e:
            self._json(200, {"ok": False, "error": str(e)})

    def _list(self):
        SAVE_DIR.mkdir(parents=True, exist_ok=True)
        files = sorted(
            [p for p in SAVE_DIR.iterdir() if p.is_file() and p.suffix.lower() in
             {".jpg", ".jpeg", ".png", ".webp", ".heic"}],
            key=lambda p: p.stat().st_mtime, reverse=True)[:40]
        items = [{"name": f.name, "size": f.stat().st_size} for f in files]
        self._json(200, {"ok": True, "items": items, "dir": str(SAVE_DIR)})


def input_pause():
    """双击运行时窗口能停住；被脚本调用时无 Ide 输入也不报错。"""
    try:
        input("按回车键关闭窗口...")
    except (EOFError, KeyboardInterrupt):
        pass


if __name__ == "__main__":
    port = 8768
    for a in sys.argv[1:]:
        if a.startswith("--port="):
            port = int(a.split("=", 1)[1])
    def already_running():
        """Windows 下 SO_REUSEADDR 会让第二个实例也 bind 成功，
        所以改用探测端口有没有服务应答来判断是否已经在跑。"""
        probe = socket.socket()
        probe.settimeout(0.5)
        try:
            return probe.connect_ex(("127.0.0.1", port)) == 0
        finally:
            probe.close()

    if already_running():
        print("=" * 58)
        print("这个服务已经在运行了，不用重复启动。")
        print("手机连同一个 WiFi，打开下面任意地址就行：")
        for ip in lan_ips():
            print("   http://%s:%d" % (ip, port))
        print("=" * 58)
        input_pause()
        sys.exit(0)

    try:
        srv = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    except OSError as e:
        print("=" * 58)
        print("启动失败：端口 %d 已经被占用。" % port)
        print("多半是服务已经在跑了，把这个窗口截图发我，我帮你处理。")
        print("错误详情：%s" % e)
        print("=" * 58)
        input_pause()
        sys.exit(1)
    print("=" * 58)
    print("手机传照片服务已启动（同一 WiFi 下可用）")
    print("=" * 58)
    ips = lan_ips()
    if ips:
        print("手机浏览器打开下面任意一个地址：")
        for ip in ips:
            print("   http://%s:%d" % (ip, port))
    else:
        print("没自动查到局域网地址；电脑上运行 ipconfig 查 IPv4 地址，")
        print("然后手机打开 http://<那个地址>:%d" % port)
    print("照片存到： %s" % SAVE_DIR)
    print("按 Ctrl+C 停止（用完记得关）")
    print("=" * 58)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()
