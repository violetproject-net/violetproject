import { sql, type SQL } from 'drizzle-orm';
import { db } from './db';

export type SessionTableCols = {
	table: string;
	user: string | null;
	ip: string | null;
	ua: string | null;
	created: string | null;
	updated: string | null;
	expires: string | null;
};

export type ClosedSessionRow = {
	id: string;
	userId?: string | null;
	ip?: string | null;
	ua?: string | null;
	createdAt?: Date | string | null;
	updatedAt?: Date | string | null;
	expiresAt?: Date | string | null;
};

export type SessionLogState = { ok: boolean; error?: string };
export type ArchiveResult = { ok: boolean; moved: number };

const rawLog = String(process.env.YNO_SESSION_LOG_TABLE || 'sessionLog');
export const SESSION_LOG_NAME = /^[A-Za-z0-9_$]+$/.test(rawLog) ? rawLog : 'sessionLog';
export const T_SESSION_LOG = sql.raw('`' + SESSION_LOG_NAME + '`');

const q = (name: string) => sql.raw('`' + name + '`');

let ensured: SessionLogState | null = null;
let ensuring: Promise<SessionLogState> | null = null;

export async function ensureSessionLog(): Promise<SessionLogState> {
	if (ensured) return ensured;
	if (!ensuring) {
		ensuring = (async () => {
			try {
				await db.execute(sql`CREATE TABLE IF NOT EXISTS ${T_SESSION_LOG} (
	\`id\` VARCHAR(255) NOT NULL,
	\`userId\` VARCHAR(255) NULL,
	\`ip\` VARCHAR(64) NULL,
	\`ua\` TEXT NULL,
	\`createdAt\` DATETIME(3) NULL,
	\`updatedAt\` DATETIME(3) NULL,
	\`expiresAt\` DATETIME(3) NULL,
	\`closedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	\`reason\` VARCHAR(32) NOT NULL DEFAULT 'closed',
	\`closedBy\` VARCHAR(64) NULL,
	PRIMARY KEY (\`id\`),
	KEY \`sessionLog_user_idx\` (\`userId\`),
	KEY \`sessionLog_closed_idx\` (\`closedAt\`)
)`);
				ensured = { ok: true };
			} catch (e) {
				ensured = { ok: false, error: String((e as Error)?.message || e) };
			}
			return ensured;
		})();
	}
	return ensuring;
}

const asDate = (v: Date | string | null | undefined): Date | null => {
	if (!v) return null;
	if (v instanceof Date) return Number.isFinite(v.getTime()) ? v : null;
	const d = new Date(String(v));
	return Number.isFinite(d.getTime()) ? d : null;
};

export async function insertClosedSession(
	row: ClosedSessionRow,
	reason: string,
	closedBy: string | null = null
): Promise<boolean> {
	if (!row.id) return false;
	const state = await ensureSessionLog();
	if (!state.ok) return false;
	try {
		await db.execute(
			sql`INSERT IGNORE INTO ${T_SESSION_LOG} (\`id\`, \`userId\`, \`ip\`, \`ua\`, \`createdAt\`, \`updatedAt\`, \`expiresAt\`, \`closedAt\`, \`reason\`, \`closedBy\`)
				VALUES (${String(row.id).slice(0, 255)}, ${row.userId ? String(row.userId).slice(0, 255) : null}, ${row.ip ? String(row.ip).slice(0, 64) : null}, ${row.ua ? String(row.ua) : null}, ${asDate(row.createdAt)}, ${asDate(row.updatedAt)}, ${asDate(row.expiresAt)}, NOW(3), ${String(reason || 'closed').slice(0, 32)}, ${closedBy ? String(closedBy).slice(0, 64) : null})`
		);
		return true;
	} catch {
		return false;
	}
}

export async function archiveSessions(
	cols: SessionTableCols,
	where: SQL,
	reason: string,
	closedBy: string | null = null
): Promise<ArchiveResult> {
	const state = await ensureSessionLog();
	if (!state.ok) return { ok: false, moved: 0 };
	const pick = (name: string | null) => (name ? q(name) : sql`NULL`);
	const values: SQL[] = [
		q('id'),
		pick(cols.user),
		pick(cols.ip),
		pick(cols.ua),
		pick(cols.created),
		pick(cols.updated),
		pick(cols.expires),
		sql`NOW(3)`,
		sql`${String(reason || 'closed').slice(0, 32)}`,
		closedBy ? sql`${String(closedBy).slice(0, 64)}` : sql`NULL`
	];
	try {
		const res = await db.execute(
			sql`INSERT IGNORE INTO ${T_SESSION_LOG} (\`id\`, \`userId\`, \`ip\`, \`ua\`, \`createdAt\`, \`updatedAt\`, \`expiresAt\`, \`closedAt\`, \`reason\`, \`closedBy\`)
				SELECT ${sql.join(values, sql`, `)} FROM ${sql.raw('`' + cols.table + '`')} WHERE ${where}`
		);
		const header = (Array.isArray(res) ? res[0] : res) as { affectedRows?: number } | null;
		return { ok: true, moved: Number(header?.affectedRows ?? 0) };
	} catch {
		return { ok: false, moved: 0 };
	}
}
