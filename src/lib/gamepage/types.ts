export type ChatKind = 'game' | 'room' | 'site';

export type ChatTab =
	| ChatKind
	| 'friends'
	| 'roster'
	| 'lookup'
	| 'shots'
	| 'switch'
	| 'saves'
	| 'settings'
	| 'controls';
export type TopTab = 'chat' | 'players' | 'other' | 'settings';
export type SettingsTab = 'audio' | 'scale' | 'layout' | 'misc' | 'saves';

export type ChatMsg = {
	name?: string;
	uid?: string;
	color?: string;
	pg?: string;
	rm?: number;
	text: string;
	ts?: number;
	mine?: boolean;
	sys?: boolean;
	ping?: boolean;
	announce?: boolean;
	adm?: boolean;
};

export type MenuTarget = { name: string; uid?: string; x: number; y: number; message?: string };

export type Contact = {
	uid: string;
	name: string;
	online?: boolean;
	game?: string;
	room?: number;
	color?: string;
	adm?: boolean;
};

export type SitePresence = {
	uid: string;
	name: string;
	game: string;
	room: number;
	color?: string;
	adm?: boolean;
};

export type Shot = { id: number; game: string; room: number; map: string; ts: number };

export type PingOption = { file: string; label: string };

export type NamedPlayer = { name?: string; color?: string; mine?: boolean; adm?: boolean };
