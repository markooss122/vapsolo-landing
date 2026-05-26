import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'msedge' });
const p = await b.newPage({ viewport: { width: 1880, height: 920 } });
await p.addInitScript(() => localStorage.setItem('vapsolo_age_ok','true'));
await p.goto('http://localhost:4321/', { waitUntil:'load' });
await p.waitForTimeout(6000);
const ids = ['ventajas','productos','como-funciona','opiniones','faq'];
const out = await p.evaluate((ids) => {
  return ids.map(id => {
    const sec = document.getElementById(id);
    if(!sec) return {id, missing:true};
    const sr = sec.getBoundingClientRect();
    // inner container = first child div that has max-w
    const inner = sec.querySelector('[class*="max-w-"]');
    const ir = inner?.getBoundingClientRect();
    const cs = inner ? getComputedStyle(inner) : null;
    return { id, secLeft: Math.round(sr.left), secWidth: Math.round(sr.width),
             innerLeft: ir?Math.round(ir.left):null, innerWidth: ir?Math.round(ir.width):null,
             ml: cs?.marginLeft, mr: cs?.marginRight };
  });
}, ids);
console.log(JSON.stringify(out, null, 2));
await b.close();
