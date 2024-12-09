<script lang="ts">
	import '../app.postcss';
	import { onMount } from 'svelte';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faFaceSurprise, faUser } from '@fortawesome/free-solid-svg-icons';
	import { user } from '$lib/auth';
	import { supabase } from '$lib/supabaseClient';

	let iconsLoaded = false;

	onMount(() => {
		// Check if fonts are loaded
		document.fonts.ready.then(() => {
			iconsLoaded = true;
		});
	});

	let displayName: string = ''; // Variable to store the display name
	// Update `displayName` based on `user` store's state
	$: {
		if ($user) {
			getDisplayName().then((name) => {
				displayName = name || '';
			});
		}
	}

	const getDisplayName = async () => {
		// Get display name from user
		try {
			const { data, error } = await supabase.auth.getUser();
			if (error) throw error;
			const displayName = data.user.user_metadata.display_name || data.user.email;
			return displayName;
		} catch (error: any) {
			console.error('Error fetching display name:', error.message);
			return null;
		}
	};
</script>

<svelte:head>
	<title>Code Curious</title>
</svelte:head>

<div class="flex flex-col min-h-screen">
	<!-- Header (shared across all pages) -->
	<header class="bg-secondary-800 text-white p-4">
		<div class="mx-0 flex justify-between items-center">
			<div class="lg:w-80 flex justify-start">
				<a href="/" class="hover:text-gray-200 inline-block lg:hidden"
					><h1>
						<h1 class="flex gap-2 items-center">
							<div class="w-5 h-5 flex items-center justify-center">
								{#if iconsLoaded}
									<FontAwesomeIcon icon={faFaceSurprise} />
								{/if}
							</div>
							<span class="sm:hidden">CC</span>
							<span class="hidden sm:inline-block">CODE CURIOUS</span>
						</h1>
					</h1></a
				>
			</div>
			<div>
				<a href="/" class="hover:text-gray-200 hidden lg:inline-block"
					><h1 class="flex gap-2 items-center">
						<div class="w-5 h-5 flex items-center justify-center">
							{#if iconsLoaded}
								<FontAwesomeIcon icon={faFaceSurprise} />
							{/if}
						</div>
						CODE CURIOUS
					</h1></a
				>
			</div>
			<nav class="lg:w-80 flex gap-6 justify-end">
				<a href="/tutorial/welcome" class="hover:text-gray-200">Tutorial</a>
				{#if !$user}
					<a href="/sign-in" class="hover:text-gray-200 flex gap-2 items-center"
						><div class="w-5 h-5 flex items-center justify-center">
							{#if iconsLoaded}
								<FontAwesomeIcon icon={faUser} />
							{/if}
						</div>
						Sign In</a
					>
				{:else}
					<a href="/dashboard" class="hover:text-gray-200 flex gap-2 items-center"
						><div class="w-5 h-5 flex items-center justify-center">
							{#if iconsLoaded}
								<FontAwesomeIcon icon={faUser} />
							{/if}
						</div>
						{displayName !== '' ? displayName : $user.email}</a
					>
				{/if}
			</nav>
		</div>
	</header>

	<!-- Main Layout (shared) -->
	<main class="flex-1 flex flex-col md:flex-row h-full">
		<!-- This is where the content of each page will be injected -->
		<slot></slot>
	</main>
</div>
