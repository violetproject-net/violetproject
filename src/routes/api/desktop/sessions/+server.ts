import { error, json } from '@sveltejs/kit';
import { sql, type SQL } from 'drizzle-orm';
import { db } from '../../../../lib/server/db';
import { archiveSessions, ensureSessionLog, T_SESSION_LOG } from '../../../../lib/server/session-log';
import { col, readJson, requireDesktop, rows } from '../_guard';
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
	const userId = String(url.searchParams.get('user') || '').trim();
	if (!userId) throw error(400, 'need a user id');
	const limit = Math.min(
		100,
		Math.max(1, Math.floor(Number(url.searchParams.get('limit') || 0)) || 50)
	);
	const cols = await sessionCols();
	if (!cols.user) throw error(503, 'session table missing or outdated');
	const T_SESSION = sql.raw('`' + cols.table + '`');
	const last = cols.updated ?? cols.created ?? 'id';
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

	const fields: SQL[] = [sql`${col('id')} AS id`];
	if (cols.ip) fields.push(sql`${col(cols.ip)} AS ip`);
	if (cols.ua) fields.push(sql`${col(cols.ua)} AS ua`);
	if (cols.created) fields.push(sql`${col(cols.created)} AS createdAt`);
	if (cols.updated) fields.push(sql`${col(cols.updated)} AS updatedAt`);
	if (cols.expires) fields.push(sql`${col(cols.expires)} AS expiresAt`);

	const countRes = await db.execute(
		sql`SELECT COUNT(*) AS n FROM ${T_SESSION} WHERE ${col(cols.user)} = ${userId}`
	);
	const total = Number(rows(countRes)[0]?.n ?? 0);

	const listRes = await db.execute(
		sql`SELECT ${sql.join(fields, sql`, `)} FROM ${T_SESSION} WHERE ${col(cols.user)} = ${userId} ORDER BY ${col(last)} DESC LIMIT ${limit}`
	);
	const asIso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v ?? ''));
	const sessions = rows(listRes).map((r) => ({
		id: String(r.id ?? ''),
		ip: String(r.ip ?? ''),
		ua: String(r.ua ?? ''),
		createdAt: asIso(r.createdAt),
		updatedAt: asIso(r.updatedAt),
		expiresAt: asIso(r.expiresAt)
	}));

	let ips: { ip: string; count: number; last: string }[] = [];
	if (cols.ip) {
		const ipRes = await db.execute(
			sql`SELECT ${col(cols.ip)} AS ip, COUNT(*) AS n, MAX(${col(last)}) AS last FROM ${T_SESSION} WHERE ${col(cols.user)} = ${userId} GROUP BY ${col(cols.ip)} ORDER BY last DESC LIMIT 25`
		);
		ips = rows(ipRes).map((r) => ({
			ip: String(r.ip ?? ''),
			count: Number(r.n ?? 0),
			last: asIso(r.last)
		}));
	}
	if (logState.ok) {
		try {
			const logIps = await db.execute(
				sql`SELECT \`ip\` AS ip, COUNT(*) AS n, MAX(\`closedAt\`) AS last FROM ${T_SESSION_LOG} WHERE \`userId\` = ${userId} AND \`ip\` IS NOT NULL AND \`ip\` <> '' GROUP BY \`ip\``
			);
			const byIp = new Map(ips.map((s) => [s.ip, s]));
			for (const r of rows(logIps)) {
				const ip = String(r.ip ?? '');
				if (!ip) continue;
				const count = Number(r.n ?? 0);
				const last = asIso(r.last);
				const rec = byIp.get(ip);
				if (rec) {
					rec.count += count;
					if (last > rec.last) rec.last = last;
				} else {
					const fresh = { ip, count, last };
					ips.push(fresh);
					byIp.set(ip, fresh);
				}
			}
			ips = ips
				.slice()
				.sort((a, b) => String(b.last).localeCompare(String(a.last)))
				.slice(0, 25);
		} catch {}
	}

	let closed: {
		id: string;
		ip: string;
		ua: string;
		createdAt: string;
		updatedAt: string;
		expiresAt: string;
		closedAt: string;
		reason: string;
		closedBy: string;
	}[] = [];
	let closedTotal = 0;
	if (logState.ok) {
		try {
			const closedRes = await db.execute(
				sql`SELECT \`id\` AS id, \`ip\` AS ip, \`ua\` AS ua, \`createdAt\` AS createdAt, \`updatedAt\` AS updatedAt, \`expiresAt\` AS expiresAt, \`closedAt\` AS closedAt, \`reason\` AS reason, \`closedBy\` AS closedBy FROM ${T_SESSION_LOG} WHERE \`userId\` = ${userId} ORDER BY \`closedAt\` DESC LIMIT ${limit}`
			);
			closed = rows(closedRes).map((r) => ({
				id: String(r.id ?? ''),
				ip: String(r.ip ?? ''),
				ua: String(r.ua ?? ''),
				createdAt: asIso(r.createdAt),
				updatedAt: asIso(r.updatedAt),
				expiresAt: asIso(r.expiresAt),
				closedAt: asIso(r.closedAt),
				reason: String(r.reason ?? ''),
				closedBy: String(r.closedBy ?? '')
			}));
			const cCount = await db.execute(
				sql`SELECT COUNT(*) AS n FROM ${T_SESSION_LOG} WHERE \`userId\` = ${userId}`
			);
			closedTotal = Number(rows(cCount)[0]?.n ?? 0);
		} catch {}
	}

	return json({
		userId,
		sessions,
		closed,
		ips,
		total,
		closedTotal,
		...(logState.ok ? {} : { logError: logState.error || 'session log unavailable' })
	});
};

export const POST: RequestHandler = async ({ request }) => {
	const admin = await requireDesktop(request, { unlocked: true });
	const body = await readJson(request);
	const userId = String(body.user || '').trim();
	const id = String(body.id || '').trim();
	const all = body.all === true;
	if (!userId) throw error(400, 'need a user id');
	if (!all && !id) throw error(400, 'need a session id or all');
	const cols = await sessionCols();
	if (!cols.user) throw error(503, 'session table missing or outdated');
	const T_SESSION = sql.raw('`' + cols.table + '`');
	const where = all
		? sql`WHERE ${col(cols.user)} = ${userId}`
		: sql`WHERE ${col(cols.user)} = ${userId} AND ${col('id')} = ${id}`;
	const arch = await archiveSessions(cols, where, 'revoked', admin.discordName || admin.siteName || null);
	const countRes = await db.execute(sql`SELECT COUNT(*) AS n FROM ${T_SESSION} ${where}`);
	const deleted = Number(rows(countRes)[0]?.n ?? 0);
	if (deleted > 0) await db.execute(sql`DELETE FROM ${T_SESSION} ${where}`);
	return json({ ok: true, deleted, logged: arch.moved });
};
