// Turns out/meta.json + frames into saafdin-demo.mp4 (1080p, 30fps) and saafdin-demo.srt.
// Long waits recorded with waitFast() are fast-forwarded by their factor.
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const OUT = path.join(__dirname, 'out'); const m = JSON.parse(fs.readFileSync(path.join(OUT, 'meta.json')));
const sp = m.speedups.sort((a, b) => a.start - b.start);
// map real time -> video time
function vt(t) {
  const G = Number(process.env.SPEED || 1.1); let v = t - m.frames[0].t;
  for (const s of sp) {
    const a = Math.max(s.start, m.frames[0].t), b = Math.min(s.end, t);
    if (b > a) v -= (b - a) * (1 - 1 / s.factor);
  }
  return Math.max(0, v / G);
}
const fr = m.frames; const tEnd = m.tEnd || fr[fr.length - 1].t + 1;
let list = '';
for (let i = 0; i < fr.length; i++) {
  const next = i + 1 < fr.length ? fr[i + 1].t : tEnd;
  const d = vt(next) - vt(fr[i].t);
  if (d <= 0) continue;
  list += `file '${fr[i].file}'\nduration ${d.toFixed(4)}\n`;
}
list += `file '${fr[fr.length - 1].file}'\n`;
fs.writeFileSync(path.join(OUT, 'list.txt'), list);
const fmt = (s) => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3600000), mi = Math.floor(ms / 60000) % 60, se = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:${String(se).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
const srt = m.captions.filter((c) => c.end && c.end > c.start).map((c, i) => `${i + 1}\n${fmt(vt(c.start))} --> ${fmt(vt(c.end))}\n${c.text.replace(/&amp;/g, '&')}\n`).join('\n');
const name = process.argv[2] || 'saafdin-demo';
fs.writeFileSync(path.join(OUT, name + '.srt'), srt);
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(OUT, 'list.txt'),
  '-vf', 'scale=1920:1080:flags=lanczos,fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-movflags', '+faststart',
  path.join(OUT, name + '.mp4')], { stdio: 'inherit' });
console.log('video length', vt(tEnd).toFixed(1), 's; captions', m.captions.length, '; speedups', sp.map(s => (s.end - s.start).toFixed(1) + 's/' + s.factor).join(' '));
