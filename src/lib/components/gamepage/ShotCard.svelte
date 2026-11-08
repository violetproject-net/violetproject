<script lang="ts">
	import { t } from '../../i18n.svelte';
	import { fmtShotTs, shotUrl } from '../../gamepage/format';
	import type { Shot } from '../../gamepage/types';
	import { getGameContext } from '../../gamepage/context';
    import type { ChatTab, SettingsTab, TopTab } from '../../gamepage/types';

	let {
		shot,
		onOpen,
		onSend,
		onDelete,
		onChatClick
	}: {
		shot: Shot;
		onOpen: () => void;
		onSend: () => void;
		onDelete: () => void;
		onChatClick: () => void;
	} = $props();

	const { locations } = getGameContext();
</script>

<div class="shotcard">
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
	<img src={shotUrl(shot.id)} alt={t('shots.alt', 'screenshot')} loading="lazy" onclick={onOpen} />
	<div class="shotcap">
		<span>{shot.map || (shot.room ? t('shots.mapN', 'Map {n}', { n: shot.room }) : locations.gameName(shot.game))} · {locations.gameName(shot.game)}</span>
		<span>{fmtShotTs(shot.ts)}</span>
	</div>
	<div class="shotrow">
		<button onclick={() => {onSend(); onChatClick?.(); }}>{t('shots.send', 'Send')}</button>
		<button onclick={onDelete}>{t('shots.delete', 'Delete')}</button>
	</div>
</div>
