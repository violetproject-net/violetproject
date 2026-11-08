<script lang="ts">
	import { t } from '../../i18n.svelte';
	import { SHOT_MAX } from '../../gamepage/chat.svelte';
	import { getGameContext } from '../../gamepage/context';
	import type { Shot } from '../../gamepage/types';
	import ShotCard from './ShotCard.svelte';
	

	let {
		onOpenViewer,
		onOpen,
		onSend
	}: {
		onOpenViewer: () => void;
		onOpen: (shot: Shot) => void;
		onSend: (id: number) => void;
	} = $props();

	const { chat } = getGameContext();
</script>

<div class="chat-log">
	<div class="sys">{t('shots.count', 'Screenshots ({n}/{max})', { n: chat.shotCount, max: SHOT_MAX })}</div>
	<div class="shotrow">
		<button onclick={onOpenViewer}>{t('shots.viewer', 'Viewer')}</button>
	</div>
	<div class="shotgrid">
		{#each chat.shots as s (s.id)}
			<ShotCard shot={s} onOpen={() => onOpen(s)} onSend={() => onSend(s.id)} onDelete={() => chat.deleteShot(s.id)} />
		{/each}
	</div>
</div>
