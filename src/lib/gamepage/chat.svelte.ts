import { isPingFor, b64enc } from './format';
import type { RelayUrls } from './relay';
import type { GameSettings } from './settings.svelte';
import type { PlayerMenu } from './playerMenu.svelte';
import type { Mementos } from './mementos.svelte';
import type { ChatKind, ChatMsg, ChatTab, Contact, Shot, SitePresence } from './types';

export const SHOT_MAX = 670;
const CHAT_MAX_TRIES = 8;
const KINDS: ChatKind[] = ['game', 'room', 'site'];
const HEX = /^#[0-9a-fA-F]{6}$/;

export type ChatHost = {
	urls: RelayUrls;
	game: string;
	settings: GameSettings;
	mementos: Mementos;
	menu: PlayerMenu;
	displayName: () => string;
	nick: () => string;
	activeTab: () => ChatTab;
	lastChatTab: () => ChatKind;
	onRoom: (room: number) => void;
	onPing: () => void;
};

type Sockets = Record<ChatKind, WebSocket | null>;
type Timers = Record<ChatKind, ReturnType<typeof setTimeout> | null>;


export class ChatClient {
	messages: Record<ChatKind, ChatMsg[]> = $state({ game: [], room: [], site: [] });
	status: Record<ChatKind, string> = $state({
		game: 'connecting…',
		room: 'connecting…',
		site: 'connecting…'
	});
	unread: Record<string, number> = $state({ game: 0, room: 0, site: 0 });
	amAdmin = $state(false);
	myUid = $state('');
	systemNotice = $state<{ text: string; mementoName?: string } | null>(null);

	friends: Contact[] = $state([]);
	incoming: Contact[] = $state([]);
	outgoing: Contact[] = $state([]);
	blocks: Contact[] = $state([]);
	blockedUuids = $state(new Set<string>());

	roster: Contact[] = $state([]);
	siteRoster: SitePresence[] = $state([]);
	lookupResults: Contact[] = $state([]);

	shots: Shot[] = $state([]);
	shotCount = $state(0);
	pendingShots: number[] = $state([]);

	visibleFriends = $derived(
		this.friends
			.filter((f) => !this.blockedUuids.has(f.uid))
			.sort((a, b) => Number(b.online ?? false) - Number(a.online ?? false))
	);

	private ws: Sockets = { game: null, room: null, site: null };
	private retry: Timers = { game: null, room: null, site: null };
	private tries: Record<ChatKind, number> = { game: 0, room: 0, site: 0 };
	private names: Record<ChatKind, string> = { game: '', room: '', site: '' };
	private systemNoticeTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(private host: ChatHost) {}

	messagesFor(tab: ChatTab) {
		const list = tab === 'site' ? this.messages.site : tab === 'room' ? this.messages.room : this.messages.game;
		return list.filter((m) => !m.uid || !this.blockedUuids.has(m.uid));
	}

	sitePresence(uid: string) {
		return this.siteRoster.find((s) => s.uid === uid);
	}

	canSeeShot(uid?: string, name?: string) {
		const vis = this.host.settings.shotVisibility;
		if (vis === 'all') return true;
		if (vis === 'none') return false;
		if (uid && (uid === this.myUid || this.friends.some((f) => f.uid === uid))) return true;
		if (name && this.friends.some((f) => f.name.toLowerCase() === String(name).toLowerCase())) return true;
		return false;
	}

	private push(kind: ChatKind, msg: ChatMsg) {
		this.messages[kind] = [...this.messages[kind], msg];
	}

	pushLocalSys(text: string) {
		this.showSystemNotice(text);
	}

	private showSystemNotice(text: string, mementoName?: string) {
		this.systemNotice = { text, mementoName };
		if (this.systemNoticeTimer) clearTimeout(this.systemNoticeTimer);
		this.systemNoticeTimer = setTimeout(() => {
			this.systemNotice = null;
			this.systemNoticeTimer = null;
		}, 5000);
	}

	clear(tab: ChatTab) {
		const kind: ChatKind = tab === 'site' ? 'site' : tab === 'room' ? 'room' : 'game';
		this.messages[kind] = [];
	}

	markRead(kind: ChatKind) {
		this.unread = { ...this.unread, [kind]: 0 };
	}


	sendMessage(kind: ChatKind, raw: string): boolean {
		let text = raw.trim();
		if (!text) return false;
		if (this.pendingShots.length && text.includes('[screenshot]')) {
			text = text.replace('[screenshot]', `[shot:${this.pendingShots[0]}]`);
		}
		this.pendingShots = [];
		text = text.slice(0, 280);
		if (!text) return false;
		const ws = this.ws[kind];
		if (!ws || ws.readyState !== 1) return false;
		const payload: Record<string, unknown> = { t: 'msg', text };
		if (kind === 'site') payload.game = this.host.game;
		ws.send(JSON.stringify(payload));
		return true;
	}

	anySocket() {
		for (const kind of KINDS) {
			const ws = this.ws[kind];
			if (ws && ws.readyState === 1) return ws;
		}
		return null;
	}

	send(payload: Record<string, unknown>) {
		const ws = this.anySocket();
		if (!ws) return false;
		ws.send(JSON.stringify(payload));
		return true;
	}

	isLive(kind: ChatKind) {
		const ws = this.ws[kind];
		return !!ws && ws.readyState <= 1;
	}

	private setStatus(kind: ChatKind, s: string) {
		this.status = { ...this.status, [kind]: s };
	}

	private urlFor(kind: ChatKind, nick: string) {
		const urls = this.host.urls;
		return kind === 'site' ? urls.siteChat(nick) : kind === 'room' ? urls.roomChat(nick) : urls.gameChat(nick);
	}

	open(kind: ChatKind, nick: string) {
		this.close(kind);
		if (!nick || !this.host.displayName()) return;
		let ws: WebSocket;
		try {
			ws = new WebSocket(this.urlFor(kind, nick));
		} catch (e) {
			console.warn(e);
			return;
		}
		this.ws[kind] = ws;
		this.setStatus(kind, 'connecting…');
		this.attach(ws, kind);
		if (kind === 'game') {
			const onOpen = () => {
				this.requestSettings();
				this.requestMementos();
			};
			if (ws.readyState === 1) onOpen();
			else ws.onopen = onOpen;
		}
	}

	openAll(nick: string) {
		for (const kind of KINDS) this.open(kind, nick);
	}

	reopenDead(nick: string) {
		if (!nick) return;
		for (const kind of KINDS) if (!this.isLive(kind)) this.open(kind, nick);
	}

	close(kind: ChatKind) {
		if (this.retry[kind]) clearTimeout(this.retry[kind]!);
		this.retry[kind] = null;
		try {
			this.ws[kind]?.close();
		} catch {}
		this.ws[kind] = null;
	}

	closeAll() {
		for (const kind of KINDS) this.close(kind);
		if (this.systemNoticeTimer) clearTimeout(this.systemNoticeTimer);
		this.systemNoticeTimer = null;
		this.systemNotice = null;
	}

	private drop(kind: ChatKind, ws: WebSocket) {
		if (this.ws[kind] !== ws) return false;
		this.ws[kind] = null;
		if (this.retry[kind]) clearTimeout(this.retry[kind]!);
		this.retry[kind] = null;
		return true;
	}

	private scheduleRetry(kind: ChatKind, code = 0) {
		const { displayName, nick } = this.host;
		if (code === 4401) {
			this.setStatus(kind, 'login required');
			return;
		}
		if (code === 4403) {
			this.setStatus(kind, 'rejected');
			return;
		}
		if (code === 4408 || code === 4410) {
			this.setStatus(kind, code === 4408 ? 'banned' : 'deleted');
			if (!nick() || !displayName()) return;
			const n = (this.tries[kind] ?? 0) + 1;
			this.tries[kind] = n;
			if (n > 20) return;
			this.retry[kind] = setTimeout(() => {
				if (!nick() || !displayName()) return;
				this.open(kind, nick());
			}, 30000);
			return;
		}
		if (!nick() || !displayName()) return;
		const n = (this.tries[kind] ?? 0) + 1;
		this.tries[kind] = n;
		if (n > CHAT_MAX_TRIES) {
			this.setStatus(kind, 'offline');
			return;
		}
		this.setStatus(kind, 'reconnecting…');
		this.retry[kind] = setTimeout(() => this.open(kind, nick()), 3000);
	}

	private attach(ws: WebSocket, kind: ChatKind) {
		const { settings, menu } = this.host;
		ws.onmessage = (ev) => {
			let m: any;
			try {
				m = JSON.parse(ev.data);
			} catch {
				return;
			}
			if (m.t === 'me') {
				this.names[kind] = String(m.name || '');
				if (typeof m.color === 'string' && HEX.test(m.color)) settings.nameColor = m.color;
				if (m.admin) this.amAdmin = true;
				this.tries[kind] = 0;
				this.setStatus(kind, 'open');
			} else if (m.t === 'mementos') {
				this.host.mementos.syncFromServer(m.unlocked);
			} else if (m.t === 'memento-unlock') {
				const name = String(m.name || '');
				if (this.host.mementos.addServerUnlock(name)) {
					this.showSystemNotice('', name);
				}
			} else if (m.t === 'sys') {
				this.showSystemNotice(String(m.text || ''));
			} else if (m.t === 'muted') {
				this.showSystemNotice(
					m.until ? `You are muted until ${new Date(Number(m.until)).toLocaleString()}` : 'You are muted'
				);
			} else if (m.t === 'admin-ok' || m.t === 'admin-err') {
				this.showSystemNotice(`${m.t === 'admin-ok' ? 'OK' : 'Error'}: ${m.message}`);
				if (m.t === 'admin-ok' && menu.target) this.requestModState(menu.target.name);
			} else if (m.t === 'modstate') {
				if (menu.target && m.target === menu.target.name) {
					menu.mod = { banned: Number(m.banned) || 0, muted: Number(m.muted) || 0 };
				}
			} else if (m.t === 'contacts') {
				this.myUid = String(m.you || this.myUid);
				this.friends = Array.isArray(m.friends) ? m.friends : [];
				this.incoming = Array.isArray(m.incoming) ? m.incoming : [];
				this.outgoing = Array.isArray(m.outgoing) ? m.outgoing : [];
				this.blocks = Array.isArray(m.blocks) ? m.blocks : [];
				this.blockedUuids = new Set(this.blocks.map((b) => String(b.uid)));
			} else if (m.t === 'settings' && m.settings && typeof m.settings === 'object') {
				settings.applyFromServer(m.settings);
				if (this.host.displayName()) settings.flush((part) => this.send({ t: 'settings-set', settings: part }));
			} else if (
				m.t === 'friend-ok' || m.t === 'friend-err' ||
				m.t === 'block-ok' || m.t === 'block-err' ||
				m.t === 'report-ok' || m.t === 'report-err' ||
				m.t === 'shot-err' || m.t === 'shot-del-err' ||
				m.t === 'changepw-ok' || m.t === 'changepw-err'
			) {
				this.showSystemNotice(String(m.message || m.t));
			} else if (m.t === 'shots') {
				this.shots = (Array.isArray(m.shots) ? m.shots : [])
					.map((p: any) => ({
						id: Number(p.id) || 0,
						game: String(p.game || ''),
						room: Number(p.room) || 0,
						map: String(p.map || ''),
						ts: Number(p.ts) || 0
					}))
					.filter((s: Shot) => s.id > 0);
				this.shotCount = Number(m.count) || this.shots.length;
			} else if (m.t === 'shot-ok') {
				this.shotCount = Number(m.count) || this.shotCount;
				this.showSystemNotice(`Screenshot saved (${this.shotCount}/${SHOT_MAX})`);
				this.requestShots();
			} else if (m.t === 'shot-del-ok') {
				this.shots = this.shots.filter((s) => s.id !== Number(m.id));
				this.shotCount = Number(m.count) || this.shots.length;
				this.showSystemNotice('Screenshot deleted');
			} else if (m.t === 'room') {
				this.host.onRoom(Number(m.room) || 0);
				if (kind === 'room') this.requestRoster();
			} else if (m.t === 'roster' && kind === 'room') {
				this.roster = Array.isArray(m.players)
					? m.players.map((p: any) => ({
							uid: String(p.uid || ''),
							name: String(p.name || ''),
							color: String(p.color || ''),
							adm: Boolean(p.adm)
						}))
					: [];
			} else if (m.t === 'lookup') {
				this.lookupResults = Array.isArray(m.players)
					? m.players.map((p: any) => ({
							uid: String(p.uid || ''),
							name: String(p.name || ''),
							color: String(p.color || ''),
							adm: Boolean(p.adm)
						}))
					: [];
			} else if (m.t === 'siteroster') {
				this.siteRoster = Array.isArray(m.players)
					? m.players.map((p: any) => ({
							uid: String(p.uid || ''),
							name: String(p.name || ''),
							game: String(p.game || ''),
							room: Number(p.room) || 0,
							color: String(p.color || ''),
							adm: Boolean(p.adm)
						}))
					: [];
			} else if (m.t === 'msg') {
				const msg = this.toMessage(m, this.names[kind]);
				if (!msg.mine && isPingFor(msg.text, this.names[kind])) {
					msg.ping = true;
					this.host.onPing();
				}
				this.push(kind, msg);
				if (kind !== this.host.activeTab()) this.unread = { ...this.unread, [kind]: (this.unread[kind] ?? 0) + 1 };
			}
		};
		ws.onclose = (ev: CloseEvent) => {
			if (!this.drop(kind, ws)) return;
			this.names[kind] = '';
			this.scheduleRetry(kind, ev?.code ?? 0);
		};
		ws.onerror = () => {
			try {
				ws.close();
			} catch {}
		};
	}

	private toMessage(m: any, selfName: string): ChatMsg {
		return {
			name: String(m.name || ''),
			uid: String(m.uid || ''),
			color: String(m.color || ''),
			pg: String(m.pg || ''),
			rm: Number(m.rm) || 0,
			text: String(m.text || ''),
			ts: Number(m.ts || 0),
			mine: m.name === selfName,
			announce: Boolean(m.announce),
			adm: Boolean(m.adm)
		};
	}

	requestRoster() {
		const ws = this.ws.room;
		if (!ws || ws.readyState !== 1) return;
		ws.send(JSON.stringify({ t: 'roster' }));
	}

	requestContacts() {
		this.send({ t: 'contacts' });
	}

	requestSiteRoster() {
		this.send({ t: 'siteroster' });
	}

	requestShots() {
		this.send({ t: 'shots' });
	}

	requestSettings() {
		const ws = this.ws.game;
		if (!ws || ws.readyState !== 1) return;
		ws.send(JSON.stringify({ t: 'settings' }));
	}

	requestMementos() {
		const ws = this.ws.game;
		if (!ws || ws.readyState !== 1 || !this.host.displayName()) return;
		ws.send(JSON.stringify({ t: 'mementos' }));
	}

	requestModState(target: string) {
		const ws = this.ws.game;
		if (!ws || ws.readyState !== 1 || !target) return;
		ws.send(JSON.stringify({ t: 'modstate', target }));
	}

	friendOp(op: string, target: string) {
		if (!target) return;
		this.send({ t: 'friend', op, target });
	}

	blockOp(op: string, target: string) {
		if (!target) return;
		this.send({ t: 'block', op, target });
	}

	lookup(query: string) {
		const q = query.trim().slice(0, 22);
		if (!q) return;
		this.send({ t: 'lookup', q });
	}

	deleteShot(id: number) {
		this.send({ t: 'shot-del', id });
	}

	report(target: string, context: string, message?: string) {
		if (!this.send({ t: 'report', target, context: context.slice(0, 500), message: (message || '').slice(0, 280) })) {
			this.pushLocalSys('Chat not connected — report not sent');
		}
	}

	changePassword(current: string, next: string) {
		if (!this.anySocket()) {
			this.pushLocalSys('Chat not connected');
			return false;
		}
		if (next.length < 8) {
			this.pushLocalSys('New password must be 8+ characters');
			return false;
		}
		this.send({ t: 'changepw', current, new: next });
		return true;
	}

	saveScreenshot(png: Uint8Array, game: string, room: number, map: string) {
		if (this.shotCount >= SHOT_MAX) {
			this.pushLocalSys(`Screenshot limit reached (${SHOT_MAX})`);
			return;
		}
		if (!png || !png.length || png.length > 2 * 1024 * 1024) {
			this.pushLocalSys('Screenshot failed');
			return;
		}
		if (!this.send({ t: 'shot-save', img: b64enc(png), game, room, map })) {
			this.pushLocalSys('Chat not connected — screenshot not saved');
		}
	}

	setNameColor(color: string) {
		if (!HEX.test(color)) return;
		this.send({ t: 'color', color });
	}

	sendAdmin(action: string) {
		const { menu } = this.host;
		const target = menu.target;
		if (!target) return;
		const ws = this.ws.game;
		if (!ws || ws.readyState !== 1) {
			this.showSystemNotice('Game chat not connected — command not sent');
			return;
		}
		const payload: Record<string, unknown> = {
			t: 'admin',
			action,
			target: target.name,
			minutes: Math.max(0, Math.floor(Number(menu.minutes) || 0)),
			reason: menu.reason.slice(0, 200)
		};
		if (action === 'rename') {
			const nn = menu.newName.replace(/[^a-zA-Z0-9._]/g, '').slice(0, 22);
			if (!nn) return;
			payload.newName = nn;
		}
		if (action === 'delete') {
			if (menu.deleteName !== target.name) return;
			payload.confirm = menu.deleteName;
		}
		ws.send(JSON.stringify(payload));
		menu.close();
	}

	resetAccountState() {
		this.amAdmin = false;
		this.host.menu.close();
	}
}
