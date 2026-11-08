<script lang="ts">
	import GamePage from '../../lib/components/GamePage.svelte';

	let { data } = $props();
</script>

<GamePage game="yumearuki" title="Yume Aruki - Violetproject" data={data} />
