import { currentLang } from '../i18n.svelte';

async function fetchLocTable(url: string): Promise<Record<string, string> | null> {
	try {
		const r = await fetch(url, { cache: 'no-store' });
		if (!r.ok) return null;
		const j = await r.json().catch(() => null);
		return j && typeof j === 'object' && !Array.isArray(j) ? (j as Record<string, string>) : null;
	} catch {
		return null;
	}
}


export class Locations {

	currentRoom = $state(0);

	private byGame: Record<string, Record<string, string>> = $state({});
	private names: Record<string, string> = $state({});
	private loading = new Set<string>();
	private loadedLang: Record<string, string> = {};


	private presenceByGame: Record<string, Record<string, string>> = $state({});
	private presenceLoading = new Set<string>();

	constructor(private game: string) {}

	async ensure(game: string, force = false) {
		const g = (game || '').toLowerCase();
		if (!g) return;
		const lang = currentLang();
		if (this.loading.has(g)) return;
		if (!force && this.byGame[g] && this.loadedLang[g] === lang) return;
		this.loading.add(g);
		const [base, tr] = await Promise.all([
			fetchLocTable(`/locations/${g}.json`),
			fetchLocTable(`/locations/${g}_${encodeURIComponent(lang)}.json`)
		]);
		this.loading.delete(g);
		if (currentLang() !== lang) {
			void this.ensure(g);
			return;
		}
		const table: Record<string, string> = { ...(base || {}), ...(tr || {}) };
		this.byGame = { ...this.byGame, [g]: table };
		this.loadedLang[g] = lang;
		if (typeof table.game === 'string' && table.game) {
			this.names = { ...this.names, [g]: table.game };
		}
	}

	gameName(id: string): string {
		const g = (id || '').toLowerCase();
		return this.names[g] || id;
	}

	mapName(game: string, room: number): string {
		const table = this.byGame[(game || '').toLowerCase()];
		if (table) {
			const hit = table[String(room).padStart(4, '0')] ?? table[String(room)];
			if (hit) return String(hit);
		}
		return String(room);
	}


	get currentMapName() {
		return this.currentRoom > 0 ? this.mapName(this.game, this.currentRoom) : '—';
	}

	async ensurePresence(game: string) {
		const g = (game || '').toLowerCase();
		if (!g || this.presenceByGame[g] || this.presenceLoading.has(g)) return;
		this.presenceLoading.add(g);
		const base = await fetchLocTable(`/locations/${g}.json`);
		this.presenceLoading.delete(g);
		this.presenceByGame = { ...this.presenceByGame, [g]: { ...(base || {}) } };
	}


	postPresence() {
		const wv = (window as unknown as { chrome?: { webview?: { postMessage?: (m: unknown) => void } } })
			.chrome?.webview;
		if (typeof wv?.postMessage !== 'function') return;
		const g = (this.game || '').toLowerCase();
		const table = this.presenceByGame[g] || {};
		const room = this.currentRoom;
		const map = room > 0 ? (table[String(room).padStart(4, '0')] ?? table[String(room)] ?? '') : '';
		const name = typeof table.game === 'string' && table.game ? table.game : this.gameName(this.game);
		wv.postMessage({
			type: 'vp-presence',
			game: g,
			gameName: String(name || ''),
			room: room > 0 ? room : 0,
			mapName: String(map || '')
		});
	}
}
