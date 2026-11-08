import { error, json } from '@sveltejs/kit';
import { sql, type SQL } from 'drizzle-orm';
import { db } from '../../../../lib/server/db';
import { col, requireDesktop, rows, T_CHAT, T_USER, userCols } from '../_guard';
import type { RequestHandler } from './$types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const GAME_RE = /^[a-z0-9_-]{1,32}$/;

export const GET: RequestHandler = async ({ request, url }) => {
	await requireDesktop(request, { unlocked: true });
	const from = String(url.searchParams.get('from') || '').trim();
	const to = String(url.searchParams.get('to') || '').trim();
	const kw = String(url.searchParams.get('q') || '').trim();
	const who = String(url.searchParams.get('who') || '').trim().slice(0, 64);
	const game = String(url.searchParams.get('game') || '').trim().toLowerCase();
	const limit = Math.min(250, Math.max(1, Math.floor(Number(url.searchParams.get('limit') || 0)) || 100));
	if (from && !DATE_RE.test(from)) throw error(400, 'bad from date');
	if (to && !DATE_RE.test(to)) throw error(400, 'bad to date');
	if (game && !GAME_RE.test(game)) throw error(400, 'bad game');

	const cols = await userCols();
	const nameExpr = cols.display
		? sql`COALESCE(NULLIF(u.${col(cols.display)}, ''), ${
				cols.name ? sql`u.${col(cols.name)}` : sql`c.${col('uuid')}`
			})`
		: cols.name
			? sql`COALESCE(u.${col(cols.name)}, c.${col('uuid')})`
			: sql`c.${col('uuid')}`;
	const senderExpr = sql`CASE WHEN c.${col('uuid')} = 'announce' THEN '[ANNOUNCEMENT]' ELSE ${nameExpr} END`;
	const join = sql`LEFT JOIN ${T_USER} u ON u.${col(cols.id)} = c.${col('uuid')}`;

	const conds: SQL[] = [];
	if (from) {
		const d = new Date(from + 'T00:00:00');
		if (!Number.isFinite(d.getTime())) throw error(400, 'bad from date');
		conds.push(sql`c.${col('timestamp')} >= ${d}`);
	}
	if (to) {
		const d = new Date(to + 'T00:00:00');
		if (!Number.isFinite(d.getTime())) throw error(400, 'bad to date');
		d.setDate(d.getDate() + 1);
		conds.push(sql`c.${col('timestamp')} < ${d}`);
	}
	if (game) conds.push(sql`c.${col('game')} = ${game}`);
	if (kw) {
		const pat = '%' + kw.replace(/[\\%_]/g, (c) => '\\' + c) + '%';
		conds.push(sql`c.${col('contents')} LIKE ${pat}`);
	}
	if (who) {
		const pat = '%' + who.replace(/[\\%_]/g, (c) => '\\' + c) + '%';
		conds.push(sql`(${senderExpr} LIKE ${pat} OR c.${col('uuid')} = ${who})`);
	}
	const where = conds.length ? sql.join(conds, sql` AND `) : sql`1 = 1`;

	const totalRes = await db.execute(sql`SELECT COUNT(*) AS n FROM ${T_CHAT} c ${join} WHERE ${where}`);
	const total = Math.floor(Number(rows(totalRes)[0]?.n || 0)) || 0;
	const res = await db.execute(
		sql`SELECT c.${col('msgId')} AS msgId, c.${col('timestamp')} AS ts, c.${col('game')} AS game, c.${col('mapId')} AS mapId, c.${col('contents')} AS text, ${senderExpr} AS name FROM ${T_CHAT} c ${join} WHERE ${where} ORDER BY c.${col('timestamp')} DESC, c.${col('msgId')} DESC LIMIT ${limit}`
	);
	const list = rows(res).map((r) => ({
		msgId: Math.floor(Number(r.msgId) || 0),
		ts: r.ts instanceof Date ? r.ts.toISOString() : String(r.ts ?? ''),
		game: String(r.game ?? ''),
		mapId: Math.floor(Number(r.mapId) || 0),
		name: String(r.name ?? ''),
		text: String(r.text ?? '')
	}));
	list.reverse();
	return json({ rows: list, total, limit, truncated: total > list.length });
};
