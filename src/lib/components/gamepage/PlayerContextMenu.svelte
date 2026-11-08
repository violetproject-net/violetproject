<script lang="ts">
	import { t } from '../../i18n.svelte';
	import { getGameContext } from '../../gamepage/context';
	import type { Contact } from '../../gamepage/types';
	import { fade, fly, scale } from "svelte/transition";
    import { quadOut, sineInOut } from 'svelte/easing';

	let { onReport }: { onReport: () => void } = $props();

	const { chat, menu } = getGameContext();

	let el: HTMLDivElement | null = $state(null);

	function inList(list: Contact[], uid: string | undefined, name: string) {
		const lower = name.toLowerCase();
		return list.some((f) => (uid && f.uid === uid) || f.name.toLowerCase() === lower);
	}

	let target = $derived(menu.target);
	let relation = $derived(
		!target
			? 'none'
			: target.uid && target.uid === chat.myUid
				? 'self'
				: inList(chat.friends, target.uid, target.name)
					? 'friend'
					: inList(chat.incoming, target.uid, target.name)
						? 'incoming'
						: inList(chat.outgoing, target.uid, target.name)
							? 'outgoing'
							: 'none'
	);
	let blocked = $derived(
		!!target &&
			((target.uid && chat.blockedUuids.has(target.uid)) ||
				chat.blocks.some((b) => b.name.toLowerCase() === target.name.toLowerCase()))
	);

	$effect(() => {
		if (!menu.target || !el) return;
		const node = el;
		requestAnimationFrame(() => {
			const cur = menu.target;
			if (!cur || !node.isConnected) return;
			const r = node.getBoundingClientRect();
			let x = cur.x;
			let y = cur.y;
			if (r.right > window.innerWidth - 8) x -= r.right - (window.innerWidth - 8);
			if (r.bottom > window.innerHeight - 8) y -= r.bottom - (window.innerHeight - 8);
			x = Math.max(8, x);
			y = Math.max(8, y);
			if (x !== cur.x || y !== cur.y) menu.target = { ...cur, x, y };
		});
	});
</script>

{#if target}
	<div transition:fade={{ duration: 200 }} class="modmenu" bind:this={el} style={`left:${target.x}px;top:${target.y}px`}>
		<div class="vp-head">
			<b>{target.name}</b>
			<button class="vp-close" onclick={() => menu.close()} title={t('app.close', 'Close')}>×</button>
		</div>
		{#if relation === 'self'}
			<span class="modnote">{t('menu.self', "That's you")}</span>
		{:else}
			{#if relation === 'none'}
				<div class="modrow">
					<button onclick={() => chat.friendOp('add', target.name)}>{t('menu.addFriend', 'Add friend')}</button>
				</div>
			{:else if relation === 'outgoing'}
				<span class="modnote">{t('menu.requestSent', 'Request sent')}</span>
				<div class="modrow">
					<button onclick={() => chat.friendOp('cancel', target.name)}>{t('menu.cancel', 'Cancel')}</button>
				</div>
			{:else if relation === 'incoming'}
				<div class="modrow">
					<button onclick={() => chat.friendOp('accept', target.name)}>{t('players.accept', 'Accept')}</button>
					<button onclick={() => chat.friendOp('decline', target.name)}>{t('players.decline', 'Decline')}</button>
				</div>
			{:else}
				<span class="modnote">{t('menu.friendsOk', 'Friends ✓')}</span>
				<div class="modrow">
					<button onclick={() => chat.friendOp('remove', target.name)}>{t('players.remove', 'Remove')}</button>
				</div>
			{/if}
			<div class="modrow">
				{#if blocked}
					<button onclick={() => chat.blockOp('unblock', target.name)}>{t('players.unblock', 'Unblock')}</button>
				{:else}
					<button onclick={() => chat.blockOp('block', target.name)}>{t('menu.block', 'Block')}</button>
				{/if}
			</div>
			<div class="modrow">
				<button onclick={onReport}>{t('menu.report', 'Report')}</button>
			</div>
			{#if chat.amAdmin}
				<label>{t('mod.minutes', 'Minutes (0 = forever)')}<input type="number" min="0" bind:value={menu.minutes} /></label>
				<label>{t('mod.reason', 'Reason')}<input maxlength="200" bind:value={menu.reason} placeholder={t('mod.reason', 'Reason')} /></label>
				<div class="modrow">
					{#if menu.mod?.muted}
						<button onclick={() => chat.sendAdmin('unmute')}>{t('mod.unmute', 'Unmute')}</button>
					{:else}
						<button onclick={() => chat.sendAdmin('mute')}>{t('mod.mute', 'Mute')}</button>
					{/if}
					{#if menu.mod?.banned}
						<button onclick={() => chat.sendAdmin('unban')}>{t('mod.unban', 'Unban')}</button>
					{:else}
						<button onclick={() => chat.sendAdmin('ban')}>{t('mod.ban', 'Ban')}</button>
					{/if}
				</div>
				<label>{t('mod.renameTo', 'Rename to')}<input maxlength="22" bind:value={menu.newName} placeholder={t('mod.newName', 'New name')} /></label>
				<div class="modrow">
					<button onclick={() => chat.sendAdmin('rename')}>{t('mod.rename', 'Rename')}</button>
				</div>
				<div class="modrow">
					<button onclick={() => chat.sendAdmin('resetpw')}>{t('mod.resetPw', 'Reset password')}</button>
				</div>
				<label>{t('mod.typeToDelete', 'Type {name} to delete', { name: target.name })}<input maxlength="22" bind:value={menu.deleteName} placeholder={target.name} /></label>
				<div class="modrow">
					<button disabled={menu.deleteName !== target.name} onclick={() => chat.sendAdmin('delete')}>{t('mod.deleteAccount', 'Delete account')}</button>
				</div>
			{/if}
		{/if}
	</div>
{/if}
