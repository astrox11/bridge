<script>
	import { onMount, onDestroy } from 'svelte';

	let canvas;
	let ctx;
	let particles = [];
	let mouseX = 0;
	let mouseY = 0;
	let animationFrame;

	const PARTICLE_COUNT = 50;
	const PARTICLE_SIZE = 3;
	const MOUSE_RADIUS = 150;

	class Particle {
		constructor(canvasWidth, canvasHeight) {
			this.x = Math.random() * canvasWidth;
			this.y = Math.random() * canvasHeight;
			this.baseX = this.x;
			this.baseY = this.y;
			this.size = Math.random() * PARTICLE_SIZE + 1;
			this.density = Math.random() * 30 + 1;
			this.vx = (Math.random() - 0.5) * 0.5;
			this.vy = (Math.random() - 0.5) * 0.5;
			this.canvasWidth = canvasWidth;
			this.canvasHeight = canvasHeight;
		}

		update() {
			// Calculate distance from mouse
			const dx = mouseX - this.x;
			const dy = mouseY - this.y;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance < MOUSE_RADIUS) {
				// Move towards mouse with easing
				const force = (MOUSE_RADIUS - distance) / MOUSE_RADIUS;
				const dirX = dx / distance || 0;
				const dirY = dy / distance || 0;
				this.x += dirX * force * 2;
				this.y += dirY * force * 2;
			}

			// Gentle floating motion
			this.x += this.vx;
			this.y += this.vy;

			// Boundary check with wrapping
			if (this.x < 0) this.x = this.canvasWidth;
			if (this.x > this.canvasWidth) this.x = 0;
			if (this.y < 0) this.y = this.canvasHeight;
			if (this.y > this.canvasHeight) this.y = 0;
		}

		draw() {
			const dx = mouseX - this.x;
			const dy = mouseY - this.y;
			const distance = Math.sqrt(dx * dx + dy * dy);
			
			// Glow effect near mouse
			const alpha = distance < MOUSE_RADIUS 
				? 0.8 - (distance / MOUSE_RADIUS) * 0.4
				: 0.4;
			
			ctx.beginPath();
			ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
			ctx.fillStyle = `hsla(245, 85%, 70%, ${alpha})`;
			ctx.fill();

			// Add subtle glow
			if (distance < MOUSE_RADIUS) {
				ctx.beginPath();
				ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
				ctx.fillStyle = `hsla(245, 85%, 70%, ${alpha * 0.3})`;
				ctx.fill();
			}
		}
	}

	function init() {
		if (!canvas) return;
		ctx = canvas.getContext('2d');
		resize();
		createParticles();
		animate();
	}

	function resize() {
		if (!canvas) return;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		createParticles();
	}

	function createParticles() {
		particles = [];
		for (let i = 0; i < PARTICLE_COUNT; i++) {
			particles.push(new Particle(canvas.width, canvas.height));
		}
	}

	function drawConnections() {
		for (let i = 0; i < particles.length; i++) {
			for (let j = i + 1; j < particles.length; j++) {
				const dx = particles[i].x - particles[j].x;
				const dy = particles[i].y - particles[j].y;
				const distance = Math.sqrt(dx * dx + dy * dy);

				if (distance < 120) {
					const alpha = (1 - distance / 120) * 0.3;
					ctx.beginPath();
					ctx.moveTo(particles[i].x, particles[i].y);
					ctx.lineTo(particles[j].x, particles[j].y);
					ctx.strokeStyle = `hsla(245, 85%, 70%, ${alpha})`;
					ctx.lineWidth = 0.5;
					ctx.stroke();
				}
			}
		}
	}

	function animate() {
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		particles.forEach(p => {
			p.update();
			p.draw();
		});

		drawConnections();
		animationFrame = requestAnimationFrame(animate);
	}

	function handleMouseMove(e) {
		mouseX = e.clientX;
		mouseY = e.clientY;
	}

	function handleTouchMove(e) {
		if (e.touches.length > 0) {
			mouseX = e.touches[0].clientX;
			mouseY = e.touches[0].clientY;
		}
	}

	onMount(() => {
		init();
		window.addEventListener('resize', resize);
	});

	onDestroy(() => {
		if (animationFrame) cancelAnimationFrame(animationFrame);
		window.removeEventListener('resize', resize);
	});
</script>

<canvas 
	bind:this={canvas}
	class="particles-canvas"
	onmousemove={handleMouseMove}
	ontouchmove={handleTouchMove}
></canvas>

<style>
	.particles-canvas {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: all;
		z-index: 0;
	}
</style>
