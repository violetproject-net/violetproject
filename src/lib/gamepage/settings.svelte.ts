import { currentLang, setLang } from '../i18n.svelte';
import type { TimeFormat } from './format';
import { isPingFile, parsePingList } from './format';
import type { PingOption } from './types';

export type NametagMode = 'classic' | 'compact' | 'none';
export type ScaleMode = 'nearest' | 'bilinear' | 'integer';
export type ShotVisibility = 'all' | 'friends' | 'none';
export type ChatLayout = 'inline' | 'stacked';

export const LIMITS = {
	chatFont: [11, 18],
	btnSize: [10, 18],
	chatWidth: [20, 80],
	chatWidthMobile: [20, 80],
	statusFont: [10, 18],
	shotSize: [40, 240],
	shotScale: [1, 4],
	dividerPx: [1, 6],
	friendDividerPx: [1, 6],
	pingVolume: [1, 100],
	musicVolume: [0, 100],
	sfxVolume: [0, 100]
} as const;

const HEX = /^#[0-9a-fA-F]{6}$/;
const clamp = (n: number, [lo, hi]: readonly [number, number] | readonly number[]) =>
	Math.min(hi, Math.max(lo, n));

const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined =>
	allowed.includes(v as T) ? (v as T) : undefined;

export class GameSettings {
	// chat
	chatFont = $state(13);
	btnSize = $state(13);
	chatWidth = $state(20);
	chatWidthMobile = $state(60);
	statusFont = $state(12);
	timeFmt: TimeFormat = $state('24h');
	nameColor = $state('#ecd5e3');
	pingColor = $state('#5b2f8f');
	chatLayout: ChatLayout = $state('stacked');
	dividers = $state(false);
	dividerPx = $state(1);
	friendDividers = $state(false);
	friendDividerPx = $state(1);
	showGame = $state(true);
	showMap = $state(true);
	showMapGlobal = $state(false);
	showWhere = $state(true);

	// audio
	mutePings = $state(false);
	pingSound = $state('');
	pingVolume = $state(50);
	musicVolume = $state(100);
	sfxVolume = $state(100);
	mutePlayerSounds = $state(false);
	pingSounds: PingOption[] = $state([]);

	// screenshots
	shotSize = $state(120);
	shotScale = $state(1);
	shotVisibility: ShotVisibility = $state('friends');

	// engine
	nametagMode: NametagMode = $state('classic');
	scaleMode: ScaleMode = $state('nearest');
	doNpcSync = $state(false);

	load() {
		try {
			const ls = localStorage;
			const num = (key: string, limits: readonly number[], fallback: number) => {
				const raw = ls.getItem(key);
				if (raw === null) return fallback;
				const n = Number(raw);
				return Number.isFinite(n) ? clamp(n, limits) : fallback;
			};
			const flag = (key: string, fallback: boolean) => {
				const raw = ls.getItem(key);
				return raw === null ? fallback : raw === '1';
			};
			this.chatFont = num('vp_chat_font', LIMITS.chatFont, this.chatFont);
			this.btnSize = num('vp_btn_size', LIMITS.btnSize, this.btnSize);
			this.statusFont = num('vp_status_font', LIMITS.statusFont, this.statusFont);
			this.chatWidth = num('vp_chat_width', LIMITS.chatWidth, this.chatWidth);
			this.chatWidthMobile = num('vp_chat_width_mobile', LIMITS.chatWidthMobile, this.chatWidthMobile);
			this.timeFmt = oneOf(ls.getItem('vp_chat_time'), ['24h', '12h', 'off'] as const) ?? this.timeFmt;
			const nc = ls.getItem('vp_name_color');
			if (nc && HEX.test(nc)) this.nameColor = nc;
			const pc = ls.getItem('vp_ping_color');
			if (pc && HEX.test(pc)) this.pingColor = pc;
			this.mutePings = ls.getItem('vp_mute_pings') === '1';
			this.mutePlayerSounds = ls.getItem('vp_mute_player_se') === '1';
			this.pingVolume = num('vp_ping_volume', LIMITS.pingVolume, this.pingVolume);
			this.dividers = ls.getItem('vp_dividers') === '1';
			this.dividerPx = num('vp_divider_px', LIMITS.dividerPx, this.dividerPx);
			this.friendDividers = ls.getItem('vp_friend_dividers') === '1';
			this.friendDividerPx = num('vp_friend_divider_px', LIMITS.friendDividerPx, this.friendDividerPx);
			this.chatLayout = oneOf(ls.getItem('vp_chat_layout'), ['inline', 'stacked'] as const) ?? this.chatLayout;
			this.shotSize = num('vp_shot_size', LIMITS.shotSize, this.shotSize);
			const scale = Number(ls.getItem('vp_shot_scale'));
			if (Number.isFinite(scale)) this.shotScale = scale > 4 || scale < 1 ? 1 : scale;
			this.shotVisibility =
				oneOf(ls.getItem('vp_shot_visibility'), ['all', 'friends', 'none'] as const) ?? this.shotVisibility;
			void this.loadPingSounds(ls.getItem('vp_ping_sound'));
			this.showGame = flag('vp_show_game', true);
			this.showWhere = flag('vp_show_where', true);
			this.showMapGlobal = flag('vp_show_map_global', false);
			this.showMap = flag('vp_show_map', true);
			this.nametagMode =
				oneOf(ls.getItem('vp_nametag'), ['classic', 'compact', 'none'] as const) ?? this.nametagMode;
			this.scaleMode =
				oneOf(ls.getItem('vp_scale_mode'), ['nearest', 'bilinear', 'integer'] as const) ?? this.scaleMode;
			const gv = ls.getItem('vp_game_volume');
			const legacy = gv !== null && Number.isFinite(Number(gv)) ? clamp(Number(gv), LIMITS.musicVolume) : 100;
			this.musicVolume = num('vp_music_volume', LIMITS.musicVolume, legacy);
			this.sfxVolume = num('vp_sfx_volume', LIMITS.sfxVolume, legacy);
		} catch {}
	}

	private async loadPingSounds(saved: string | null) {
		try {
			const r = await fetch('/sounds/ping/list.json');
			const l = r.ok ? await r.json().catch(() => null) : null;
			this.pingSounds = parsePingList(l);
		} catch {}
		if (saved !== null && (saved === '' || this.pingSounds.some((p) => p.file === saved))) {
			this.pingSound = saved;
		}
	}

	persist() {
		try {
			const ls = localStorage;
			ls.setItem('vp_chat_font', String(this.chatFont));
			ls.setItem('vp_btn_size', String(this.btnSize));
			ls.setItem('vp_status_font', String(this.statusFont));
			ls.setItem('vp_chat_width', String(this.chatWidth));
			ls.setItem('vp_chat_width_mobile', String(this.chatWidthMobile));
			ls.setItem('vp_chat_time', this.timeFmt);
			ls.setItem('vp_name_color', this.nameColor);
			ls.setItem('vp_ping_color', this.pingColor);
			ls.setItem('vp_mute_pings', this.mutePings ? '1' : '');
			ls.setItem('vp_mute_player_se', this.mutePlayerSounds ? '1' : '');
			ls.setItem('vp_ping_sound', this.pingSound);
			ls.setItem('vp_ping_volume', String(this.pingVolume));
			ls.setItem('vp_dividers', this.dividers ? '1' : '');
			ls.setItem('vp_divider_px', String(this.dividerPx));
			ls.setItem('vp_friend_dividers', this.friendDividers ? '1' : '');
			ls.setItem('vp_friend_divider_px', String(this.friendDividerPx));
			ls.setItem('vp_chat_layout', this.chatLayout);
			ls.setItem('vp_shot_size', String(this.shotSize));
			ls.setItem('vp_shot_scale', String(this.shotScale));
			ls.setItem('vp_shot_visibility', this.shotVisibility);
			ls.setItem('vp_show_game', this.showGame ? '1' : '');
			ls.setItem('vp_show_where', this.showWhere ? '1' : '');
			ls.setItem('vp_show_map_global', this.showMapGlobal ? '1' : '');
			ls.setItem('vp_show_map', this.showMap ? '1' : '');
			ls.setItem('vp_music_volume', String(this.musicVolume));
			ls.setItem('vp_sfx_volume', String(this.sfxVolume));
			ls.setItem('vp_nametag', this.nametagMode);
			ls.setItem('vp_scale_mode', this.scaleMode);
		} catch {}
	}

	snapshot(): Record<string, unknown> {
		return {
			chatFont: this.chatFont,
			btnSize: this.btnSize,
			chatWidth: this.chatWidth,
			chatWidthMobile: this.chatWidthMobile,
			statusFont: this.statusFont,
			timeFmt: this.timeFmt,
			pingColor: this.pingColor,
			mutePings: this.mutePings ? '1' : '',
			mutePlayerSounds: this.mutePlayerSounds ? '1' : '',
			showGame: this.showGame ? '1' : '',
			showMapGlobal: this.showMapGlobal ? '1' : '',
			showMap: this.showMap ? '1' : '',
			showWhere: this.showWhere ? '1' : '',
			musicVolume: this.musicVolume,
			sfxVolume: this.sfxVolume,
			nametagMode: this.nametagMode,
			scaleMode: this.scaleMode,
			pingSound: this.pingSound,
			pingVolume: this.pingVolume,
			dividers: this.dividers ? '1' : '',
			dividerPx: this.dividerPx,
			chatLayout: this.chatLayout,
			friendDividers: this.friendDividers ? '1' : '',
			friendDividerPx: this.friendDividerPx,
			shotSize: this.shotSize,
			shotVisibility: this.shotVisibility,
			lang: currentLang()
		};
	}


	private touched = new Set<string>();
	private prev: Record<string, unknown> | null = null;
	private primed = false;
	private timer: ReturnType<typeof setTimeout> | null = null;


	trackChanges(canSync: boolean, send: (part: Record<string, unknown>) => void) {
		const snap = this.snapshot();
		if (!this.primed) {
			this.primed = true;
			this.prev = snap;
			return;
		}
		const prev = this.prev;
		this.prev = snap;
		let changed = false;
		for (const k of Object.keys(snap)) {
			if (!prev || snap[k] !== prev[k]) {
				this.touched.add(k);
				changed = true;
			}
		}
		if (!changed || !canSync) return;
		if (this.timer) clearTimeout(this.timer);
		this.timer = setTimeout(() => this.flush(send), 800);
	}


	flush(send: (part: Record<string, unknown>) => void) {
		if (!this.touched.size) return;
		const snap = this.snapshot();
		const part: Record<string, unknown> = {};
		for (const k of this.touched) part[k] = snap[k];
		send(part);
	}

	cancelPending() {
		if (this.timer) clearTimeout(this.timer);
		this.timer = null;
	}


	applyFromServer(s: any) {
		const take = (k: string) => !this.touched.has(k);
		const num = (v: unknown, limits: readonly number[], fallback: number, floor: boolean = true) => {
			const n = floor ? Math.floor(Number(v)) : Number(v);
			return Number.isFinite(n) ? clamp(n, limits) : fallback;
		};
		const numIfPresent = (v: unknown, limits: readonly number[], fallback: number, floor: boolean = true) => {
			const n = floor ? Math.floor(Number(v)) : Number(v);
			return v !== undefined && Number.isFinite(n) ? clamp(n, limits) : fallback;
		};
		if (take('chatFont')) this.chatFont = num(s.chatFont, LIMITS.chatFont, this.chatFont);
		if (take('btnSize')) this.btnSize = num(s.btnSize, LIMITS.btnSize, this.btnSize);
		if (take('chatWidth')) this.chatWidth = num(s.chatWidth, LIMITS.chatWidth, this.chatWidth, false);
		if (take('chatWidthMobile')) this.chatWidthMobile = num(s.chatWidthMobile, LIMITS.chatWidthMobile, this.chatWidthMobile, false);
		if (take('statusFont')) this.statusFont = num(s.statusFont, LIMITS.statusFont, this.statusFont);
		if (take('timeFmt')) this.timeFmt = oneOf(s.timeFmt, ['24h', '12h', 'off'] as const) ?? this.timeFmt;
		if (take('pingColor') && typeof s.pingColor === 'string' && HEX.test(s.pingColor)) this.pingColor = s.pingColor;
		if (take('mutePings') && s.mutePings !== undefined) this.mutePings = s.mutePings === '1';
		if (take('mutePlayerSounds') && s.mutePlayerSounds !== undefined) this.mutePlayerSounds = s.mutePlayerSounds === '1';
		if (take('pingSound') && typeof s.pingSound === 'string' && isPingFile(s.pingSound)) this.pingSound = s.pingSound;
		if (take('pingVolume')) this.pingVolume = numIfPresent(s.pingVolume, LIMITS.pingVolume, this.pingVolume);
		if (take('dividers') && s.dividers !== undefined) this.dividers = s.dividers === '1';
		if (take('dividerPx')) this.dividerPx = numIfPresent(s.dividerPx, LIMITS.dividerPx, this.dividerPx);
		if (take('friendDividers') && s.friendDividers !== undefined) this.friendDividers = s.friendDividers === '1';
		if (take('friendDividerPx'))
			this.friendDividerPx = numIfPresent(s.friendDividerPx, LIMITS.friendDividerPx, this.friendDividerPx);
		if (take('chatLayout')) this.chatLayout = oneOf(s.chatLayout, ['inline', 'stacked'] as const) ?? this.chatLayout;
		if (take('showGame') && s.showGame !== undefined) this.showGame = s.showGame === '1';
		if (take('showWhere') && s.showWhere !== undefined) this.showWhere = s.showWhere === '1';
		if (take('showMapGlobal') && s.showMapGlobal !== undefined) this.showMapGlobal = s.showMapGlobal === '1';
		if (take('showMap') && s.showMap !== undefined) this.showMap = s.showMap === '1';
		if (take('musicVolume')) this.musicVolume = num(s.musicVolume, LIMITS.musicVolume, this.musicVolume);
		if (take('sfxVolume')) this.sfxVolume = num(s.sfxVolume, LIMITS.sfxVolume, this.sfxVolume);
		if (take('nametagMode'))
			this.nametagMode = oneOf(s.nametagMode, ['classic', 'compact', 'none'] as const) ?? this.nametagMode;
		if (take('scaleMode'))
			this.scaleMode = oneOf(s.scaleMode, ['nearest', 'bilinear', 'integer'] as const) ?? this.scaleMode;
		if (take('shotSize')) this.shotSize = num(s.shotSize, LIMITS.shotSize, this.shotSize);
		if (take('shotScale')) this.shotScale = num(s.shotScale, LIMITS.shotScale, this.shotScale);
		if (take('shotVisibility'))
			this.shotVisibility = oneOf(s.shotVisibility, ['all', 'friends', 'none'] as const) ?? this.shotVisibility;
		if (take('lang') && typeof s.lang === 'string' && s.lang && s.lang !== currentLang()) setLang(s.lang);
		this.prev = this.snapshot();
	}
}
