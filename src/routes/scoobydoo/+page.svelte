<script lang="ts">
		import GamePage from '../../lib/components/GamePage.svelte';

	let { data } = $props();
</script>

<GamePage game="scoobydoo" title="Scooby Doo - Violetproject" data={data} />