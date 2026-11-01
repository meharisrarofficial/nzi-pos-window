const fs = require('fs');
const p = 'www/index.html';
let h = fs.readFileSync(p, 'utf8');
const missing = [];

function rep(from, to, label) {
  if (h.includes(from)) { h = h.split(from).join(to); }
  else { missing.push(label); }
}

rep('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css', 'libs/fa/css/all.min.css', 'fontawesome');
rep('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js', 'libs/qrcode.min.js', 'qrcode');
rep('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', 'libs/supabase.js', 'supabase');
rep('https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js', 'libs/FileSaver.min.js', 'filesaver');
rep('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'libs/html2canvas.min.js', 'html2canvas');

rep('window.supabase = window.supabase.createClient(NZI_SUPABASE_URL, NZI_SUPABASE_KEY);',
    'try{ window.supabase = window.supabase.createClient(NZI_SUPABASE_URL, NZI_SUPABASE_KEY); }catch(e){ console.warn("Supabase client unavailable (offline)"); }',
    'supabase-client');

rep('isAuto && navigator.onLine === false && saved &&', 'isAuto && saved &&', 'grace-online-check');

fs.writeFileSync(p, h);
console.log(missing.length ? 'WARNING - not found: ' + missing.join(', ') : 'All patches applied.');
