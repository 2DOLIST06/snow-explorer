import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerApiBase } from '@/lib/api/resorts';
import { hasCurrentBulletinPdf, normalizeAvalancheRisk } from '@/lib/api/avalanche';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }
  const slug = req.query.slug;
  if (typeof slug !== 'string' || !slug.trim()) return res.status(400).json({ status: 'unavailable' });
  try {
    const base = `${getServerApiBase()}/api/stations/${encodeURIComponent(slug)}/avalanche-risk`;
    const signal = AbortSignal.timeout(15000);
    const bulletin = await fetch(base, { cache: 'no-store', headers: { Accept: 'application/json' }, signal });
    if (!bulletin.ok) return res.status(503).json({ status: 'unavailable' });
    const data = normalizeAvalancheRisk(await bulletin.json());
    if (data.station.slug !== slug || !hasCurrentBulletinPdf(data)) return res.status(404).json({ status: 'unavailable' });
    const response = await fetch(`${base}/pdf`, { cache: 'no-store', headers: { Accept: 'application/pdf' }, signal });
    if (!response.ok || response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/pdf') return res.status(503).json({ status: 'unavailable' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="bulletin-avalanche.pdf"');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(Buffer.from(await response.arrayBuffer()));
  } catch {
    return res.status(503).json({ status: 'unavailable' });
  }
}
