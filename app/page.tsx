'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { createCheckoutSession } from '@/lib/stripe';
import html2canvas from 'html2canvas';

const GROK_API_KEY = process.env.NEXT_PUBLIC_GROK_API_KEY;

export default function LuckyDuel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [levelPrompt, setLevelPrompt] = useState('neon cyber duel arena in San Antonio');
  const [background, setBackground] = useState('');
  const [coins, setCoins] = useState(1850);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [opponentHealth, setOpponentHealth] = useState(100);
  const [score, setScore] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);

  const generateDuelArena = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('https://api.x.ai/v1/images/generations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROK_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "grok-imagine",
          prompt: `Create a flashy neon cyber duel arena background for a cash game: ${levelPrompt}. High energy, dramatic lighting, prizes and coins everywhere.`,
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
    }
  };

  const initDuelGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = 400;
    canvas.height = 500;

    let bullets: any[] = [];
    let animationFrame: number;

    const animate = () => {
      ctx.clearRect(0, 0, 400, 500);
      if (background) {
        const img = new Image();
        img.src = background;
        ctx.drawImage(img, 0, 0, 400, 500);
      }

      // Player (bottom)
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(150, 420, 100, 30); // player base

      // Opponent (top)
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(150, 50, 100, 30); // opponent base

      // Health bars
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(50, 410, playerHealth * 3, 10);
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(50, 40, opponentHealth * 3, 10);

      // Bullets
      bullets.forEach((b, i) => {
        b.y += b.speed;
        ctx.fillStyle = '#facc15';
        ctx.fillRect(b.x, b.y, 8, 18);
        if (b.y < 60 && b.direction === 'up') {
          setOpponentHealth(h => Math.max(0, h - 12));
          bullets.splice(i, 1);
        }
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    // Tap to shoot
    const shoot = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e instanceof MouseEvent ? e.clientX : (e as TouchEvent).touches[0].clientX) - rect.left;
      bullets.push({ x: x - 4, y: 400, speed: -12, direction: 'up' });
    };

    canvas.addEventListener('click', shoot);
    canvas.addEventListener('touchstart', shoot);

    // Auto opponent attack
    setInterval(() => {
      if (opponentHealth > 0) {
        bullets.push({ x: 170 + Math.random() * 60, y: 90, speed: 8, direction: 'down' });
        setPlayerHealth(h => Math.max(0, h - 8));
      }
    }, 1200);
  };

  const luckySpin = () => {
    if (coins < 350) return alert("Not enough coins! Win more duels first.");
    setCoins(c => c - 350);
    setIsSpinning(true);

    setTimeout(() => {
      setIsSpinning(false);
      const roll = Math.random();
      if (roll < 0.03) {
        alert("💰 JACKPOT! You won $25 real cash!");
      } else if (roll < 0.25) {
        alert("🎟️ 2000 Coins + Free Pro Boost!");
        setCoins(c => c + 2000);
      } else {
        alert("Nice spin! +300 coins");
        setCoins(c => c + 300);
      }
    }, 1800);
  };

  const sellMyDuel = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const screenshot = await html2canvas(canvas);
    const dataUrl = screenshot.toDataURL('image/png');
    const price = prompt('Set price for this duel arena ($0.99 – $2.99)', '1.99');
    if (!price) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('marketplace').insert({
      prompt: levelPrompt,
      image_url: dataUrl,
      price: parseFloat(price) * 100,
      seller_id: user?.id,
      seller_name: user?.email?.split('@')[0] || 'Anonymous'
    });
    alert(`🎉 Duel arena listed for $${price}!`);
  };

  useEffect(() => {
    initDuelGame();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 to-black text-white flex flex-col items-center p-4 font-mono">
      <h1 className="text-5xl font-black text-yellow-400 tracking-widest mb-1">LUCKY DUEL</h1>
      <div className="flex justify-between w-full max-w-md mb-4 text-xl">
        <div>🪙 {coins}</div>
        <div>🏆 {score}</div>
      </div>

      <div className="relative w-full max-w-md aspect-[4/5] border-4 border-yellow-400 rounded-3xl overflow-hidden shadow-2xl">
        {isGenerating && <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-2xl animate-pulse z-10">✨ AI Arena Loading...</div>}
        {isSpinning && <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-3xl animate-pulse z-10">🎰 SPINNING...</div>}
        <canvas ref={canvasRef} className="w-full h-full cursor-pointer" />
      </div>

      <input value={levelPrompt} onChange={e => setLevelPrompt(e.target.value)} className="mt-6 bg-zinc-900 p-4 rounded-2xl w-full max-w-md text-center" placeholder="Describe your duel arena..." />

      <div className="flex gap-3 mt-6 w-full max-w-md">
        <button onClick={generateDuelArena} className="flex-1 py-6 bg-yellow-400 text-black font-bold rounded-3xl text-xl">New AI Duel</button>
        <button onClick={sellMyDuel} className="flex-1 py-6 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-3xl text-xl">💰 Sell Arena</button>
      </div>

      <button onClick={luckySpin} className="mt-8 w-full max-w-md py-8 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 text-white font-black text-3xl rounded-3xl shadow-lg active:scale-95">
        🎰 LUCKY SPIN (350 coins) — Win Real Cash!
      </button>

      <p className="text-center text-xs mt-10 opacity-70">Tap the arena fast to shoot • Win duels • Spin for real money</p>
    </div>
  );
}
