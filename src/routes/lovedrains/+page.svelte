<script lang="ts">
	import GamePage from '../../lib/components/GamePage.svelte';

	let { data } = $props();
</script>

<GamePage game="lovedrains" title="Love Drains - Violetproject" data={data} />
