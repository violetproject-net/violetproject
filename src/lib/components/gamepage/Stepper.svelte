<script lang="ts">
	import SettingRow from './SettingRow.svelte';

	let {
		label,
		value = $bindable(),
		min,
		max,
		step = 1,
		unit = '',
		decimalPlaces = 0
	}: {
		label: string;
		value: number;
		min: number;
		max: number;
		step?: number;
		unit?: string;
		decimalPlaces?: number;
	} = $props();
</script>

<SettingRow {label}>
	<button onclick={() => (value = Math.max(min, value - step))}>−</button>
	<b>{value.toFixed(decimalPlaces)}{unit}</b>
	<button onclick={() => (value = Math.min(max, value + step))}>+</button>
</SettingRow>
