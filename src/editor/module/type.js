import { el, list, mount } from 'redom';
import Module from './module';

let propertyTypeToEditorType = {
	'float': 'number',
	'string': 'text'
};

class PropertyModule extends Module {
	constructor() {
		super(
			this.propertyEditor = el('div.propertyEditor', 'hei')
		);
		this.id = 'type';
		this.name = 'Type';
	}
	update() {
		this.componentClasses = this.state.componentClasses; 

		let schema = {
			editors: [
				{
					field: 'yks',
					title: 'YKS',
					type: 'text'
				}
			]
		};

		let data = {};

		let componentArray = Array.from(this.componentClasses.values());
		componentArray.forEach(c => {
			let componentSchema = {
				type: 'group',
				field: c.name,
				title: c.name,
				editors: c._propertyTypes.map(pm => ({
					field: c.name + '.' + pm.name,
					title: pm.name.length > 30 ? (pm.name.substring(0, 28) + '..') : pm.name,
					type: propertyTypeToEditorType[pm.type.name] || 'text'
				}))
			};
			schema.editors.push(componentSchema);

			let componentData = {};
			c._propertyTypes.forEach(pm => {
				componentData[pm.name] = pm.initialValue;
			});
			data[c.name] = componentData;
		});
		
		new PJS($(this.propertyEditor), schema, data);
	}
}

Module.register(PropertyModule, 'right');
