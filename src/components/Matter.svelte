<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { matterActionOutput } from '$lib/utils/actions'; // Import matterActionOutput store
	import {
		initMatterJS,
		startMatter,
		stopMatter,
		resetBodies,
		handleInstruction,
	} from '$lib/matter';
	import Matter from 'matter-js';
	import type { MatterInstance, Action } from '../lib/types';
	import { actionSnapshot } from '$lib/utils/actions';
	import { isRunning, matterInstanceStore, resetMatterFlag } from '$lib/stores/store';

	// Matter.js instance, needs to be exported to be used by actions.ts
	export let matterInstance: MatterInstance | null = null;
	let matterContainer: HTMLElement | null = null;

	// Expose the data prop to receive the data from the parent +page.svelte
	export let data;

	// Only subscribe to matterActionOutput when isRunning is true

	matterActionOutput.subscribe((instructions: Action[]) => {
		if ($isRunning && matterInstance && instructions.length > 0) {
			const latestInstruction = instructions[instructions.length - 1];
			handleInstruction(matterInstance, latestInstruction, $actionSnapshot); // Pass the latest instruction to matter.ts
		}
	});

	// Reactively control Matter.js based on the running state
	$: if ($isRunning && matterInstance) {
		resetBodies(matterInstance);
		//resetBodies(matterInstance, (data.scene = data.scene ? data.scene : null));
		startMatter(matterInstance.runner, matterInstance.engine);
	} else if (!$isRunning && matterInstance) {
		stopMatter(matterInstance.runner);
	}

	// Scale factor!
	let scale: number = 0.8;
	let innerWidth: number;

	// Helper to clean up the current Matter.js instance
	function cleanupMatterInstance() {
		if (matterInstance) {
			stopMatter(matterInstance.runner);
			Matter.Engine.clear(matterInstance.engine);
			Matter.World.clear(matterInstance.engine.world, false); // Clear all bodies including static ones
			// Remove the canvas element
			const container = document.querySelector('#matterContainer');
			const canvas = container?.querySelector('canvas');
			if (canvas) {
				canvas.remove(); // Ensure canvas is removed
			}
		}
	}

	const reinitMatterJs = () => {
		cleanupMatterInstance(); // First, clean up the old instance
		// Toggle running state to false, NB must be run after cleanup
		$isRunning = false;
		if (matterContainer) {
			matterInstance = initMatterJS(
				matterContainer,
				{ width: 450, height: 680 },
				scale,
				(data.scene = data.scene ? data.scene : null),
			);
			matterInstanceStore.set(matterInstance); // Set the store with the Matter instance
		}
	};

	// Reinitialize Matter.js whenever the lesson `data` changes
	$: if (data && matterContainer) {
		reinitMatterJs();
	}

	// Reinitialize Matter.js whenever the flag is changed
	$: if ($resetMatterFlag) {
		reinitMatterJs();
		resetMatterFlag.update((flag) => (flag = false)); // Reset the flag
	}

	// Reinitialize Matter.js whenever the scale changes
	$: if (scale) {
		reinitMatterJs();
	}

	function updateScale(innerWidth: number) {
		if (innerWidth <= 400) {
			scale = 0.8;
		} else if (innerWidth <= 540) {
			scale = 1;
		} else if (innerWidth <= 1024) {
			scale = 1.2;
		} else if (innerWidth <= 1440) {
			scale = 1;
		} else if (innerWidth <= 1680) {
			scale = 1.1;
		} else if (innerWidth <= 1920) {
			scale = 1.25;
		} else {
			scale = 1.4;
		}
	}

	// Initialize Matter.js when the component mounts
	onMount(() => {
		// Get window dimensions
		innerWidth = window.innerWidth;
		updateScale(innerWidth);

		// Update scale on resize
		window.addEventListener('resize', () => {
			innerWidth = window.innerWidth;
			updateScale(innerWidth);
		});

		if (matterContainer) {
			matterInstance = initMatterJS(
				matterContainer,
				{ width: 450, height: 680 },
				scale,
				(data.scene = data.scene ? data.scene : null),
			);
			matterInstanceStore.set(matterInstance); // Set the store with the Matter instance
		}
	});

	// Clean up Matter.js when the component is destroyed
	onDestroy(() => {
		cleanupMatterInstance();
	});
</script>

<section class="w-full flex justify-center">
	<div id="matterContainer" bind:this={matterContainer}></div>
</section>

<style>
</style>
