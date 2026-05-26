import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'msedge' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => localStorage.setItem('vapsolo_age_ok','true'));
await p.goto('https://vapsolo-landing.vercel.app/', { waitUntil:'load' });
await p.waitForTimeout(7000);
const H = await p.evaluate(()=>document.body.scrollHeight);
for (const s of [0.24, 0.27]) {
  await p.evaluate(y=>window.scrollTo(0,y), Math.floor(H*s));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `shots/cap_${Math.round(s*100)}.png` });
}
await b.close(); console.log('done');
