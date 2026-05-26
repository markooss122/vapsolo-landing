import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ═══════════════════════════════ Secuencia de frames del hero ═══════ */
const FRAME_COUNT = 153;
const framePath = (i: number) => `/frames/f_${String(i).padStart(3, '0')}.jpg`;
const frames: HTMLImageElement[] = [];
let framesReady = false;
let resolveFrames: () => void;
const framesLoaded = new Promise<void>((res) => (resolveFrames = res));

function loadFrames(onProgress: (p: number) => void) {
  let loaded = 0;
  const done = () => {
    loaded++;
    onProgress(loaded / FRAME_COUNT);
    if (loaded >= FRAME_COUNT && !framesReady) {
      framesReady = true;
      resolveFrames();
    }
  };
  for (let i = 1; i <= FRAME_COUNT; i++) {
    const img = new Image();
    img.onload = done;
    img.onerror = done; // no bloquear si falta alguno
    img.src = framePath(i);
    frames[i - 1] = img;
  }
  // Salvavidas: nunca esperar más de 9s
  setTimeout(() => {
    if (!framesReady) {
      framesReady = true;
      resolveFrames();
    }
  }, 9000);
}

/* ═══════════════════════════════════════════════ Smooth scroll ═════ */
let lenis: Lenis | null = null;
function initSmoothScroll() {
  if (reduceMotion) return;
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  (window as any).__lenis = lenis;
}

/* ═══════════════════════════════════════════════════ Preloader ═════ */
function initPreloader(onDone: () => void) {
  const pre = document.getElementById('preloader');
  const num = document.getElementById('pre-count');
  const bar = document.getElementById('pre-bar');

  const finish = () => {
    document.body.style.overflow = '';
    if (localStorage.getItem('vapsolo_age_ok') === 'true') lenis?.start();
    ScrollTrigger.refresh();
    onDone();
  };

  if (!pre || reduceMotion) {
    loadFrames(() => {});
    pre?.remove();
    finish();
    return;
  }

  lenis?.stop();
  document.body.style.overflow = 'hidden';

  const shown = { p: 0 };
  loadFrames((p) => {
    // Avanzar la barra hacia el progreso real (suavizado)
    gsap.to(shown, {
      p,
      duration: 0.4,
      ease: 'power2.out',
      onUpdate: () => {
        const val = Math.round(shown.p * 100);
        if (num) num.textContent = String(val).padStart(3, '0');
        if (bar) bar.style.transform = `scaleX(${shown.p})`;
      },
    });
  });

  framesLoaded.then(() => {
    gsap
      .timeline({
        onComplete: () => {
          pre.remove();
          finish();
        },
      })
      .to(shown, {
        p: 1,
        duration: 0.4,
        onUpdate: () => {
          if (num) num.textContent = String(Math.round(shown.p * 100)).padStart(3, '0');
          if (bar) bar.style.transform = `scaleX(${shown.p})`;
        },
      })
      .to('#pre-content', { y: -30, opacity: 0, duration: 0.5, ease: 'power3.in' }, '+=0.1')
      .to(pre, { yPercent: -100, duration: 1, ease: 'expo.inOut' }, '-=0.1');
  });
}

/* ════════════════════════════════════════ Hero: canvas scrubbing ═══ */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cw: number, ch: number) {
  if (!img || !img.width) return;
  const ir = img.width / img.height;
  const cr = cw / ch;
  let w: number, h: number, x: number, y: number;
  if (cr > ir) {
    w = cw; h = cw / ir; x = 0; y = (ch - h) / 2;
  } else {
    h = ch; w = ch * ir; x = (cw - w) / 2; y = 0;
  }
  ctx.drawImage(img, x, y, w, h);
}

function initFrameSequence() {
  const canvas = document.getElementById('hero-canvas') as HTMLCanvasElement | null;
  const hero = document.getElementById('hero');
  if (!canvas || !hero) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let cw = 0, ch = 0, dpr = 1;
  const state = { frame: 0 };

  const render = () => {
    const idx = Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(state.frame)));
    const img = frames[idx];
    if (img && img.complete && img.width) {
      ctx.clearRect(0, 0, cw, ch);
      drawCover(ctx, img, cw, ch);
    }
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = window.innerWidth;
    ch = window.innerHeight;
    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  };

  framesLoaded.then(() => {
    resize();
    window.addEventListener('resize', () => {
      resize();
      ScrollTrigger.refresh();
    });

    if (reduceMotion) {
      state.frame = 0;
      render();
      return;
    }

    // Scroll → frame (scrub suaviza; render es instantáneo, nunca se atasca)
    gsap.to(state, {
      frame: FRAME_COUNT - 1,
      ease: 'none',
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.5,
      },
      onUpdate: render,
    });

    // Captions encadenadas (la primera ya visible al cargar)
    const caps = gsap.utils.toArray<HTMLElement>('.hero-cap');
    gsap.set(caps[0], { autoAlpha: 1, y: 0 });
    const capTl = gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
    });
    caps.forEach((cap, i) => {
      if (i === 0) {
        capTl
          .to(cap, { autoAlpha: 1, duration: 0.8 })
          .to(cap, { autoAlpha: 0, y: -50, duration: 1, ease: 'power2.in' }, '+=0.6');
      } else {
        capTl
          .fromTo(cap, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'power2.out' })
          .to(cap, { autoAlpha: 0, y: -50, duration: 1, ease: 'power2.in' }, i === caps.length - 1 ? '+=1.6' : '+=0.9');
      }
    });

    gsap.to('#hero-hint', {
      autoAlpha: 0,
      scrollTrigger: { trigger: hero, start: 'top top', end: '10% top', scrub: true },
    });

    ScrollTrigger.refresh();
  });
}

/* ══════════════════════════════════════════ Nav reactivo al scroll ═ */
function initNav() {
  const nav = document.getElementById('site-nav');
  if (!nav) return;
  let last = 0;
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      // Fondo sólido pasado el hero
      nav.classList.toggle('nav-solid', y > window.innerHeight * 0.6);
      // Ocultar al bajar, mostrar al subir
      if (y > last && y > 200) nav.classList.add('nav-hidden');
      else nav.classList.remove('nav-hidden');
      last = y;
    },
  });
}

/* ═══════════════════════════════════════════════════════ Cursor ═══ */
function initCursor() {
  if (!finePointer || reduceMotion) return;
  const dot = document.querySelector<HTMLElement>('.cursor-dot');
  const ring = document.querySelector<HTMLElement>('.cursor-ring');
  if (!dot || !ring) return;
  const xD = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
  const yD = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
  const xR = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
  const yR = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
  window.addEventListener('mousemove', (e) => {
    xD(e.clientX); yD(e.clientY); xR(e.clientX); yR(e.clientY);
  });
  document.querySelectorAll('a, button, [data-cursor], summary, input, [data-tilt]').forEach((el) => {
    el.addEventListener('mouseenter', () => ring.classList.add('is-hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('is-hover'));
  });
}

/* ══════════════════════════════════ Split de titulares (char) ═════ */
function splitChars(el: HTMLElement) {
  const walk = (node: ChildNode): Node[] => {
    if (node.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      (node.textContent || '').split('').forEach((ch) => {
        if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); return; }
        const s = document.createElement('span');
        s.className = 'char inline-block';
        s.textContent = ch;
        frag.appendChild(s);
      });
      return [frag];
    }
    // No partir spans con degradado (background-clip:text): se animan en bloque
    if (node.nodeType === Node.ELEMENT_NODE) {
      const elNode = node as HTMLElement;
      if (elNode.classList?.contains('text-gradient') || elNode.hasAttribute?.('data-nosplit')) {
        const clone = node.cloneNode(true) as HTMLElement;
        clone.classList.add('char', 'inline-block');
        return [clone];
      }
    }
    const clone = node.cloneNode(false);
    node.childNodes.forEach((c) => walk(c).forEach((n) => clone.appendChild(n)));
    return [clone];
  };
  const out = document.createDocumentFragment();
  Array.from(el.childNodes).forEach((c) => walk(c).forEach((n) => out.appendChild(n)));
  el.innerHTML = '';
  el.appendChild(out);
  return el.querySelectorAll('.char');
}

function initSplitReveals() {
  document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    const chars = splitChars(el);
    if (reduceMotion) return;
    gsap.from(chars, {
      yPercent: 110,
      autoAlpha: 0,
      duration: 0.9,
      ease: 'expo.out',
      stagger: 0.025,
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
}

/* ══════════════════════════════════════════════════════ Reveals ═══ */
function initReveals() {
  if (reduceMotion) return;
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 48, autoAlpha: 0, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
  gsap.utils.toArray<HTMLElement>('[data-reveal-group]').forEach((group) => {
    gsap.from(group.querySelectorAll('[data-reveal-item]'), {
      y: 56, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.09,
      scrollTrigger: { trigger: group, start: 'top 82%', once: true },
    });
  });
}

/* ════════════════════════════════ Manifiesto palabra a palabra ════ */
function initHighlight() {
  const el = document.querySelector<HTMLElement>('[data-highlight]');
  if (!el) return;
  const words = (el.textContent || '').trim().split(/\s+/);
  el.innerHTML = words.map((w) => `<span class="hl-word">${w}</span>`).join(' ');
  if (reduceMotion) return;
  gsap.set('.hl-word', { opacity: 0.16 });
  gsap.to('.hl-word', {
    opacity: 1, ease: 'none', stagger: 0.5,
    scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 58%', scrub: true },
  });
}

/* ═══════════════════════════════════════════════════ Contadores ═══ */
function initCounters() {
  gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count || '0');
    const suffix = el.dataset.suffix || '';
    const obj = { v: 0 };
    gsap.to(obj, {
      v: end, duration: 2, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString('es-ES') + suffix; },
    });
  });
}

/* ═══════════════════════════════════════════════════ Marquees ════ */
function initMarquees() {
  gsap.utils.toArray<HTMLElement>('.marquee').forEach((track) => {
    const speed = parseFloat(track.dataset.speed || '40');
    const dir = track.dataset.dir === 'right' ? 1 : -1;
    track.innerHTML += track.innerHTML;
    const half = track.scrollWidth / 2;
    gsap.set(track, { x: dir === 1 ? -half : 0 });
    gsap.to(track, { x: dir === 1 ? 0 : -half, duration: half / speed, ease: 'none', repeat: -1 });
  });
}

/* ═══════════════════════════ Galería horizontal (pinned) ═════════ */
function initHorizontal() {
  const section = document.querySelector<HTMLElement>('[data-horizontal]');
  const track = section?.querySelector<HTMLElement>('[data-htrack]');
  if (!section || !track || reduceMotion) return;
  const getDist = () => track.scrollWidth - window.innerWidth;
  gsap.to(track, {
    x: () => -getDist(),
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => '+=' + getDist(),
      scrub: 1,
      pin: true,
      invalidateOnRefresh: true,
    },
  });
}

/* ════════════════════════════════════ Tilt 3D + magnéticos ═══════ */
function initInteractions() {
  if (!finePointer || reduceMotion) return;
  gsap.utils.toArray<HTMLElement>('[data-tilt]').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(card, { rotateY: px * 12, rotateX: -py * 12, transformPerspective: 800, duration: 0.4, ease: 'power2.out' });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
    });
  });
  gsap.utils.toArray<HTMLElement>('[data-magnetic]').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      gsap.to(btn, { x: (e.clientX - (r.left + r.width / 2)) * 0.3, y: (e.clientY - (r.top + r.height / 2)) * 0.3, duration: 0.4, ease: 'power2.out' });
    });
    btn.addEventListener('mouseleave', () => gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' }));
  });
}

/* ══════════════════════════════════════════════════ Anclas ══════ */
function initAnchors() {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target as HTMLElement, { offset: 0 });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

/* ══════════════════════════════════════════════════════ Boot ════ */
function boot() {
  initSmoothScroll();
  initCursor();
  initNav();
  initFrameSequence();
  initSplitReveals();
  initReveals();
  initHighlight();
  initCounters();
  initMarquees();
  initHorizontal();
  initInteractions();
  initAnchors();
  initPreloader(() => ScrollTrigger.refresh());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

window.addEventListener('load', () => ScrollTrigger.refresh());
