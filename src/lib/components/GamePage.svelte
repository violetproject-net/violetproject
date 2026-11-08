<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { SplitPane } from '@rich_harris/svelte-split-pane';
	import type { Length } from '@rich_harris/svelte-split-pane';
	import { t, initI18n, currentLang } from '../i18n.svelte';
	import '../styles/gamepage/index.css';
    import { tick } from 'svelte';
	import { gameBySlug } from '../games';
	import { gameDetails, gameSlides } from '../gameDetails';
	import { ChatClient, SHOT_MAX } from '../gamepage/chat.svelte';
	import { setGameContext } from '../gamepage/context';
	import { Locations } from '../gamepage/locations.svelte';
	import { Mementos } from '../gamepage/mementos.svelte';
	/* import { NpcSync } from '../gamepage/npcSync'; */
	import { OnlineStats } from '../gamepage/onlineStats.svelte';
	import { PingPlayer } from '../gamepage/pingSound';
	import { PlayerMenu } from '../gamepage/playerMenu.svelte';
	import { createRelayUrls } from '../gamepage/relay';
	import { GameSettings } from '../gamepage/settings.svelte';
	import type { ChatKind, ChatTab, SettingsTab, Shot, TopTab } from '../gamepage/types';
	import { VersionWatcher } from '../gamepage/version.svelte';
	import { emojiStore } from '#lib/gamepage/emojis.svelte.ts';

	import GamePopup from './GamePopup.svelte';
	import AuthBar from './gamepage/AuthBar.svelte';
	import ChatInput from './gamepage/ChatInput.svelte';
	import ChatLog from './gamepage/ChatLog.svelte';
	import ChatTabs from './gamepage/ChatTabs.svelte';
	import FriendsTab from './gamepage/FriendsTab.svelte';
	import GamePlayer from './gamepage/GamePlayer.svelte';
	import Lightbox from './gamepage/Lightbox.svelte';
	import LookupTab from './gamepage/LookupTab.svelte';
	import PasswordDialog from './gamepage/PasswordDialog.svelte';
	import MementosTab from './gamepage/MementosTab.svelte';
	import PlayerContextMenu from './gamepage/PlayerContextMenu.svelte';
	import ReportDialog from './gamepage/ReportDialog.svelte';
	import RosterTab from './gamepage/RosterTab.svelte';
	import ScreenshotsTab from './gamepage/ScreenshotsTab.svelte';
	import ScreenshotViewer from './gamepage/ScreenshotViewer.svelte';
	import SettingsTabView from './gamepage/SettingsTab.svelte';
	import StatusBar from './gamepage/StatusBar.svelte';
	import SwitchGameTab from './gamepage/SwitchGameTab.svelte';
	import TouchControls from './gamepage/TouchControls.svelte';
    import EmojiPicker from './gamepage/EmojiPicker.svelte';
    import GuestPopup from './GuestPopup.svelte';
	import RulesPopup from './RulesPopup.svelte';
    import GameSavesTab from './gamepage/GameSavesTab.svelte';
    import MementosViewer from './gamepage/MementosViewer.svelte';


	let { game, title, data }: { game: string; title: string; data: { displayName?: string } } = $props();

	const GAME = game;
	const EMOJI_TOKEN_END = /(?:^|\s):([a-zA-Z0-9_-]*)$/;

	// ANCHOR User

	let displayName = $derived((data?.displayName ?? '').replace(/[^a-zA-Z0-9._]/g, '').slice(0, 22));
	let currentNick = $state('');
	let appliedSession: string | null = null;
	const guestNick = () => 'Guest' + Math.floor(1000 + Math.random() * 9000);

	// ANCHOR states

	const urls = createRelayUrls(GAME);
	const settings = new GameSettings();
	const locations = new Locations(GAME);
	const menu = new PlayerMenu();
	/* const npcSync = new NpcSync(); */
	const ping = new PingPlayer();
	const version = new VersionWatcher();
	const mementos = new Mementos();

	let topTab: TopTab = $state('chat');
	let chatTab: ChatTab = $state('game');
	let lastChat: ChatKind = $state('game');
	let lastPeople: 'friends' | 'roster' | 'lookup' = $state('friends');
	let settingsTab: SettingsTab = $state('audio');

	const chat = new ChatClient({
		urls,
		game: GAME,
		settings,
		menu,
		mementos,
		displayName: () => displayName,
		nick: () => currentNick,
		activeTab: () => chatTab,
		lastChatTab: () => lastChat,
		onRoom: (room) => (locations.currentRoom = room),
		onPing: () => ping.play({ muted: settings.mutePings, sound: settings.pingSound, volume: settings.pingVolume })
	});
	const stats = new OnlineStats(() => urls.stats(), GAME, () => chat.requestRoster());

	function openMenu(e: MouseEvent, name: string | undefined, uid?: string, message?: string) {
		if (!menu.open(e, name, uid, message)) return;
		if (chat.amAdmin) chat.requestModState(name!);
	}

	setGameContext({
		game: GAME, settings, chat, locations, mementos, menu, openMenu,
		get displayName() { return displayName; },
		get loggedIn() { return !!displayName; }
	});

	// ANCHOR game

	let player: GamePlayer;
	let engine: any = $state(null);
	let started = $state(false);
	let booted = $state(false);
	let status = $state('OFFLINE');
	let peers: string[] = $state([]);

	// ANCHOR Layout

	let chatLog: ChatLog | undefined = $state(); //asdasdasd lol
	let isTouch = $state(false);
	let isNarrow = $state(false);
	let mobileLayout = $derived(isTouch && isNarrow);

	let paneType: 'rows' | 'columns' = $derived(mobileLayout ? 'rows' : 'columns');
	let panePos: Length = $derived.by(() => {
		if (!settings.chatWidth) {
			return mobileLayout ? '68%' : '75%';
		}
		// stupid type alias
		if (mobileLayout) {
			return `${100 - settings.chatWidthMobile}%` as Length;
		}
		return `${100 - settings.chatWidth}%` as Length;
	});
	//let paneMin: Length = $derived(mobileLayout ? '20%' : '80%');
	//let paneMax: Length = $derived(mobileLayout ? '80%' : '20%');
	let paneMin: Length = $derived('20%');
	let paneMax: Length = $derived('80%');
	// make the hitbox for the divider super fat on mobile
	let paneDividerThickness: Length = $derived(mobileLayout ? '25px' : '10px');
	/** players on the map: the roster for accounts, what the engine sees for guests */
	let mapCount = $derived(displayName ? chat.roster.length : peers.length);

	// for listening to interactions with the pane divider (the "hitbox")
	// a bit hacky
	let paneDragging = false;
	function onPointerDown(e: PointerEvent) {
		const target = e.target as HTMLElement
		if (!target.closest("svelte-split-pane-divider")) {
			// not clicking on the pane divider
			return;
		}

		if (
			(e.pointerType === 'mouse' && e.button === 2) ||
			(e.pointerType !== 'mouse' && !e.isPrimary)
		) {
			return;
		}
		
		//console.log("begin dragging on pane divider");
		paneDragging = true;
	}
	
	function onPointerUp(e: PointerEvent) {
		const target = e.target as HTMLElement
		if (!target.closest("svelte-split-pane-divider")) {
			// not clicking on the pane divider
			return;
		}

		if (!paneDragging) {
			return;
		}

		paneDragging = false;
		if (mobileLayout) {
			settings.chatWidthMobile = 100 - Number.parseFloat(panePos.substring(0, panePos.indexOf("%")));
		} else {
			settings.chatWidth = 100 - Number.parseFloat(panePos.substring(0, panePos.indexOf("%")));
		}
		//console.log(`end dragging on pane divider, chatWidth = ${settings.chatWidth} panePos = ${panePos}`);
	}


	$effect(() => {
		void mobileLayout;
		void settings.chatWidth;
		void settings.chatWidthMobile;

		if (mobileLayout) {
			panePos = `${100 - settings.chatWidthMobile}%` as Length;
		} else {
			panePos = `${100 - settings.chatWidth}%` as Length;
		}
	});

	let savesTab: GameSavesTab | null = $state(null);
	let saveError: string = $state("ok");

	// ANCHOR Dialogs

	let openGame: string | null = $state(null);
	let reportFor: { name: string; message?: string } | null = $state(null);
	let passwordOpen = $state(false);
	let viewerOpen = $state(false);
	let mementosOpen = $state(false);
	let guestPopupOpen = $state(false);
	let RulesPopupOpen = $state(false);
	function openRulesPopup() {
		RulesPopupOpen = true; 
	}
	let lightbox: { src: string; shot?: Shot } | null = $state(null);

	let chatInput = $state('');
	let chatField: HTMLInputElement | null = $state(null);
	let settingsSavedMsg = $state('');

	// ANCHOR Tabs

	function selectTab(tab: ChatTab) {
		chatTab = tab;
		stats.ping();
		if (tab === 'game' || tab === 'room' || tab === 'site') {
			lastChat = tab;
			chat.markRead(tab);
		} else if (tab === 'friends' || tab === 'roster' || tab === 'lookup') {
			lastPeople = tab;
		}
		if (tab === 'roster') chat.requestRoster();
		if (tab === 'friends') chat.requestContacts();
		if (tab === 'lookup') chat.requestSiteRoster();
		if (tab === 'shots') chat.requestShots();
		if (tab === 'mementos') void mementos.load();
	}

	function selectTop(tab: TopTab) {
		topTab = tab;
		selectTab(tab === 'chat' ? lastChat : tab === 'players' ? lastPeople : tab === 'other' ? 'shots' : 'settings');
	}

	function selectSettings(tab: SettingsTab) {
		settingsTab = tab;
		if (chatTab === 'controls') selectTab('settings');
	}

	function focusChatBox() {
		if (topTab !== 'chat') selectTop('chat');
		requestAnimationFrame(() => chatField?.focus());
	}

	function handleTabKey(e: KeyboardEvent) {
		if (e.key !== 'Tab' || e.repeat) return;
		const el = document.activeElement as HTMLElement | null;
		if (el === chatField) {
			e.preventDefault();
			document.getElementById('canvas')?.focus();
			return;
		}
		if (el && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(el.tagName)) return;
		e.preventDefault();
		e.stopPropagation();
		focusChatBox();
	}

	// ANCHOR actions

	function sendChat() {
		if (chatTab !== 'game' && chatTab !== 'room' && chatTab !== 'site') return;
		if (chat.sendMessage(chatTab, chatInput)) chatInput = '';
	}

	function insertEmoji(name: string) {
		const match = chatInput.match(EMOJI_TOKEN_END);
		const start = match ? chatInput.length - match[1].length - 1 : chatInput.length;
		chatInput = `${chatInput.slice(0, start)}:${name}: `;
		requestAnimationFrame(() => {
			const end = chatInput.length;
			chatField?.focus();
			chatField?.setSelectionRange(end, end);
		});
	}

	function takeScreenshot() {
		if (!started || !engine) return;
		if (chat.shotCount >= SHOT_MAX) {
			chat.pushLocalSys(`Screenshot limit reached (${SHOT_MAX})`);
			return;
		}
		const room = locations.currentRoom;
		chat.saveScreenshot(engine.api.getScreenshot(), GAME, room, room > 0 ? locations.mapName(GAME, room) : '');
	}

	function shareShot(id: number) {
		if (topTab !== 'chat') selectTop('chat');
		chatInput = (chatInput ? chatInput + ' ' : '') + '[screenshot] ';
		chat.pendingShots = [...chat.pendingShots, id];
		requestAnimationFrame(() => {
			chatField?.focus();
			//await tick();
			chatLog?.scrollToBottom();
		});
	}

	function openLightbox(src: string, id?: number) {
		if (!src) return;
		const shotId = id ?? idFromUrl(src);
		lightbox = { src, shot: shotId ? chat.shots.find((s) => s.id === shotId) : undefined };
	}

	function idFromUrl(src: string) {
		try {
			return Number(new URL(src, location.href).searchParams.get('id')) || 0;
		} catch {
			return 0;
		}
	}

	function openViewer() {
		viewerOpen = true;
		chat.requestShots();
	}

	function openMementos() {
		mementosOpen = true;
		void mementos.load();
	}

	function openReport() {
		if (!menu.target) return;
		reportFor = { name: menu.target.name, message: menu.target.message };
		menu.close();
	}

	function saveSettingsNow() {
		settings.cancelPending();
		if (!displayName) {
			settingsSavedMsg = t('settings.saveLoginRequired', 'login required');
			return;
		}
		if (!chat.send({ t: 'settings-set', settings: settings.snapshot() })) {
			settingsSavedMsg = t('settings.saveOffline', 'offline');
			return;
		}
		settingsSavedMsg = t('settings.saved', 'Saved {time}', { time: new Date().toLocaleTimeString() });
	}

	function requestEngineSession() {
		if (!engine) return;
		try {
			engine.api.setSessionToken(currentNick);
		} catch (e) {
			console.warn(e);
		}
		if (status === 'OFFLINE') return;
		try {
			engine.api.sessionReady();
		} catch (e) {
			console.warn(e);
		}
	}

	function resumeEngineSessionOnMap() {
		setTimeout(() => {
			if (!engine || !currentNick || status !== 'OFFLINE') return;
			try {
				engine.api.setSessionToken(currentNick);
				engine.api.sessionReady();
			} catch (e) {
				console.warn(e);
			}
		}, 0);
	}

	function reconnect() {
		void locations.ensure(GAME, true);
		/* void npcSync.ensure(GAME); */
		try {
			if (!engine) return;
			if (displayName !== appliedSession) {
				appliedSession = displayName;
				currentNick = displayName || guestNick();
			} else if (!currentNick) {
				currentNick = displayName || guestNick();
			}
			requestEngineSession();
			if (!stats.isOpen()) stats.open();
			else stats.ping();
			chat.reopenDead(currentNick);
		} catch (e) {
			console.warn(e);
		}
	}

  async function handleChatClick() {
    await tick();
    chatLog?.scrollToBottom();
}

	
	const saveFileName = (slot: number) => `Save${String(slot).padStart(2, '0')}.lsd`;
	const MAX_SLOT = 3;
	const SAVE_SLOTS = 15;

	let SAVE_PRESENCE = $state<boolean[]>(Array.from({ length: SAVE_SLOTS }, () => false));

	async function downloadSaveData(slot: number): Promise<Uint8Array | null> {
		if (!displayName) return null;
		try {
			const r = await fetch(`/api/saves?game=${GAME}&slot=${slot}`, {
				credentials: 'same-origin'
			});

			if (!r.ok)
				return null;

			const buf = new Uint8Array(await r.arrayBuffer());

			return buf.length ? buf : null;
		} catch (e) {
			console.warn(e);
			return null;
		}
	}

	async function downloadAllSaves(): Promise<Array<{ slot: number; buf: Uint8Array }>> {
		if (!displayName) {
			return [];
		}
		const out: Array<{ slot: number; buf: Uint8Array }> = [];
		try {
			const r = await fetch(`/api/saves?game=${GAME}`, { credentials: 'same-origin' });
			if (!r.ok) 
				return out;
			
			const slots = ((await r.json()).slots ?? []).filter(
				(s: unknown) => Number.isFinite(s) && (s as number) >= 1 && (s as number) <= MAX_SLOT
			);
			await Promise.all(
				slots.map(async (slot: number) => {
					const buf = await downloadSaveData(slot);
					if (buf) 
						out.push({ slot, buf });
				})
			);
		} catch (e) {
			console.warn(e);
		}
		return out;
	}

	function downloadSave(slot: number): Promise<boolean> {
		if (!engine) {
			return Promise.resolve(false);
		}

		return new Promise((resolve) => {
			void (async () => {
				try {
					let buf: Uint8Array | null = null;
					try {
						buf = engine.FS.readFile(`Save/${saveFileName(slot)}`);
					} catch {}
					if (!buf || !buf.length) {
						saveError = "not found";
						resolve(false);
						return;
					}
					// whatever there is already a binding for this
					if (engine.api.downloadSavegame(slot)) {
						saveError = "ok";
						resolve(true);
					} else {
						saveError = "unknown";
						resolve(false);
					}
				} catch (e) {
					saveError = "exception";
					console.warn(e);
					resolve(false);
				} finally {
					refreshSavePresence();
				}
			})();
		});
	}

	function uploadSave(slot: number): Promise<boolean> {
		console.log("upload");
		if (!engine) {
			return Promise.resolve(false);
		}
		return new Promise((resolve) => {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = '.lsd';

			let done = false;
			const finish = (ok: boolean) => {
				if (done) return;
				done = true;
				input.remove();
				refreshSavePresence();
				resolve(ok);
			};

			input.oncancel = () => finish(false);
			input.onchange = () => {
				const file = input.files?.[0];
				if (!file) 
					return finish(false);

				void (async () => {
					try {
						const buf = new Uint8Array(await file.arrayBuffer());
						if (!buf.length) {
							saveError = "unknown";
							return finish(false);
						}
						console.log(`[save] picked ${file.name} for slot ${slot}: ${buf.length} bytes`);
						const installed = installSave(slot, buf); // also calls refreshScene()
						engine.api.refreshScene(); // fuck it let's do it twice
						saveError = installed ? "ok" : "unknown";
						SAVE_PRESENCE[slot - 1] = installed;

						if (!displayName) {
							// save does exist so we resolve with true
							return finish(installed);
						}

						if (slot > 3) {
							return finish(installed);
						}
						
						// upload him to the cloud
						const r = await fetch(`/api/saves?game=${GAME}&slot=${slot}`, {
							method: 'POST',
							credentials: 'same-origin',
							headers: { 'Content-Type': 'application/octet-stream' },
							body: buf
						});
						if (!r.ok) {
							console.warn('save upload', r.status);
							return finish(false);
						}
						console.log(`[save] uploaded slot ${slot}: ${buf.length} bytes`);
						finish(true);
					} catch (e) {
						saveError = "exception";
						console.warn(e);
						finish(false);
					}
				})();
			}
			// some browsers refuse to open a picker for an input that is not in the document
			document.body.appendChild(input);
			input.click();
		});
	}

	function installSave(
		slot: number,
		buf: Uint8Array | null,
		opts: { sync?: boolean; refresh?: boolean } = {}
	) {
		if (!buf || !engine) return false;
		try {

			const paths = [`/easyrpg/${GAME}/Save/${saveFileName(slot)}`, `Save/${saveFileName(slot)}`];
			try {
				engine.FS.mkdirTree(`/easyrpg/${GAME}/Save`);
			} catch {}
			let okBytes = -1;
			for (const p of paths) {
				try {
					engine.FS.writeFile(p, buf);
					okBytes = engine.FS.readFile(p).length;
				} catch {}
			}
			console.log(`[save] installed slot ${slot}: ${buf.length} bytes (readback ${okBytes})`);
			if (opts.sync !== false) {
				try {
					engine.FS.syncfs(() => {});
				} catch {}
			}
			try {
				console.log(`[save] Save dir: ${engine.FS.readdir(`/easyrpg/${GAME}/Save`).join(',')}`);
			} catch (e) {
				console.log('[save] Save dir missing');
			}

			engine.api.refreshScene();

			return okBytes === buf.length;
		} catch (e) {
			console.warn('[save] failed to install save:', e);
			return false;
		}
	}

	function deleteSave(slot: number): Promise<boolean> {
		console.log("delete");
		if (!engine) {
			return Promise.resolve(false);
		}

		return new Promise((resolve) => {
			let removed = false;
			for (const p of [`/easyrpg/${GAME}/Save/${saveFileName(slot)}`, `Save/${saveFileName(slot)}`]) {
				try {
					engine.FS.unlink(p);
					removed = true;
				} catch {}
			}
			try {
				engine.FS.syncfs(() => {});
			} catch {}
			refreshSavePresence();
			engine.api.refreshScene();
	
			if (!displayName || slot > MAX_SLOT) {
				saveError = removed ? "ok" : "not found";
				resolve(removed);
				return;
			}
	
			void (async () => {
				try {
					const r = await fetch(`/api/saves?game=${GAME}&slot=${slot}`, {
						method: 'DELETE',
						credentials: 'same-origin'
					});
					if (!r.ok) {
						console.warn('save delete', r.status);
						saveError = removed ? "ok" : "unknown";
						resolve(false);
						return;
					}
					console.log(`[save] deleted slot ${slot} (local ${removed ? 'yes' : 'no'})`);
					saveError = "ok";
					resolve(removed);
				} catch (e) {
					saveError = "exception";
					console.warn(e);
					resolve(false);
				}
			})();
		});
	}

	function saveExists(slot: number): boolean {
		if (!engine) return false;
		const name = saveFileName(slot);
		// TODO don't read from the engine filesystem every single time for this probably
		//  except it probably doesn't even matter that much
		for (const p of [`/easyrpg/${GAME}/Save/${name}`, `Save/${name}`]) {
			try {
				engine.FS.readFile(p);
				return true;
			} catch {}
		}
		return false;
	}

	function refreshSavePresence() {
		for (let slot = 1; slot <= SAVE_SLOTS; slot++) {
			SAVE_PRESENCE[slot - 1] = saveExists(slot);
		}
	}

  let elem: HTMLDivElement | null = $state(null);

  async function toggleFullscreen() {
        if (!document.fullscreenElement) {
            await elem?.requestFullscreen();
        } else {
            await document.exitFullscreen(); }
}


	// ANCHOR reactive stuff

	$effect(() => {
		if (!engine) return;
		refreshSavePresence();
	});

	$effect(() => {
		if (chatTab === 'saves') 
			refreshSavePresence();
	});

	$effect(() => {
		mementos.setPlayer(displayName);
	});


	onMount(() => settings.load());

	$effect(() => settings.persist());

	$effect(() => settings.trackChanges(!!displayName, (part) => chat.send({ t: 'settings-set', settings: part })));

	let colorTimer: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		const c = settings.nameColor;
		if (colorTimer) clearTimeout(colorTimer);
		colorTimer = setTimeout(() => {
			if (displayName) chat.setNameColor(c);
		}, 800);
	});

	$effect(() => {
		if (!displayName) {
			chat.closeAll();
			return;
		}
		if (currentNick) chat.reopenDead(currentNick);
	});

	$effect(() => {
		const d = displayName;
		if (!started || !engine || !currentNick || d === appliedSession) return;
		try {
			appliedSession = d;
			currentNick = d || guestNick();
			requestEngineSession();
		} catch (e) {
			console.warn(e);
		}
	});

	$effect(() => {
		void locations.currentRoom;
		if (!displayName || !currentNick) return;
		if (!chat.isLive('room')) chat.open('room', currentNick);
	});

	$effect(() => {
		void displayName;
		chat.resetAccountState();
	});

	$effect(() => {
		void currentLang();
		const games = new Set<string>([GAME]);
		for (const list of [chat.friends, chat.incoming, chat.outgoing, chat.blocks, chat.roster, chat.siteRoster, chat.lookupResults]) {
			for (const e of list as Array<{ game?: string }>) if (e?.game) games.add(e.game);
		}
		for (const g of games) void locations.ensure(g);
	/*	for (const g of games) void npcSync.ensure(g); */
	});

	$effect(() => {
		void locations.ensurePresence(GAME);
	});
	$effect(() => {
		void locations.currentRoom;
		locations.postPresence();
	});

	$effect(() => {
		version.serverVersion;
		untrack(() => {
			emojiStore.refresh();
		});
	})

	let emojiQuery = $derived.by(() => {
		const m = chatInput.match(EMOJI_TOKEN_END);
		return m ? m[1] : null;
	});
	let typingEmoji = $derived(emojiQuery !== null);

	// ANCHOR lifecycle

	onMount(() => {
		void initI18n();
		emojiStore.refresh();
		void mementos.load();
		const touchMq = window.matchMedia('(hover: none), (pointer: coarse)');
		const narrowMq = window.matchMedia('(max-width: 720px), (max-height: 500px)');
		const applyMedia = () => {
			isTouch = touchMq.matches;
			isNarrow = narrowMq.matches;
			if (!isTouch && chatTab === 'controls') selectTab('game');
		};
		applyMedia();
		touchMq.addEventListener('change', applyMedia);
		narrowMq.addEventListener('change', applyMedia);

		window.addEventListener('keydown', handleTabKey);
		window.addEventListener('pointerdown', ping.unlock);
		window.addEventListener('keydown', ping.unlock);

		const revive = () => player?.reviveAudio();
		const onVisibility = () => {
			if (!document.hidden) revive();
		};
		document.addEventListener('visibilitychange', onVisibility);
		window.addEventListener('focus', revive);
		window.addEventListener('pageshow', revive);
		window.addEventListener('pointerdown', revive, true);
		window.addEventListener('keydown', revive, true);

		// closing the tab would drop the player out of the game
		const onBeforeUnload = (e: BeforeUnloadEvent) => {
			if (!booted) return;
			e.preventDefault();
			e.returnValue = 'x';
		};
		window.addEventListener('beforeunload', onBeforeUnload);
		const onPageShow = (e: PageTransitionEvent) => {
			if (e.persisted) location.reload();
		};
		window.addEventListener('pageshow', onPageShow);

		// the game fills the window; no page scrolling
		const prevHtmlOverflow = document.documentElement.style.overflow;
		const prevBodyOverflow = document.body.style.overflow;
		document.documentElement.style.overflow = 'hidden';
		document.body.style.overflow = 'hidden';

		const nick = displayName || guestNick();
		currentNick = nick;
		appliedSession = displayName;

		(window as any).vpMementos = mementos;

		void player.start(nick);

		return () => {
			stats.stop();
			version.stop();
			window.removeEventListener('pageshow', onPageShow);
			window.removeEventListener('keydown', handleTabKey);
			window.removeEventListener('pointerdown', ping.unlock);
			window.removeEventListener('keydown', ping.unlock);
			document.removeEventListener('visibilitychange', onVisibility);
			window.removeEventListener('focus', revive);
			window.removeEventListener('pageshow', revive);
			window.removeEventListener('pointerdown', revive, true);
			window.removeEventListener('keydown', revive, true);
			window.removeEventListener('beforeunload', onBeforeUnload);
			document.documentElement.style.overflow = prevHtmlOverflow;
			document.body.style.overflow = prevBodyOverflow;
			delete (window as any).vpMementos;
			touchMq.removeEventListener('change', applyMedia);
			narrowMq.removeEventListener('change', applyMedia);
		};
	});
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- ^^ this hopefully should not be a Problem .  . . . -->
<div bind:this={elem} class="gamepage" class:no-select={chatTab === 'controls'}
	// FIXME this is a bit hacky, but i don't know 
	//  any other way to listen to the pointer events for the pane divider
	//  as it doesnt export any kind of callbacks for them
    onpointerdown={onPointerDown}
    onpointerup={onPointerUp}>
	<SplitPane
		type={paneType}
		id="gamepage-pane"
		min={paneMin}
		max={paneMax}
		bind:pos={panePos}
		--thickness={paneDividerThickness}
	>
		{#snippet a()}
			<section>
				<GamePlayer
					bind:this={player}
					game={GAME}
					relayUrl={urls.relay}
					{displayName}
					{settings}
					mobile={mobileLayout}
					systemNotice={chat.systemNotice}
					bind:engine
					bind:started
					bind:booted
					bind:status
					bind:peers
				/*	canSyncEvent={(id, name) => npcSync.canSync(locations.currentRoom, id, name)} */
					onMapLoad={(id) => {
						locations.currentRoom = id;
						resumeEngineSessionOnMap();
					}}
					onPlayersChanged={() => chat.requestRoster()}
					onReady={() => {
						chat.openAll(currentNick);
						stats.open();
						version.start();
					}}
					onTeardown={() => {
						chat.closeAll();
						stats.close();
						ping.dispose();
					}}
					extraAudio={() => ping.audioContext}
				/>
			</section>
		{/snippet}
		{#snippet b()}
			<section>
				<aside
					class="chat"
					class:mobile={mobileLayout}
					style={`font-size:${settings.chatFont}px;--btnfs:${settings.btnSize}px;--stfs:${settings.statusFont}px;--divpx:${settings.dividerPx}px;--shotsz:${settings.shotSize}px`}
				>
					<AuthBar displayName={data.displayName} updateReady={version.updateReady} />
					{#if started}
						<StatusBar {status} {mapCount} gameOnline={stats.gameOnline} siteOnline={stats.siteOnline} onReconnect={reconnect} />
					{/if}
					<ChatTabs
						{topTab}
						{chatTab}
						{settingsTab}
						{started}
						{isTouch}
						onTop={selectTop}
						onTab={selectTab}
						onSettingsTab={selectSettings}
						onClear={() => chat.clear(chatTab)}
						onScreenshot={takeScreenshot}
                        toggleFullscreen={toggleFullscreen}
                        onChatClick={handleChatClick}
						onOpenMementos={openMementos}
					/>
					{#if isTouch && chatTab === 'controls'}
						<TouchControls />
					{:else if chatTab === 'friends'}
						<FriendsTab />
					{:else if chatTab === 'roster'}
						<RosterTab />
					{:else if chatTab === 'lookup'}
						<LookupTab />
					{:else if chatTab === 'shots'}
						<ScreenshotsTab onOpenViewer={openViewer} onOpen={(s) => openLightbox(`/api/screenshots?id=${s.id}`, s.id)} onSend={shareShot} />
					{:else if chatTab === 'switch'}
						<SwitchGameTab counts={stats.gameCounts} countsLive={stats.live} onPick={(slug) => (openGame = slug)} />
					{:else if chatTab === 'saves'}
						<GameSavesTab bind:this={savesTab} engine={engine} savePresence={SAVE_PRESENCE} saveError={saveError} onDownload={downloadSave} onUpload={uploadSave} onDelete={deleteSave} />
					{:else if chatTab === 'mementos'}
						<MementosTab />
					{:else if chatTab === 'settings'}
						<SettingsTabView tab={settingsTab} savedMessage={settingsSavedMsg} onSave={saveSettingsNow} onChangePassword={() => (passwordOpen = true)} openRulesPopup={() => RulesPopupOpen = true} />
					{:else}
						<ChatLog bind:this={chatLog} messages={chat.messagesFor(chatTab)} tab={chatTab} onOpenImage={(src) => openLightbox(src)} />
					{/if}
					{#key menu.opened}
						<PlayerContextMenu onReport={openReport} />
					{/key}
					{#if chatTab === 'game' || chatTab === 'room' || chatTab === 'site'}
						<ChatInput bind:value={chatInput} bind:input={chatField} onSend={sendChat} openGuestPopup={() => guestPopupOpen = true} />
						{#if typingEmoji}
							<EmojiPicker query={emojiQuery} anchor={chatField} onPick={insertEmoji} />
						{/if}
					{/if}
				</aside>
			</section>
		{/snippet}
	</SplitPane>
	
    {#if RulesPopupOpen }
		<RulesPopup
			onClose={() => RulesPopupOpen = false}
		/>
	{/if}
	{#if guestPopupOpen}
		<GuestPopup
			onClose={() => guestPopupOpen = false}
		/>
	{/if}
	{#if reportFor}
		<ReportDialog
			name={reportFor.name}
			message={reportFor.message}
			onSend={(context) => {
				chat.report(reportFor!.name, context, reportFor!.message);
				reportFor = null;
			}}
			onClose={() => (reportFor = null)}
		/>
	{/if}
	{#if viewerOpen}
		<ScreenshotViewer
			shots={chat.shots}
			onClose={() => (viewerOpen = false)}
			onOpen={(s) => openLightbox(`/api/screenshots?id=${s.id}`, s.id)}
			onSend={(id) => {
				shareShot(id);
				viewerOpen = false;
			}}
			onDelete={(id) => chat.deleteShot(id)}
		/>
	{/if}
	{#if mementosOpen}
		<MementosViewer
			onClose={() => (mementosOpen = false)}
		/>
	{/if}
	{#if passwordOpen}
		<PasswordDialog onSave={(current, next) => chat.changePassword(current, next)} onClose={() => (passwordOpen = false)} />
	{/if}
	{#if lightbox}
		<Lightbox src={lightbox.src} shot={lightbox.shot} scale={settings.shotScale} onClose={() => (lightbox = null)} />
	{/if}
	{#if openGame && gameDetails[openGame]}
		<GamePopup
			title={gameBySlug(openGame)?.name ?? openGame}
			playHref={`/${openGame}`}
			details={gameDetails[openGame]}
			slides={gameSlides[openGame]}
			onClose={() => (openGame = null)}
		/>
	{/if}
		
</div>
