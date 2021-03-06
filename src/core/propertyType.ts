import assert from '../util/assert';
import Property from './property';
import { DataTypeContainer } from './dataTypes';
// info about type, validator, validatorParameters, initialValue

export class PropertyType {
	flags: any;
	constructor(
		public name: string,
		public type: DataType,
		public validator,
		public initialValue,
		public description: string,
		flags: Array<any> = [],
		public visibleIf
	) {
		assert(name[0] >= 'a' && name[0] <= 'z', 'Name of a property must start with lower case letter.');
		assert(type && typeof type.name === 'string');
		assert(validator && typeof validator.validate === 'function');

		this.name = name;
		this.type = type;
		this.validator = validator;
		this.initialValue = initialValue;
		this.description = description;
		this.visibleIf = visibleIf;
		this.flags = {};
		flags.forEach(f => this.flags[f.type] = f);
	}
	getFlag(flag: Flag) {
		return this.flags[flag.type];
	}
	createProperty({
		value,
		predefinedId,
		skipSerializableRegistering = false
	}: CreatePropertyParameters = {}) {
		return new Property({
			propertyType: this,
			value,
			predefinedId,
			name: this.name,
			skipSerializableRegistering
		});
	}
}

type CreatePropertyParameters = {
	value?: any;
	predefinedId?: string;
	skipSerializableRegistering?: boolean;
}

export interface PropType extends Function, DataTypeContainer {
	visibleIf?: (propertyName: string, value: any) => any;
}

/*
	Beautiful way of creating property types

	optionalParameters:
		description: 'Example',
		validator: PropertyType.
 */
/**
 *
 * @param propertyName - name of property. name will be converted propertyName -> Property Name in editor.
 * @param defaultValue - initial value of property
 * @param type - Prop.<type>, for example Prop.int, Prop.bool, prop.float
 * @param optionalParameters - "description", validator Prop.float.range(0, 1)
 */
const Prop: PropType = function Prop(propertyName: string, defaultValue: any, type: DataTypeDefinition, ...optionalParameters) {
	let dataType = type();
	let validator = dataType.validators.default();
	let description = '';
	let flags = [];
	let visibleIf = null;
	optionalParameters.forEach((p, idx) => {
		if (typeof p === 'string')
			description = p;
		else if (p && p.validate)
			validator = p;
		else if (p && p.isFlag)
			flags.push(p);
		else if (p && p.visibleIf)
			visibleIf = p;
		else
			assert(false, 'invalid parameter ' + p + ' idx ' + idx);
	});
	return new PropertyType(propertyName, dataType, validator, defaultValue, description, flags, visibleIf);
};

export default Prop;

// if value is string, property must be value
// if value is an array, property must be one of the values
Prop.visibleIf = function (propertyName: string, value: any) {
	assert(typeof propertyName === 'string' && propertyName.length);
	assert(typeof value !== 'undefined');
	return {
		visibleIf: true,
		propertyName,
		values: Array.isArray(value) ? value : [value]
	};
};

type Flag = {
	type: string;
	isFlag: boolean;
};
function createFlag(type: string, func: any = {}): Flag {
	func.isFlag = true;
	func.type = type;
	return func;
}

export interface PropType {
	flagDegreesInEditor?: Flag;
}
Prop.flagDegreesInEditor = createFlag('degreesInEditor');

type DataType = {
	name: string;
	validators?: { [s: string]: Function };
	toJSON?: Function;
	fromJSON?: Function;
	clone?: Function;
	equal?: (a, b) => boolean
};
export type DataTypeDefinition = Function;

export function createDataType({
	name = '',
	validators = { default: x => x }, // default must exist. if value is a reference(object), validator should copy the value.
	toJSON = x => x,
	fromJSON = x => x,
	clone = x => x,
	equal = (a, b) => a === b
}: DataType): DataTypeDefinition {
	assert(name, 'name missing from property type');
	assert(typeof validators.default === 'function', 'default validator missing from property type: ' + name);
	assert(typeof toJSON === 'function', 'invalid toJSON for property type: ' + name);
	assert(typeof fromJSON === 'function', 'invalid fromJSON for property type: ' + name);

	let type: DataType = {
		name,
		validators,
		toJSON,
		fromJSON,
		clone,
		equal
	};
	let createType = () => type;

	Object.keys(validators).forEach(validatorName => {
		createType[validatorName] = createValidator(validatorName, validators[validatorName]);
		validators[validatorName] = createType[validatorName];
	});
	return createType;
}

type Validator = {
	validate?: Function,
	validatorName?: string,
	parameters?: Array<any>
};

function createValidator(name: string, validatorFunction: Function): Validator {
	let validator: any = function (...args): Validator {
		let parameters = args;
		let validatorArgs = [null, ...args];
		return {
			validatorName: name,
			validate: function (x) {
				validatorArgs[0] = x;
				return validatorFunction.apply(null, validatorArgs);
			},
			parameters
		};
	};
	validator.validatorName = name;
	validator.validate = validatorFunction;
	return validator;
}
