import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerApiBase } from '@/lib/api/resorts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }
  const slug = req.query.slug;
  if (typeof slug !== 'string' || !slug.trim()) return res.status(400).json({ status: 'unavailable' });
  try {
    const response = await fetch(`${getServerApiBase()}/api/stations/${encodeURIComponent(slug)}/avalanche-risk`, {
      cache: 'no-store', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return res.status(503).json({ status: 'unavailable' });
    return res.status(200).json(await response.json());
  } catch {
    return res.status(503).json({ status: 'unavailable' });
  }
}
