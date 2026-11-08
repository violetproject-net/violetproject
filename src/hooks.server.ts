import { building } from '$app/environment';
import { startFeaturedBot } from './lib/server/featured';
import type { Handle } from '@sveltejs/kit';

if (!building) startFeaturedBot();

export const handle: Handle = ({ event, resolve }) => resolve(event);
