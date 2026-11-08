<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { t } from '../../i18n.svelte';
	import { EngineHooks } from '../../gamepage/engineHooks';
	import { createCloudSaves } from '../../gamepage/saves';
	import type { GameSettings, NametagMode, ScaleMode } from '../../gamepage/settings.svelte';

	let {
		game,
		relayUrl,
		displayName,
		settings,
		mobile,
		engine = $bindable(null),
		started = $bindable(false),
		booted = $bindable(false),
		status = $bindable('OFFLINE'),
		peers = $bindable([]),
/* 		canSyncEvent, */
		onMapLoad,
		onPlayersChanged,
		onReady,
		onTeardown,
		extraAudio
	}: {
		game: string;
		relayUrl: string;
		displayName: string;
		settings: GameSettings;
		mobile: boolean;
		engine?: any;
		started?: boolean;
		booted?: boolean;
		status?: string;
		peers?: string[];
		/* 	canSyncEvent: (id: number, name: string) => boolean; */
		onMapLoad: (id: number) => void;
		onPlayersChanged: () => void;
		onReady: (nick: string) => void;
		onTeardown: () => void;
		extraAudio?: () => AudioContext | null;
	} = $props();

	let canvas: HTMLCanvasElement;
	// svelte-ignore state_referenced_locally
	const GAME = game;
	// svelte-ignore state_referenced_locally
	const RELAY_URL = relayUrl;
	const ENGINE_JS = '/player/bardengine-simd.js';

	const hooks = new EngineHooks();
	const saves = createCloudSaves({
		game: GAME,
		engine: () => engine,
		displayName: () => displayName
	});

	let booting = false;
	let netRetry = $state<string[]>([]);
	let bootScaleMode: ScaleMode | null = $state(null);
	const peerMap = new Map<string, string>();

	const SCALE_ENUM = { nearest: 0, integer: 1, bilinear: 2 };
	const NAMETAG_ENUM: Record<NametagMode, number> = { none: 0, classic: 1, compact: 2 };

	function applyVolume() {
		try {
			const api = engine?.api;
			if (!api) return;
			if (typeof api.setMusicVolume === 'function') api.setMusicVolume(settings.musicVolume);
			if (typeof api.setSoundVolume === 'function') api.setSoundVolume(settings.sfxVolume);
		} catch (e) {
			console.warn(e);
		}
	}

	// clientWidth, clientHeight
	// since this will be in a split pane
	// we need to do this to update the actual
	// dimensions of the canvas itself so that
	// the engine can properly scale the display
	// honestly don't know if there is a better way to do this lol

	let cw = $state(0);
	let ch = $state(0);

	$effect(() => {
		if (!engine || !cw || !ch) {
			return;
		}

		canvas.width = cw;
		canvas.height = ch;
		// HACK HOW DO YOU EVEN GET IT TO UPDATE THE SURFACE?????
		// WHO EVEN CARES AT THIS POINT
		// can you tell i have literally no idea what i'm doing
		window.dispatchEvent(new Event("resize"));
		engine.api.updateSurface(); // this just REDRAWS to the surface actually
		// but whatever the resize event does i dont know how to make a binding for
		// because i don't even know what it is but who even cares at this point lol it works
	});

	function applyNametagMode() {
		try {
			const api = engine?.api;
			if (!api || typeof api.setNametagMode !== 'function') return;
			api.setNametagMode(NAMETAG_ENUM[settings.nametagMode]);
		} catch (e) {
			console.warn(e);
		}
	}

	$effect(() => {
		settings.scaleMode;
		untrack(() => {
			if (!engine) return;
			engine.api.setVideoScalingMode(SCALE_ENUM[settings.scaleMode]);
		});
	});
	$effect(() => {
		settings.doNpcSync;
		untrack(() => {
			if (!engine) return;
			engine.api.setEventSyncEnabled(settings.doNpcSync);
		});
	});
	$effect(() => {
		if (!started || !engine) return;
		applyVolume();
	});
	$effect(() => {
		if (!started || !engine) return;
		applyNametagMode();
	});

	function renderPeers() {
		peers = [...peerMap.keys()];
	}

	function defineEngineGlobals() {
		const w = window as any;
		w.vpNetRetry = (file: unknown, state: string) => {
			const f = String(file || '?');
			netRetry =
				state === 'retry' ? (netRetry.includes(f) ? netRetry : [...netRetry, f]) : netRetry.filter((x) => x !== f);
		};
		w.onLoadMap = (n: string) => {
			const id = Number(n.split('Map')[1].substring(0, 4));
			console.log(`[violetproject] loading to map ID ${id}`);
			if (Number.isFinite(id) && id > 0) onMapLoad(Math.floor(id));
		};
		w.onRoomSwitch = () => console.log('[violetproject] room switched');
		w.syncPlayerData = (_uuid: unknown, _rank: unknown, _account: unknown, _badge: unknown, _medals: unknown, id: string) => {
			if (id === undefined) return;
			peerMap.set(id, '#' + id);
			renderPeers();
			onPlayersChanged();
		};
		w.onPlayerDisconnected = (id: string) => {
			peerMap.delete(id);
			renderPeers();
			onPlayersChanged();
		};
		w.onPlayerConnectedOrUpdated = () => {};
		w.onUpdateConnectionStatus = (s: number) => {
			const next = s === 1 ? 'ONLINE' : s === 2 ? '…' : 'OFFLINE';
			if (next === 'ONLINE' && status !== 'ONLINE') {
				peerMap.clear();
				renderPeers();
			}
			status = next;
		};
		w.onReceiveInputFeedback = () => {};
		w.onNametagModeUpdated = () => {};
		w.onPlayerSpriteUpdated = () => {};
		w.onPlayerTeleported = (map: unknown, x: unknown, y: unknown) => console.log('[violetproject] teleported', map, x, y);
		w.onUpdateSystemGraphic = () => {};
		w.onBadgeUpdateRequested = () => {};
		w.showClientToastMessage = (msg: unknown) => console.log('[violetproject] toast:', msg);
		w.shouldConnectPlayer = () => true;
		w.onRequestFile = () => {};
		w.onSaveSlotUpdated = (slot: unknown) => saves.upload(Number(slot));

		// npc-sync
		w.onEventAuthorityUpdated = (authorityHostId: unknown) => {
			console.log(`[violetproject]: Event authority updated: ${authorityHostId}`);
		};
		w.shouldSyncGameEvent = (id: string, name: string) => {
			// TODO use sync filter
			//const syncAllowed = canSyncEvent(parseInt(id), name);
			//console.log(`[violetproject]: Engine is asking if it should sync event id ${id}, filter says ${syncAllowed}`);
			return true;
		};
	}

	function loadEngineScript() {
		return new Promise<void>((resolve, reject) => {
			if ((window as any).createEasyRpgPlayer) return resolve();
			const el = document.createElement('script');
			el.src = ENGINE_JS;
			el.async = true;
			el.onload = () => resolve();
			el.onerror = () => reject(new Error('failed to load engine' + ENGINE_JS));
			document.body.appendChild(el);
		});
	}

	async function installSoundfont() {
		const r = await fetch('/soundfonts/MicrosoftGM.sf2');
		if (!r.ok) throw new Error('sf2 HTTP ' + r.status);
		engine.FS.writeFile('easyrpg.soundfont', new Uint8Array(await r.arrayBuffer()));
	}

	export async function start(nick: string) {
		if (started || booting) return;
		booting = true;
		try {
			defineEngineGlobals();
			hooks.install();
			hooks.lockTitle('Violetproject');
			const pendingSaves = saves.downloadAll();
			await loadEngineScript();
			const bootScale = settings.scaleMode;
			bootScaleMode = bootScale;
			const engineOpts: Record<string, unknown> = {
				game: GAME,
				saveFs: undefined,
				wsUrl: RELAY_URL
			};
			let scalingInjected = false;
			Object.defineProperty(engineOpts, 'arguments', {
				configurable: true,
				enumerable: true,
				get(this: Record<string, unknown>) {
					return this._args;
				},
				set(this: Record<string, unknown>, v: unknown) {
					this._args =
						Array.isArray(v) && !scalingInjected
							? ((scalingInjected = true), ['easyrpg-player', '--scaling', bootScale, ...(v as unknown[]).slice(1)])
							: v;
				}
			});
			const Module = await (window as any).createEasyRpgPlayer(engineOpts);
			engine = Module;
			Module.initApi();
			applyVolume();
			applyNametagMode();
			Module.wsUrl = RELAY_URL;
			Module.api.setSessionToken(nick);
			Module.api.sessionReady();
		/*	Module.api.setEventSyncEnabled(true); */
			for (const s of await pendingSaves) saves.install(s.slot, s.buf);
			console.log(`[save] cloud install done for game=${GAME}`);
			onReady(nick);
			await installSoundfont();
			started = true;
			booted = true;
			document.getElementById('canvas')?.focus();
		} catch (e: any) {
			console.error(e);
			booting = false;
		}
	}

	export function reviveAudio() {
		hooks.reviveAudio(engine?.SDL2?.audioContext, extraAudio?.());
	}

	function teardown() {
		hooks.teardown();
		onTeardown();
		peerMap.clear();
		renderPeers();
		engine = null;
		started = false;
		booting = false;
	}

	onMount(() => {
		const canvas = document.getElementById('canvas');
		const focus = () => canvas?.focus();
		canvas?.addEventListener('mouseenter', focus);
		canvas?.addEventListener('click', focus);
		return teardown;
	});
</script>

<div id="status" class="sr-only" aria-live="polite">{status}</div>
{#if netRetry.length}
	<div class="net-retry" role="status">
		{t('app.netRetry', 'Connection lost, retrying to load {file}…', { file: netRetry.join(', ') })}
	</div>
{/if}
<!--
	style={`width:${mobile ? 100 : 100 - settings.chatWidth}%; height:${mobile ? 'var(--cvch)' : '100%'}; image-rendering:${(bootScaleMode ?? settings.scaleMode) === 'bilinear' ? 'auto' : 'pixelated'}`}
-->
<canvas
	id="canvas"
	tabindex="-1"
	style={`image-rendering:${(bootScaleMode ?? settings.scaleMode) === 'bilinear' ? 'auto' : 'pixelated'}`}
	
	bind:this={canvas}
	bind:clientWidth={cw}
	bind:clientHeight={ch}
></canvas>
