'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { createCheckoutSession } from '@/lib/stripe';
import html2canvas from 'html2canvas';

const GROK_API_KEY = process.env.NEXT_PUBLIC_GROK_API_KEY;

export default function CashCarnival() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [levelPrompt, setLevelPrompt] = useState('neon carnival night in San Antonio');
  const [background, setBackground] = useState('');
  const [coins, setCoins] = useState(1250);
  const [score, setScore] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prizesCaught, setPrizesCaught] = useState(0);
  const [marketplaceListings, setMarketplaceListings] = useState<any[]>([]);

  const generateCarnival = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('https://api.x.ai/v1/images/generations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROK_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "grok-imagine",
          prompt: `Create a vibrant, flashy carnival background for a cash prize game: ${levelPrompt}. Neon lights, spinning wheels, prizes falling, exciting and addictive.`,
          size: "1024x1024"
        }),
      });
      const data = await res.json();
      setBackground(data.data[0].url);
    } catch {
      setBackground('/fallback-level.jpg');
    } finally {
      setIsGenerating(false);
      initCarnivalGame();
    }
  };

  const initCarnivalGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = 400;
    canvas.height = 500;

    let fallingItems: any[] = [];
    let animationFrame: number;

    const spawnItem = () => {
      fallingItems.push({
        x: Math.random() * 340 + 30,
        y: -50,
        size: 35 + Math.random() * 25,
        speed: 3 + Math.random() * 4,
        type: Math.random() > 0.6 ? 'coin' : 'prize',
        color: Math.random() > 0.6 ? '#facc15' : '#22d3ee'
      });
    };

    const animate = () => {
      ctx.clearRect(0, 0, 400, 500);
      if (background) {
        const img = new Image();
        img.src = background;
        ctx.drawImage(img, 0, 0, 400, 500);
      }

      fallingItems = fallingItems.filter(item => {
        item.y += item.speed;
        ctx.fillStyle = item.color;
        ctx.fillRect(item.x, item.y, item.size, item.size);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(item.type === 'coin' ? '🪙' : '🎟️', item.x + 5, item.y + 28);
        return item.y < 520;
      });

      if (Math.random() < 0.15) spawnItem();
      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    // Tap to catch
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      fallingItems = fallingItems.filter(item => {
        if (Math.abs(item.x + item.size/2 - clickX) < item.size && Math.abs(item.y + item.size/2 - clickY) < item.size) {
          const earned = item.type === 'coin' ? 80 : 150;
          setCoins(c => c + earned);
          setScore(s => s + earned * 2);
          setPrizesCaught(p => p + 1);
          return false;
        }
        return true;
      });
    });
  };

  const luckySpin = () => {
    if (coins < 300) {
      alert("Not enough coins! Catch more prizes first.");
      return;
    }
    setCoins(c => c - 300);
    const outcomes = [
      { msg: "💰 $5 Cash Win!", value: 5 },
      { msg: "🎟️ 800 Coins!", value: 800 },
      { msg: "🔥 1500 Coins Jackpot!", value: 1500 },
      { msg: "Better luck next time! +50 coins", value: 50 },
    ];
    const result = outcomes[Math.floor(Math.random() * outcomes.length)];
    setTimeout(() => {
      alert(result.msg);
      setCoins(c => c + result.value);
    }, 800);
  };

  const sellMyCarnival = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const screenshot = await html2canvas(canvas);
    const dataUrl = screenshot.toDataURL('image/png');
    const price = prompt('Set your price for this carnival scene ($0.99 – $2.99)', '1.99');
    if (!price) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('marketplace').insert({
      prompt: levelPrompt,
      image_url: dataUrl,
      price: parseFloat(price) * 100,
      seller_id: user?.id,
      seller_name: user?.email?.split('@')[0] || 'Anonymous'
    });
    alert(`🎉 Your carnival scene is now for sale for $${price}!`);
  };

  useEffect(() => {
    initCarnivalGame();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 to-black text-white flex flex-col items-center p-4 font-mono">
      <h1 className="text-5xl font-black text-yellow-400 tracking-widest mb-2">CASH CARNIVAL</h1>
      <div className="flex justify-between w-full max-w-md mb-4">
        <div className="text-xl">🪙 {coins}</div>
        <div className="text-xl">🏆 {score}</div>
        <div className="text-xl">🎟️ {prizesCaught}</div>
      </div>

      <div className="relative w-full max-w-md aspect-[4/5] border-4 border-yellow-400 rounded-3xl overflow-hidden shadow-2xl">
        {isGenerating && <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-2xl animate-pulse z-10">✨ AI Carnival Loading...</div>}
        <canvas ref={canvasRef} className="w-full h-full cursor-pointer" />
      </div>

      <input value={levelPrompt} onChange={e => setLevelPrompt(e.target.value)} className="mt-6 bg-zinc-900 p-4 rounded-2xl w-full max-w-md text-center" placeholder="Describe your carnival..." />

      <div className="flex gap-3 mt-6 w-full max-w-md">
        <button onClick={generateCarnival} className="flex-1 py-6 bg-yellow-400 text-black font-bold rounded-3xl text-2xl">New AI Carnival</button>
        <button onClick={sellMyCarnival} className="flex-1 py-6 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-3xl text-2xl">💰 Sell Scene</button>
      </div>

      <button onClick={luckySpin} className="mt-8 w-full max-w-md py-8 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 text-white font-black text-3xl rounded-3xl shadow-lg active:scale-95 transition">
        🎰 LUCKY SPIN (300 coins) — Win Real Cash!
      </button>

      <p className="text-xs mt-10 opacity-70 text-center">Tap the falling prizes → earn coins → spin for real money chance</p>
    </div>
  );
}
