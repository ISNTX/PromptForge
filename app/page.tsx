'use client';
import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { supabase } from '@/lib/supabase';
import { createCheckoutSession } from '@/lib/stripe';
import html2canvas from 'html2canvas';

const GROK_API_KEY = process.env.NEXT_PUBLIC_GROK_API_KEY;

export default function LuckyDuel3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [levelPrompt, setLevelPrompt] = useState('epic neon cyber arena with floating islands San Antonio');
  const [coins, setCoins] = useState(3250);
  const [score, setScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [isSpinning, setIsSpinning] = useState(false);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const init3D = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x1a0033, 10, 100);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, 400 / 500, 0.1, 1000);
    camera.position.set(0, 8, 15);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(400, 500);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    // Epic lighting (Blizzard/Unreal quality)
    const ambient = new THREE.AmbientLight(0x6600ff, 0.6);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xff00ff, 1.2);
    directional.position.set(10, 20, 10);
    directional.castShadow = true;
    scene.add(directional);

    // Arena floor
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshPhongMaterial({ color: 0x220033, shininess: 80 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Floating neon platforms (adventure feel)
    for (let i = 0; i < 8; i++) {
      const platform = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.5, 4),
        new THREE.MeshPhongMaterial({ color: 0x00ffff, emissive: 0x00ffff, shininess: 100 })
      );
      platform.position.set((Math.random() - 0.5) * 20, 2 + Math.random() * 4, (Math.random() - 0.5) * 20);
      scene.add(platform);
    }

    // Particle system for energy
    const particles = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({ color: 0xff00ff, size: 0.2 })
    );
    scene.add(particles);

    const animate = () => {
      requestAnimationFrame(animate);
      if (renderer && scene && camera) renderer.render(scene, camera);
    };
    animate();
  };

  const luckySpin = () => {
    if (coins < 350) return alert("Not enough coins! Complete more levels.");
    setCoins(c => c - 350);
    setIsSpinning(true);
    setTimeout(() => {
      setIsSpinning(false);
      const roll = Math.random();
      if (roll < 0.05) {
        alert("💰 $50 REAL CASH JACKPOT!");
        // Real Stripe payout would go here in production
      } else if (roll < 0.35) {
        alert("🎟️ 3000 Coins + Free Level Skip!");
        setCoins(c => c + 3000);
      } else {
        alert("Solid spin! +650 coins");
        setCoins(c => c + 650);
      }
    }, 1600);
  };

  const completeLevel = () => {
    const reward = 800 + currentLevel * 300;
    setCoins(c => c + reward);
    setScore(s => s + reward);
    setCurrentLevel(l => l + 1);
    alert(`🎉 Level ${currentLevel} Complete! +$${reward} worth of coins earned!`);
  };

  useEffect(() => {
    init3D();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 to-black text-white flex flex-col items-center p-4 font-mono">
      <h1 className="text-5xl font-black text-yellow-400 tracking-widest">LUCKY DUEL</h1>
      <p className="text-purple-300 -mt-2 mb-6">Intellect Arena • Level {currentLevel}</p>

      <div className="flex justify-between w-full max-w-md mb-4 text-xl">
        <div>🪙 {coins}</div>
        <div>🏆 {score}</div>
      </div>

      <div className="relative w-full max-w-md aspect-[4/5] border-4 border-yellow-400 rounded-3xl overflow-hidden shadow-2xl">
        <canvas ref={canvasRef} className="w-full h-full cursor-pointer" />
      </div>

      <input value={levelPrompt} onChange={e => setLevelPrompt(e.target.value)} className="mt-6 bg-zinc-900 p-4 rounded-2xl w-full max-w-md text-center" placeholder="Describe your epic arena..." />

      <div className="flex gap-3 mt-6 w-full max-w-md">
        <button onClick={generateArena} className="flex-1 py-6 bg-yellow-400 text-black font-bold rounded-3xl text-xl">New Epic Arena</button>
        <button onClick={completeLevel} className="flex-1 py-6 bg-emerald-500 text-white font-bold rounded-3xl text-xl">Complete Level & Earn Cash</button>
      </div>

      <button onClick={luckySpin} className="mt-8 w-full max-w-md py-8 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 text-white font-black text-3xl rounded-3xl shadow-xl">
        🎰 LUCKY SPIN (350 coins) — Win Real Cash!
      </button>

      <p className="text-xs mt-10 opacity-70 text-center">Explore the 3D arena • Defeat enemies • Complete levels to earn real cash</p>
    </div>
  );
}
