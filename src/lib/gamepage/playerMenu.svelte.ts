import type { MenuTarget } from './types';

export class PlayerMenu {
	target: MenuTarget | null = $state(null);
	mod: { banned: number; muted: number } | null = $state(null);
	opened = $state(0);

	minutes = $state('30');
	reason = $state('');
	newName = $state('');
	deleteName = $state('');

	open(e: MouseEvent, name: string | undefined, uid?: string, message?: string) {
		if (!name) return false;
		e.preventDefault();
		e.stopPropagation();
		this.newName = '';
		this.deleteName = '';
		this.target = {
			name,
			uid,
			x: Math.min(e.clientX, window.innerWidth - 230),
			y: Math.min(e.clientY, window.innerHeight - 140),
			message: (message || '').slice(0, 280)
		};
		this.mod = null;
		this.opened++;
		return true;
	}

	close() {
		this.target = null;
	}
}
