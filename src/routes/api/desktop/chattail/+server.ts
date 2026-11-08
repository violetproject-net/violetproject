import { error, json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { db } from '../../../../lib/server/db';
import { col, requireDesktop, rows, T_CHAT, T_USER, userCols } from '../_guard';
import type { RequestHandler } from './$types';

const GAME_RE = /^[a-z0-9_-]{1,32}$/;

export const GET: RequestHandler = async ({ request, url }) => {
	await requireDesktop(request, { unlocked: true });
	const game = String(url.searchParams.get('game') || '')
		.trim()
		.toLowerCase();
	if (!GAME_RE.test(game)) throw error(400, 'bad game');
	const limit = Math.min(
		100,
		Math.max(1, Math.floor(Number(url.searchParams.get('limit') || 0)) || 50)
	);

	const cols = await userCols();
	const nameExpr = cols.display
		? sql`COALESCE(NULLIF(u.${col(cols.display)}, ''), ${
				cols.name ? sql`u.${col(cols.name)}` : sql`c.${col('uuid')}`
			})`
		: cols.name
			? sql`COALESCE(u.${col(cols.name)}, c.${col('uuid')})`
			: sql`c.${col('uuid')}`;
	const sender = sql`CASE WHEN c.${col('uuid')} = 'announce' THEN '[ANNOUNCEMENT]' ELSE ${nameExpr} END`;
	const join = sql`LEFT JOIN ${T_USER} u ON u.${col(cols.id)} = c.${col('uuid')}`;

	const res = await db.execute(
		sql`SELECT c.${col('timestamp')} AS ts, c.${col('contents')} AS text, ${sender} AS name FROM ${T_CHAT} c ${join} WHERE c.${col('game')} = ${game} AND c.${col('mapId')} = 0 ORDER BY c.${col('timestamp')} DESC, c.${col('msgId')} DESC LIMIT ${limit}`
	);
	const list = rows(res).map((r) => ({
		ts: r.ts instanceof Date ? r.ts.toISOString() : String(r.ts ?? ''),
		name: String(r.name ?? ''),
		text: String(r.text ?? '')
	}));
	list.reverse();
	return json({ rows: list, game, limit });
};
