import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'msedge' });
const p = await b.newPage({ viewport: { width: 860, height: 760 }, deviceScaleFactor: 2 });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:4321/logos', { waitUntil:'networkidle' });
await p.waitForTimeout(2500);
await p.screenshot({ path: 'shots/logos.png', fullPage: true });
console.log('ERRORS', errs.length?errs:'none');
await b.close();
