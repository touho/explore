import '../core/index'
import '../components'
import { keyPressed, key, listenKeyDown, simulateKeyEvent } from '../util/input'
import { scene, listenSceneCreation } from '../core/scene';
import { listenGameCreation } from '../core/game';
import { configureNetSync } from '../core/net'
import { disableAllChanges } from '../core/property';

import './canvasResize'
import './touchControlManager'


import * as fullscreen from '../util/fullscreen';

disableAllChanges();

configureNetSync({
	serverToClientEnabled: true,
	clientToServerEnabled: false,
	context: 'play'
});

listenGameCreation(game => {
	let levelIndex = 0;

	function play() {
		let levels = game.getChildren('lvl');
		if (levelIndex >= levels.length)
			levelIndex = 0;
		levels[levelIndex].createScene().play();
	}

	play();

	game.listen('levelCompleted', () => {
		levelIndex++;
		play();
	});
});

listenKeyDown(keyValue => {
	if (keyValue === key.space && scene)
		scene.win();
});



// Fullscreen
/*
if (fullscreen.fullscreenSupport()) {
	window.addEventListener('click', () => fullscreen.toggleFullscreen(window.document.body));
}
setTimeout(() => {
	document.getElementById('fullscreenInfo').classList.add('showSlowly');
}, 1000);
setTimeout(() => {
	document.getElementById('fullscreenInfo').classList.remove('showSlowly');
}, 3000);
*/