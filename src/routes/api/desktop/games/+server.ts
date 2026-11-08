import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { db } from '../../../../lib/server/db';
import { col, requireDesktop, rows, T_CHAT } from '../_guard';
import { games } from '../../../../lib/games';
import type { RequestHandler } from './$types';

const GAME_RE = /^[a-z0-9_-]{1,32}$/;

export const GET: RequestHandler = async ({ request }) => {
	await requireDesktop(request, { unlocked: true });
	const out = games.map((g) => ({ slug: g.slug, name: g.name }));
	const seen = new Set(out.map((g) => g.slug));
	try {
		const res = await db.execute(sql`SELECT DISTINCT ${col('game')} AS g FROM ${T_CHAT}`);
		for (const r of rows(res)) {
			const slug = String(r.g ?? '')
				.trim()
				.toLowerCase();
			if (!slug || slug === 'site' || seen.has(slug) || !GAME_RE.test(slug)) continue;
			seen.add(slug);
			const name = slug
				.split(/[-_]+/)
				.filter(Boolean)
				.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
				.join(' ');
			out.push({ slug, name: name || slug });
		}
	} catch {
	}
	return json({ games: out });
};
