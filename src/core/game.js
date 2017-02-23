import Serializable from './serializable'
import { addChange, changeType, setChangeOrigin } from './serializableManager';
import Prototype from '../core/prototype'
import assert from '../util/assert'
import PropertyOwner, { Prop } from '../core/propertyOwner';

let propertyTypes = [
	Prop('name', 'No name', Prop.string)
];

let game = null; // only one game at the time
export { game };

let isClient = typeof window !== 'undefined';

export default class Game extends PropertyOwner {
	constructor(predefinedId) {
		if (isClient) {
			if (game) {
				try {
					game.delete();
				} catch (e) {
					console.warn('Deleting old game failed', e);
				}
			}
			game = this;
		}
		
		if (predefinedId)
			console.log('game import');
		else
			console.log('game created');
		
		super(...arguments);
	}
	initWithChildren() {
		super.initWithChildren(...arguments);
		addChange(changeType.addSerializableToTree, this);
	}
	delete() {
		if (!super.delete()) return false;
		
		if (game === this)
			game = null;
		console.log('game.delete');
		
		return true;
	}
}
PropertyOwner.defineProperties(Game, propertyTypes);

Game.prototype.isRoot = true;

Serializable.registerSerializable(Game, 'gam');
