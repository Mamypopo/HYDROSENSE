'use client';

import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

type SceneProps = { waterOk: boolean | null; pumpOn: boolean | null; hot: boolean; reduce: boolean };

// ฉาก: ถังกระจกมีผักสลัด 3 ต้นอยู่บนฝา ปั๊มหน้าตายิ้มอยู่ข้างๆ ต่อกันด้วยท่อ
const TANK = { w: 1.7, h: 1.9, d: 1.2, cx: -0.62 };
const WALL = 0.06;
const PIPE_Y = -0.7;
const PIPE_X0 = TANK.cx + TANK.w / 2;
const PUMP_X = 1.5;
const PIPE_X1 = PUMP_X - 0.34;
const FLOAT_LEVEL = 0.5;
const N_DROPS = 10;
const PLANT_X = [-0.5, 0, 0.5];
const LID_TOP = TANK.h / 2 + 0.1;

const GREEN = new THREE.Color('#6cc36b');
const GREEN_IN = new THREE.Color('#a6e37e');
const STRESS = new THREE.Color('#c9c45a');
const STRESS_IN = new THREE.Color('#e0d576');

type Leaf = { angle: number; r: number; size: number; tilt: number; inner: boolean };
const LEAVES: Leaf[] = [
  ...Array.from({ length: 6 }, (_, i) => ({ angle: (i / 6) * Math.PI * 2, r: 0.14, size: 1, tilt: 0.85, inner: false })),
  ...Array.from({ length: 5 }, (_, i) => ({ angle: (i / 5) * Math.PI * 2 + 0.3, r: 0.07, size: 0.72, tilt: 1.2, inner: true })),
];

function Scene({ waterOk, pumpOn, hot, reduce }: SceneProps) {
  const { viewport, invalidate } = useThree();
  const group = useRef<THREE.Group>(null!);
  const water = useRef<THREE.Mesh>(null!);
  const surface = useRef<THREE.Mesh>(null!);
  const prop = useRef<THREE.Group>(null!);
  const drops = useRef<THREE.InstancedMesh>(null!);
  const plants = useRef<(THREE.Group | null)[]>([]);
  const leaves = useRef<(THREE.Mesh | null)[]>([]);
  const eyes = useRef<(THREE.Mesh | null)[]>([]);
  const matOut = useMemo(() => new THREE.MeshStandardMaterial({ color: GREEN, roughness: 0.7, side: THREE.DoubleSide }), []);
  const matIn = useMemo(() => new THREE.MeshStandardMaterial({ color: GREEN_IN, roughness: 0.7, side: THREE.DoubleSide }), []);

  const target = waterOk === false ? 0.2 : waterOk === null ? FLOAT_LEVEL : 0.82;
  const droopTarget = waterOk === false ? 1 : hot ? 0.55 : 0;
  const level = useRef(reduce ? target : 0);
  const droop = useRef(reduce ? droopTarget : 0);
  const appear = useRef(reduce ? 1 : 0);
  const spin = useRef(0);
  const flow = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const tankGeo = useMemo(() => new RoundedBoxGeometry(TANK.w, TANK.h, TANK.d, 4, 0.14), []);
  const lidGeo = useMemo(() => new RoundedBoxGeometry(TANK.w + 0.08, 0.1, TANK.d + 0.08, 4, 0.04), []);
  const waterGeo = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 3, 0.08), []);
  const pumpGeo = useMemo(() => new RoundedBoxGeometry(0.66, 0.62, 0.56, 4, 0.18), []);
  const rim = waterOk === false ? '#ff8a80' : hot ? '#ffb27a' : '#bdf0f5';

  const innerH = TANK.h - WALL * 2;
  const bottom = -TANK.h / 2 + WALL;
  const fitScale = () => Math.min(1.15, viewport.width / 3.9, (viewport.height * 0.46) / 2.8);

  const applyWater = () => {
    const h = Math.max(0.001, innerH * level.current);
    water.current.scale.y = h;
    water.current.position.y = bottom + h / 2;
    surface.current.position.y = bottom + h;
  };

  const applyPlants = (t: number) => {
    const d = droop.current;
    matOut.color.copy(GREEN).lerp(STRESS, d);
    matIn.color.copy(GREEN_IN).lerp(STRESS_IN, d);
    leaves.current.forEach((m, i) => {
      if (!m) return;
      const l = LEAVES[i % LEAVES.length];
      m.rotation.z = l.tilt - d * (l.inner ? 0.55 : 1.0);
    });
    plants.current.forEach((g, i) => {
      if (!g) return;
      g.rotation.z = Math.sin(t * 1.3 + i * 1.7) * 0.05;
      g.rotation.x = Math.cos(t * 1.1 + i) * 0.04;
      g.scale.y = 1 - d * 0.1;
    });
  };

  useEffect(() => {
    if (!reduce) return;
    level.current = target;
    droop.current = droopTarget;
    applyWater();
    applyPlants(0);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, droopTarget, reduce, pumpOn]);

  useFrame((state, delta) => {
    if (reduce) return;
    const t = state.clock.elapsedTime;

    appear.current = Math.min(1, appear.current + delta / 1.4);
    const ease = 1 - Math.pow(1 - appear.current, 3);
    // เด้งเข้ามาเล็กน้อยแล้วนิ่ง เป็นจังหวะเดียวของการ์ดตอนเปิดหน้า
    const pop = ease + Math.sin(ease * Math.PI) * 0.05;
    group.current.scale.setScalar(fitScale() * (0.8 + 0.2 * pop));
    group.current.position.y = viewport.height * 0.15 - 0.15 + Math.sin(t * 0.9) * 0.03;
    group.current.rotation.y = -0.4 + Math.sin(t * 0.35) * 0.15;

    level.current += (target - level.current) * (1 - Math.exp(-delta * 2.2));
    droop.current += (droopTarget - droop.current) * (1 - Math.exp(-delta * 1.6));
    applyWater();
    applyPlants(t);

    spin.current += ((pumpOn ? 1 : 0) - spin.current) * (1 - Math.exp(-delta * 4));
    flow.current += ((pumpOn ? 1 : 0) - flow.current) * (1 - Math.exp(-delta * 4));
    prop.current.rotation.y += delta * 12 * spin.current;

    const blink = t % 4 < 0.12 ? 0.12 : 1;
    eyes.current.forEach((e) => e && (e.scale.y = blink));

    for (let i = 0; i < N_DROPS; i++) {
      const p = (t * 0.8 + i / N_DROPS) % 1;
      dummy.position.set(PIPE_X0 + p * (PIPE_X1 - PIPE_X0), PIPE_Y, 0);
      dummy.scale.setScalar(flow.current);
      dummy.updateMatrix();
      drops.current.setMatrixAt(i, dummy.matrix);
    }
    drops.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={group} scale={fitScale()} position={[0, viewport.height * 0.15 - 0.15, 0]} rotation={[0, -0.4, 0]}>
      {/* ถังกระจก */}
      <group position={[TANK.cx, 0, 0]}>
        <mesh geometry={tankGeo}>
          <meshPhysicalMaterial color="#e6f8fa" transparent opacity={0.16} roughness={0.05} depthWrite={false} />
        </mesh>
        <mesh geometry={tankGeo} scale={1.012}>
          <meshBasicMaterial color={rim} transparent opacity={0.3} side={THREE.BackSide} depthWrite={false} />
        </mesh>

        {/* น้ำ */}
        <mesh ref={water} geometry={waterGeo} position={[0, bottom, 0]} scale={[TANK.w - WALL * 2, 0.001, TANK.d - WALL * 2]}>
          <meshStandardMaterial color="#58c3d3" transparent opacity={0.8} roughness={0.2} emissive="#2a8fa0" emissiveIntensity={0.35} />
        </mesh>
        <mesh ref={surface} rotation={[-Math.PI / 2, 0, 0]} position={[0, bottom, 0]}>
          <planeGeometry args={[TANK.w - WALL * 2 - 0.06, TANK.d - WALL * 2 - 0.06]} />
          <meshBasicMaterial color="#d6f6fa" transparent opacity={0.5} />
        </mesh>

        {/* ลูกลอย */}
        <mesh position={[0, -TANK.h / 2 + TANK.h * FLOAT_LEVEL, 0]}>
          <boxGeometry args={[TANK.w - 0.04, 0.012, TANK.d - 0.04]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.25} />
        </mesh>
        <mesh position={[TANK.w / 2 - 0.22, -TANK.h / 2 + TANK.h * FLOAT_LEVEL, 0.22]}>
          <sphereGeometry args={[0.1, 20, 20]} />
          <meshStandardMaterial color="#ffffff" roughness={0.35} />
        </mesh>

        {/* ฝาถัง */}
        <mesh geometry={lidGeo} position={[0, TANK.h / 2 + 0.05, 0]}>
          <meshStandardMaterial color="#f4f7f1" roughness={0.6} />
        </mesh>

        {/* ผักสลัด 3 ต้น พร้อมรากห้อยลงน้ำ */}
        {PLANT_X.map((x, pi) => (
          <group key={pi} position={[x, 0, 0]}>
            <mesh position={[0, LID_TOP + 0.04, 0]}>
              <cylinderGeometry args={[0.21, 0.16, 0.16, 24]} />
              <meshStandardMaterial color="#ffffff" roughness={0.5} />
            </mesh>
            {[-0.05, 0.02, 0.07].map((rx, ri) => (
              <mesh key={ri} position={[rx, TANK.h / 2 - 0.22, ri * 0.03 - 0.03]}>
                <cylinderGeometry args={[0.012, 0.008, 0.5, 6]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
              </mesh>
            ))}
            <group ref={(g) => { plants.current[pi] = g; }} position={[0, LID_TOP + 0.1, 0]}>
              <mesh position={[0, 0.07, 0]} material={matIn}>
                <sphereGeometry args={[0.1, 14, 12]} />
              </mesh>
              {LEAVES.map((l, li) => (
                <group key={li} rotation={[0, l.angle, 0]} position={[0, l.inner ? 0.07 : 0.02, 0]}>
                  <mesh
                    ref={(m) => { leaves.current[pi * LEAVES.length + li] = m; }}
                    position={[l.r, 0, 0]}
                    rotation={[0, 0, l.tilt]}
                    scale={[0.24 * l.size, 0.05 * l.size, 0.15 * l.size]}
                    material={l.inner ? matIn : matOut}
                  >
                    <sphereGeometry args={[1, 14, 10]} />
                  </mesh>
                </group>
              ))}
            </group>
          </group>
        ))}
      </group>

      {/* ท่อ */}
      <mesh position={[(PIPE_X0 + PIPE_X1) / 2, PIPE_Y, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, PIPE_X1 - PIPE_X0, 16]} />
        <meshStandardMaterial color="#5aa5ad" roughness={0.5} />
      </mesh>
      <instancedMesh ref={drops} args={[undefined, undefined, N_DROPS]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshBasicMaterial color="#d6f6fa" />
      </instancedMesh>

      {/* ปั๊มหน้ายิ้ม มีใบพัดเล็กๆ บนหัว */}
      <group position={[PUMP_X, PIPE_Y, 0]}>
        <mesh geometry={pumpGeo}>
          <meshStandardMaterial color="#ffd166" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.34, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.08, 10]} />
          <meshStandardMaterial color="#e8b84a" />
        </mesh>
        <group ref={prop} position={[0, 0.4, 0]}>
          {[0, 1].map((i) => (
            <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
              <boxGeometry args={[0.46, 0.02, 0.07]} />
              <meshStandardMaterial color="#ff7b6b" />
            </mesh>
          ))}
        </group>
        {/* หน้า */}
        {[-0.14, 0.14].map((ex, i) => (
          <mesh key={i} ref={(m) => { eyes.current[i] = m; }} position={[ex, 0.07, 0.285]}>
            <sphereGeometry args={[0.055, 14, 14]} />
            <meshBasicMaterial color="#2b2b2b" />
          </mesh>
        ))}
        {[-0.22, 0.22].map((cx, i) => (
          <mesh key={i} position={[cx, -0.05, 0.283]}>
            <circleGeometry args={[0.05, 16]} />
            <meshBasicMaterial color="#ff8fa3" transparent opacity={0.65} />
          </mesh>
        ))}
        {pumpOn ? (
          <mesh position={[0, -0.04, 0.287]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.07, 0.016, 8, 16, Math.PI]} />
            <meshBasicMaterial color="#2b2b2b" />
          </mesh>
        ) : (
          <mesh position={[0, -0.09, 0.287]}>
            <boxGeometry args={[0.09, 0.018, 0.01]} />
            <meshBasicMaterial color="#2b2b2b" />
          </mesh>
        )}
      </group>

      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 4, 5]} intensity={1.5} />
      <pointLight position={[-3, -2, 3]} intensity={5} color="#58c3d3" />
    </group>
  );
}

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function TankScene({ waterOk, pumpOn, hot }: { waterOk: boolean | null; pumpOn: boolean | null; hot: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setReduce(matchMedia('(prefers-reduced-motion: reduce)').matches);
    const el = wrap.current;
    if (!el) return;
    // หยุดวาดเมื่อฮีโร่เลื่อนพ้นจอหรือถูกแผ่นเนื้อหาบัง ประหยัดแบตมือถือ
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className="pointer-events-none absolute inset-0 z-[-5]" aria-hidden="true">
      <Boundary>
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [0, 0.4, 6.2], fov: 35 }}
          gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
          frameloop={visible ? (reduce ? 'demand' : 'always') : 'never'}
        >
          <Scene waterOk={waterOk} pumpOn={pumpOn} hot={hot} reduce={reduce} />
        </Canvas>
      </Boundary>
    </div>
  );
}
