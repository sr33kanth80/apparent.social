import { useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import type { HiringCompany } from '@/lib/apparent-types';
import { layoutCity, project, STOREY_H, TILE_H, TILE_W, type Plot } from './iso-layout';

/**
 * Stylised isometric city, drawn on a canvas.
 *
 * Deliberately not a GIS map: buildings are hand-feeling blocks on a grid, sized
 * by how many roles a company has open, so the skyline itself carries the
 * information. Canvas rather than DOM because a busy city is hundreds of
 * buildings and each needs redrawing on every pan frame.
 */

export type IsoMapHandle = {
  /** Glide the camera onto one company's building. */
  focusCompany: (domain: string) => void;
};

type IsoMapProps = {
  companies: HiringCompany[];
  selectedDomain: string | null;
  onSelect: (company: HiringCompany | null) => void;
};

type Camera = { x: number; y: number; zoom: number };

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.6;

// Soft greys and crisp whites for the city, one bright accent for what is
// selected — the palette does the work of telling you where you are.
const COLOURS = {
  ground: '#f4efe9',
  tileFill: '#ece5dc',
  tileEdge: '#e0d7cb',
  roofTop: '#ffffff',
  roofLeft: '#d9d0c4',
  roofRight: '#c8bdae',
  outline: '#b3a795',
  selectedTop: '#5ec1ff',
  selectedLeft: '#1d9bf0',
  selectedRight: '#0b6cab',
  hoverTop: '#fff3d6',
  hoverLeft: '#f0dcae',
  hoverRight: '#dcc48d',
  label: '#3d3730',
};

export const IsoMap = forwardRef<IsoMapHandle, IsoMapProps>(function IsoMap(
  { companies, selectedDomain, onSelect },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
  const plotsRef = useRef<Plot[]>([]);
  const hoverRef = useRef<string | null>(null);
  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number; moved: boolean }>({
    active: false,
    lastX: 0,
    lastY: 0,
    moved: false,
  });
  const animationRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  plotsRef.current = layoutCity(companies);

  /** Painter's algorithm: far plots first so near buildings overlap them. */
  const drawOrder = useCallback(
    () => [...plotsRef.current].sort((a, b) => a.gx + a.gy - (b.gx + b.gy)),
    [],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = COLOURS.ground;
    ctx.fillRect(0, 0, width, height);

    const cam = cameraRef.current;
    ctx.save();
    ctx.translate(width / 2 + cam.x, height / 2 + cam.y);
    ctx.scale(cam.zoom, cam.zoom);

    const ordered = drawOrder();

    // Ground plots first, so buildings sit on a visible city block.
    for (const plot of ordered) {
      const { x, y } = project(plot.gx, plot.gy);
      ctx.beginPath();
      ctx.moveTo(x, y - TILE_H / 2);
      ctx.lineTo(x + TILE_W / 2, y);
      ctx.lineTo(x, y + TILE_H / 2);
      ctx.lineTo(x - TILE_W / 2, y);
      ctx.closePath();
      ctx.fillStyle = COLOURS.tileFill;
      ctx.fill();
      ctx.strokeStyle = COLOURS.tileEdge;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (const plot of ordered) {
      const { x, y } = project(plot.gx, plot.gy);
      const h = plot.height * STOREY_H;
      const isSelected = plot.company.domain === selectedDomain;
      const isHover = plot.company.domain === hoverRef.current;

      const top = isSelected ? COLOURS.selectedTop : isHover ? COLOURS.hoverTop : COLOURS.roofTop;
      const left = isSelected ? COLOURS.selectedLeft : isHover ? COLOURS.hoverLeft : COLOURS.roofLeft;
      const right = isSelected
        ? COLOURS.selectedRight
        : isHover
          ? COLOURS.hoverRight
          : COLOURS.roofRight;

      const inset = 6;
      const halfW = TILE_W / 2 - inset;
      const halfH = TILE_H / 2 - inset / 2;

      // Left face.
      ctx.beginPath();
      ctx.moveTo(x - halfW, y);
      ctx.lineTo(x, y + halfH);
      ctx.lineTo(x, y + halfH - h);
      ctx.lineTo(x - halfW, y - h);
      ctx.closePath();
      ctx.fillStyle = left;
      ctx.fill();
      ctx.strokeStyle = COLOURS.outline;
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // Right face.
      ctx.beginPath();
      ctx.moveTo(x + halfW, y);
      ctx.lineTo(x, y + halfH);
      ctx.lineTo(x, y + halfH - h);
      ctx.lineTo(x + halfW, y - h);
      ctx.closePath();
      ctx.fillStyle = right;
      ctx.fill();
      ctx.stroke();

      // Roof.
      ctx.beginPath();
      ctx.moveTo(x, y - halfH - h);
      ctx.lineTo(x + halfW, y - h);
      ctx.lineTo(x, y + halfH - h);
      ctx.lineTo(x - halfW, y - h);
      ctx.closePath();
      ctx.fillStyle = top;
      ctx.fill();
      ctx.stroke();

    }

    /**
     * Labels last, with collision avoidance.
     *
     * A name on every roof is unreadable the moment a city has more than a
     * dozen buildings. Tallest first means the biggest hirers keep their label
     * and the long tail quietly drops its own rather than overprinting.
     * Selection and hover jump the queue so the thing being pointed at is
     * always named.
     */
    ctx.textAlign = 'center';
    const taken: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    const labelPriority = [...ordered].sort((a, b) => {
      const rank = (plot: Plot) =>
        plot.company.domain === selectedDomain ? 2 : plot.company.domain === hoverRef.current ? 1 : 0;
      return rank(b) - rank(a) || b.height - a.height;
    });

    for (const plot of labelPriority) {
      const isSelected = plot.company.domain === selectedDomain;
      const isHover = plot.company.domain === hoverRef.current;
      const forced = isSelected || isHover;
      if (!forced && cam.zoom < 0.8) continue;

      const { x, y } = project(plot.gx, plot.gy);
      const h = plot.height * STOREY_H;
      const label =
        plot.company.name.length > 22 ? `${plot.company.name.slice(0, 21)}…` : plot.company.name;

      ctx.font = `${isSelected ? '600 ' : ''}11px ui-sans-serif, system-ui, sans-serif`;
      const halfText = ctx.measureText(label).width / 2 + 3;
      const ly = y - (TILE_H / 2 - 3) - h - 7;
      const box = { x1: x - halfText, y1: ly - 10, x2: x + halfText, y2: ly + 3 };

      const collides = taken.some(
        (other) => box.x1 < other.x2 && box.x2 > other.x1 && box.y1 < other.y2 && box.y2 > other.y1,
      );
      if (collides && !forced) continue;
      taken.push(box);

      // A soft plate keeps the name legible against a roof of any shade.
      if (forced) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);
      }
      ctx.fillStyle = isSelected ? COLOURS.selectedRight : COLOURS.label;
      ctx.fillText(label, x, ly);
    }

    ctx.restore();
  }, [drawOrder, selectedDomain]);

  const timeoutRef = useRef<number | null>(null);

  /**
   * Coalesce repaints into one frame. A timer races the frame because
   * requestAnimationFrame does not fire in every context that claims to be
   * visible; without the fallback, dragging the map silently stops repainting.
   * Whichever fires first cancels the other.
   */
  const scheduleDraw = useCallback(() => {
    if (frameRef.current != null || timeoutRef.current != null) return;

    const run = () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      if (timeoutRef.current != null) clearTimeout(timeoutRef.current);
      frameRef.current = null;
      timeoutRef.current = null;
      draw();
    };

    frameRef.current = requestAnimationFrame(run);
    timeoutRef.current = window.setTimeout(run, 32);
  }, [draw]);

  /** Which building is under a screen point, testing near buildings first. */
  const hitTest = useCallback((clientX: number, clientY: number): Plot | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cam = cameraRef.current;
    const px = (clientX - rect.left - rect.width / 2 - cam.x) / cam.zoom;
    const py = (clientY - rect.top - rect.height / 2 - cam.y) / cam.zoom;

    // Reverse draw order: whatever is drawn last is on top.
    const ordered = drawOrder().reverse();
    for (const plot of ordered) {
      const { x, y } = project(plot.gx, plot.gy);
      const h = plot.height * STOREY_H;
      const halfW = TILE_W / 2 - 6;
      const halfH = TILE_H / 2 - 3;
      // Bounding box over the whole extruded block is close enough for picking
      // and far cheaper than three polygon tests per building.
      if (px >= x - halfW && px <= x + halfW && py >= y - halfH - h && py <= y + halfH) {
        return plot;
      }
    }
    return null;
  }, [drawOrder]);

  /** Ease the camera to a target, cancelling any flight already in progress. */
  const glideTo = useCallback(
    (target: Camera, duration = 520) => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      const start = { ...cameraRef.current };
      const startedAt = performance.now();

      // If frames never arrive, the flight must still finish: landing at the
      // destination without the animation beats never getting there.
      let started = false;
      const bail = window.setTimeout(() => {
        if (started) return;
        cameraRef.current = target;
        draw();
      }, 120);

      const step = (now: number) => {
        started = true;
        clearTimeout(bail);
        const t = Math.min(1, (now - startedAt) / duration);
        // easeOutCubic keeps the arrival soft rather than abrupt.
        const e = 1 - (1 - t) ** 3;
        cameraRef.current = {
          x: start.x + (target.x - start.x) * e,
          y: start.y + (target.y - start.y) * e,
          zoom: start.zoom + (target.zoom - start.zoom) * e,
        };
        scheduleDraw();
        if (t < 1) animationRef.current = requestAnimationFrame(step);
        else animationRef.current = null;
      };
      animationRef.current = requestAnimationFrame(step);
    },
    [draw, scheduleDraw],
  );

  const centreOn = useCallback(
    (plot: Plot, zoom: number) => {
      const { x, y } = project(plot.gx, plot.gy);
      glideTo({ x: -x * zoom, y: -y * zoom + 40, zoom });
    },
    [glideTo],
  );

  useImperativeHandle(ref, () => ({
    focusCompany: (domain: string) => {
      const plot = plotsRef.current.find((p) => p.company.domain === domain);
      if (plot) centreOn(plot, 1.7);
    },
  }));

  // Pointer: drag to pan, click to select, double-click to zoom in.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const onPointerDown = (event: PointerEvent) => {
      dragRef.current = { active: true, lastX: event.clientX, lastY: event.clientY, moved: false };
      canvas.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (drag.active) {
        const dx = event.clientX - drag.lastX;
        const dy = event.clientY - drag.lastY;
        // A few pixels of slop, so a click with a shaky hand is still a click.
        if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
        drag.lastX = event.clientX;
        drag.lastY = event.clientY;
        cameraRef.current = {
          ...cameraRef.current,
          x: cameraRef.current.x + dx,
          y: cameraRef.current.y + dy,
        };
        scheduleDraw();
        return;
      }

      const hit = hitTest(event.clientX, event.clientY);
      const domain = hit?.company.domain ?? null;
      if (domain !== hoverRef.current) {
        hoverRef.current = domain;
        canvas.style.cursor = domain ? 'pointer' : 'grab';
        scheduleDraw();
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      dragRef.current = { ...drag, active: false };
      if (drag.moved) return; // that was a pan, not a click
      const hit = hitTest(event.clientX, event.clientY);
      onSelect(hit ? hit.company : null);
    };

    const onDoubleClick = (event: MouseEvent) => {
      const hit = hitTest(event.clientX, event.clientY);
      if (hit) {
        onSelect(hit.company);
        centreOn(hit, Math.min(MAX_ZOOM, Math.max(1.7, cameraRef.current.zoom * 1.6)));
      }
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const cam = cameraRef.current;
      const rect = canvas.getBoundingClientRect();
      // Zoom toward the cursor rather than the centre, so the thing being
      // pointed at stays put.
      const cx = event.clientX - rect.left - rect.width / 2;
      const cy = event.clientY - rect.top - rect.height / 2;
      const factor = Math.exp(-event.deltaY * 0.0015);
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cam.zoom * factor));
      const ratio = zoom / cam.zoom;
      cameraRef.current = {
        zoom,
        x: cx - (cx - cam.x) * ratio,
        y: cy - (cy - cam.y) * ratio,
      };
      scheduleDraw();
    };

    canvas.style.cursor = 'grab';
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('dblclick', onDoubleClick);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('dblclick', onDoubleClick);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [centreOn, hitTest, onSelect, scheduleDraw]);

  // Arrow keys pan; ignored while typing so search and forms keep their keys.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      const step = event.shiftKey ? 160 : 70;
      const moves: Record<string, [number, number]> = {
        ArrowUp: [0, step],
        ArrowDown: [0, -step],
        ArrowLeft: [step, 0],
        ArrowRight: [-step, 0],
      };
      const move = moves[event.key];
      if (!move) return;
      event.preventDefault();
      const cam = cameraRef.current;
      glideTo({ ...cam, x: cam.x + move[0], y: cam.y + move[1] }, 260);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [glideTo]);

  /**
   * Frame the whole city, once per city.
   *
   * Deliberately not run from an effect on mount: the canvas has no measured
   * size until layout settles, and fitting against a zero-width canvas clamps
   * straight to minimum zoom and renders the city as a speck. This is called
   * from the draw path instead, where the dimensions are real.
   */
  const fittedFor = useRef<string>('');
  const fitToCity = useCallback(() => {
    const canvas = canvasRef.current;
    const plots = plotsRef.current;
    if (!canvas || !plots.length) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return; // not laid out yet; try again next paint

    const signature = `${plots.length}:${plots[0]?.company.domain ?? ''}`;
    if (fittedFor.current === signature) return;
    fittedFor.current = signature;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const plot of plots) {
      const { x, y } = project(plot.gx, plot.gy);
      minX = Math.min(minX, x - TILE_W);
      maxX = Math.max(maxX, x + TILE_W);
      minY = Math.min(minY, y - plot.height * STOREY_H - TILE_H);
      maxY = Math.max(maxY, y + TILE_H);
    }

    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    // Margins keep the outermost buildings off the edges and clear of the
    // floating header.
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min((width * 0.72) / spanX, (height * 0.6) / spanY)));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    cameraRef.current = { zoom, x: -cx * zoom, y: -cy * zoom + 20 };
  }, []);

  useEffect(() => {
    // Painted synchronously, not through requestAnimationFrame. rAF is for
    // coalescing pan and zoom frames; leaning on it for the FIRST paint means
    // the map never appears at all wherever frames are throttled -- a
    // background tab, or an embedded webview that reports itself visible while
    // never compositing.
    fitToCity();
    draw();
    const onResize = () => {
      // A resize changes what "fits", so allow one refit.
      fittedFor.current = '';
      fitToCity();
      scheduleDraw();
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      if (timeoutRef.current != null) clearTimeout(timeoutRef.current);
      if (animationRef.current != null) cancelAnimationFrame(animationRef.current);
    };
  }, [draw, fitToCity, scheduleDraw, companies, selectedDomain]);

  return <canvas ref={canvasRef} className="h-full w-full touch-none select-none" />;
});
