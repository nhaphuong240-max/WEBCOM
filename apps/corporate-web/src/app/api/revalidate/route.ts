import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * On-demand revalidate for Platform CMS publish (AC-P1).
 * POST { paths?: string[], tags?: string[] }
 * Header: x-revalidate-secret (optional if CORPORATE_REVALIDATE_SECRET unset in dev)
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CORPORATE_REVALIDATE_SECRET || '';
  if (secret) {
    const got = req.headers.get('x-revalidate-secret') || '';
    if (got !== secret) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
  }
  let body: { paths?: string[]; tags?: string[] } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const paths = body.paths?.length ? body.paths : ['/'];
  const tags = body.tags || [];
  for (const p of paths) {
    revalidatePath(p);
  }
  for (const t of tags) {
    revalidateTag(t);
  }
  return NextResponse.json({ ok: true, paths, tags, at: new Date().toISOString() });
}
