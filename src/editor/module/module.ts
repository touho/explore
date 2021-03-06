import { el, list, mount } from 'redom';
import ModuleContainer from '../layout/moduleContainer';
import { editorEventDispacher } from '../editorEventDispatcher';

let moduleIdToModule: { [moduleId: string]: Module } = {};

export default class Module {
	id: string;
	type: string;
	name: string;

	/**
	 * Wether this module is selected in this module container.
	 */
	_selected: boolean;

	/**
	 * Wether this module can be accessed in this module container.
	 */
	_enabled: boolean;

	el: HTMLElement;
	moduleContainer: ModuleContainer;

	constructor() {
		this.type = 'module';
		this.name = this.name || 'Module';
		this.id = this.id || 'module';
		this.el = el('div.module');
		this._selected = true;
		this._enabled = true;

		// Timeout so that module constructor has time to set this.id after calling super.
		setTimeout(() => {
			moduleIdToModule[this.id] = this;
		});
	}
	addElements(...elements) {
		for (let element of elements) {
			mount(this.el, element);
		}
	}
	// Called when this module is opened. Other modules can call Module.activateModule('Module', ...args);
	activate() {
	}
	// Called when changes happen. return false to hide from ui
	update() {
	}
	_show() {
		this.el.classList.remove('hidden');
		this._selected = true;
		this._enabled = true;
	}
	_hide() {
		this.el.classList.add('hidden');
		this._selected = false;
	}

	/**
	 * Modules must be in same moduleContainer
	 * You might want to first call editor update to first enable the modules you want to activate.
	*/
	static activateModule(moduleId, unpackModuleView = true, ...args) {
		moduleIdToModule[moduleId].moduleContainer.activateModule(moduleIdToModule[moduleId], unpackModuleView, ...args);
	};
	/**
	 * Modules must be in same moduleContainer
	 * You might want to first call editor update to first enable the modules you want to activate.
	*/
	static activateOneOfModules(moduleIds: string[], unpackModuleView = true, ...args) {
		moduleIdToModule[moduleIds[0]].moduleContainer.activateOneOfModules(moduleIds.map(mId => moduleIdToModule[mId]), unpackModuleView, ...args);
	};
	static packModuleContainer(moduleContainerName) {
		document.querySelectorAll(`.moduleContainer.${moduleContainerName}`)[0].classList.add('packed');
	};
	static unpackModuleContainer(moduleContainerName) {
		document.querySelectorAll(`.moduleContainer.${moduleContainerName}`)[0].classList.remove('packed');
	};

	// moduleContainerName = left | middle | right | bottom
	static register(moduleClass, moduleContainerName) {
		registerPromise = registerPromise.then(() => {
			editorEventDispacher.dispatch('registerModule_' + moduleContainerName, moduleClass);
		});
	};
}



let registerPromise: Promise<void> = new Promise(function (resolve) {
	editorEventDispacher.listen('registerModules', function () {
		registerPromise.then(() => {
			editorEventDispacher.dispatch('modulesRegistered');
		});
		resolve();
	});
});
