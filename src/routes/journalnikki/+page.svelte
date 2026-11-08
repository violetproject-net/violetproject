<script lang="ts">
	import GamePage from '../../lib/components/GamePage.svelte';

	let { data } = $props();
</script>

<GamePage game="journalnikki" title="Journal Nikki - Violetproject" data={data} />
