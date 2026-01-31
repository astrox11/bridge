<script>
	import { onMount, onDestroy } from 'svelte';
	import StatCard from '$lib/components/StatCard.svelte';
	import PerformanceChart from '$lib/components/PerformanceChart.svelte';
	import SessionList from '$lib/components/SessionList.svelte';

	let cpu = $state(null);
	let memory = $state(null);
	let disk = $state(null);
	let cpuHistory = $state([]);
	let sessions = $state([]);
	let loading = $state(true);
	let sessionsLoading = $state(true);

	/** @type {EventSource | null} */
	let systemStream = null;
	/** @type {EventSource | null} */
	let instanceStream = null;

	onMount(() => {
		// System metrics stream
		systemStream = new EventSource('/api/system/stream');
		systemStream.onmessage = (e) => {
			const data = JSON.parse(e.data);
			cpu = data.cpu.toFixed(1) + '%';
			memory = data.memory.toFixed(1) + '%';
			disk = (data.disk || 0).toFixed(1) + '%';
			cpuHistory = [...cpuHistory, data.cpu].slice(-30);
			loading = false;
		};

		// Instance stream
		instanceStream = new EventSource('/api/instances/stream');
		instanceStream.onmessage = (e) => {
			try {
				sessions = JSON.parse(e.data);
				sessionsLoading = false;
			} catch (err) {
				console.error('Instance parse error:', err);
			}
		};
	});

	onDestroy(() => {
		systemStream?.close();
		instanceStream?.close();
	});
</script>

<svelte:head>
	<title>Dashboard | Whatsaly</title>
</svelte:head>

<section class="space-y-4 md:space-y-6 fade-in">
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
		<StatCard label="Processor" icon="fi-rr-microchip" value={cpu} loading={loading} />
		<StatCard label="Memory" icon="fi-rr-database" value={memory} loading={loading} />
		<StatCard label="Disk" icon="fi-rr-folder-open" value={disk} loading={loading} />
	</div>

	<PerformanceChart data={cpuHistory} />

	<SessionList sessions={sessions} loading={sessionsLoading} />
</section>
