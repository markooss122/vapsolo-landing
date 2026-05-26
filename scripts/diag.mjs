import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'msedge' });
const p = await b.newPage({ viewport: { width: 1880, height: 920 } });
await p.addInitScript(() => localStorage.setItem('vapsolo_age_ok','true'));
await p.goto('http://localhost:4321/', { waitUntil:'load' });
await p.waitForTimeout(6000);
await p.evaluate(()=>window.scrollTo(0, document.body.scrollHeight*0.86));
await p.waitForTimeout(1500);
const info = await p.evaluate(() => {
  const sec = document.getElementById('productos');
  const inner = sec?.querySelector('.relative.z-10') || sec?.children[1];
  const r = inner?.getBoundingClientRect();
  return {
    innerWidth: window.innerWidth,
    docScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    mainWidth: document.querySelector('main')?.getBoundingClientRect().width,
    productosLeft: r?.left, productosWidth: r?.width,
  };
});
console.log(JSON.stringify(info, null, 2));
await b.close();
