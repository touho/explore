import Popup, { Button } from './popup';
import { componentClasses } from '../../../core/component';
import ComponentData from '../../../core/componentData';
import { list, el } from 'redom';
import assert from '../../../util/assert';
import { setChangeOrigin } from '../../../core/serializableManager';
import { game } from '../../../core/game'

export default class InstanceMoreButtonContextMenu extends Popup {
	constructor(property) {
		super({
			title: 'Instance Property: ' + property.name,
			width: '500px',
			content: this.buttons = list('div', Button)
		});

		let value = property.value;
		let component = property.getParent();
		let componentId = component._componentId;
		let entityPrototype = component.entity.prototype;
		let prototype = entityPrototype.prototype;
		
		let actions = [
			{
				text: 'Copy value to type ' + prototype.name,
				callback: () => {
					setChangeOrigin(this);
					let componentData = prototype.getOwnComponentDataOrInherit(componentId);
					if (componentData) {
						let newProperty = componentData.getPropertyOrCreate(property.name);
						newProperty.value = property.value;
					} else {
						alert('Error: Component data not found');
					}
					this.remove();
				}
			},
			{
				text: 'Save value for this instance',
				callback: () => {
					setChangeOrigin(this);

					let componentData = entityPrototype.getOwnComponentDataOrInherit(componentId);
					if (componentData) {
						let newProperty = componentData.getPropertyOrCreate(property.name);
						newProperty.value = property.value;
					} else {
						alert('Error: Component data not found');
					}
					this.remove();
				}
			}
		];
		
		this.update(actions);
	}
	update(data) {
		this.buttons.update(data);
	}
}