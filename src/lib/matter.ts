import Matter from 'matter-js';
import type { Action, InitialBody, MatterInstance, MatterOptions, VariableType } from './types';
import { colors } from './utils/colors';
import { consoleOutput } from './utils/consoleActions';
import type { Log } from './types';
import { writable } from 'svelte/store';
// Create aliases to avoid "Matter." prefixes
const { Body, Constraint, Engine, Render, World, Bodies, Runner, Sleeping } = Matter;

let engine: Matter.Engine | null = null;

let userBodies: InitialBody[] = [];
// Make a writable store to keep track of any bodies in a scene
export const sceneBodiesStore = writable<InitialBody[]>([]);
// Make a writable store to keep track of any composites in a scene
export const sceneCompositesStore = writable<any[]>([]);
// Make a writable store to keep track of the scene string
export const sceneStringStore = writable<string>('');

let _scale: number = 1;
// Helper function to apply scale to a pixel value
const s = (value: number) => Math.round(value * _scale);

export function initMatterJS(
	container: HTMLElement,
	options: MatterOptions,
	scale: number,
	scene?: string,
): MatterInstance | null {
	// Remove unnecessary decimal points by rounding
	_scale = scale;

	// First, check if there is any existing eninge
	if (engine) {
		Matter.World.clear(engine.world, false); // Clear existing bodies, 'false' removes static bodies as well as dynamic
		Matter.Engine.clear(engine); // Clear the engine itself
	}

	engine = Engine.create();

	engine.positionIterations = 25;
	engine.velocityIterations = 25;

	const render = Render.create({
		element: container,
		engine: engine,
		options: {
			width: s(options.width),
			height: s(options.height),
			wireframes: false,
			background: 'rgb(18 19 26)', // Adjust background color
		},
	});

	// Create static walls
	World.add(engine.world, [
		// ceiling
		Bodies.rectangle(s(225), s(-100), s(450), s(5), {
			isStatic: true,
		}),
		// floor
		Bodies.rectangle(s(225), s(700), s(450), s(50), {
			isStatic: true,
		}),
		// left wall
		Bodies.rectangle(s(-20), s(350), s(50), s(900), {
			isStatic: true,
		}),
		// right wall
		Bodies.rectangle(s(470), s(350), s(50), s(900), {
			isStatic: true,
		}),
	]);

	// Create a runner
	const runner = Runner.create();

	// Run the renderer
	Render.run(render);

	// If there is no scene data empty both stores
	if (!scene) {
		// Reset each store: sceneBodiesStore, sceneCompositesStore and sceneStringStore
		sceneBodiesStore.set([]);
		sceneCompositesStore.set([]);
		sceneStringStore.set('');
	}

	// If there is scene data...
	if (scene) {
		sceneStringStore.set(scene);
		handleScene(scene, { engine, runner });
	}

	// Return the engine and runner so we can control them externally
	return { engine, runner };
}

// Create specific scene
const catapultScene = (matterInstance: MatterInstance) => {
	const { engine } = matterInstance;
	const group = Body.nextGroup(true); // Negative group for no collision within the group, for catapult and pivot

	const catapult = Bodies.rectangle(s(225), s(610), s(250), s(20), {
		render: { fillStyle: 'rgb(18 19 26)', strokeStyle: 'rgb(255, 255, 255)', lineWidth: 2 },
		collisionFilter: { group: group },
	});

	const pivot = Bodies.rectangle(s(225), s(635), s(20), s(80), {
		isStatic: true,
		render: { fillStyle: 'rgb(18 19 26)', strokeStyle: 'rgb(255, 255, 255)', lineWidth: 2 },
		collisionFilter: { group: group },
	});

	const stand = Bodies.rectangle(s(325), s(648), s(10), s(54), {
		isStatic: true,
		render: { fillStyle: 'rgb(18 19 26)', strokeStyle: 'rgb(255, 255, 255)', lineWidth: 2 },
	});

	const projectile = Bodies.circle(s(325), s(580), s(20), {
		isStatic: false,
		restitution: 0.75,
		friction: 0.1,
		density: 0.0001,
		render: { fillStyle: 'rgb(18 19 26)', strokeStyle: 'rgb(255, 255, 255)', lineWidth: 2 },
	});

	World.add(engine.world, [
		pivot,
		stand,
		projectile,
		catapult,
		Constraint.create({
			bodyA: catapult,
			pointB: { x: s(225), y: s(610) },
			stiffness: 1,
			length: 0,
		}),
	]);

	sceneBodiesStore.set([
		{ body: stand, initialPosition: { x: stand.position.x, y: stand.position.y } },
		{ body: pivot, initialPosition: { x: pivot.position.x, y: pivot.position.y } },
		{ body: projectile, initialPosition: { x: projectile.position.x, y: projectile.position.y } },
		{ body: catapult, initialPosition: { x: catapult.position.x, y: catapult.position.y } },
	]);
};

const pyramidScene = (matterInstance: MatterInstance) => {
	const { engine } = matterInstance;
	// Create a pyramid of bodies
	const stack = Matter.Composites.pyramid(s(75), s(515), 15, 15, 0, 0, (x: number, y: number) => {
		return Bodies.rectangle(x, y, s(20), s(20), {
			isStatic: false,
			restitution: 0.95,
			friction: 0.01,
			density: 0.001,
			render: { fillStyle: 'rgb(18 19 26)', strokeStyle: 'rgb(255, 255, 255)', lineWidth: 2 },
		});
	});
	World.add(engine.world, stack);
	sceneCompositesStore.set([stack]);
};

const stackScene = (matterInstance: MatterInstance) => {
	const { engine } = matterInstance;

	const stack = Matter.Composites.stack(
		s(335),
		s(375),
		1,
		10,
		0,
		0,
		function (x: number, y: number) {
			return Bodies.rectangle(x, y, s(30), s(30), {
				isStatic: false,
				restitution: 0.001, // Less bouncy
				friction: 1.25, // More resistance to sliding
				density: 0.05,
				render: { fillStyle: 'rgb(18 19 26)', strokeStyle: 'rgb(255, 255, 255)', lineWidth: 2 },
				//sleepThreshold: 60, // Adjust sleep threshold
			});
		},
	);

	World.add(engine.world, stack);
	sceneCompositesStore.set([stack]);
};

const handleScene = (scene: string, matterInstance: MatterInstance) => {
	// Remove all constraints from the world
	const constraints = Matter.Composite.allConstraints(matterInstance.engine.world);
	constraints.forEach((constraint) => {
		World.remove(matterInstance.engine.world, constraint);
	});

	// Remove any scene bodies or composites
	let sceneBodies: InitialBody[] = [];
	sceneBodiesStore.subscribe((value) => (sceneBodies = value));
	// If there already are any scene bodies, remove them
	if (sceneBodies.length > 0) {
		//Loop through scene bodies and remove them from the world
		sceneBodies.forEach((body) => {
			World.remove(matterInstance.engine.world, body.body, true);
		});
	}
	let sceneComposites: any[] = [];
	sceneCompositesStore.subscribe((value) => (sceneComposites = value));
	if (sceneComposites.length > 0) {
		sceneComposites.forEach((composite) => {
			World.remove(matterInstance.engine.world, composite, true);
		});
	}

	//Recreate the scene
	switch (scene) {
		case 'catapult':
			catapultScene(matterInstance);
			break;
		case 'pyramid':
			pyramidScene(matterInstance);
			break;
		case 'stack':
			stackScene(matterInstance);
			break;
		default:
			console.warn(`Unknown scene: ${scene}`);
			break;
	}
};

export function startMatter(runner: Matter.Runner, engine: Matter.Engine) {
	Runner.run(runner, engine);
}

export function stopMatter(runner: Matter.Runner) {
	Runner.stop(runner);
	// Remove all user-created bodies, so that next time the simulation starts fresh
	userBodies = [];
}

// Reset all dynamic bodies to their initial positions
export function resetBodies(matter: MatterInstance) {
	// Remove all dynamic bodies from the world
	const dynamicBodies = Matter.Composite.allBodies(matter.engine.world).filter(
		(body) => !body.isStatic,
	);
	dynamicBodies.forEach((body) => {
		World.remove(matter.engine.world, body);
	});

	// Add user-created bodies to the world
	userBodies.forEach((userBody) => {
		const { body, initialPosition } = userBody;
		Matter.Body.setPosition(body, initialPosition); // Reset to initial position
		Matter.Body.setVelocity(body, { x: 0, y: 0 }); // Reset velocity
		World.add(matter.engine.world, body); // Add back to the world
	});

	// save sceneStringStore value to const scene
	let scene: string;
	sceneStringStore.subscribe((value) => {
		scene = value;
		// If there is scene data...
		if (scene) {
			handleScene(scene, matter);
		}
	});
}

const checkColor = (value: string) => {
	// Remove all spaces, if any, from variable.value
	let color: string = value.replace(/\s/g, '');
	// Check if the variable value is a valid color
	try {
		if (!colors[color]) {
			throw new Error(`Huh? Unrecognized color value: ${color}`);
		}
	} catch (error: any) {
		// Capture and log error to the Console component
		// Create a new log block with the error message
		const errorBlock: Log = {
			id: Date.now(),
			blockType: 'log',
			message: `Error: ${error.message}`,
			selectedId: null,
			selectedIndex: 0,
			selectedKey: null,
			useIndex: false,
			useKey: false,
			selectedType: 'string',
		};
		consoleOutput.update((output) => [...output, errorBlock]);
	}
	return (color = color.replace(/\s/g, ''));
};

// Define the handler function for various instructions
export function handleInstruction(
	matterInstance: MatterInstance,
	instruction: Action,
	snapshot: Record<string, any>[],
) {
	const variable = snapshot.find((item: any) => item.id === instruction.variableId) as VariableType;
	let horizontalOffset = 0;
	switch (instruction.action) {
		case 'create circle':
			let circleFill = variable.value as string;
			circleFill = checkColor(circleFill);
			// Use random horizontal offset for each triangle between -5 and 5
			horizontalOffset = Math.random() * 10 - 5;
			if (typeof circleFill === 'string') {
				const circle = Bodies.circle(s(100 + horizontalOffset), s(0), s(30), {
					isStatic: false,
					restitution: 0.95,
					friction: 0,
					density: 0.01,
					render: { fillStyle: circleFill },
				});
				World.add(matterInstance.engine.world, circle);
				userBodies = [
					...userBodies,
					{
						body: circle,
						initialPosition: { x: circle.position.x, y: circle.position.y },
					},
				];
			}
			break;
		case 'create square':
			let squareFill = variable.value as string;
			squareFill = checkColor(squareFill);
			if (typeof squareFill === 'string') {
				const square = Bodies.rectangle(s(225), s(0), s(60), s(60), {
					isStatic: false,
					restitution: 0.95,
					friction: 0.25,
					density: 0.01,
					render: { fillStyle: squareFill },
				});
				World.add(matterInstance.engine.world, square);
				userBodies = [
					...userBodies,
					{
						body: square,
						initialPosition: { x: square.position.x, y: square.position.y },
					},
				];
			}
			break;
		case 'create triangle':
			let triangleFill = variable.value as string;
			triangleFill = checkColor(triangleFill);
			// Use random horizontal offset for each triangle between -5 and 5
			horizontalOffset = Math.random() * 10 - 5;

			if (typeof triangleFill === 'string') {
				const triangle = Bodies.polygon(s(350 + horizontalOffset), s(0), 3, s(40), {
					isStatic: false,
					restitution: 0.75,
					friction: 0.5,
					density: 0.01,
					render: { fillStyle: triangleFill },
				});

				// Rotate the triangle by 90 degrees (π/2 radians) to align its flat side with the floor
				Matter.Body.setAngle(triangle, Math.PI / 2);

				World.add(matterInstance.engine.world, triangle);
				userBodies = [
					...userBodies,
					{
						body: triangle,
						initialPosition: { x: triangle.position.x, y: triangle.position.y },
					},
				];
			}
			break;
		case 'create circles':
			try {
				// Check if the items in the array are strings
				if (variable.itemType !== 'string') {
					throw new Error(
						`Expected an array of strings, but got an array of ${variable.itemType}s`,
					);
				}

				// If no error, proceed with the rest of the logic
				const circleFills = variable.value as string[];

				circleFills.forEach((fill, i) => {
					let circleFill = checkColor(fill);

					if (typeof fill === 'string') {
						const xPosition = s(50 + i * 87);

						// Adjusted random values for density and air resistance
						const randomDensity = Math.random() * 0.003 + 0.002; // Min density: 0.002, Max density: 0.005
						const randomFrictionAir = Math.random() * 0.02 + 0.005; // Min frictionAir: 0.005, Max frictionAir: 0.025

						// Create the circle with adjusted properties
						const circle = Bodies.circle(xPosition, s(0), s(30), {
							isStatic: false,
							restitution: 0.95,
							friction: 0,
							density: randomDensity, // Adjusted density range
							frictionAir: randomFrictionAir, // Adjusted air resistance range
							render: { fillStyle: circleFill },
						});

						World.add(matterInstance.engine.world, circle);

						userBodies = [
							...userBodies,
							{
								body: circle,
								initialPosition: { x: circle.position.x, y: circle.position.y },
							},
						];
					}
				});
			} catch (error: any) {
				// Capture and log error to the Console component
				const errorBlock: Log = {
					id: Date.now(),
					blockType: 'log',
					message: `Error: ${error.message}`,
					selectedId: null,
					selectedIndex: 0,
					selectedKey: null,
					useIndex: false,
					useKey: false,
					selectedType: 'string',
				};
				consoleOutput.update((output) => [...output, errorBlock]);

				// Break out of the case upon error
				break;
			}
			break; // Break at the end of the case when no errors occur

		default:
			console.warn(`Unknown instruction type: ${instruction.action}`);
			break;
	}
}
