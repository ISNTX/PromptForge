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
  const [isPro, setIsPro] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
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
      setError('AI timed out — using classic level');
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

  // Simple canvas game (physics + block clearing) - keep your existing initGame function here
  const initGame = (endless = false) => {
    // ... (your existing canvas code from previous versions)
    console.log('Game initialized');
  };

  useEffect(() => {
    loadMarketplace();
    initGame();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center p-4 font-mono">
      {/* Header, canvas, mode tabs, input, buttons from v1.5 remain the same */}
      {/* ... (keep all previous UI elements) */}

      {/* NEW Sell button */}
      <button onClick={sellMyLevel} className="mt-4 w-full max-w-md py-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-3xl flex items-center justify-center gap-2">
        💰 Sell My AI Level (Earn 70%)
      </button>

      {/* Marketplace */}
      <div className="mt-8 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">🛒 AI Marketplace</h2>
        <div className="grid grid-cols-2 gap-3">
          {marketplaceListings.map((item) => (
            <div key={item.id} className="bg-zinc-900 rounded-2xl p-3 cursor-pointer" onClick={() => buyMarketplaceLevel(item)}>
              <img src={item.image_url} className="w-full aspect-square object-cover rounded-xl" />
              <p className="text-xs mt-2 line-clamp-1">{item.prompt}</p>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-emerald-400">${(item.price / 100).toFixed(2)}</span>
                <span className="opacity-60">by {item.seller_name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}