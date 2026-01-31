<script>
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	/** @type {'light' | 'dark' | 'auto'} */
	let mode = $state('auto');

	onMount(() => {
		const saved = localStorage.getItem('theme');
		if (saved === 'light' || saved === 'dark' || saved === 'auto') {
			mode = saved;
		}
		applyTheme(mode);

		// Listen for system theme changes
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		mediaQuery.addEventListener('change', () => {
			if (mode === 'auto') {
				applyTheme('auto');
			}
		});
	});

	/**
	 * @param {'light' | 'dark' | 'auto'} newMode
	 */
	function setMode(newMode) {
		mode = newMode;
		if (browser) {
			localStorage.setItem('theme', newMode);
			applyTheme(newMode);
		}
	}

	/**
	 * @param {'light' | 'dark' | 'auto'} themeMode
	 */
	function applyTheme(themeMode) {
		const html = document.documentElement;
		
		if (themeMode === 'dark') {
			html.classList.add('dark');
		} else if (themeMode === 'light') {
			html.classList.remove('dark');
		} else {
			// Auto mode - check system preference
			if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
				html.classList.add('dark');
			} else {
				html.classList.remove('dark');
			}
		}
	}
</script>

<div class="flex items-center gap-0.5 p-1 rounded-lg" style="background: hsl(var(--bg)); border: 1px solid hsl(var(--border));">
	<button 
		onclick={() => setMode('light')} 
		class="theme-btn" 
		class:active={mode === 'light'}
		aria-label="Light mode"
	>
		<i class="fi fi-rr-sun text-sm"></i>
	</button>
	<button 
		onclick={() => setMode('dark')} 
		class="theme-btn" 
		class:active={mode === 'dark'}
		aria-label="Dark mode"
	>
		<i class="fi fi-rr-moon text-sm"></i>
	</button>
	<button 
		onclick={() => setMode('auto')} 
		class="theme-btn" 
		class:active={mode === 'auto'}
		aria-label="Auto theme (system)"
	>
		<i class="fi fi-rr-computer text-sm"></i>
	</button>
</div>
