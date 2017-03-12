import Serializable from './serializable';
import Entity from './entity';
import assert from '../util/assert';
import { game } from './game';
import { addChange, changeType, setChangeOrigin } from './serializableManager';
import { isClient } from '../util/environment';

// import { createWorld, deleteWorld, updateWorld } from '../feature/physicsMatter';
// import { createWorld, deleteWorld, updateWorld } from '../feature/physicsJs';
import { createWorld, deleteWorld, updateWorld } from '../feature/physicsP2';

let scene = null;
export { scene };

const physicsOptions = {
	enableSleeping: true
};

export default class Scene extends Serializable {
	constructor(predefinedId = false) {
		if (isClient) {
			if (scene) {
				try {
					scene.delete();
				} catch (e) {
					console.warn('Deleting old scene failed', e);
				}
			}
			scene = this;
			
			this.canvas = document.querySelector('canvas.anotherCanvas');
			this.context = this.canvas.getContext('2d');
		}
		this.level = null;
		
		// To make component based entity search fast:
		this.components = new Map(); // componentName -> Set of components
		
		this.animationFrameId = null;
		this.playing = false;
		this.time = 0;
		
		super(predefinedId);
		addChange(changeType.addSerializableToTree, this);

		if (predefinedId)
			console.log('scene import');
		else
			console.log('scene created');

		createWorld(this, physicsOptions);
		
		this.draw();
	}
	win() {
		setTimeout(() => {
			setChangeOrigin(this);
			this.reset();
			game.dispatch('levelCompleted');
		})
	}
	animFrame(playCalled) {
		this.animationFrameId = null;
		if (!this._alive || !this.playing) return;
		
		let timeInMilliseconds = performance.now();
		let t = 0.001*timeInMilliseconds;
		let dt = t-this._prevUpdate;
		if (dt > 0.05)
			dt = 0.05;
		this._prevUpdate = t;
		this.time += dt;

		setChangeOrigin(this);
		
		this.dispatch('onUpdate', dt, this.time);
		updateWorld(this, dt, timeInMilliseconds);
		this.draw();
		
		this.requestAnimFrame();
	}
	requestAnimFrame() {
		this.animationFrameId = window.requestAnimationFrame(() => this.animFrame());
	}
	draw() {
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.dispatch('onDraw', this.context);
	}
	isInInitialState() {
		return !this.playing && this.time === 0;
	}
	reset() {
		this.resetting = true;
		this.pause();
		this.deleteChildren();

		deleteWorld(this);
		createWorld(this, physicsOptions);
		
		if (this.level)
			this.level.createScene(this);
		
		this.time = 0;
		this.draw();
		delete this.resetting;
	}
	pause() {
		if (!this.playing) return;
		
		this.playing = false;
		if (this.animationFrameId)
			window.cancelAnimationFrame(this.animationFrameId);
		this.animationFrameId = null;
	}
	play() {
		if (this.playing) return;
		
		this._prevUpdate = 0.001*performance.now();
		this.playing = true;
		
		this.requestAnimFrame();
		
		
		if (this.time === 0)
			this.dispatch('onStart');
		
		/*
		let player = game.findChild('prt', p => p.name === 'Player', true);
		if (player) {
			console.log('Spawning player!', player);
			this.spawn(player);
		}
		*/
	}
	delete() {
		if (!super.delete()) return false;

		deleteWorld(this);
		
		if (scene === this)
			scene = null;
		
		console.log('scene.delete');
		return true;
	}

	// To make component based entity search fast:
	addComponent(component) {
		let set = this.components.get(component.constructor.componentName);
		if (!set) {
			set = new Set();
			this.components.set(component.constructor.componentName, set);
		}
		set.add(component);
	}
	removeComponent(component) {
		let set = this.components.get(component.constructor.componentName);
		assert(set);
		assert(set.delete(component));
	}
	getComponents(componentName) {
		return this.components.get(componentName) || new Set;
	}
}
Scene.prototype.isRoot = true;

Serializable.registerSerializable(Scene, 'sce');
