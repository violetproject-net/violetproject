<script lang="ts">
	import GamePage from '../../lib/components/GamePage.svelte';

	let { data } = $props();
</script>

<GamePage game="unconscious" title="Collective Unconscious - Violetproject" data={data} />
