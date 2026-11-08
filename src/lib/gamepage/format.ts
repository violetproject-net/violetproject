import { t } from '../i18n.svelte';
import type { PingOption } from './types';

export type TimeFormat = '24h' | '12h' | 'off';

const pad2 = (n: number) => String(n).padStart(2, '0');

export function escHtml(s: string) {
	return String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export function fmtTime(ts: number | undefined, fmt: TimeFormat) {
	if (fmt === 'off' || !ts) return '';
	const d = new Date(ts);
	const mm = pad2(d.getMinutes());
	if (fmt === '12h') {
		const h = d.getHours();
		return `${h % 12 || 12}:${mm} ${h >= 12 ? 'PM' : 'AM'}`;
	}
	return `${pad2(d.getHours())}:${mm}`;
}

export function fmtShotTs(ts?: number) {
	if (!ts) return '';
	const d = new Date(ts);
	return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function shotFileTs(ts: number) {
	const d = new Date(ts || Date.now());
	return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}-${pad2(d.getHours())}h${pad2(d.getMinutes())}m${pad2(d.getSeconds())}s`;
}

export function shotUrl(id: number | string) {
	return `/api/screenshots?id=${id}`;
}

export function shotIdsIn(text: string): number[] {
	const out: number[] = [];
	for (const m of String(text ?? '').matchAll(/\[shot:(\d{1,19})\]/g)) {
		const id = Number(m[1]);
		if (id > 0 && !out.includes(id)) out.push(id);
	}
	return out;
}


export function richText(text: string, canSeeShot: () => boolean, withShots = true) {
	let s = escHtml(text);
	let embedded = false;
	s = s.replace(/\[shot:(\d{1,19})\]/g, (_tok, id) => {
		if (!withShots) return '';
		if (canSeeShot() && !embedded) {
			embedded = true;
			return `<img class="shot" loading="lazy" src="${shotUrl(id)}" alt="${t('shots.alt', 'screenshot')}" onerror="this.style.display='none'" />`;
		}
		return '[screenshot]';
	});
	s = s.replace(/\|\|(.+?)\|\|/g, '<span class="spoiler">$1</span>');
	s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
	s = s.replace(/~~(.+?)~~/g, '<s>$1</s>');
	s = s.replace(/\*([^*]+?)\*/g, '<i>$1</i>');
	return s;
}

export function isPingFor(text: string, selfName: string) {
	if (!selfName) return false;
	const at = '@' + selfName.toLowerCase();
	const i = text.toLowerCase().indexOf(at);
	if (i < 0) return false;
	const after = text[i + at.length];
	return after === undefined || /[^a-zA-Z0-9._]/.test(after);
}

export function b64enc(buf: Uint8Array) {
	let s = '';
	const CH = 0x8000;
	for (let i = 0; i < buf.length; i += CH) {
		s += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + CH)));
	}
	return btoa(s);
}

const PING_FILE_RE = /^[\w\-.]+\.(wav|mp3|ogg)$/i;

export const isPingFile = (f: string) => PING_FILE_RE.test(f);

export function parsePingList(l: unknown): PingOption[] {
	if (!Array.isArray(l)) return [];
	const out: PingOption[] = [];
	for (const e of l) {
		if (typeof e === 'string') {
			if (PING_FILE_RE.test(e)) out.push({ file: e, label: e });
		} else if (e && typeof e === 'object') {
			const o = e as Record<string, unknown>;
			const file = String(o.file ?? '');
			if (!PING_FILE_RE.test(file)) continue;
			const label = String(o.name ?? o.label ?? file).slice(0, 40) || file;
			out.push({ file, label });
		}
		if (out.length >= 20) break;
	}
	return out;
}
