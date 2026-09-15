import http.server, pathlib
UPLOAD_DIR = pathlib.Path("/home/user/mizandigital/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "text/html; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        html = b"""<!doctype html><html><head><meta charset="utf-8"><title>Upload pitch.txt 3.5M</title>
<style>body{font-family:system-ui;padding:24px;max-width:800px;margin:auto;background:#fafafa} .box{border:3px dashed #4a90e2;padding:32px;border-radius:16px;background:white} #drop{padding:40px;text-align:center} progress{width:100%;height:24px} .ok{color:green;white-space:pre-wrap} .err{color:red}</style>
</head><body>
<h1>Upload pitch.txt (3.5M chars)</h1>
<div class="box">
<div id="drop">
<p><b>Drag & drop your pitch.txt here</b><br>or click to select (up to 100MB)</p>
<input type="file" id="file" accept=".txt,.md,.pdf,.json">
<br><br>
<button id="btn" style="padding:12px 24px;font-size:16px">Upload</button>
<progress id="prog" value="0" max="100" style="display:none"></progress>
<div id="status" style="margin-top:16px;white-space:pre-wrap"></div>
</div>
</div>
<script>
const fileInput=document.getElementById('file');
const btn=document.getElementById('btn');
const prog=document.getElementById('prog');
const status=document.getElementById('status');
const drop=document.getElementById('drop');
drop.addEventListener('dragover', e=>{e.preventDefault(); drop.style.background='#e3f2fd'});
drop.addEventListener('dragleave', e=>{drop.style.background='white'});
drop.addEventListener('drop', e=>{e.preventDefault(); fileInput.files=e.dataTransfer.files; if(fileInput.files[0]) status.textContent='Selected: '+fileInput.files[0].name+' '+(fileInput.files[0].size/1024/1024).toFixed(2)+' MB';});
fileInput.onchange=()=>{if(fileInput.files[0]) status.textContent='Selected: '+fileInput.files[0].name+' '+(fileInput.files[0].size/1024/1024).toFixed(2)+' MB';};
btn.onclick=()=>{
  const f=fileInput.files[0];
  if(!f){status.textContent='Choose file first';return;}
  prog.style.display='block';
  status.textContent='Uploading '+f.name+' '+(f.size/1024/1024).toFixed(2)+' MB...';
  const fd=new FormData(); fd.append('file', f);
  const xhr=new XMLHttpRequest();
  xhr.open('POST','/upload');
  xhr.upload.onprogress=e=>{if(e.lengthComputable) prog.value=(e.loaded/e.total)*100};
  xhr.onload=()=>{status.innerHTML='<div class=ok>'+xhr.responseText+'</div>'; prog.value=100;};
  xhr.onerror=()=>{status.innerHTML='<div class=err>Upload failed</div>'};
  xhr.send(fd);
};
</script>
<p>After upload, I will auto-run: <code>node scripts/compare-large-pitch.mjs</code></p>
</body></html>"""
        self.wfile.write(html)
    def do_POST(self):
        if self.path != "/upload":
            self.send_error(404); return
        length = int(self.headers.get('Content-Length',0))
        data = self.rfile.read(length)
        try:
            if b'filename=' in data:
                hdr_end = data.find(b'\r\n\r\n')
                file_start = hdr_end+4 if hdr_end!=-1 else 0
                first_nl = data.find(b'\r\n')
                boundary = data[:first_nl]
                last_b = data.rfind(boundary)
                file_end = last_b-2
                file_data = data[file_start:file_end]
            else:
                file_data = data
            out = UPLOAD_DIR / "pitch.txt"
            out.write_bytes(file_data)
            (UPLOAD_DIR / "pitch_info.txt").write_text(f"size={len(file_data)} path={out}\n")
            self.send_response(200)
            self.send_header("Content-type","text/plain; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin","*")
            self.end_headers()
            preview = file_data[:1000].decode('utf-8', errors='ignore')
            self.wfile.write(f"OK Saved {len(file_data)} bytes ({len(file_data)/1024/1024:.2f} MB) to {out}\n\nFirst 1000 chars:\n{preview}\n".encode())
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f"Error {e}".encode())
    def log_message(self, *a): 
        print(a[0] % a[1:])

http.server.HTTPServer(("0.0.0.0",8787),Handler).serve_forever()
