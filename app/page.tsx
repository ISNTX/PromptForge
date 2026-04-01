'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { createCheckoutSession } from '@/lib/stripe';
import html2canvas from 'html2canvas';

const GROK_API_KEY = process.env.NEXT_PUBLIC_GROK_API_KEY;

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<'daily' | 'custom' | 'endless'>('custom');
  const [levelPrompt, setLevelPrompt] = useState('cyberpunk San Antonio rodeo at night');
  const [background, setBackground] = useState('');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [lives, setLives] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [marketplaceListings, setMarketplaceListings] = useState<any[]>([]);

  const generateLevel = async (prompt: string) => {
    setIsGenerating(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch('https://api.x.ai/v1/images/generations', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Authorization': `Bearer ${GROK_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "grok-imagine",
          prompt: `Create a vibrant puzzle level background for a block-clearing game: ${prompt}. Highly detailed, game-ready, colorful blocks and power-ups visible.`,
          size: "1024x1024"
        }),
      });
      clearTimeout(timeout);
      const data = await res.json();
      return data.data[0].url;
    } catch {
      return '/fallback-level.jpg';
    } finally {
      setIsGenerating(false);
    }
  };

  const startNewLevel = async () => {
    const imageUrl = await generateLevel(levelPrompt);
    setBackground(imageUrl);
    initGame(mode === 'endless');
  };

  const sellMyLevel = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const screenshot = await html2canvas(canvas);
    const dataUrl = screenshot.toDataURL('image/png');
    const price = prompt('Set your price for this level ($0.99 – $2.99)', '1.99');
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
    loadMarketplace();
  };

  const loadMarketplace = async () => {
    const { data } = await supabase.from('marketplace').select('*').order('created_at', { ascending: false }).limit(12);
    setMarketplaceListings(data || []);
  };

  const buyMarketplaceLevel = async (listing: any) => {
    const session = await createCheckoutSession(listing.price, 'one_time');
    window.location.href = session.url;
  };

  const shareCurrentLevel = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const screenshot = await html2canvas(canvas);
    const dataUrl = screenshot.toDataURL('image/png');
    const text = `I just cleared a ${levelPrompt} level in PromptForge! Score: ${score} 🔥 https://promptforge-sage.vercel.app #PromptForge #AIGame`;
    if (navigator.share) {
      navigator.share({ text, files: [new File([await (await fetch(dataUrl)).blob()], 'level.png', { type: 'image/png' })] });
    } else alert(text);
  };

  const initGame = (endless = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = 400;
    canvas.height = 400;
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
        b.vy += 0.3;
        if (b.y > 400) b.vy = -b.vy * 0.6;
      });
      requestAnimationFrame(animate);
    };
    animate();
  };

  useEffect(() => {
    loadMarketplace();
    initGame();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center p-4 font-mono">
      <div className="w-full max-w-md flex justify-between items-center mb-4">
        <h1 className="text-4xl font-bold text-yellow-400">PromptForge</h1>
        <div className="flex items-center gap-4 text-xl">
          <span>🔥 {score}</span>
          <span className="text-purple-400">×{combo}</span>
          <span>❤️ {lives}</span>
        </div>
      </div>

      <div className="relative w-full max-w-md aspect-square border-4 border-yellow-400 rounded-3xl overflow-hidden">
        {isGenerating && <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-xl animate-pulse z-10">✨ Generating AI Level...</div>}
        <canvas ref={canvasRef} className="w-full h-full cursor-pointer" />
      </div>

      <input 
        value={levelPrompt} 
        onChange={e => setLevelPrompt(e.target.value)} 
        className="mt-6 bg-zinc-900 p-4 rounded-2xl w-full max-w-md text-white text-center" 
        placeholder="Type any theme..." 
      />

      <div className="flex gap-3 mt-6 w-full max-w-md">
        <button onClick={startNewLevel} className="flex-1 py-5 bg-yellow-400 text-black font-bold rounded-3xl">New AI Level</button>
        <button onClick={shareCurrentLevel} className="flex-1 py-5 bg-white/10 hover:bg-white/20 rounded-3xl font-bold">📸 Share Level</button>
      </div>

      <button onClick={sellMyLevel} className="mt-4 w-full max-w-md py-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-3xl">💰 Sell My AI Level (Earn 70%)</button>

      <div className="mt-8 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">🛒 AI Marketplace</h2>
        <div className="grid grid-cols-2 gap-3">
          {marketplaceListings.map((item) => (
            <div key={item.id} className="bg-zinc-900 rounded-2xl p-3 cursor-pointer" onClick={() => buyMarketplaceLevel(item)}>
              <img src={item.image_url} className="w-full aspect-square object-cover rounded-xl" />
              <p className="text-xs mt-2 line-clamp-1">{item.prompt}</p>
              <div className="flex justify-between mt-1">
                <span className="text-emerald-400 font-bold">${(item.price / 100).toFixed(2)}</span>
                <span className="text-xs opacity-60">by {item.seller_name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => createCheckoutSession(499, 'subscription')} className="mt-8 w-full max-w-md py-4 bg-purple-500 text-white font-bold rounded-3xl">⭐ Go Pro — $4.99/mo</button>
    </div>
  );
}
