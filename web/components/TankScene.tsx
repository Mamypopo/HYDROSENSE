'use client';

import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

type SceneProps = { waterOk: boolean | null; pumpOn: boolean | null; hot: boolean; reduce: boolean };

// หน่วยเป็นหน่วยโลกของฉาก ถังอยู่ซ้าย ปั๊มอยู่ขวา ต่อกันด้วยท่อ
const TANK = { w: 1.6, h: 2.0, d: 1.2, cx: -0.6 };
const WALL = 0.05;
const PIPE_Y = -0.72;
const PIPE_X0 = TANK.cx + TANK.w / 2;
const PUMP_X = 1.45;
const PIPE_X1 = PUMP_X - 0.34;
const FLOAT_LEVEL = 0.5; // ลูกลอยอยู่กลางถัง: น้ำสูงกว่าเส้นนี้ = ปกติ ต่ำกว่า = แห้ง
const N_DROPS = 10;

function Scene({ waterOk, pumpOn, hot, reduce }: SceneProps) {
  const { viewport, invalidate } = useThree();
  const group = useRef<THREE.Group>(null!);
  const water = useRef<THREE.Mesh>(null!);
  const surface = useRef<THREE.Mesh>(null!);
  const blades = useRef<THREE.Group>(null!);
  const drops = useRef<THREE.InstancedMesh>(null!);

  const target = waterOk === false ? 0.2 : waterOk === null ? FLOAT_LEVEL : 0.82;
  const level = useRef(reduce ? target : 0);
  const appear = useRef(reduce ? 1 : 0);
  const spin = useRef(0);
  const flow = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(TANK.w, TANK.h, TANK.d)), []);
  const edgeColor = waterOk === false ? '#ff8a80' : hot ? '#ffb27a' : '#9fd6dc';

  const innerH = TANK.h - WALL * 2;
  const bottom = -TANK.h / 2 + WALL;

  const applyWater = () => {
    const h = Math.max(0.001, innerH * level.current);
    water.current.scale.y = h;
    water.current.position.y = bottom + h / 2;
    surface.current.position.y = bottom + h;
  };

  // โหมดลดการเคลื่อนไหว: ไม่แอนิเมชัน แค่วาดใหม่เมื่อข้อมูลเปลี่ยน
  useEffect(() => {
    if (!reduce) return;
    level.current = target;
    applyWater();
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reduce, pumpOn, hot, waterOk]);

  useFrame((state, delta) => {
    if (reduce) return;
    const t = state.clock.elapsedTime;

    appear.current = Math.min(1, appear.current + delta / 1.4);
    const ease = 1 - Math.pow(1 - appear.current, 3);
    const s = Math.min(1.2, viewport.width / 3.7);
    group.current.scale.setScalar(s * (0.86 + 0.14 * ease));
    group.current.position.y = viewport.height * 0.17 + Math.sin(t * 0.8) * 0.03;
    group.current.rotation.y = -0.42 + Math.sin(t * 0.35) * 0.16;

    level.current += (target - level.current) * (1 - Math.exp(-delta * 2.2));
    applyWater();

    spin.current += ((pumpOn ? 1 : 0) - spin.current) * (1 - Math.exp(-delta * 4));
    flow.current += ((pumpOn ? 1 : 0) - flow.current) * (1 - Math.exp(-delta * 4));
    blades.current.rotation.z -= delta * 10 * spin.current;

    for (let i = 0; i < N_DROPS; i++) {
      const p = (t * 0.8 + i / N_DROPS) % 1;
      dummy.position.set(PIPE_X0 + p * (PIPE_X1 - PIPE_X0), PIPE_Y, 0);
      dummy.scale.setScalar(flow.current);
      dummy.updateMatrix();
      drops.current.setMatrixAt(i, dummy.matrix);
    }
    drops.current.instanceMatrix.needsUpdate = true;
  });

  const s0 = Math.min(1.2, viewport.width / 3.7);

  return (
    <group ref={group} scale={s0} position={[0, viewport.height * 0.17, 0]} rotation={[0, -0.42, 0]}>
      {/* ถัง */}
      <group position={[TANK.cx, 0, 0]}>
        <mesh>
          <boxGeometry args={[TANK.w, TANK.h, TANK.d]} />
          <meshPhysicalMaterial color="#d8f3f6" transparent opacity={0.14} roughness={0.05} depthWrite={false} />
        </mesh>
        <lineSegments geometry={edges}>
          <lineBasicMaterial color={edgeColor} />
        </lineSegments>

        {/* น้ำ */}
        <mesh ref={water} position={[0, bottom + 0.0005, 0]} scale={[TANK.w - WALL * 2, 0.001, TANK.d - WALL * 2]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#46b3c4" transparent opacity={0.78} roughness={0.25} emissive="#1d6b7a" emissiveIntensity={0.35} />
        </mesh>
        <mesh ref={surface} rotation={[-Math.PI / 2, 0, 0]} position={[0, bottom, 0]}>
          <planeGeometry args={[TANK.w - WALL * 2, TANK.d - WALL * 2]} />
          <meshBasicMaterial color="#c9f1f7" transparent opacity={0.55} />
        </mesh>

        {/* ลูกลอย */}
        <mesh position={[0, -TANK.h / 2 + TANK.h * FLOAT_LEVEL, 0]}>
          <boxGeometry args={[TANK.w - 0.02, 0.012, TANK.d - 0.02]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.28} />
        </mesh>
        <mesh position={[TANK.w / 2 - 0.2, -TANK.h / 2 + TANK.h * FLOAT_LEVEL, 0.2]}>
          <sphereGeometry args={[0.1, 20, 20]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
      </group>

      {/* ท่อ */}
      <mesh position={[(PIPE_X0 + PIPE_X1) / 2, PIPE_Y, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, PIPE_X1 - PIPE_X0, 16]} />
        <meshStandardMaterial color="#3e6a70" roughness={0.5} />
      </mesh>
      <instancedMesh ref={drops} args={[undefined, undefined, N_DROPS]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshBasicMaterial color="#c9f1f7" />
      </instancedMesh>

      {/* ปั๊ม */}
      <group position={[PUMP_X, PIPE_Y, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.34, 0.34, 0.5, 32]} />
          <meshStandardMaterial color="#16393e" roughness={0.45} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.26]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.28, 0.28, 0.02, 32]} />
          <meshStandardMaterial color="#8dbfc5" roughness={0.3} metalness={0.4} />
        </mesh>
        <group ref={blades} position={[0, 0, 0.29]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]} position={[0, 0, 0]}>
              <boxGeometry args={[0.06, 0.46, 0.03]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          ))}
        </group>
      </group>

      <ambientLight intensity={1.0} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      <pointLight position={[-3, -2, 3]} intensity={6} color="#46b3c4" />
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
    // หยุดวาดเมื่อฮีโร่ถูกแผ่นเนื้อหาบังหรือเลื่อนพ้นจอ ประหยัดแบตมือถือ
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className="pointer-events-none absolute inset-0 -z-[5]" aria-hidden="true">
      <Boundary>
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [0, 0.3, 6], fov: 35 }}
          gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
          frameloop={visible ? (reduce ? 'demand' : 'always') : 'never'}
        >
          <Scene waterOk={waterOk} pumpOn={pumpOn} hot={hot} reduce={reduce} />
        </Canvas>
      </Boundary>
    </div>
  );
}
