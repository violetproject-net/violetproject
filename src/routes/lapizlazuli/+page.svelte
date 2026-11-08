<script lang="ts">
	import GamePage from '../../lib/components/GamePage.svelte';

	let { data } = $props();
</script>

<GamePage game="lapizlazuli" title="LAPIS lAZULi - Violetproject" data={data} />
