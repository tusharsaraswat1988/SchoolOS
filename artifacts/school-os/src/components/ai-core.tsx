import { useEffect, useRef } from "react";

type AiCoreProps = {
  size?: number;
  charged?: boolean;
};

type Node = { x: number; y: number; z: number };

/**
 * Canvas neural core: a rotating node-sphere that leans toward the pointer
 * and pulses energy. Evokes an "AI mind" without drawing a literal brain.
 */
export function AiCore({ size = 184, charged = false }: AiCoreProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const chargedRef = useRef(charged);
  const stateRef = useRef({
    rotX: 0,
    rotY: 0,
    targetRotX: 0,
    targetRotY: 0,
    energy: 0.2,
    targetEnergy: 0.2,
    pulse: 0,
  });

  chargedRef.current = charged;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.33;

    const N = 96;
    const nodes: Node[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i += 1) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      nodes.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
    }

    const pairs: Array<[number, number]> = [];
    for (let i = 0; i < N; i += 1) {
      for (let j = i + 1; j < N; j += 1) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dz = nodes[i].z - nodes[j].z;
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.46) pairs.push([i, j]);
      }
    }

    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - (rect.left + rect.width / 2);
      const my = e.clientY - (rect.top + rect.height / 2);
      const dist = Math.hypot(mx, my);
      const influence = Math.max(0, 1 - dist / 460);
      const s = stateRef.current;
      s.targetRotY = (mx / 240) * 0.95;
      s.targetRotX = (-my / 240) * 0.95;
      s.targetEnergy = 0.28 + influence * 0.72;
    };

    const handleLeave = () => {
      const s = stateRef.current;
      s.targetRotX = 0;
      s.targetRotY = 0;
      s.targetEnergy = 0.2;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseout", handleLeave);

    let autoSpin = 0;

    const render = () => {
      const s = stateRef.current;
      s.rotX += (s.targetRotX - s.rotX) * 0.06;
      s.rotY += (s.targetRotY - s.rotY) * 0.06;
      const targetE = chargedRef.current ? 1.6 : s.targetEnergy;
      s.energy += (targetE - s.energy) * 0.08;
      s.pulse += 0.045;
      autoSpin += 0.0015;

      ctx.clearRect(0, 0, size, size);

      const ry = s.rotY + autoSpin;
      const rx = s.rotX;
      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);

      const proj = nodes.map((n) => {
        const x = n.x * cosY - n.z * sinY;
        const z = n.x * sinY + n.z * cosY;
        const y = n.y;
        const y2 = y * cosX - z * sinX;
        const z2 = y * sinX + z * cosX;
        const persp = 1 / (1.65 - z2 * 0.5);
        return {
          sx: cx + x * radius * persp,
          sy: cy + y2 * radius * persp,
          depth: (z2 + 1) / 2,
        };
      });

      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.7);
      const corePulse = 0.16 + s.energy * 0.24 + Math.sin(s.pulse) * 0.03;
      coreGrad.addColorStop(0, `rgba(99,130,246,${corePulse})`);
      coreGrad.addColorStop(0.6, `rgba(99,130,246,${corePulse * 0.4})`);
      coreGrad.addColorStop(1, "rgba(99,130,246,0)");
      ctx.fillStyle = coreGrad;
      ctx.fillRect(0, 0, size, size);

      for (const [i, j] of pairs) {
        const a = proj[i];
        const b = proj[j];
        const depth = (a.depth + b.depth) / 2;
        const alpha = (0.04 + depth * 0.2) * (0.6 + s.energy * 0.7);
        ctx.strokeStyle = `rgba(96,134,246,${alpha})`;
        ctx.lineWidth = 0.5 + depth * 0.6;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }

      proj.forEach((p, idx) => {
        const twinkle = 0.5 + 0.5 * Math.sin(s.pulse + idx);
        const r = (0.8 + p.depth * 2.4) * (1 + s.energy * 0.3);
        const alpha = (0.28 + p.depth * 0.6) * (0.7 + twinkle * 0.3);
        ctx.fillStyle = `rgba(129,160,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseout", handleLeave);
    };
  }, [size]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} className="block" />;
}
