import React, { useEffect, useRef } from 'react';

export type FireworkType = 'small' | 'grand';

const FIREWORK_EVENT = 'es-trigger-fireworks';

export function triggerFireworks(type: FireworkType): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<FireworkType>(FIREWORK_EVENT, { detail: type })
  );
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  gravity: number;
  shape: 'circle' | 'rect';
  rotation: number;
  vRot: number;
}

const COLORS = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#3b82f6', // blue
  '#f43f5e', // rose
  '#a855f7', // purple
  '#14b8a6', // teal
];

export const FireworksOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const spawnBurst = (
      cx: number,
      cy: number,
      count: number,
      speedScale: number
    ) => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
        const speed = (2.2 + Math.random() * 5.8) * speedScale;
        particlesRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5 * speedScale,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 4 + Math.random() * 4.5,
          alpha: 1,
          decay: 0.014 + Math.random() * 0.012,
          gravity: 0.12,
          shape: Math.random() > 0.4 ? 'rect' : 'circle',
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.2,
        });
      }
    };

    const startLoop = () => {
      if (rafRef.current !== null) return;

      const tick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const list = particlesRef.current;

        for (let i = list.length - 1; i >= 0; i--) {
          const p = list[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity;
          p.vx *= 0.985;
          p.alpha -= p.decay;
          p.rotation += p.vRot;

          if (p.alpha <= 0) {
            list.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);

          if (p.shape === 'rect') {
            ctx.fillRect(-p.size, -p.size * 0.6, p.size * 2, p.size * 1.2);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 0.75, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        if (list.length > 0) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    const timers: number[] = [];

    const onTrigger = (e: Event) => {
      const customEv = e as CustomEvent<FireworkType>;
      const type = customEv.detail || 'small';
      const w = window.innerWidth;
      const h = window.innerHeight;

      if (type === 'small') {
        // Small cheerful burst near center for Write mode correct answers
        spawnBurst(w * 0.5, h * 0.42, 42, 0.95);
        startLoop();
      } else {
        // Grand multi-wave fireworks for Exam 80+ Pass
        const positions = [
          { x: w * 0.5, y: h * 0.32, delay: 0 },
          { x: w * 0.26, y: h * 0.36, delay: 220 },
          { x: w * 0.74, y: h * 0.36, delay: 440 },
          { x: w * 0.38, y: h * 0.25, delay: 750 },
          { x: w * 0.62, y: h * 0.25, delay: 1050 },
          { x: w * 0.5, y: h * 0.3, delay: 1400 },
          { x: w * 0.28, y: h * 0.4, delay: 1750 },
          { x: w * 0.72, y: h * 0.4, delay: 2100 },
        ];

        positions.forEach(({ x, y, delay }) => {
          const tid = window.setTimeout(() => {
            spawnBurst(x, y, 65, 1.35);
            startLoop();
          }, delay);
          timers.push(tid);
        });
      }
    };

    window.addEventListener(FIREWORK_EVENT, onTrigger);
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener(FIREWORK_EVENT, onTrigger);
      timers.forEach((tid) => clearTimeout(tid));
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      aria-hidden="true"
    />
  );
};
