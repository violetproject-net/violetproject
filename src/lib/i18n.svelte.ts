export type LangMeta = { code: string; name: string; rtl?: boolean; file: string };
type LangFile = { code?: string; name?: string; rtl?: boolean; strings?: Record<string, string> };

const STORE_KEY = 'vp_lang';
const BASE =
	typeof import.meta !== 'undefined' && (import.meta as any).env?.BASE_URL
		? String((import.meta as any).env.BASE_URL)
		: '/';
const LANG_DIR = BASE.replace(/\/?$/, '/') + 'gamepage/lang/';

const state = $state({
	code: 'en',
	list: [{ code: 'en', name: 'English', file: 'en.json' }] as LangMeta[],
	dict: {} as Record<string, string>,
	ready: false
});

let booted = false;
const cache: Record<string, LangFile> = {};

export function currentLang() {
	return state.code;
}

export function langs() {
	return state.list;
}

export function t(key: string, fallback = '', params?: Record<string, string | number>) {
	let s = state.dict[key] ?? fallback ?? '';
	if (params) {
		for (const [k, v] of Object.entries(params)) s = s.split('{' + k + '}').join(String(v));
	}
	return s;
}

function applyHtml(code: string, rtl?: boolean) {
	try {
		document.documentElement.lang = code;
		document.documentElement.dir = rtl ? 'rtl' : 'ltr';
	} catch {}
}

async function fetchJson(url: string) {
	try {
		const r = await fetch(url, { cache: 'no-cache' });
		if (!r.ok) return null;
		return await r.json();
	} catch {
		return null;
	}
}

async function loadFile(file: string): Promise<LangFile | null> {
	if (cache[file]) return cache[file];
	const data = await fetchJson(LANG_DIR + file);
	if (!data || typeof data !== 'object') return null;
	cache[file] = data as LangFile;
	return cache[file];
}

async function loadMeta(file: string): Promise<LangMeta | null> {
	const data = await loadFile(file);
	if (!data || typeof data.code !== 'string' || !data.code) return null;
	return {
		code: data.code,
		name: typeof data.name === 'string' && data.name ? data.name : data.code,
		rtl: !!data.rtl,
		file
	};
}

export async function setLang(code: string) {
	const meta = state.list.find((l) => l.code === code);
	if (!meta) return;
	try {
		localStorage.setItem(STORE_KEY, code);
	} catch {}
	state.code = code;
	applyHtml(code, meta.rtl);
	const data = await loadFile(meta.file);
	if (state.code === code) state.dict = (data && data.strings) || {};
}

export async function initI18n() {
	if (booted || typeof window === 'undefined') return;
	booted = true;
	const index = await fetchJson(LANG_DIR + 'index.json');
	const files: string[] = Array.isArray(index)
		? index.filter((f): f is string => typeof f === 'string' && !!f)
		: [];
	const metas = (await Promise.all(files.map(loadMeta))).filter((m): m is LangMeta => !!m);
	if (metas.length) {
		metas.sort((a, b) => (a.code === 'en' ? -1 : b.code === 'en' ? 1 : a.name.localeCompare(b.name)));
		state.list = metas;
	}
	let want = '';
	try {
		want = localStorage.getItem(STORE_KEY) || '';
	} catch {}
	if (!want) {
		const nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
		const low = nav.toLowerCase();
		const hit = state.list.find(
			(l) => low === l.code.toLowerCase() || low.startsWith(l.code.toLowerCase() + '-')
		);
		if (hit) want = hit.code;
	}
	if (want && state.list.some((l) => l.code === want)) {
		await setLang(want);
	} else {
		applyHtml(state.code);
	}
	state.ready = true;
}
