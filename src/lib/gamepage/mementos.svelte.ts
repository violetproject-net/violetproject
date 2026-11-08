export type MementoVarTrigger = {
	id?: number;
	op?: string;
	val?: number | string;
};

export type MementoSwitchTrigger = {
	id?: number;
	val?: 'on' | 'off' | boolean | string;
};

export type MementoTrigger = {
	map?: number;
	x1?: number;
	x2?: number;
	y1?: number;
	y2?: number;
	evinteract?: number;
	evcollision?: number;
	var1?: MementoVarTrigger;
	switch1?: MementoSwitchTrigger;
	raw: Record<string, unknown>;
};

export type Memento = {
	name: string;
	desc: string;
	cond: string;
	art: string;
	anim: boolean;
	game?: string;
	reqtrigger?: number;
	triggers: Record<string, MementoTrigger>;
	raw: Record<string, unknown>;
};

const BASE =
	typeof import.meta !== 'undefined' && (import.meta as any).env?.BASE_URL
		? String((import.meta as any).env.BASE_URL)
		: '/';
const ROOT = BASE.endsWith('/') ? BASE : BASE + '/';
const ART_DIR = ROOT + 'img/mementos/';


const MEMENTO_MODULES = import.meta.glob('../../../static/mementos/*.json', {
	eager: true,
	import: 'default'
}) as Record<string, unknown>;

const IMAGE_EXTS = ['png', 'webp', 'gif', 'apng', 'jpg', 'jpeg'];
const ANIMATED_EXTS = ['gif', 'webp', 'apng', 'png', 'jpg', 'jpeg'];
const STORAGE_PREFIX = 'vp_mementos';

function numberOrUndefined(value: unknown): number | undefined {
	const n = Number(value);
	return Number.isFinite(n) ? n : undefined;
}

function parseTrigger(value: unknown): MementoTrigger | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const raw = value as Record<string, unknown>;
	const varRaw =
		raw.var1 && typeof raw.var1 === 'object' && !Array.isArray(raw.var1)
			? (raw.var1 as Record<string, unknown>)
			: null;
	const switchRaw =
		raw.switch1 && typeof raw.switch1 === 'object' && !Array.isArray(raw.switch1)
			? (raw.switch1 as Record<string, unknown>)
			: null;

	return {
		map: numberOrUndefined(raw.map),
		x1: numberOrUndefined(raw.x1),
		x2: numberOrUndefined(raw.x2),
		y1: numberOrUndefined(raw.y1),
		y2: numberOrUndefined(raw.y2),
		evinteract: numberOrUndefined(raw.evinteract),
		evcollision: numberOrUndefined(raw.evcollision),
		var1: varRaw
			? {
					id: numberOrUndefined(varRaw.id),
					op: varRaw.op === undefined ? undefined : String(varRaw.op),
					val: varRaw.val as number | string | undefined
				}
			: undefined,
		switch1: switchRaw
			? {
					id: numberOrUndefined(switchRaw.id),
					val: switchRaw.val as MementoSwitchTrigger['val']
				}
			: undefined,
		raw
	};
}

function parseMemento(value: unknown): Memento | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const raw = value as Record<string, unknown>;
	const name = typeof raw.name === 'string' ? raw.name.trim() : '';
	if (!name) return null;

	const triggers: Record<string, MementoTrigger> = {};
	for (const [key, trigger] of Object.entries(raw)) {
		if (!/^t\d+$/i.test(key)) continue;
		const parsed = parseTrigger(trigger);
		if (parsed) triggers[key.toLowerCase()] = parsed;
	}

	const animRaw = raw.anim;
	const anim =
		animRaw === true ||
		animRaw === 1 ||
		(typeof animRaw === 'string' && /^(y|yes|true|1)$/i.test(animRaw.trim()));

	return {
		name,
		desc: typeof raw.desc === 'string' ? raw.desc : '',
		cond: typeof raw.cond === 'string' ? raw.cond : '',
		art: typeof raw.art === 'string' ? raw.art : '',
		anim,
		game: typeof raw.game === 'string' && raw.game.trim() ? raw.game.trim() : undefined,
		reqtrigger: numberOrUndefined(raw.reqtrigger),
		triggers,
		raw
	};
}


export function parseMementos(data: unknown): Memento[] {
	let list: unknown[] = [];
	if (Array.isArray(data)) {
		list = data;
	} else if (data && typeof data === 'object') {
		list = Object.entries(data as Record<string, unknown>).map(([name, value]) => {
			if (!value || typeof value !== 'object' || Array.isArray(value)) return { name };
			return { name, ...(value as Record<string, unknown>) };
		});
	}

	const out: Memento[] = [];
	const seen = new Set<string>();
	for (const item of list) {
		const memento = parseMemento(item);
		if (!memento || seen.has(memento.name)) continue;
		seen.add(memento.name);
		out.push(memento);
	}
	return out;
}

function bundledMementos(): Memento[] {
	const items: unknown[] = [];
	for (const [file, data] of Object.entries(MEMENTO_MODULES)) {
		try {
			if (Array.isArray(data)) {
				items.push(...data);
			} else if (data && typeof data === 'object') {
				if (typeof (data as Record<string, unknown>).name === 'string') {
					items.push(data);
				} else {
					for (const [name, value] of Object.entries(data as Record<string, unknown>)) {
						if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
						items.push({ name, ...(value as Record<string, unknown>) });
					}
				}
			}
		} catch (e) {
			console.warn(`[mementos] could not parse ${file}`, e);
		}
	}
	return parseMementos(items);
}


export function mementoArtUrls(memento: Pick<Memento, 'name' | 'anim'>): string[] {
	const name = String(memento.name || '').trim();
	if (!name) return [];

	const extMatch = name.match(/\.([a-z0-9]+)$/i);
	if (extMatch) {
		const stem = name.slice(0, -extMatch[0].length);
		const ext = extMatch[1].toLowerCase();
		const rest = IMAGE_EXTS.filter((candidate) => candidate !== ext);
		return [ext, ...rest].map((candidate) => `${ART_DIR}${encodeURIComponent(stem)}.${candidate}`);
	}

	const exts = memento.anim ? ANIMATED_EXTS : IMAGE_EXTS;
	return exts.map((ext) => `${ART_DIR}${encodeURIComponent(name)}.${ext}`);
}

function safeScope(name: string): string {
	const scope = String(name || '').trim().toLowerCase();
	return scope || 'guest';
}

export class Mementos {
	all = $state<Memento[]>([]);
	unlocked = $state<string[]>([]);
	loading = $state(false);
	ready = $state(false);
	error = $state('');

	serverBacked = $state(false);

	private loaded = false;
	private scope = 'guest';
	private storageKey = `${STORAGE_PREFIX}:guest`;

	constructor() {
		this.loadUnlocked();
	}

	setPlayer(name: string, uid?: string) {
		const account = String(uid || '').trim();
		const scope = account ? `uid:${account}` : safeScope(name);
		if (scope === this.scope) return;
		const wasGuest = this.scope === 'guest';
		const hadServerData = this.serverBacked && this.unlocked.length > 0;
		this.scope = scope;
		this.storageKey = `${STORAGE_PREFIX}:${scope}`;
		this.serverBacked = Boolean(account || String(name || '').trim());

		if (!(wasGuest && hadServerData)) this.unlocked = [];
		if (!this.serverBacked) this.loadUnlocked();
	}


	async load(force = false) {
		if (this.loading) return;
		if (this.loaded && !force) return;
		this.loading = true;
		this.error = '';
		try {
			this.all = bundledMementos();
			this.unlocked = this.canonicalNames(this.unlocked);
			if (!this.serverBacked) this.saveUnlocked();
			this.loaded = true;
		} catch (e) {
			this.error = String(e);
			console.warn('[mementos] could not load memento definitions', e);
		} finally {
			this.loading = false;
			this.ready = true;
		}
	}

	has(name: string): boolean {
		return this.unlocked.includes(name);
	}

	isUnlocked(name: string): boolean {
		return this.has(name);
	}

	get unlockedList(): Memento[] {
		return this.all.filter((memento) => this.has(memento.name));
	}

	get count(): number {
		return this.all.length ? this.unlockedList.length : this.unlocked.length;
	}

	unlock(name: string): boolean {
		if (this.serverBacked) {
			console.warn('[mementos] unlocks are enforced by the relay for logged-in players');
			return false;
		}
		return this.unlockLocal(name);
	}

	private unlockLocal(name: string): boolean {
		const wanted = String(name || '').trim();
		if (!wanted) return false;
		const definition = this.all.find(
			(memento) => memento.name.toLowerCase() === wanted.toLowerCase()
		);
		if (this.loaded && this.all.length && !definition) {
			console.warn(`[mementos] no definition named "${wanted}"`);
			return false;
		}
		const canonical = definition?.name ?? wanted;
		if (this.has(canonical)) return false;
		this.unlocked = [...this.unlocked, canonical];
		this.saveUnlocked();
		return true;
	}

	lock(name: string): boolean {
		if (this.serverBacked || !this.has(name)) return false;
		this.unlocked = this.unlocked.filter((unlocked) => unlocked !== name);
		this.saveUnlocked();
		return true;
	}

	toggle(name: string): boolean {
		if (this.has(name)) {
			this.lock(name);
			return false;
		}
		return this.unlock(name);
	}

	unlockAll(): void {
		if (this.serverBacked) return;
		this.unlocked = this.all.map((memento) => memento.name);
		this.saveUnlocked();
	}

	syncFromServer(entries: unknown) {
		const list = Array.isArray(entries) ? entries : [];
		const names = list
			.map((entry) => {
				if (typeof entry === 'string') return entry;
				if (entry && typeof entry === 'object' && 'name' in entry) {
					return String((entry as { name?: unknown }).name || '');
				}
				return '';
			})
			.filter(Boolean);
		this.serverBacked = true;
		this.unlocked = this.canonicalNames(names);
	}

	addServerUnlock(name: string): boolean {
		const canonical = this.canonicalNames([name])[0];
		if (!canonical || this.has(canonical)) return false;
		this.serverBacked = true;
		this.unlocked = [...this.unlocked, canonical];
		return true;
	}

	private canonicalNames(names: string[]): string[] {
		const canonical = new Map<string, string>(
			this.all.map((memento) => [memento.name.toLowerCase(), memento.name])
		);
		const out: string[] = [];
		const seen = new Set<string>();
		for (const name of names) {
			const key = String(name || '').trim();
			if (!key) continue;
			const resolved = canonical.get(key.toLowerCase()) ?? key;
			if (seen.has(resolved)) continue;
			seen.add(resolved);
			out.push(resolved);
		}
		return out;
	}

	private loadUnlocked() {
		if (typeof localStorage === 'undefined') return;
		try {
			const raw = localStorage.getItem(this.storageKey);
			const parsed = raw ? JSON.parse(raw) : [];
			this.unlocked = Array.isArray(parsed)
				? parsed.filter((name): name is string => typeof name === 'string' && !!name)
				: [];
		} catch {
			this.unlocked = [];
		}
	}

	private saveUnlocked() {
		if (this.serverBacked) return;
		try {
			localStorage.setItem(this.storageKey, JSON.stringify(this.unlocked));
		} catch {}
	}
}