<script lang="ts">
	import { t } from '../../i18n.svelte';
	import { getGameContext } from '../../gamepage/context';

	let {
		status,
		mapCount,
		gameOnline,
		siteOnline,
		onReconnect
	}: {
		status: string;
		mapCount: number;
		gameOnline: number;
		siteOnline: number;
		onReconnect: () => void;
	} = $props();

	const { game, settings, locations } = getGameContext();
</script>

<div class="chat-reconnect">
	<b class:online={status === 'ONLINE'}>{status}</b>
	<span>{t('app.statLine', 'Map: {map} · Game: {game} · Site: {site}', { map: mapCount, game: gameOnline, site: siteOnline })}</span>
	<button onclick={onReconnect}>{t('app.reconnect', 'Reconnect')}</button>
</div>
{#if settings.showWhere}
	<div class="chat-where">
		<span>{locations.gameName(game)}</span>
		<span>{locations.currentMapName}</span>
	</div>
{/if}
