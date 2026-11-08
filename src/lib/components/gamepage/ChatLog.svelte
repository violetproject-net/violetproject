<script lang="ts">
	import type { ChatMsg, ChatTab } from '../../gamepage/types';
	import ChatMessage from './ChatMessage.svelte';
	import { tick } from 'svelte';

	let {
		messages,
		tab,
		onOpenImage
	}: {
		messages: ChatMsg[];
		tab: ChatTab;
		onOpenImage: (src: string) => void;
	} = $props();

	let el: HTMLDivElement | null = $state(null);

     export async function scrollToBottom() {
        await tick();

        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    }

	$effect.pre(() => {
		void messages;
		void messages.length;
		if (!el)
			return;
		
		const tolerance = 40;
		if (el.offsetHeight + el.scrollTop > el.scrollHeight - tolerance) {
			tick().then(() => {
				if(!el) return; // bruh
				el.scrollTop = el.scrollHeight;
			});
		}
	});

	function click(e: MouseEvent) {
		const target = e.target as HTMLElement;
		const img = target.closest?.('img.shot') as HTMLImageElement | null;
		if (img?.src) {
			onOpenImage(img.src);
			return;
		}
		target.closest?.('.spoiler')?.classList.toggle('open');
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="chat-log" bind:this={el} onclick={click}>
	{#each messages as m, i (i)}
		<ChatMessage {m} {tab} {onOpenImage} />
	{/each}
</div>
