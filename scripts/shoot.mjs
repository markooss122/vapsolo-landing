import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'shots';
mkdirSync(OUT, { recursive: true });

const channel = process.env.PW_CHANNEL || 'msedge';
const browser = await chromium.launch({ channel, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

// Saltar el age-gate
await page.addInitScript(() => localStorage.setItem('vapsolo_age_ok', 'true'));

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto('http://localhost:4321/', { waitUntil: 'load' });
// Esperar a que el preloader termine y carguen los frames
await page.waitForTimeout(6000);

const totalHeight = await page.evaluate(() => document.body.scrollHeight);
const vh = 900;
const stops = [0, 0.05, 0.12, 0.22, 0.34, 0.5, 0.62, 0.72, 0.82, 0.9, 0.97];

let i = 0;
for (const s of stops) {
  const y = Math.floor((totalHeight - vh) * s);
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/shot_${String(i).padStart(2, '0')}_${Math.round(s * 100)}.png` });
  i++;
}

console.log('TOTAL_HEIGHT', totalHeight);
console.log('CONSOLE_ERRORS', errors.length ? errors.slice(0, 20) : 'none');
await browser.close();
