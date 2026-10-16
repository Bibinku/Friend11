import { useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { createIntroScene, INTRO_TIMES } from '../lib/introScene';

const SEEN_KEY = 'friend11_entrance_seen_v1';
/** The page's own entrance animations (see home-entrance.css) need this long after the reveal starts. */
const PAGE_SETTLE_MS = 1900;

/** Only on the home page, once per browser tab session, never for reduced-motion users. Add ?intro to the address to force it. */
function shouldPlay(pathname: string): boolean {
  if (pathname !== '/') return false;
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    if (new URLSearchParams(window.location.search).has('intro')) return true;
    return sessionStorage.getItem(SEEN_KEY) !== '1';
  } catch {
    return true;
  }
}

/**
 * Full-screen opening film for the home page.
 *
 * A striker hits the ball, a flash cut takes us behind the goal, the ball crashes into the
 * net, the FRIEND11 logo glows in, and a ring of light opens the picture so the real home
 * page appears underneath while its content rises into place.
 *
 * The picture is drawn on one <canvas> by `lib/introScene.ts` (no image or video files).
 * The loop below only advances time and flips a few class names, so React renders this
 * component once and once more when it is removed: nothing re-renders while it plays.
 * Tap, click or Esc skips ahead to the reveal. Reduced-motion users never see it.
 */
export function HomeEntrance() {
  const { pathname } = useLocation();
  const [active, setActive] = useState(() => shouldPlay(pathname));
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!active || !root || !canvas) return;

    const html = document.documentElement;
    let raf = 0;
    let resizeTimer = 0;
    let cleanTimer = 0;
    let cancelled = false;

    // Hide the page content before the first paint, so nothing flashes behind the film.
    html.classList.add('entrance-play');
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* private mode: it simply plays again next visit */
    }

    const scene = createIntroScene(canvas);
    if (!scene) {
      // Canvas not available: skip the film, show the page.
      html.classList.remove('entrance-play');
      setActive(false);
      return;
    }
    const size = () => scene.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    size();

    let t = 0; // film time in ms; advances by frame deltas so a hidden tab can't skip the film
    let last = 0;
    let speed = 1;
    let logoShown = false;
    let revealing = false;
    let ended = false;

    const finish = () => {
      if (ended) return;
      ended = true;
      root.classList.add('is-done');
      // Keep the page animations alive until they have finished, then hand over to the plain page.
      cleanTimer = window.setTimeout(() => {
        html.classList.remove('entrance-play', 'entrance-go');
        if (!cancelled) setActive(false);
      }, PAGE_SETTLE_MS - (INTRO_TIMES.end - INTRO_TIMES.wipe));
    };

    const frame = (now: number) => {
      if (cancelled) return;
      const dt = last ? Math.min(now - last, 50) : 0;
      last = now;
      t += dt * speed;

      if (!logoShown && t >= INTRO_TIMES.logo) {
        logoShown = true;
        root.classList.add('is-logo');
      }
      if (!revealing && t >= INTRO_TIMES.wipe) {
        revealing = true;
        root.classList.add('is-reveal');
        html.classList.add('entrance-go'); // the page behind starts rising in
      }
      scene.render(t);
      if (t >= INTRO_TIMES.end) {
        finish();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    root.classList.add('is-ready');
    raf = requestAnimationFrame(frame);

    // Skip: jump to the reveal and run it a little faster
    const skip = () => {
      if (revealing || ended) return;
      t = Math.max(t, INTRO_TIMES.wipe);
      speed = 1.4;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip();
    };
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(size, 150);
    };
    root.addEventListener('pointerdown', skip);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.clearTimeout(cleanTimer);
      root.removeEventListener('pointerdown', skip);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      scene.destroy();
      html.classList.remove('entrance-play', 'entrance-go');
    };
  }, [active]);

  if (!active) return null;

  return (
    <div ref={rootRef} className="film" aria-hidden="true">
      <canvas ref={canvasRef} className="film-canvas" />
      <div className="film-bar film-bar-top" />
      <div className="film-bar film-bar-bottom" />
      <div className="film-title">
        <div className="film-logo">
          <span className="film-word">FRIEND</span>
          <span className="film-tag">11</span>
        </div>
        <span className="film-rule" />
        <span className="film-sub">Find · Match · Play</span>
      </div>
    </div>
  );
}