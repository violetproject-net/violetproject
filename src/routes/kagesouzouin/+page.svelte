<script lang="ts">
	import GamePage from '../../lib/components/GamePage.svelte';

	let { data } = $props();
</script>

<GamePage game="kagesouzouin" title="Kage, Souzou, In - Violetproject" data={data} />
