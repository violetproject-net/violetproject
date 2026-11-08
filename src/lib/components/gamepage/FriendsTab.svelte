<script lang="ts">
	import { t } from '../../i18n.svelte';
	import { getGameContext } from '../../gamepage/context';
	import type { Contact } from '../../gamepage/types';
	import PlayerName from './PlayerName.svelte';

	const { settings, chat, locations } = getGameContext();

	let addName = $state('');

	function sendRequest() {
		const n = addName.trim().slice(0, 22);
		if (!n) return;
		chat.friendOp('add', n);
		addName = '';
	}

	const whereIs = (f: Contact) =>
		f.online
			? `${locations.mapName(f.game ?? '', f.room ?? 0)} · ${locations.gameName(f.game ?? '')}`
			: t('players.offline', 'offline');
</script>

<div class="chat-log" class:fdiv={settings.friendDividers} style={`--fdivpx:${settings.friendDividerPx}px`}>
	<div class="friendrow">
		<input
			bind:value={addName}
			maxlength="22"
			placeholder={t('players.usernamePlaceholder', 'Username')}
			onkeydown={(e) => {
				e.stopPropagation();
				if (e.key === 'Enter') sendRequest();
			}}
		/>
		<button onclick={sendRequest}>{t('players.add', 'Add')}</button>
	</div>
	{#if chat.incoming.length}
		<div class="sys">{t('players.friendRequests', 'Friend requests')}</div>
		{#each chat.incoming as f (f.uid)}
			<div class="friendrow">
				<span class="dot" class:on={f.online}></span>
				<PlayerName player={f} />
				<span class="sub">{whereIs(f)}</span>
				<button onclick={() => chat.friendOp('accept', f.name)}>{t('players.accept', 'Accept')}</button>
				<button onclick={() => chat.friendOp('decline', f.name)}>{t('players.decline', 'Decline')}</button>
			</div>
		{/each}
	{/if}
	<div class="sys">{t('players.friendsN', 'Friends ({n})', { n: chat.visibleFriends.length })}</div>
	{#each chat.visibleFriends as f, i (f.uid)}
		<div class="friendrow" class:fgap={!f.online && i > 0 && chat.visibleFriends[i - 1].online}>
			<span class="dot" class:on={f.online}></span>
			<PlayerName player={f} />
			<span class="sub">{whereIs(f)}</span>
		</div>
	{/each}
	{#if chat.blocks.length}
		<div class="sys">{t('players.blocked', 'Blocked')}</div>
		{#each chat.blocks as f (f.uid)}
			<div class="friendrow">
				<PlayerName player={f} />
				<button onclick={() => chat.blockOp('unblock', f.name)}>{t('players.unblock', 'Unblock')}</button>
			</div>
		{/each}
	{/if}
</div>
