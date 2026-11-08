import { error } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
const env = process.env;
import { db } from '../../../lib/server/db';


export const SESSION_DAYS = 30;
export const HANDOFF_TTL = 10 * 60_000;

export const T_SESSIONS = sql.raw('`desktopSessions`');
export const T_USER = sql.raw('`user`');
export const T_CHAT = sql.raw('`chatMessages`');

export const col = (name: string, prefix = '') => sql.raw(prefix + '`' + name + '`');

type Row = Record<string, unknown>;

export function rows(res: unknown): Row[] {
	if (Array.isArray(res)) {
		const first = res[0];
		if (Array.isArray(first)) return first as Row[];
		return res as Row[];
	}
	const maybe = res as { rows?: Row[] } | null;
	return maybe && Array.isArray(maybe.rows) ? maybe.rows : [];
}

export function hashToken(token: string) {
	return createHash('sha256').update(token).digest('hex');
}

export function randomToken(bytes: number) {
	return randomBytes(bytes).toString('base64url');
}

export function envList(name: string) {
	return String(env[name] ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}

export function discordAllowed(discordId: string) {
	const list = envList('YNO_DESKTOP_DISCORD_IDS');
	return list.length > 0 && list.includes(String(discordId));
}

export function safeEqual(a: string, b: string) {
	const ha = createHash('sha256').update(a).digest();
	const hb = createHash('sha256').update(b).digest();
	return timingSafeEqual(ha, hb);
}

export function bearer(request: Request) {
	const h = request.headers.get('authorization') || '';
	const m = /^Bearer\s+(.+)$/i.exec(h.trim());
	return m ? m[1].trim() : '';
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
	try {
		const body = (await request.json()) as unknown;
		return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}

export type DesktopSession = {
	discordId: string;
	discordName: string;
	locked: boolean;
	siteVerified: boolean;
	siteUid: string;
	siteName: string;
	tokenHash: string;
};

export async function requireDesktop(
	request: Request,
	opts: { unlocked?: boolean } = {}
): Promise<DesktopSession> {
	const token = bearer(request);
	if (!token) throw error(401, 'missing token');
	const hash = hashToken(token);
	let res: unknown = null;
	try {
		res = await db.execute(
			sql`SELECT discordId, discordName, locked, siteVerified, siteUserId, siteUserName, expiresAt FROM ${T_SESSIONS} WHERE tokenHash = ${hash} AND revoked = 0 LIMIT 1`
		);
	} catch {
		throw error(503, 'desktopSessions table missing or outdated');
	}
	const row = rows(res)[0];
	if (!row) throw error(401, 'bad token');
	const until =
		row.expiresAt instanceof Date ? row.expiresAt.getTime() : Date.parse(String(row.expiresAt ?? ''));
	if (Number.isFinite(until) && until < Date.now()) throw error(401, 'session expired');
	const discordId = String(row.discordId || '');
	if (!discordAllowed(discordId)) {
		throw error(403, 'discord id not allowed');
	}
	const locked = Number(row.locked) === 1;
	const siteVerified = Number(row.siteVerified) === 1;
	if (opts.unlocked && locked) throw error(403, 'locked');
	if (opts.unlocked && !siteVerified) throw error(403, 'site login required');
	db.execute(sql`UPDATE ${T_SESSIONS} SET lastSeenAt = NOW() WHERE tokenHash = ${hash}`).catch(
		() => {}
	);
	return {
		discordId,
		discordName: String(row.discordName || ''),
		locked,
		siteVerified,
		siteUid: String(row.siteUserId || ''),
		siteName: String(row.siteUserName || ''),
		tokenHash: hash
	};
}

const gateFails = new Map<string, { n: number; at: number }>();
const GATE_WINDOW = 15 * 60_000;

export function attemptsBlocked(key: string) {
	const rec = gateFails.get(key);
	if (!rec) return false;
	if (Date.now() - rec.at > GATE_WINDOW) {
		gateFails.delete(key);
		return false;
	}
	return rec.n >= 10;
}

export function attemptsNote(key: string, ok: boolean) {
	if (ok) {
		gateFails.delete(key);
		return;
	}
	const rec = gateFails.get(key);
	if (!rec || Date.now() - rec.at > GATE_WINDOW) gateFails.set(key, { n: 1, at: Date.now() });
	else rec.n += 1;
}

export const pendingStates = new Map<string, number>();
export const handoffCodes = new Map<string, { discordId: string; name: string; at: number }>();

export type UserCols = {
	id: string;
	name: string | null;
	display: string | null;
	email: string | null;
	created: string | null;
};
let userColsCache: UserCols | null = null;

export async function userCols(): Promise<UserCols> {
	if (userColsCache) return userColsCache;
	const table = String(env.YNO_USER_TABLE || 'user');
	let names = new Set<string>();
	try {
		const res = await db.execute(
			sql`SELECT COLUMN_NAME AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table}`
		);
		names = new Set(rows(res).map((r) => String(r.c || '').toLowerCase()));
	} catch {
	}
	const pick = (...cs: string[]) => cs.find((c) => names.has(c)) ?? null;
	userColsCache = {
		id: pick('id') ?? 'id',
		name: pick('name'),
		display: pick('displayusername', 'display_username'),
		email: pick('email'),
		created: pick('createdat', 'created_at')
	};
	return userColsCache;
}

export type AccountCols = {
	table: string;
	user: string | null;
	provider: string | null;
	password: string | null;
};
let acctColsCache: AccountCols | null = null;

export async function acctCols(): Promise<AccountCols> {
	if (acctColsCache) return acctColsCache;
	const raw = String(env.YNO_ACCOUNT_TABLE || 'account');
	const table = /^[A-Za-z0-9_$]+$/.test(raw) ? raw : 'account';
	let names = new Set<string>();
	try {
		const res = await db.execute(
			sql`SELECT COLUMN_NAME AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table}`
		);
		names = new Set(rows(res).map((r) => String(r.c || '').toLowerCase()));
	} catch {}
	const pick = (...cs: string[]) => cs.find((c) => names.has(c)) ?? null;
	acctColsCache = {
		table,
		user: pick('userid', 'user_id'),
		provider: pick('providerid', 'provider_id'),
		password: pick('password')
	};
	return acctColsCache;
}
