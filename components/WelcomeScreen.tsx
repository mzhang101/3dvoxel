/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useT } from '../i18n/LocaleContext';

interface WelcomeScreenProps {
  visible: boolean;
  onStart: () => void;
}

const BRICK_SIZES = [
  [1, 1], [1, 2], [2, 2], [2, 4], [1, 1], [1, 2],
] as const;

const BRICK_COLORS = [
  0xf87171, 0xfb923c, 0xfbbf24, 0x4ade80, 0x60a5fa,
  0xa78bfa, 0xf472b6, 0x38bdf8, 0x34d399, 0xfcd34d,
  0xc084fc, 0xfb7185, 0x2dd4bf, 0x818cf8, 0xf9a8d4,
  0xa3e635, 0xe879f9, 0x67e8f9,
];

const UNIT = 0.3;
const STUD_RADIUS = 0.08;
const STUD_HEIGHT = 0.06;
const BRICK_HEIGHT = 0.24;

function createBrickGeometry(sx: number, sy: number): THREE.BufferGeometry {
  const w = sx * UNIT;
  const d = sy * UNIT;

  const body = new THREE.BoxGeometry(w, BRICK_HEIGHT, d);
  const studs: THREE.CylinderGeometry[] = [];

  for (let ix = 0; ix < sx; ix++) {
    for (let iy = 0; iy < sy; iy++) {
      const stud = new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 12);
      stud.translate(
        (ix - (sx - 1) / 2) * UNIT,
        BRICK_HEIGHT / 2 + STUD_HEIGHT / 2,
        (iy - (sy - 1) / 2) * UNIT,
      );
      studs.push(stud);
    }
  }

  const merged = new THREE.BufferGeometry();
  const geos = [body, ...studs];
  let totalVerts = 0;
  let totalIdx = 0;
  for (const g of geos) {
    totalVerts += g.attributes.position.count;
    totalIdx += (g.index?.count ?? 0);
  }

  const pos = new Float32Array(totalVerts * 3);
  const norm = new Float32Array(totalVerts * 3);
  const idx = new Uint32Array(totalIdx);
  let vOff = 0;
  let iOff = 0;
  for (const g of geos) {
    const p = g.attributes.position as THREE.BufferAttribute;
    const n = g.attributes.normal as THREE.BufferAttribute;
    pos.set(p.array as Float32Array, vOff * 3);
    norm.set(n.array as Float32Array, vOff * 3);
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) {
        idx[iOff + i] = g.index.array[i] + vOff;
      }
      iOff += g.index.count;
    }
    vOff += p.count;
  }

  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  merged.setIndex(new THREE.BufferAttribute(idx, 1));
  for (const g of geos) g.dispose();
  return merged;
}

interface BrickState {
  mesh: THREE.Mesh;
  rx: number;
  ry: number;
  rz: number;
  bobPhase: number;
  bobAmp: number;
  baseY: number;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ visible, onStart }) => {
  const t = useT();
  const canvasRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const bricksRef = useRef<BrickState[]>([]);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!visible || !canvasRef.current) return;

    const container = canvasRef.current;
    const w = window.innerWidth;
    const h = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.set(0, 0, 8);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 8, 6);
    scene.add(dir);

    const bricks: BrickState[] = [];
    const count = 18;
    for (let i = 0; i < count; i++) {
      const [sx, sy] = BRICK_SIZES[i % BRICK_SIZES.length];
      const color = BRICK_COLORS[i % BRICK_COLORS.length];
      const geo = createBrickGeometry(sx, sy);
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.35,
        metalness: 0.05,
      });
      const mesh = new THREE.Mesh(geo, mat);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.5 + Math.random() * 2;
      mesh.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi) - 2,
      );
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      );

      scene.add(mesh);
      bricks.push({
        mesh,
        rx: (Math.random() - 0.5) * 0.3,
        ry: (Math.random() - 0.5) * 0.3,
        rz: (Math.random() - 0.5) * 0.15,
        bobPhase: Math.random() * Math.PI * 2,
        bobAmp: 0.15 + Math.random() * 0.2,
        baseY: mesh.position.y,
      });
    }
    bricksRef.current = bricks;

    let t0 = performance.now();
    const animate = () => {
      const now = performance.now();
      const dt = (now - t0) / 1000;
      t0 = now;

      for (const b of bricks) {
        b.mesh.rotation.x += b.rx * dt;
        b.mesh.rotation.y += b.ry * dt;
        b.mesh.rotation.z += b.rz * dt;
        b.bobPhase += dt * 0.8;
        b.mesh.position.y = b.baseY + Math.sin(b.bobPhase) * b.bobAmp;
      }

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    const onResize = () => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      for (const b of bricks) {
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.MeshStandardMaterial).dispose();
      }
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [visible]);

  const handleStart = () => {
    setFading(true);
    setTimeout(() => {
      setFading(false);
      onStart();
    }, 600);
  };

  if (!visible && !fading) return null;

  return (
    <div
      className={`
        fixed inset-0 z-50 pointer-events-auto font-sans
        transition-opacity duration-600
        ${fading ? 'opacity-0' : 'opacity-100'}
      `}
    >
      {/* Three.js canvas background */}
      <div
        ref={canvasRef}
        className="absolute inset-0"
        style={{ background: 'linear-gradient(165deg, #f8fafc 0%, #eef2f7 42%, #e2e8f0 100%)' }}
      />

      <div className="absolute inset-0 bg-white/25" />

      {/* Centered content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full gap-8 select-none">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-6xl sm:text-7xl font-black tracking-tight text-slate-800 drop-shadow-sm">
            {t('welcome.title')}
          </h1>
          <p className="text-xl sm:text-2xl font-medium tracking-[0.25em] uppercase text-slate-500">
            {t('welcome.subtitle')}
          </p>
        </div>

        <button
          onClick={handleStart}
          className="
            mt-4 px-10 py-4 rounded-full text-lg font-bold tracking-wide
            bg-[#d4d76a] hover:bg-[#c5c85a] text-slate-900
            shadow-lg shadow-[#d4d76a]/30 border border-[#d4d76a]/50
            transition-all duration-200 active:scale-95 hover:scale-105
          "
        >
          {t('welcome.start')}
        </button>
      </div>
    </div>
  );
};
