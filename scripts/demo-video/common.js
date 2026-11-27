const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

// Real Open-Meteo weather responses fetched earlier today, keyed by "lat,lon" as the app requests them.
const SAVED = { '28.57,77.22': 'weather-28.57_77.22.json', '28.57329,77.24024': 'weather-lajpat.json' };

function curl(url) {
  return new Promise((resolve) => {
    execFile('curl', ['-s', '-m', '8', '-w', '\n%{http_code}', url], { maxBuffer: 4e6 }, (err, out) => {
      if (err) return resolve({ status: 0, body: '' });
      const i = out.lastIndexOf('\n');
      resolve({ status: Number(out.slice(i + 1)), body: out.slice(0, i) });
    });
  });
}

// The container shares an egress IP whose Open-Meteo *weather* quota is exhausted (HTTP 429).
// Try live first; on 429 serve a real response saved earlier today for the same coordinates.
async function installRetry(ctx, log = () => {}) {
  await ctx.route(/api\.open-meteo\.com\/v1\/forecast/, async (route) => {
    const url = route.request().url();
    const u = new URL(url);
    const key = `${u.searchParams.get('latitude')},${u.searchParams.get('longitude')}`;
    const r = await curl(url);
    const headers = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
    if (r.status === 200) { log('weather live 200 ' + key); return route.fulfill({ status: 200, headers, body: r.body }); }
    const f = SAVED[key] && path.join(__dirname, '.weather-cache', SAVED[key]);
    if (f && fs.existsSync(f)) { log(`weather live ${r.status}; served saved real response ${key}`); return route.fulfill({ status: 200, headers, body: fs.readFileSync(f, 'utf8') }); }
    log(`weather live ${r.status}; nothing saved for ${key}`);
    return route.fulfill({ status: r.status || 503, headers, body: r.body || '{}' });
  });
}
module.exports = { installRetry };
