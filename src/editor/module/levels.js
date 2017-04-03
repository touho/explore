import { el, list, mount } from 'redom';
import Module from './module';
import { game } from '../../core/game';
import { editor } from '../editor';
import Level from '../../core/level';
import { Button } from '../views/popup/popup';
import { dispatch, listen } from '../events';

export function createNewLevel() {
	let lvl = new Level();
	lvl.initWithPropertyValues({
		name: 'New level'
	});
	editor.game.addChild(lvl);
	editor.setLevel(lvl);
	
	return lvl;
}

class Levels extends Module {
	constructor() {
		super(
			this.content = el('div',
				this.buttons = list('div.levelSelectorButtons', LevelItem),
				'Create: ',
				this.createButton = new Button
			)
		);
		this.name = 'Levels';
		this.id = 'levels';

		this.createButton.update({
			text: 'New level',
			icon: 'fa-area-chart',
			callback: () => {
				setChangeOrigin(this);
				let lvl = createNewLevel();
				editor.select(lvl, this);

				setTimeout(() => {
					Module.activateModule('level', true, 'focusOnProperty', 'name');
				}, 100);
			}
		});

		listen(this.el, 'selectLevel', level => {
			editor.setLevel(level);
			editor.select(level, this);
		});
/*
		listen(this.el, 'deleteLevel', level => {
			if (level.isEmpty() || confirm('Are you sure you want to delete level: ' + level.name)) {
				setChangeOrigin(this);
				level.delete();
			}
		});
		*/
	}
	update() {
		this.buttons.update(game.getChildren('lvl'));
	}
}

Module.register(Levels, 'left');

class LevelItem {
	constructor() {
		this.el = el('div.levelItem',
			this.number = el('span'),
			this.selectButton = new Button
			//,this.deleteButton = new Button
		)
	}
	selectClicked() {
		dispatch(this, 'selectLevel', this.level);
	}
	/*
	deleteClicked() {
		dispatch(this, 'deleteLevel', this.level);
	}
	*/
	update(level, idx) {
		this.level = level;
		this.number.textContent = (idx+1) + '.';
		this.selectButton.update({
			text: level.name,
			icon: 'fa-area-chart',
			callback: () => this.selectClicked()
		});
		/*
		this.deleteButton.update({
			text: 'Delete',
			class: 'dangerButton',
			icon: 'fa-cross',
			callback: () => this.deleteClicked()
		});
		*/
	}
}
