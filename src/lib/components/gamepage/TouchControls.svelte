<script lang="ts">
	import { t } from '../../i18n.svelte';

	type Key = { 
		key: string; 
		code: string; 
		keyCode: number; 
		location: number;
		display?: string;
	};

	const PAD_KEYS: Record<string, Key> = {
		'tpad-up': { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38, location: 0 },
		'tpad-right': { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, location: 0 },
		'tpad-down': { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, location: 0 },
		'tpad-left': { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37, location: 0 },

		'tpad-shift': { key: 'Shift', code: 'ShiftLeft', keyCode: 16, location: 1, display: "Sh" },
		'tpad-cancel': { key: 'Escape', code: 'Escape', keyCode: 27, location: 0, display: "X" },
		'tpad-ok': { key: 'Enter', code: 'Enter', keyCode: 13, location: 0, display: "Z" },
		'tpad-9': { key: '9', code: 'Digit9', keyCode: 57, location: 0, display: "9" },
		'tpad-1': { key: '1', code: 'Digit1', keyCode: 49, location: 0, display: "1" }
	};

	const DPAD = [
		{ id: 'tpad-up', label: ['controls.up', 'Up'], d: 'M48,5.8C48,2.5,45.4,0,42,0H29.9C26.6,0,24,2.4,24,5.8V24h24V5.8z' },
		{ id: 'tpad-right', label: ['controls.right', 'Right'], d: 'M66.2,24H48v24h18.2c3.3,0,5.8-2.7,5.8-6V29.9C72,26.5,69.5,24,66.2,24z' },
		{ id: 'tpad-down', label: ['controls.down', 'Down'], d: 'M24,66.3c0,3.3,2.6,5.7,5.9,5.7H42c3.3,0,6-2.4,6-5.7V48H24V66.3z' },
		{ id: 'tpad-left', label: ['controls.left', 'Left'], d: 'M5.7,24C2.4,24,0,26.5,0,29.9V42c0,3.3,2.3,6,5.7,6H24V24H5.7z' }
	];

	const BUTTONS = [
		{ id: 'tpad-shift', cls: 'cbtn shift', label: ['controls.shift', 'Shift'], display: "Sh" },
		{ id: 'tpad-cancel', cls: 'cbtn', label: ['controls.cancel', 'Cancel'], display: "X" },
		{ id: 'tpad-ok', cls: 'cbtn', label: ['controls.confirm', 'Confirm'], display: "Z" },
		{ id: 'tpad-9', cls: 'cbtn', label: ['controls.9', '9'], display: "9" },
		{ id: 'tpad-1', cls: 'cbtn', label: ['controls.1', '1'], display: "1" }
	];

	/** which pad control each finger is currently on */
	const pointers = new Map<number, string>();
	let shiftHeld = false;

	function send(type: 'keydown' | 'keyup', info: Key) {
		const canvas = document.getElementById('canvas');
		if (!canvas) return;
		const selfShift = info.code === 'ShiftLeft';
		const shiftDown = selfShift ? type === 'keydown' : shiftHeld;
		if (selfShift) shiftHeld = type === 'keydown';
		const ev = new KeyboardEvent(type, {
			key: info.key,
			code: info.code,
			location: info.location,
			shiftKey: shiftDown,
			ctrlKey: false,
			altKey: false,
			metaKey: false,
			repeat: false,
			bubbles: true,
			cancelable: true,
			composed: true
		});
		Object.defineProperty(ev, 'keyCode', { get: () => info.keyCode });
		Object.defineProperty(ev, 'which', { get: () => info.keyCode });
		Object.defineProperty(ev, 'charCode', { get: () => 0 });
		canvas.dispatchEvent(ev);
	}

	function down(e: PointerEvent) {
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		const node = e.currentTarget as Element | null;
		const info = node ? PAD_KEYS[node.id] : undefined;
		if (!node || !info) return;
		e.preventDefault();
		try {
			node.setPointerCapture(e.pointerId);
		} catch {}
		pointers.set(e.pointerId, node.id);
		node.classList.add('active');
		send('keydown', info);
	}

	function up(e: PointerEvent) {
		const cur = pointers.get(e.pointerId);
		pointers.delete(e.pointerId);
		if (!cur) return;
		e.preventDefault();
		const info = PAD_KEYS[cur];
		if (info) send('keyup', info);
		document.getElementById(cur)?.classList.remove('active');
	}

	function move(e: PointerEvent) {
		const cur = pointers.get(e.pointerId);
		if (cur === undefined) return;
		e.preventDefault();
		const under = document.elementFromPoint(e.clientX, e.clientY) as Element | null;
		const nextId = under?.id ?? '';
		if (cur === nextId) return;
		if (cur) {
			const info = PAD_KEYS[cur];
			if (info) send('keyup', info);
			document.getElementById(cur)?.classList.remove('active');
		}
		const nextInfo = PAD_KEYS[nextId];
		if (nextInfo) {
			send('keydown', nextInfo);
			pointers.set(e.pointerId, nextId);
			document.getElementById(nextId)?.classList.add('active');
		} else {
			pointers.set(e.pointerId, '');
		}
	}
</script>

<div class="controls-view" role="group" aria-label={t('tabs.controls', 'Controls')} oncontextmenu={(e) => e.preventDefault()}>
	<div class="cpad-dpad">
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
			<path
				class="tpad-outline"
				d="M29.9,0 C26.6,0 24,2.4 24,5.8 L24,24 L5.7,24 C2.4,24 0,26.5 0,29.9 L0,42 C0,45.3 2.3,48 5.7,48 L24,48 L24,66.3 C24,69.6 26.6,72 29.9,72 L42,72 C45.4,72 48,69.6 48,66.3 L48,48 L66.2,48 C69.5,48 72,45.3 72,42 L72,29.9 C72,26.5 69.5,24 66.2,24 L48,24 L48,5.8 C48,2.5 45.4,0 42,0 Z"
			/>
			{#each DPAD as p (p.id)}
				<path
					id={p.id}
					role="button"
					tabindex="-1"
					aria-label={t(p.label[0], p.label[1])}
					d={p.d}
					onpointerdown={down}
					onpointermove={move}
					onpointerup={up}
					onpointercancel={up}
				/>
			{/each}
			<rect id="tpad-center" x="24" y="24" width="24" height="24" />
		</svg>
	</div>
	<div class="cpad-buttons">
		{#each BUTTONS as b (b.id)}
			<div
				id={b.id}
				class={b.cls}
				role="button"
				tabindex="-1"
				aria-label={t(b.label[0], b.label[1])}
				onpointerdown={down}
				onpointermove={move}
				onpointerup={up}
				onpointercancel={up}
			>{b.display}</div>
		{/each}
	</div>
</div>
