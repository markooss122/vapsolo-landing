import { mkdirSync, writeFileSync } from 'node:fs';

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('No GEMINI_API_KEY'); process.exit(1); }
mkdirSync('public/logo', { recursive: true });

const MODELS = ['gemini-2.5-flash-image', 'gemini-2.0-flash-preview-image-generation'];

async function generate(prompt, out) {
  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    };
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) { console.log(`[${model}] HTTP ${r.status}: ${JSON.stringify(j).slice(0, 200)}`); continue; }
      const parts = j?.candidates?.[0]?.content?.parts || [];
      const img = parts.find((p) => p.inlineData?.data);
      if (img) {
        const ext = (img.inlineData.mimeType || 'image/png').split('/')[1].replace('jpeg', 'jpg');
        const file = `public/logo/${out}.${ext}`;
        writeFileSync(file, Buffer.from(img.inlineData.data, 'base64'));
        console.log(`OK  ${file}  (${model})`);
        return true;
      }
      const txt = parts.find((p) => p.text)?.text;
      console.log(`[${model}] sin imagen. Texto: ${txt ? txt.slice(0, 160) : 'ninguno'}`);
    } catch (e) {
      console.log(`[${model}] error: ${e.message}`);
    }
  }
  console.log(`FALLO ${out}`);
  return false;
}

const prompts = [
  {
    out: 'logo-lockup',
    p: `Design a modern, premium logo for a vape shop called "VapShop Zgz" (Zgz = Zaragoza, Spain).
Horizontal lockup: a clean icon to the left of the wordmark "VapShop Zgz".
The icon is a stylized vapor cloud merged with a bold letter V.
Vibrant gradient from purple to pink to orange, on a solid very dark background (#0a0610).
Sans-serif, bold, contemporary. Flat vector style, crisp edges, high contrast, centered, lots of padding. No photo, no realism, no extra text.`,
  },
  {
    out: 'logo-icon',
    p: `Design a single app-icon style logo mark for a vape shop "VapShop Zgz".
A rounded square badge containing a stylized letter V formed by a swirling vapor cloud.
Vibrant gradient purple-pink-orange. Flat vector, minimal, bold, centered on dark background. No text, no words.`,
  },
  {
    out: 'logo-stacked',
    p: `Minimal premium wordmark logo "VapShop Zgz" stacked on two lines: "VapShop" large on top, "Zgz" smaller below.
Bold modern sans-serif, white text with a subtle purple-to-orange gradient accent underline.
Solid dark background #0a0610, generous padding, flat vector, crisp. Only the text "VapShop Zgz", nothing else.`,
  },
];

for (const { out, p } of prompts) await generate(p, out);
