import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'msedge' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await p.addInitScript(() => localStorage.setItem('vapsolo_age_ok','true'));
await p.goto('http://localhost:4321/', { waitUntil:'load' });
await p.waitForTimeout(5500);
const nav = await p.$('#site-nav a[aria-label*="Inicio"]');
if (nav) await nav.screenshot({ path: 'shots/logo_nav.png' });
await b.close(); console.log('ok');
