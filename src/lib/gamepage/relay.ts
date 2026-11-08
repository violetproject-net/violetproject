export type RelayUrls = {
	relay: string;
	gameChat(nick: string): string;
	roomChat(nick: string): string;
	siteChat(nick: string): string;
	stats(): string;
};

function envRelayUrl(): string {
	return typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_YNO_RELAY_URL
		? String(import.meta.env.PUBLIC_YNO_RELAY_URL)
		: '';
}

function defaultRelayUrl(game: string) {
	try {
		if (typeof location !== 'undefined' && location.protocol === 'https:')
			return `wss://${location.host}/connect/${game}/`;
	} catch {}
	return `ws://localhost:8001/connect/${game}/`;
}

export function createRelayUrls(game: string): RelayUrls {
	const relay = envRelayUrl() || defaultRelayUrl(game);
	const base = relay.replace(/\/?$/, '/');
	const siteBase = base.replace(/\/[^/]+\/$/, '/');
	return {
		relay,
		gameChat: (nick) => base + 'chat?name=' + encodeURIComponent(nick),
		roomChat: (nick) => base + 'chat?room=follow&name=' + encodeURIComponent(nick),
		siteChat: (nick) => siteBase + 'chat?name=' + encodeURIComponent(nick),
		stats: () => siteBase + 'online'
	};
}
