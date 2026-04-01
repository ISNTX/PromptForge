'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { createCheckoutSession } from '@/lib/stripe';
import html2canvas from 'html2canvas';

const GROK_API_KEY = process.env.NEXT_PUBLIC_GROK_API_KEY;

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [levelPrompt, setLevelPrompt] = useState('cyberpunk San Antonio rodeo at night');
  const [background, setBackground] = useState('');
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(250); // starting coins
  const [combo, setCombo] = useState(1);
  const [lives, setLives] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [marketplaceListings, setMarketplaceListings] = useState<any[]>([]);
  const [dailyStreak, setDailyStreak] = useState(3);

  const generateLevel = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('https://api.x.ai/v1/images/generations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROK_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "grok-imagine",
          prompt: `Create a vibrant puzzle level background for a block-clearing game: ${levelPrompt}. Highly detailed, game-ready, colorful blocks and power-ups visible.`,
          size: "1024x1024"
        }),
      });
      const data = await res.json();
      setBackground(data.data[0].url);
    } catch {
      setBackground('/fallback-level.jpg');
    } finally {
      setIsGenerating(false);
      initGame();
    }
  };

  const initGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = 400;
    canvas.height = 400;
    // Simple addictive block-clear demo with gravity
    let blocks: any[] = [];
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        blocks.push({ x: x * 60 + 20, y: y * 60 + 20, size: 50, color: ['#facc15', '#22d3ee', '#a78bfa', '#f472b6'][Math.floor(Math.random()*4)], vy: 0 });
      }
    }
    const animate = () => {
      ctx.clearRect(0, 0, 400, 400);
      if (background) {
        const img = new Image();
        img.src = background;
        ctx.drawImage(img, 0, 0, 400, 400);
      }
      blocks.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.size, b.size);
        b.y += b.vy;
        b.vy += 0.4;
        if (b.y > 400) b.vy = -b.vy * 0.7;
      });
      requestAnimationFrame(animate);
    };
    animate();
  };

  const clearLevel = () => {
    // Simulate clearing a level
    const earnedCoins = 50 + combo * 30;
    setCoins(coins + earnedCoins);
    setScore(score + 1000);
    setCombo(combo + 1);
    alert(`🎉 Level cleared! +${earnedCoins} Forge Coins`);
    generateLevel();
  };

  const luckySpin = async () => {
    if (coins < 500) {
      alert("Not enough coins! Play more levels to earn coins.");
      return;
    }
    setCoins(coins - 500);
    // Simple spin simulation with real-money chance
    const roll = Math.random();
    if (roll < 0.02) {
      alert("💰 JACKPOT! You won $10 real cash!");
      // In real version this would trigger Stripe payout
    } else if (roll < 0.15) {
      alert("🎟️ You won 1000 coins + free booster!");
      setCoins(coins + 1000);
    } else {
      alert("Better luck next spin! +50 coins consolation");
      setCoins(coins + 50);
    }
  };

  const sellMyLevel = async () => {
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
    alert(`🎉 Your level is now live in the Marketplace for $${price}!`);
  };

  useEffect(() => {
    initGame();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center p-4 font-mono">
      <div className="w-full max-w-md flex justify-between items-center mb-4">
        <h1 className="text-4xl font-bold text-yellow-400 tracking-wider">PROMPT FORGE</h1>
        <div className="flex items-center gap-6 text-lg">
          <div>🔥 {score}</div>
          <div className="flex items-center gap-1">
            <span className="text-yellow-400">🪙</span> {coins}
          </div>
          <div>❤️ {lives}</div>
        </div>
      </div>

      <div className="relative w-full max-w-md aspect-square border-4 border-yellow-400 rounded-3xl overflow-hidden shadow-2xl">
        {isGenerating && <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-2xl animate-pulse z-10">✨ AI Generating Level...</div>}
        <canvas ref={canvasRef} className="w-full h-full cursor-pointer" onClick={clearLevel} />
      </div>

      <input value={levelPrompt} onChange={e => setLevelPrompt(e.target.value)} className="mt-6 bg-zinc-900 p-4 rounded-2xl w-full max-w-md text-center text-lg" placeholder="Type any theme..." />

      <div className="flex gap-3 mt-6 w-full max-w-md">
        <button onClick={generateLevel} className="flex-1 py-5 bg-yellow-400 text-black font-bold rounded-3xl text-xl">New AI Level</button>
        <button onClick={sellMyLevel} className="flex-1 py-5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-3xl text-xl">💰 Sell Level</button>
      </div>

      <button onClick={luckySpin} className="mt-4 w-full max-w-md py-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-3xl text-2xl flex items-center justify-center gap-3">
        🎰 Lucky Spin (500 coins) — Win Real Cash!
      </button>

      <div className="mt-10 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">🛒 AI Marketplace</h2>
        {/* Marketplace grid would go here — already in your Supabase table */}
      </div>

      <p className="text-xs text-center mt-8 opacity-60">Daily streak: {dailyStreak} days 🔥 Earn coins • Spin for real money</p>
    </div>
  );
}
