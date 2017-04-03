import { el, list, mount } from 'redom';
import Module from './module';
import PropertyEditor from '../views/propertyEditor';
import { game } from '../../core/game';
import PropertyOwner from '../../core/propertyOwner'

class Game extends Module {
	constructor() {
		super(
			this.propertyEditor = new PropertyEditor(),
			el('div.gameDeleteInfo', 'To delete this game, remove all types and levels. Game will be automatically destroyed after 1h of inactivity.')
		);
		this.id = 'game';
		this.name = 'Game';
	}
	update() {
		if (game)
			this.propertyEditor.update([game], 'gam');
		else
			return false;
	}
	activate(command, parameter) {
		if (command === 'focusOnProperty') {
			this.propertyEditor.el.querySelector(`.property[name='${parameter}'] input`).select();
		}
	}
}

Module.register(Game, 'right');