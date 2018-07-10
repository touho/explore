import { scene, listenSceneCreation } from '../core/scene';
import debug from './debug'
import events from "../util/events";

let previousWidth = null;
let previousHeight = null;
function resizeCanvas() {
	if (!scene)
		return;

	let screen = document.getElementById('screen');
	
	function setSize(force) {
		if (!screen)
			return;
		
		let width = window.innerWidth;
		let height = window.innerHeight;
		
		if (!force && width === previousWidth && height === previousHeight)
			return;

		screen.style.width = width + 'px';
		screen.style.height = height + 'px';
		
		// Here you can change the resolution of the canvas
		let pixels = width * height;
		let quality = 1;
		if (pixels > MAX_PIXELS) {
			quality = Math.sqrt(MAX_PIXELS / pixels);
		}
		
		scene.renderer.resize(width * quality, height * quality);

		window.scrollTo(0, 0);
		
		previousWidth = width;
		previousHeight = height;
		
		events.dispatch('canvas resize', scene);
	}
	
	setSize(true);
	
	setTimeout(setSize, 50);
	setTimeout(setSize, 400);
	setTimeout(setSize, 1000);
}

window.addEventListener('resize', resizeCanvas);
listenSceneCreation(resizeCanvas);

const MAX_PIXELS = 1000 * 600;