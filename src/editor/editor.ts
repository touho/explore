import Layout from './layout/layout';

import './module/topBarModule';
import './module/sceneModule';

import './module/typesModule';
import './module/prefabsModule';
import './module/objectsModule';
import './module/levelsModule';

import './module/typeModule';
import './module/prefabModule';
import './module/objectModule';
import './module/levelModule';
import './module/gameModule';

import './module/performanceModule';
import './module/perSecondModule';

import { el, list, mount } from 'redom';
import { default as Game, game } from '../core/game';
import Serializable, { filterChildren } from '../core/serializable';
import {
	changeType, setChangeOrigin
} from '../core/change';
import { serializables } from '../core/serializableManager';
import assert from '../util/assert';
import { configureNetSync } from '../core/net';
import './help';
import './test';
import * as performance from '../util/performance'
import { limit } from '../util/callLimiter';
import OKPopup from "./views/popup/OKPopup";
import Level from '../core/level';
import { GameEvent, globalEventDispatcher } from '../core/eventDispatcher';
import { editorEventDispacher, EditorEvent } from './editorEventDispatcher';
import { editorSelection, selectInEditor, setLevel, selectedLevel } from './editorSelection';
import { listenKeyDown, key } from '../util/input';

let loaded = false;

export let modulesRegisteredPromise = editorEventDispacher.getEventPromise('modulesRegistered');
export let loadedPromise = editorEventDispacher.getEventPromise('loaded');
export let selectedToolName = 'multiTool'; // in top bar

modulesRegisteredPromise.then(() => {
	loaded = true;
	editorEventDispacher.dispatch('loaded');
});

configureNetSync({
	serverToClientEnabled: true,
	clientToServerEnabled: true,
	context: 'edit'
});

loadedPromise.then(() => {
	setLevel(game.getChildren('lvl')[0] as Level);
});

let editorUpdateLimited = limit(200, 'soon', () => {
	editor.update();
});

globalEventDispatcher.listen(GameEvent.GLOBAL_CHANGE_OCCURED, change => {
	performance.start('Editor: General');
	editorEventDispacher.dispatch(EditorEvent.EDITOR_CHANGE, change);
	if (change.reference.threeLetterType === 'gam' && change.type === changeType.addSerializableToTree) {
		let game = change.reference;
		editor = new Editor(game);
		editorEventDispacher.dispatch(EditorEvent.EDITOR_REGISTER_HELP_VARIABLE, 'editor', editor);
		editorEventDispacher.dispatch(EditorEvent.EDITOR_REGISTER_MODULES, editor);
	}
	if (editor) {
		if (change.reference.threeLetterType === 'lvl' && change.type === changeType.deleteSerializable) {
			if (selectedLevel === change.reference) {
				setLevel(null);
			}
		}
		editorUpdateLimited();
	}
	performance.stop('Editor: General');
});

editorEventDispacher.listen(EditorEvent.EDITOR_CHANGE, () => {
	// editor && editor.update();
	editor && editorUpdateLimited();
});

export let editor = null;

class Editor {
	layout: Layout;
	game: Game;

	constructor(game) {
		assert(game);
		this.layout = new Layout();
		this.game = game;
		mount(document.body, this.layout);

		listenKeyDown(k => {
			if (k === key.backspace && editorSelection.items.length > 0) {
				if (['ent', 'epr', 'pfa', 'prt'].includes(editorSelection.type)) {
					editorEventDispacher.dispatch(EditorEvent.EDITOR_PRE_DELETE_SELECTION);
					let serializables = filterChildren(editorSelection.items);
					setChangeOrigin(this);
					serializables.forEach(s => s.delete());
					editorUpdateLimited();
				}
			}
		});
	}

	update() {
		if (!this.game) return;
		this.layout.update();
	}
}

globalEventDispatcher.listen('noEditAccess', () => {
	loadedPromise.then(() => {
		document.body.classList.add('noEditAccess');
		new OKPopup('No edit access',
			`Since you don't have edit access to this game, your changes are not saved. Feel free to play around, though!`
		);
		// alert(`No edit access. Your changes won't be saved.`);
	});

	configureNetSync({
		clientToServerEnabled: false,
		serverToClientEnabled: false
	});
});
