export async function createCheckoutSession(
  amount: number,
  mode: 'payment' | 'subscription' | 'one_time'
): Promise<{ url: string }> {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, mode }),
  });
  if (!res.ok) throw new Error('Failed to create checkout session');
  return res.json();
}
