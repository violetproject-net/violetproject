export class OnlineStats {
	siteOnline = $state(0);
	gameOnline = $state(0);
	gameCounts: Record<string, number> = $state({});
	live = $state(false);

	private ws: WebSocket | null = null;
	private timer: ReturnType<typeof setTimeout> | null = null;
	private on = true;

	constructor(
		private url: () => string,
		private game: string,
		private onUpdate: () => void
	) {}

	open() {
		this.close();
		let ws: WebSocket;
		try {
			ws = new WebSocket(this.url());
		} catch (e) {
			console.warn(e);
			return;
		}
		this.ws = ws;
		ws.onmessage = (ev) => {
			let m: any;
			try {
				m = JSON.parse(ev.data);
			} catch {
				return;
			}
			if (!m || m.t !== 'online') return;
			this.siteOnline = Number(m.total) || 0;
			const g = m.games && typeof m.games === 'object' ? m.games[this.game] : 0;
			this.gameOnline = Number(g) || 0;
			if (m.games && typeof m.games === 'object') {
				const next: Record<string, number> = {};
				for (const [k, v] of Object.entries(m.games)) next[k] = Number(v) || 0;
				this.gameCounts = next;
				this.live = true;
			}
			this.onUpdate();
		};
		ws.onclose = () => {
			if (this.ws !== ws) return;
			this.ws = null;
			if (this.timer) clearTimeout(this.timer);
			this.timer = null;
			if (this.on) this.timer = setTimeout(() => this.open(), 15000);
		};
		ws.onerror = () => {
			try {
				ws.close();
			} catch {}
		};
		if (!this.timer) {
			const poll = () => {
				this.timer = null;
				if (!this.on) return;
				if (this.ws && this.ws.readyState === 1) {
					this.ws.send(JSON.stringify({ t: 'online' }));
					this.timer = setTimeout(poll, 20000);
				} else {
					this.open();
				}
			};
			this.timer = setTimeout(poll, 20000);
		}
	}

	ping() {
		try {
			if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ t: 'online' }));
		} catch {}
	}

	isOpen() {
		return !!this.ws && this.ws.readyState === 1;
	}

	close() {
		try {
			this.ws?.close();
		} catch {}
		this.ws = null;
	}

	stop() {
		this.on = false;
		if (this.timer) clearTimeout(this.timer);
		this.timer = null;
		this.close();
	}
}
