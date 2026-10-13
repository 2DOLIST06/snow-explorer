import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerApiBase } from '@/lib/api/resorts';

/** Public weather pass-through. No provider credentials or provider calls here. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }
  const slug = req.query.slug;
  if (typeof slug !== 'string' || !slug.trim()) return res.status(400).json({ status: 'unavailable' });
  res.setHeader('Cache-Control', 'no-store');
  try {
    const response = await fetch(`${getServerApiBase()}/api/stations/${encodeURIComponent(slug)}/weather`, {
      headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return res.status(503).json({ status: 'unavailable' });
    return res.status(200).json(await response.json());
  } catch {
    return res.status(503).json({ status: 'unavailable' });
  }
}
