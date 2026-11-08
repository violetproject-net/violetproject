import { error, json } from '@sveltejs/kit';
import { sql, type SQL } from 'drizzle-orm';
import { db } from '../../../../lib/server/db';
import { archiveSessions, ensureSessionLog, T_SESSION_LOG } from '../../../../lib/server/session-log';
import { col, requireDesktop, rows, userCols } from '../_guard';
import type { RequestHandler } from './$types';

type SessionCols = {
	table: string;
	user: string | null;
	ip: string | null;
	ua: string | null;
	created: string | null;
	updated: string | null;
	expires: string | null;
};
let sessionColsCache: SessionCols | null = null;

async function sessionCols(): Promise<SessionCols> {
	if (sessionColsCache) return sessionColsCache;
	const raw = String(process.env.YNO_SESSION_TABLE || 'session');
	const table = /^[A-Za-z0-9_$]+$/.test(raw) ? raw : 'session';
	let names = new Set<string>();
	try {
		const res = await db.execute(
			sql`SELECT COLUMN_NAME AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table}`
		);
		names = new Set(rows(res).map((r) => String(r.c || '').toLowerCase()));
	} catch {}
	const pick = (...cs: string[]) => cs.find((c) => names.has(c)) ?? null;
	sessionColsCache = {
		table,
		user: pick('user_id', 'userid'),
		ip: pick('ip_address', 'ipaddress', 'ip'),
		ua: pick('user_agent', 'useragent'),
		created: pick('created_at', 'createdat'),
		updated: pick('updated_at', 'updatedat'),
		expires: pick('expires_at', 'expiresat')
	};
	return sessionColsCache;
}

export const GET: RequestHandler = async ({ request, url }) => {
	await requireDesktop(request, { unlocked: true });
	const limit = Math.min(
		2000,
		Math.max(1, Math.floor(Number(url.searchParams.get('limit') || 0)) || 500)
	);
	const wantActive = url.searchParams.get('active') === '1';
	const cols = await sessionCols();
	if (!cols.user) throw error(503, 'session table missing or outdated');
	const uCols = await userCols();
	const rawUser = String(process.env.YNO_USER_TABLE || 'user');
	const uTable = /^[A-Za-z0-9_$]+$/.test(rawUser) ? rawUser : 'user';
	const T_SESSION = sql.raw('`' + cols.table + '`');
	const T_USER = sql.raw('`' + uTable + '`');
	const last = cols.updated ?? cols.created ?? 'id';
	const useActive = wantActive && !!cols.expires;
	const where: SQL = useActive
		? sql`WHERE ${col(cols.expires!, 's.')} > NOW()`
		: sql``;
	const logState = await ensureSessionLog();

	if (cols.expires) {
		const expired = sql`${col(cols.expires)} IS NOT NULL AND ${col(cols.expires)} < NOW(3)`;
		const arch = await archiveSessions(cols, expired, 'expired');
		if (arch.ok) {
			try {
				await db.execute(sql`DELETE FROM ${T_SESSION} WHERE ${expired}`);
			} catch {}
		}
	}

	const countRes = await db.execute(
		sql`SELECT COUNT(*) AS n FROM ${T_SESSION}${useActive ? sql` WHERE ${col(cols.expires!)} > NOW()` : sql``}`
	);
	const total = Number(rows(countRes)[0]?.n ?? 0);

	const fields: SQL[] = [
		sql`${col('id', 's.')} AS id`,
		sql`${col(cols.user, 's.')} AS uid`
	];
	if (cols.ip) fields.push(sql`${col(cols.ip, 's.')} AS ip`);
	if (cols.ua) fields.push(sql`${col(cols.ua, 's.')} AS ua`);
	if (cols.created) fields.push(sql`${col(cols.created, 's.')} AS createdAt`);
	if (cols.updated) fields.push(sql`${col(cols.updated, 's.')} AS updatedAt`);
	if (cols.expires) fields.push(sql`${col(cols.expires, 's.')} AS expiresAt`);
	if (uCols.name) fields.push(sql`${col(uCols.name, 'u.')} AS name`);
	if (uCols.display) fields.push(sql`${col(uCols.display, 'u.')} AS displayName`);

	const order = cols.ip
		? sql`ORDER BY ${col(cols.ip, 's.')} ASC, ${col(last, 's.')} DESC`
		: sql`ORDER BY ${col(last, 's.')} DESC`;

	const listRes = await db.execute(
		sql`SELECT ${sql.join(fields, sql`, `)} FROM ${T_SESSION} s LEFT JOIN ${T_USER} u ON ${col(uCols.id, 'u.')} = ${col(cols.user, 's.')} ${where} ${order} LIMIT ${limit}`
	);
	const asIso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v ?? ''));
	const sessions = rows(listRes).map((r) => ({
		id: String(r.id ?? ''),
		uid: String(r.uid ?? ''),
		ip: String(r.ip ?? ''),
		ua: String(r.ua ?? ''),
		name: String(r.name ?? ''),
		displayName: String(r.displayName ?? ''),
		createdAt: asIso(r.createdAt),
		updatedAt: asIso(r.updatedAt),
		expiresAt: asIso(r.expiresAt)
	}));

	let closed: {
		id: string;
		uid: string;
		ip: string;
		ua: string;
		name: string;
		displayName: string;
		createdAt: string;
		updatedAt: string;
		expiresAt: string;
		closedAt: string;
		reason: string;
		closedBy: string;
	}[] = [];
	let closedTotal = 0;
	if (logState.ok && !useActive) {
		try {
			const cFields: SQL[] = [
				sql`${col('id', 'l.')} AS id`,
				sql`${col('userId', 'l.')} AS uid`
			];
			if (uCols.name) cFields.push(sql`${col(uCols.name, 'u.')} AS name`);
			if (uCols.display) cFields.push(sql`${col(uCols.display, 'u.')} AS displayName`);
			const closedLimit = Math.min(limit, 500);
			const closedRes = await db.execute(
				sql`SELECT ${sql.join(cFields, sql`, `)}, ${col('ip', 'l.')} AS ip, ${col('ua', 'l.')} AS ua, ${col('createdAt', 'l.')} AS createdAt, ${col('updatedAt', 'l.')} AS updatedAt, ${col('expiresAt', 'l.')} AS expiresAt, ${col('closedAt', 'l.')} AS closedAt, ${col('reason', 'l.')} AS reason, ${col('closedBy', 'l.')} AS closedBy FROM ${T_SESSION_LOG} l LEFT JOIN ${T_USER} u ON ${col(uCols.id, 'u.')} = ${col('userId', 'l.')} ORDER BY ${col('closedAt', 'l.')} DESC LIMIT ${closedLimit}`
			);
			closed = rows(closedRes).map((r) => ({
				id: String(r.id ?? ''),
				uid: String(r.uid ?? ''),
				ip: String(r.ip ?? ''),
				ua: String(r.ua ?? ''),
				name: String(r.name ?? ''),
				displayName: String(r.displayName ?? ''),
				createdAt: asIso(r.createdAt),
				updatedAt: asIso(r.updatedAt),
				expiresAt: asIso(r.expiresAt),
				closedAt: asIso(r.closedAt),
				reason: String(r.reason ?? ''),
				closedBy: String(r.closedBy ?? '')
			}));
			const cCount = await db.execute(sql`SELECT COUNT(*) AS n FROM ${T_SESSION_LOG}`);
			closedTotal = Number(rows(cCount)[0]?.n ?? 0);
		} catch {}
	}

	return json({
		sessions,
		total,
		active: useActive,
		limit,
		closed,
		closedTotal,
		...(logState.ok ? {} : { logError: logState.error || 'session log unavailable' })
	});
};
