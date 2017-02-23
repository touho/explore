import events from './events';
import Layout from './layout/layout';
import './module/topBar';
import './module/type';
import './module/instance';
import './module/scene';
import './module/types';
import './module/level';
import './module/instances';
import './module/test3';
import { el, list, mount } from 'redom';
import { game } from '../core/game';
import Serializable from '../core/serializable';
import { addChangeListener, serializables, executeExternal, setChangeOrigin, changeType } from '../core/serializableManager';
import assert from '../util/assert';
import { setNetworkEnabled } from '../util/net';
import './help';

let loaded = false;

export let modulesRegisteredPromise = events.getLoadEventPromise('modulesRegistered');
export let loadedPromise = events.getLoadEventPromise('loaded');

modulesRegisteredPromise.then(() => {
	loaded = true;
	events.dispatch('loaded');
	setNetworkEnabled(true);
});

loadedPromise.then(() => {
	editor.setLevel(game.getChildren('lvl')[0]);
});

setInterval(() => {
	editor && editor.dirty && editor.update();
}, 200);

addChangeListener(change => {
	events.dispatch('change', change);
	if (change.type === changeType.addSerializableToTree && change.reference.threeLetterType === 'gam') {
		let game = change.reference;
		editor = new Editor(game);
		events.dispatch('registerModules', editor);
	}
	if (editor) {
		if (change.type === changeType.deleteSerializable && change.reference.threeLetterType === 'lvl') {
			if (editor && editor.selectedLevel === change.reference) {
				editor.setLevel(null);
			}
		}
		editor.dirty = true;
		if (change.type !== 'editorSelection' && loaded && change.reference.getRoot().threeLetterType === 'gam')
			editor.saveNeeded = true;
	}
});

export let editor = null;
class Editor {
	constructor(game) {
		assert(game);
		
		this.layout = new Layout();
		
		this.dirty = true;
		this.game = game;
		this.selectedLevel = null;
		
		this.selection = {
			type: 'none',
			items: [],
			dirty: true
		};

		mount(document.body, this.layout);
	}
	setLevel(level) {
		if (level && level.threeLetterType === 'lvl')
			this.selectedLevel = level;
		else
			this.selectedLevel = null;
		
		this.select([], this);
		events.dispatch('setLevel', this.selectedLevel);
	}
	select(items, origin) {
		if (!Array.isArray(items))
			items = [items];
		this.selection.items = [].concat(items);
		
		let types = Array.from(new Set(items.map(i => i.threeLetterType)));
		if (types.length === 0)
			this.selection.type = 'none';
		else if (types.length === 1)
			this.selection.type = types[0];
		else
			this.selection.type = 'mixed';
		
		this.dirty = true;
		
		events.dispatch('change', {
			type: 'editorSelection',
			reference: this.selection,
			origin
		});
		
		this.update();
	}
	update() {
		if (!this.dirty || !this.game) return;
		this.layout.update();
		
		let logStr = 'update';
		
		if (this.saveNeeded) {
			logStr += ' & save';
			this.save();
		}
		
		this.dirty = false;
		this.saveNeeded = false;
		
		console.log(logStr);
	}
	save() {
		localStorage.anotherGameId = this.game.id;
		// localStorage.anotherGameJSON = JSON.stringify(this.game.toJSON());
	}
}


let options = null;
function loadOptions() {
	if (!options) {
		try {
			options = JSON.parse(localStorage.anotherOptions);
		} catch(e) {
			options = {};
		}
	}
}
export function setOption(id, stringValue) {
	loadOptions();
	options[id] = stringValue;
	try {
		localStorage.anotherOptions = JSON.stringify(options);
	} catch(e) {
	}
}
export function getOption(id) {
	loadOptions();
	return options[id];
}

