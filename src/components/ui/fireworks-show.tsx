import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface Particle {
  x: number;
  y: number;
  color: string;
  velocity: {
    x: number;
    y: number;
  };
  alpha: number;
  lifetime: number;
  size: number;
}

interface Firework {
  x: number;
  y: number;
  color: string;
  velocity: {
    x: number;
    y: number;
  };
  particles: Particle[];
  exploded: boolean;
  timeToExplode: number;
}

interface FireworksBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  /**
   * Color palette for the rockets + bursts. Defaults to a celebratory rainbow.
   * Pass a brand-tuned palette to keep the effect on-aesthetic.
   */
  colors?: string[];
  /**
   * Stop spawning new fireworks after this many ms — particles already in
   * flight finish their lifetime. Use this to limit a celebratory burst.
   * When undefined, the animation runs continuously.
   */
  spawnDurationMs?: number;
}

const DEFAULT_COLORS = [
  '#9b87f5',
  '#D946EF',
  '#F97316',
  '#0EA5E9',
  '#ea384c',
  '#10B981',
  '#FCD34D',
];

export const FireworksBackground = ({
  children,
  className,
  colors = DEFAULT_COLORS,
  spawnDurationMs,
}: FireworksBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fireworksRef = useRef<Firework[]>([]);
  const animationFrameRef = useRef<number>(0);
  const lastFireworkTimeRef = useRef<number>(Date.now());
  const mountedAtRef = useRef<number>(Date.now());
  // Live ref to the colors so the spawn function picks up updates without
  // forcing the whole effect to tear down.
  const colorsRef = useRef<string[]>(colors);
  colorsRef.current = colors;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Size canvas to its parent container, accounting for DPR so the bursts
    // stay crisp on retina screens.
    const updateCanvasSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    updateCanvasSize();
    const resizeObserver = new ResizeObserver(updateCanvasSize);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    window.addEventListener('resize', updateCanvasSize);

    const cssWidth = () => canvas.clientWidth;
    const cssHeight = () => canvas.clientHeight;

    const createFirework = (x?: number, y?: number, targetY?: number) => {
      const startX = x ?? Math.random() * cssWidth();
      const startY = y ?? cssHeight();
      const palette = colorsRef.current;
      const color = palette[Math.floor(Math.random() * palette.length)];
      const angle = (Math.random() * Math.PI) / 2 - Math.PI / 4;
      const velocity = 6 + Math.random() * 4;
      const target = targetY ?? cssHeight() * (0.1 + Math.random() * 0.4);

      fireworksRef.current.push({
        x: startX,
        y: startY,
        color,
        velocity: {
          x: Math.sin(angle) * velocity,
          y: -Math.cos(angle) * velocity * 1.5,
        },
        particles: [],
        exploded: false,
        timeToExplode: target,
      });
    };

    const explodeFirework = (firework: Firework) => {
      const particleCount = 60 + Math.floor(Math.random() * 40);
      for (let i = 0; i < particleCount; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 5 + 1;
        firework.particles.push({
          x: firework.x,
          y: firework.y,
          color: firework.color,
          velocity: {
            x: Math.cos(angle) * velocity * (0.5 + Math.random()),
            y: Math.sin(angle) * velocity * (0.5 + Math.random()),
          },
          alpha: 1,
          lifetime: Math.random() * 30 + 30,
          size: Math.random() * 3 + 1,
        });
      }
    };

    const updateAndDraw = () => {
      const width = cssWidth();
      const height = cssHeight();
      // Trail effect: fade prior frames instead of clearing outright so the
      // particle trails feel like real sparks.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.fillRect(0, 0, width, height);

      const currentFireworks = fireworksRef.current;
      for (let i = 0; i < currentFireworks.length; i += 1) {
        const firework = currentFireworks[i];

        if (!firework.exploded) {
          firework.x += firework.velocity.x;
          firework.y += firework.velocity.y;
          firework.velocity.y += 0.1;

          ctx.beginPath();
          ctx.arc(firework.x, firework.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = firework.color;
          ctx.fill();

          if (
            firework.y <= firework.timeToExplode ||
            firework.velocity.y >= 0 ||
            firework.x < 0 ||
            firework.x > width
          ) {
            if (firework.y > 0 && firework.y < height) {
              explodeFirework(firework);
            }
            firework.exploded = true;
          }
        } else {
          for (let j = 0; j < firework.particles.length; j += 1) {
            const particle = firework.particles[j];

            particle.x += particle.velocity.x;
            particle.y += particle.velocity.y;
            particle.velocity.y += 0.05;
            particle.alpha -= 1 / particle.lifetime;

            if (particle.alpha <= 0.1) {
              firework.particles.splice(j, 1);
              j -= 1;
              continue;
            }

            ctx.globalAlpha = particle.alpha;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = particle.color;
            ctx.fill();
            ctx.globalAlpha = 1;
          }

          if (firework.particles.length === 0) {
            currentFireworks.splice(i, 1);
            i -= 1;
          }
        }
      }

      // Spawn new rockets only while we're within the spawn window.
      const now = Date.now();
      const spawnExpired =
        typeof spawnDurationMs === 'number' && now - mountedAtRef.current >= spawnDurationMs;
      if (!spawnExpired && now - lastFireworkTimeRef.current > 1000 + Math.random() * 2000) {
        const numberOfFireworks = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < numberOfFireworks; i += 1) {
          createFirework();
        }
        lastFireworkTimeRef.current = now;
      }

      animationFrameRef.current = requestAnimationFrame(updateAndDraw);
    };

    // Kick things off with an immediate volley so the effect lands instantly
    // instead of waiting on the first random spawn interval.
    for (let i = 0; i < 3; i += 1) {
      createFirework();
    }
    lastFireworkTimeRef.current = Date.now();
    mountedAtRef.current = Date.now();

    animationFrameRef.current = requestAnimationFrame(updateAndDraw);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [spawnDurationMs]);

  return (
    <div className={cn('relative w-full h-full overflow-hidden', className)}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
};
