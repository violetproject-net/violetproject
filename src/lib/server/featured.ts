import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { homeGames } from '../games';

type FeaturedState = {
	sentDate: string;
};

const DEFAULT_STATE =
	process.platform === 'win32'
		? path.join(process.cwd(), '.featured-state.json')
		: '/var/lib/violetproject-featured/state.json';
const DEFAULT_SITE = 'https://violetproject.net';
const DEFAULT_ROLE = '1562925151270736015';
const DEFAULT_START = '2026-10-22';

let memory: FeaturedState | null = null;
let warned = false;
let timer: ReturnType<typeof setTimeout> | null = null;

const pad = (n: number) => String(n).padStart(2, '0');

function todayUtc() {
	const d = new Date();
	return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function readEnvFile() {
	const file = (process.env.FEATURED_ENV_FILE || '').trim() || '/etc/violetproject-featured.env';
	const out: Record<string, string> = {};
	try {
		for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
			const line = raw.trim();
			if (!line || line.startsWith('#')) continue;
			const i = line.indexOf('=');
			if (i < 1) continue;
			const key = line.slice(0, i).trim();
			let value = line.slice(i + 1).trim();
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}
			if (key) out[key] = value;
		}
	} catch {}
	return out;
}

function config() {
	const file = readEnvFile();
	const pick = (key: string, fallback = '') => {
		const env = process.env[key];
		if (typeof env === 'string' && env.trim() !== '') return env.trim();
		const value = file[key];
		return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
	};
	return {
		webhook: pick('DISCORD_FEATURED_WEBHOOK'),
		token: pick('DISCORD_FEATURED_BOT_TOKEN'),
		channel: pick('DISCORD_FEATURED_CHANNEL_ID'),
		role: pick('DISCORD_FEATURED_ROLE_ID', DEFAULT_ROLE),
		site: pick('SITE_URL', DEFAULT_SITE).replace(/\/+$/, ''),
		sendOnStart: pick('FEATURED_SEND_ON_START') === '1'
	};
}

function featuredStart() {
	const env = (process.env.FEATURED_START || '').trim();
	if (env) return env;
	const file = (readEnvFile().FEATURED_START || '').trim();
	return file || DEFAULT_START;
}

function stateFile() {
	const env = (process.env.FEATURED_STATE_FILE || '').trim();
	if (env) return env;
	const file = (readEnvFile().FEATURED_STATE_FILE || '').trim();
	return file || DEFAULT_STATE;
}

function readState(): FeaturedState | null {
	try {
		const raw = JSON.parse(fs.readFileSync(stateFile(), 'utf8')) as Partial<FeaturedState>;
		if (raw && typeof raw.sentDate === 'string') return { sentDate: raw.sentDate };
	} catch {}
	return memory;
}

function writeState(state: FeaturedState) {
	memory = state;
	try {
		const file = stateFile();
		fs.mkdirSync(path.dirname(file), { recursive: true });
		const tmp = `${file}.tmp`;
		fs.writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n');
		fs.renameSync(tmp, file);
	} catch (e) {
		if (!warned) {
			warned = true;
			console.warn('[featured] error:', (e as Error).message);
		}
	}
}

export function featuredGameForDate(date: string) {
	if (!homeGames.length) throw new Error('[featured] error');
	const h = createHash('sha256').update(`violetproject-featured:${date}`).digest();
	const game = homeGames[h.readUInt32BE(0) % homeGames.length];
	if (!game) throw new Error('[featured] error');
	return game;
}

function featuredNo(date: string, start: string) {
	const a = Date.parse(`${start}T00:00:00Z`);
	const b = Date.parse(`${date}T00:00:00Z`);
	if (!Number.isFinite(a) || !Number.isFinite(b)) return 1;
	return Math.max(1, Math.floor((b - a) / 86400000) + 1);
}

export function getTodayFeatured() {
	const date = todayUtc();
	const game = featuredGameForDate(date);
	const state = readState();
	return {
		slug: game.slug,
		name: game.name,
		no: featuredNo(date, featuredStart()),
		date,
		sent: state?.sentDate === date
	};
}

export async function sendFeatured(force = false) {
	const day = getTodayFeatured();
	if (day.sent && !force) {
		console.log(`[featured] for (${day.date})`);
		return false;
	}
	const cfg = config();
	if (!cfg.webhook && !(cfg.token && cfg.channel)) {
		console.warn('[featured] configure /etc/violetproject-featured.env');
		return false;
	}
	const now = new Date();
	const stamp = `${pad(now.getUTCMonth() + 1)}/${pad(now.getUTCDate())}/${String(now.getUTCFullYear()).slice(-2)}`;
	const content = `Today's featured ynfg: [**${day.name}**](${cfg.site}/${day.slug})\n\n-# <@&${cfg.role}>\n-# NO.${day.no}  ${stamp}`;
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	const url = cfg.webhook || `https://discord.com/api/v10/channels/${cfg.channel}/messages`;
	if (!cfg.webhook) headers.Authorization = `Bot ${cfg.token}`;
	let res: Response;
	try {
		res = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify({ content, allowed_mentions: { parse: [], roles: [cfg.role] } }),
			signal: AbortSignal.timeout(15000)
		});
	} catch (e) {
		console.error('[featured] error de red:', (e as Error).message);
		return false;
	}
	if (!res.ok) {
		const body = await res.text().catch(() => '');
		console.error(`[featured] discord error ${res.status}: ${body.slice(0, 400)}`);
		return false;
	}
	writeState({ sentDate: day.date });
	console.log(`[featured] sent NO.${day.no}: ${day.name} (${day.slug})`);
	return true;
}

function schedule() {
	const now = new Date();
	const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0);
	const delay = Math.max(1000, next - now.getTime());
	if (timer) clearTimeout(timer);
	timer = setTimeout(async () => {
		try {
			await sendFeatured();
		} catch (e) {
			console.error('[featured] error:', (e as Error).message);
		}
		schedule();
	}, delay);
	(timer as unknown as { unref?: () => void }).unref?.();
	console.log(`[featured] post: ${new Date(now.getTime() + delay).toISOString()}`);
}

export function startFeaturedBot() {
	const g = globalThis as unknown as { __vpFeaturedBot?: boolean };
	if (g.__vpFeaturedBot) return;
	g.__vpFeaturedBot = true;
	const cfg = config();
	if (cfg.sendOnStart) {
		void sendFeatured().catch((e) => console.error('[featured] error:', (e as Error).message));
	}
	schedule();
}
