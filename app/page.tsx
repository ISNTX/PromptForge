'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { createCheckoutSession } from '@/lib/stripe';
import html2canvas from 'html2canvas';

const GROK_API_KEY = process.env.NEXT_PUBLIC_GROK_API_KEY;

export default function LuckyDuelIntellect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [levelPrompt, setLevelPrompt] = useState('neon cyber intellect duel arena in San Antonio');
  const [background, setBackground] = useState('');
  const [coins, setCoins] = useState(2450);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [opponentHealth, setOpponentHealth] = useState(100);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [streak, setStreak] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [riddle, setRiddle] = useState('');
  const [marketplaceListings, setMarketplaceListings] = useState<any[]>([]);

  const generateArenaAndRiddle = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('https://api.x.ai/v1/images/generations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROK_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "grok-imagine",
          prompt: `Create a stunning neon cyber intellect duel arena: ${levelPrompt}. Dramatic, futuristic, high-energy, particles and glowing effects.`,
          size: "1024x1024"
        }),
      });
      const data = await res.json();
      setBackground(data.data[0].url);
    } catch {
      setBackground('/fallback-level.jpg');
    } finally {
      setIsGenerating(false);
      initDuelGame();
      generateRiddle();
    }
  };

  const generateRiddle = () => {
    const riddles = [
      "What has keys but can't open locks?",
      "What can travel around the world while staying in a corner?",
      "What has a head, a tail, is brown, and has no legs?"
    ];
    setRiddle(riddles[Math.floor(Math.random() * riddles.length)]);
  };

  const initDuelGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = 400;
    canvas.height = 500;

    let bullets: any[] = [];
    let particles: any[] = [];

    const createParticles = (x: number, y: number, color: string) => {
      for (let i = 0; i < 25; i++) {
        particles.push({ x, y, vx: Math.random() * 8 - 4, vy: Math.random() * 8 - 4, life: 40, color });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, 400, 500);
      if (background) {
        const img = new Image();
        img.src = background;
        ctx.drawImage(img, 0, 0, 400, 500);
      }

      // Player & Opponent bases
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(140, 410, 120, 40);
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(140, 50, 120, 40);

      // Health bars
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(50, 400, playerHealth * 3, 12);
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(50, 40, opponentHealth * 3, 12);

      // Bullets & particles
      bullets.forEach((b, i) => {
        b.y += b.speed;
        ctx.fillStyle = '#facc15';
        ctx.fillRect(b.x, b.y, 10, 22);
      });

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        ctx.globalAlpha = p.life / 40;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 6, 6);
      });
      ctx.globalAlpha = 1;

      requestAnimationFrame(animate);
    };

    animate();

    // Tap to shoot
    const shoot = (e: any) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX || e.touches[0].clientX) - rect.left;
      bullets.push({ x: x - 5, y: 390, speed: -14 });
      createParticles(x, 390, '#facc15');
    };

    canvas.addEventListener('click', shoot);
    canvas.addEventListener('touchstart', shoot);

    // Opponent auto-attack
    setInterval(() => {
      if (opponentHealth > 0) {
        bullets.push({ x: 170 + Math.random() * 60, y: 100, speed: 9 });
        createParticles(200, 100, '#f472b6');
        setPlayerHealth(h => Math.max(0, h - 9));
      }
    }, 1100);
  };

  const luckySpin = () => {
    if (coins < 350) return alert("Need more coins! Win duels first.");
    setCoins(c => c - 350);
    const roll = Math.random();
    setTimeout(() => {
      if (roll < 0.04) alert("💰 $25 REAL CASH JACKPOT!");
      else if (roll < 0.3) {
        alert("🎟️ 2500 Coins + Free Pro!");
        setCoins(c => c + 2500);
      } else {
        alert("Great spin! +450 coins");
        setCoins(c => c + 450);
      }
    }, 1200);
  };

  const sellMyDuel = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const screenshot = await html2canvas(canvas);
    const dataUrl = screenshot.toDataURL('image/png');
    const price = prompt('Set your price ($0.99 – $2.99)', '1.99');
    if (!price) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('marketplace').insert({
      prompt: levelPrompt,
      image_url: dataUrl,
      price: parseFloat(price) * 100,
      seller_id: user?.id,
      seller_name: user?.email?.split('@')[0] || 'Anonymous'
    });
    alert(`🎉 Arena listed for $${price}!`);
  };

  useEffect(() => {
    initDuelGame();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-black to-zinc-950 text-white flex flex-col items-center p-4 font-mono">
      <h1 className="text-5xl font-black text-yellow-400 tracking-[4px] mb-1">LUCKY DUEL</h1>
      <p className="text-purple-300 text-sm -mt-2 mb-6">Intellect Arena</p>

      <div className="flex justify-between w-full max-w-md mb-4 text-xl font-bold">
        <div className="flex items-center gap-2"><span className="text-yellow-400">🪙</span> {coins}</div>
        <div>🔥 {score}</div>
        <div>❤️ {playerHealth}</div>
      </div>

      <div className="relative w-full max-w-md aspect-[4/5] border-4 border-yellow-400 rounded-3xl overflow-hidden shadow-2xl">
        {isGenerating && <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-2xl animate-pulse z-10">✨ AI Arena Generating...</div>}
        <canvas ref={canvasRef} className="w-full h-full cursor-pointer" />
      </div>

      <input value={levelPrompt} onChange={e => setLevelPrompt(e.target.value)} className="mt-6 bg-zinc-900 p-4 rounded-2xl w-full max-w-md text-center text-lg" placeholder="Describe your duel arena..." />

      <div className="flex gap-3 mt-6 w-full max-w-md">
        <button onClick={generateArenaAndRiddle} className="flex-1 py-6 bg-yellow-400 text-black font-bold rounded-3xl text-xl">New Intellect Duel</button>
        <button onClick={sellMyDuel} className="flex-1 py-6 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-3xl text-xl">💰 Sell Arena</button>
      </div>

      <button onClick={luckySpin} className="mt-8 w-full max-w-md py-8 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 text-white font-black text-3xl rounded-3xl shadow-xl active:scale-95">
        🎰 LUCKY SPIN (350 coins) — Win Real Cash!
      </button>

      <p className="text-xs mt-10 opacity-70 text-center">Tap fast to shoot • Answer riddles for bonus damage • Win coins & real prizes</p>
    </div>
  );
}
