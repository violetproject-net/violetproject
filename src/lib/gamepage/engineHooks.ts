export class EngineHooks {
	private installed = false;
	private tornDown = false;
	private OrigAC: typeof AudioContext | null = null;
	private OrigWS: typeof WebSocket | null = null;
	private OrigRAF: typeof requestAnimationFrame | null = null;
	private OrigCAF: typeof cancelAnimationFrame | null = null;
	private OrigSTO: typeof setTimeout | null = null;
	private OrigSIV: typeof setInterval | null = null;
	private audio: AudioContext[] = [];
	private sockets: WebSocket[] = [];
	private raf: number[] = [];
	private timers: Array<{ clear: () => void }> = [];

	reviveAudio(...extra: Array<AudioContext | null | undefined>) {
		try {
			const seen = new Set<AudioContext>();
			for (const ctx of this.audio) seen.add(ctx);
			for (const ctx of extra) if (ctx) seen.add(ctx);
			for (const ctx of seen) {
				try {
					if (ctx.state !== 'running' && ctx.state !== 'closed') void ctx.resume().catch(() => {});
				} catch {}
			}
		} catch {}
	}

	install() {
		if (this.installed || typeof window === 'undefined') return;
		this.installed = true;
		this.tornDown = false;
		this.hookAudio();
		this.hookWebSocket();
		this.hookAnimationFrame();
		this.hookTimers();
	}

	private hookAudio() {
		try {
			this.OrigAC = window.AudioContext;
			this.wrapAudioContext(this.OrigAC as any, (w) => (window.AudioContext = w));
			try {
				const wAC: any = (window as any).webkitAudioContext;
				this.wrapAudioContext(wAC, (w) => ((window as any).webkitAudioContext = w));
			} catch {}
		} catch {}
	}

	private wrapAudioContext(AC: any, assign: (wrapped: any) => void) {
		if (!AC || AC.__vphook) return;
		const self = this;
		const Wrapped = function (this: any, ...args: any[]) {
			const ctx = new AC(...args);
			if (!self.tornDown) self.audio.push(ctx);
			return ctx;
		};
		(Wrapped as any).__vphook = true;
		Wrapped.prototype = AC.prototype;
		Object.setPrototypeOf(Wrapped, AC);
		assign(Wrapped);
	}

	private hookWebSocket() {
		try {
			this.OrigWS = window.WebSocket;
			const WS: any = this.OrigWS;
			if (WS && !WS.__vphook) {
				const self = this;
				const Wrapped = function (this: any, url: any, protocols?: any) {
					const ws = protocols === undefined ? new WS(url) : new WS(url, protocols);
					try {
						if (!self.tornDown) self.sockets.push(ws);
					} catch {}
					return ws;
				};
				(Wrapped as any).__vphook = true;
				Wrapped.prototype = WS.prototype;
				Object.setPrototypeOf(Wrapped, WS);
				window.WebSocket = Wrapped as any;
			}
		} catch {}
	}

	private hookAnimationFrame() {
		try {
			this.OrigRAF = window.requestAnimationFrame.bind(window);
			this.OrigCAF = window.cancelAnimationFrame.bind(window);
			const RAF = window.requestAnimationFrame;
			if (!(RAF as any).__vphook) {
				const Wrapped = (cb: FrameRequestCallback) => {
					const id = (this.OrigRAF as any)(cb);
					if (!this.tornDown) this.raf.push(id);
					return id;
				};
				(Wrapped as any).__vphook = true;
				window.requestAnimationFrame = Wrapped as any;
			}
		} catch {}
	}

	private hookTimers() {
		try {
			this.OrigSTO = window.setTimeout.bind(window);
			this.OrigSIV = window.setInterval.bind(window);
			const STO = window.setTimeout;
			const SIV = window.setInterval;
			const nativeClearTimeout = window.clearTimeout.bind(window);
			const nativeClearInterval = window.clearInterval.bind(window);
			if (!(STO as any).__vphook) {
				window.setTimeout = ((handler: any, timeout?: any, ...args: any[]) => {
					const id = (this.OrigSTO as any)(handler, timeout, ...args);
					if (!this.tornDown) this.timers.push({ clear: () => nativeClearTimeout(id) });
					return id;
				}) as any;
				(window.setTimeout as any).__vphook = true;
			}
			if (!(SIV as any).__vphook) {
				window.setInterval = ((handler: any, timeout?: any, ...args: any[]) => {
					const id = (this.OrigSIV as any)(handler, timeout, ...args);
					if (!this.tornDown) this.timers.push({ clear: () => nativeClearInterval(id) });
					return id;
				}) as any;
				(window.setInterval as any).__vphook = true;
			}
		} catch {}
	}

	lockTitle(want: string) {
		try {
			const proto = Document.prototype as any;
			const desc = Object.getOwnPropertyDescriptor(proto, 'title');
			const origSet = desc?.set?.bind(document);
			const origGet = desc?.get?.bind(document);
			if (typeof origSet !== 'function' || typeof origGet !== 'function') {
				document.title = want;
				return;
			}

			let pageTitle = origGet();

			Object.defineProperty(document, 'title', {
				configurable: true,
				get: () => origGet(),
				set: (v: unknown) => {
					const s = String(v ?? '');
					if (s.includes('YNOproject')) {
						origSet(pageTitle || want);
					} else {
						pageTitle = s;
						origSet(s);
					}
				}
			});
		} catch {
			try {
				document.title = want;
			} catch {}
		}
	}

	teardown() {
		this.tornDown = true;
		try {
			if (this.OrigCAF) for (const id of this.raf.splice(0)) this.OrigCAF(id);
			else this.raf.splice(0);
		} catch {}
		for (const t of this.timers.splice(0)) {
			try {
				t.clear();
			} catch {}
		}
		try {
			if (this.OrigAC) window.AudioContext = this.OrigAC;
		} catch {}
		try {
			if (this.OrigWS) window.WebSocket = this.OrigWS;
		} catch {}
		try {
			if (this.OrigRAF) window.requestAnimationFrame = this.OrigRAF;
		} catch {}
		try {
			if (this.OrigSTO) window.setTimeout = this.OrigSTO;
		} catch {}
		try {
			if (this.OrigSIV) window.setInterval = this.OrigSIV;
		} catch {}
		this.OrigAC = null;
		this.OrigWS = null;
		this.OrigRAF = null;
		this.OrigCAF = null;
		this.OrigSTO = null;
		this.OrigSIV = null;
		this.installed = false;
		try {
			delete (document as any).title;
		} catch {}
		for (const ws of this.sockets.splice(0)) {
			try {
				ws.close();
			} catch {}
		}
		for (const ctx of this.audio.splice(0)) {
			try {
				void ctx.suspend();
			} catch {}
		}
		try {
			for (const el of document.querySelectorAll('audio,video')) {
				try {
					(el as HTMLMediaElement).pause();
					(el as HTMLMediaElement).removeAttribute('src');
				} catch {}
			}
		} catch {}
	}
}
