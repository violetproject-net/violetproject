import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter(),
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			
			
		}),
	],
	server: {
		allowedHosts: ['violetproject.net'],
		port: 4000,
		strictPort: true,
	},
	preview: {
		allowedHosts: ['violetproject.net'],
		port: 4000,
		strictPort: true,
		host: '127.0.0.1',
	}
});
