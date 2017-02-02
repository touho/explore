import { el, list, mount } from 'redom';


// <dataTypeName>: createFunction(container, oninput, onchange) -> setValueFunction
export default editors = {};

editors.default = editors.string = (container, oninput, onchange) => {
	let input = el('input', {
		oninput: () => oninput(input.value),
		onchange: () => onchange(input.value)
	});
	mount(container, input);

	return val => input.value = val;
};

editors.float = editors.int = (container, oninput, onchange) => {
	let input = el('input', {
		type: 'number',
		oninput: () => oninput(+input.value),
		onchange: () => onchange(+input.value)
	});
	mount(container, input);
	return val => input.value = +(+val).toFixed(4);
};

editors.bool = (container, oninput, onchange) => {
	let input = el('input', {
		type: 'checkbox',
		onchange: () => {
			onchange(input.checked);
			label.textContent = input.checked ? 'Yes' : 'No';
		}
	});
	let label = el('span');
	mount(container, el('label', input, label));
	return val => {
		input.checked = val;
		label.textContent = val ? 'Yes' : 'No';
	}
};

editors.vector = (container, oninput, onchange) => {
	function getValue() {
		return new Victor(+xInput.value, +yInput.value);
	}
	let xInput = el('input.xInput', {
		type: 'number',
		oninput: () => oninput(getValue()),
		onchange: () => onchange(getValue())
	});
	let yInput = el('input', {
		type: 'number',
		oninput: () => oninput(getValue()),
		onchange: () => onchange(getValue())
	});
	mount(container, el('div', el('span', 'x:'), xInput, el('span', 'y:'), yInput));
	return val => {
		xInput.value = +val.x.toFixed(4);
		yInput.value = +val.y.toFixed(4);
	};
};

editors.enum = (container, oninput, onchange, propertyType) => {
	let select = el('select', ...propertyType.validator.parameters.map(p => el('option', p)));
	select.onchange = () => {
		onchange(select.value);
	};
	mount(container, select);
	return val => {
		select.value = val;
	}
};
