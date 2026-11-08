import { error, json } from '@sveltejs/kit';
import { sql, type SQL } from 'drizzle-orm';
import { db } from '../../../../lib/server/db';
import { col, requireDesktop, rows, T_USER, userCols } from '../_guard';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, url }) => {
	await requireDesktop(request, { unlocked: true });
	const qRaw = String(url.searchParams.get('q') || '').trim();
	const wantTotal = url.searchParams.get('total') === '1';
	const newest = url.searchParams.get('newest') === '1';
	const limit = Math.min(
		50,
		Math.max(1, Math.floor(Number(url.searchParams.get('limit') || 0)) || (newest ? 50 : 10))
	);
	const cols = await userCols();
	const countRes = await db.execute(sql`SELECT COUNT(*) AS n FROM ${T_USER}`);
	const total = Number(rows(countRes)[0]?.n ?? 0);
	if (wantTotal) return json({ total });
	if (!qRaw && !newest) throw error(400, 'need a search term');
	const fields: SQL[] = [sql`${col(cols.id)} AS id`];
	if (cols.name) fields.push(sql`${col(cols.name)} AS name`);
	if (cols.display) fields.push(sql`${col(cols.display)} AS displayName`);
	if (cols.email) fields.push(sql`${col(cols.email)} AS email`);
	if (cols.created) fields.push(sql`${col(cols.created)} AS createdAt`);
	let query: SQL;
	if (newest) {
		query = sql`SELECT ${sql.join(fields, sql`, `)} FROM ${T_USER} ORDER BY ${col(cols.created ?? cols.id)} DESC LIMIT ${limit}`;
	} else {
		const pat = '%' + qRaw.replace(/[\\%_]/g, (c) => '\\' + c) + '%';
		const conds: SQL[] = [sql`${col(cols.id)} = ${qRaw}`];
		if (cols.display) conds.push(sql`${col(cols.display)} LIKE ${pat}`);
		if (cols.name) conds.push(sql`${col(cols.name)} LIKE ${pat}`);
		if (cols.email) conds.push(sql`${col(cols.email)} LIKE ${pat}`);
		query = sql`SELECT ${sql.join(fields, sql`, `)} FROM ${T_USER} WHERE ${sql.join(conds, sql` OR `)} LIMIT ${limit}`;
	}
	const res = await db.execute(query);
	const list = rows(res).map((r) => ({
		id: String(r.id ?? ''),
		name: String(r.name ?? ''),
		displayName: String(r.displayName ?? ''),
		email: String(r.email ?? ''),
		createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt ?? '')
	}));
	return json({ users: list, total });
};
