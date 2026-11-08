import { getContext, setContext } from 'svelte';
import type { ChatClient } from './chat.svelte';
import type { Locations } from './locations.svelte';
import type { PlayerMenu } from './playerMenu.svelte';
import type { GameSettings } from './settings.svelte';
import type { Mementos } from './mementos.svelte';

export type GameContext = {
	game: string;
	displayName: string;
	loggedIn: boolean;
	settings: GameSettings;
	chat: ChatClient;
	locations: Locations;
	mementos: Mementos;
	menu: PlayerMenu;
	openMenu: (e: MouseEvent, name: string | undefined, uid?: string, message?: string) => void;
};

const KEY = Symbol('gamepage');

export const setGameContext = (ctx: GameContext) => setContext(KEY, ctx);
export const getGameContext = () => getContext<GameContext>(KEY);
