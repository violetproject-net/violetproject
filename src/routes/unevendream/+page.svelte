<script lang="ts">
	import GamePage from '../../lib/components/GamePage.svelte';

	let { data } = $props();
</script>

<GamePage game="unevendream" title="Uneven Dream - Violetproject" data={data} />
