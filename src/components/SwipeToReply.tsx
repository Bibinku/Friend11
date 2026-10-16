import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { Reply } from 'lucide-react';

/** Finger travel (px) before we decide whether this is a swipe or a scroll. */
const SLOP = 10;
/** Travel (px) that "arms" the reply, like WhatsApp's little reply icon popping. */
const TRIGGER = 56;
/** The furthest the message can be dragged. */
const MAX = 84;
/** How stiff the drag feels once it is past the trigger point. */
const RESIST = 0.3;

interface SwipeToReplyProps {
  /** Turns the gesture off (for example while a message is selected). */
  disabled?: boolean;
  /** Called when the swipe is released past the trigger point. */
  onReply: () => void;
  /** Called the moment a horizontal swipe is recognised. */
  onSwipeStart?: () => void;
  children: ReactNode;
}

interface Gesture {
  id: number;
  x: number;
  y: number;
  mode: 'pending' | 'swipe' | 'scroll';
  armed: boolean;
}

/**
 * WhatsApp-style swipe to reply (touch screens only).
 *
 * Drag a message to the right; a reply icon appears, and releasing past the
 * trigger point replies to exactly that message. Vertical movement is always
 * left to the browser, so normal scrolling is never blocked: the row only
 * declares `touch-action: pan-y`, and we only take over once the finger has
 * clearly moved sideways. The drag itself writes straight to the element
 * styles (no React re-render per pixel), so it stays smooth.
 */
export function SwipeToReply({ disabled, onReply, onSwipeStart, children }: SwipeToReplyProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const swallowClick = useRef(false);

  function paint(x: number) {
    const progress = Math.min(1, x / TRIGGER);
    const content = contentRef.current;
    const icon = iconRef.current;
    if (content) content.style.transform = `translate3d(${x}px, 0, 0)`;
    if (icon) {
      icon.style.opacity = String(progress);
      icon.style.setProperty('--p', String(progress));
    }
  }

  function springBack() {
    const content = contentRef.current;
    const icon = iconRef.current;
    if (content) {
      content.style.transition = 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)';
      content.style.transform = '';
      content.style.willChange = '';
    }
    if (icon) {
      icon.style.opacity = '0';
      icon.style.setProperty('--p', '0');
      icon.classList.remove('is-armed');
    }
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (disabled || e.pointerType !== 'touch' || !e.isPrimary) return;
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, mode: 'pending', armed: false };
    if (contentRef.current) contentRef.current.style.transition = 'none';
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || e.pointerId !== g.id || g.mode === 'scroll') return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;

    if (g.mode === 'pending') {
      if (Math.abs(dy) > SLOP && Math.abs(dy) >= Math.abs(dx) * 0.7) {
        g.mode = 'scroll'; // vertical: hand it back to the browser
        return;
      }
      if (dx < -SLOP) {
        g.mode = 'scroll'; // leftwards: not a reply gesture
        return;
      }
      if (dx > SLOP && dx > Math.abs(dy) * 1.4) {
        g.mode = 'swipe';
        rowRef.current?.setPointerCapture(e.pointerId);
        if (contentRef.current) contentRef.current.style.willChange = 'transform';
        onSwipeStart?.();
      } else {
        return;
      }
    }

    const travel = Math.max(0, dx - SLOP);
    const x = travel <= TRIGGER ? travel : Math.min(MAX, TRIGGER + (travel - TRIGGER) * RESIST);
    paint(x);

    const icon = iconRef.current;
    if (x >= TRIGGER && !g.armed) {
      g.armed = true;
      icon?.classList.add('is-armed');
      if (typeof navigator.vibrate === 'function') navigator.vibrate(12);
    } else if (x < TRIGGER - 6 && g.armed) {
      g.armed = false;
      icon?.classList.remove('is-armed');
    }
  }

  function finish(e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) {
    const g = gesture.current;
    if (!g || e.pointerId !== g.id) return;
    gesture.current = null;
    if (g.mode !== 'swipe') return;
    if (rowRef.current?.hasPointerCapture(e.pointerId)) rowRef.current.releasePointerCapture(e.pointerId);
    swallowClick.current = true; // the lift of the finger must not count as a tap
    window.setTimeout(() => {
      swallowClick.current = false;
    }, 350);
    springBack();
    if (g.armed && !cancelled) onReply();
  }

  return (
    <div
      ref={rowRef}
      className="swipe-row"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => finish(e, false)}
      onPointerCancel={(e) => finish(e, true)}
      onClickCapture={(e) => {
        if (swallowClick.current) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
    >
      <span ref={iconRef} className="swipe-icon" aria-hidden="true">
        <Reply size={16} />
      </span>
      <div ref={contentRef} className="swipe-content">
        {children}
      </div>
    </div>
  );
}