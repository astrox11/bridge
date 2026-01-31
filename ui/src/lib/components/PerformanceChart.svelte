<script>
	import { onMount, onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';

	/** @type {number[]} */
	export let data = [];

	const maxPoints = 30;

	/** @type {HTMLCanvasElement} */
	let canvas;

	/** @type {Chart | null} */
	let chart = null;

	$: if (chart && data.length > 0) {
		chart.data.datasets[0].data = data.slice(-maxPoints);
		chart.update('none');
	}

	onMount(() => {
		const ctx = canvas.getContext('2d');
		const styles = getComputedStyle(document.documentElement);
		const primaryColor = 'hsl(142, 71%, 45%)';

		chart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: Array(maxPoints).fill(''),
				datasets: [{
					data: Array(maxPoints).fill(0),
					borderColor: primaryColor,
					borderWidth: 2,
					backgroundColor: 'hsla(142, 71%, 45%, 0.1)',
					fill: true,
					tension: 0.3,
					pointRadius: 0
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: { legend: { display: false } },
				scales: {
					y: { 
						min: 0, 
						max: 100, 
						grid: { color: 'hsla(220, 13%, 50%, 0.1)' }, 
						ticks: { display: false },
						border: { display: false }
					},
					x: { display: false }
				}
			}
		});
	});

	onDestroy(() => {
		if (chart) chart.destroy();
	});
</script>

<div class="card">
	<div class="card-header flex items-center gap-2">
		<i class="fi fi-rr-chart-line-up text-sm" style="color: hsl(var(--primary));"></i>
		<span>Performance</span>
	</div>
	<div class="p-4 h-48">
		<canvas bind:this={canvas}></canvas>
	</div>
</div>
