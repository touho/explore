import { Component, Prop } from '../core/component';
import { key, keyPressed } from '../util/input';

Component.register({
	name: 'Mover',
	properties: [
		Prop('change', new Victor(10, 10), Prop.vector),
		Prop('userControlled', false, Prop.bool),
		Prop('speed', 1, Prop.float),
		Prop('rotationSpeed', 0, Prop.float, 'Degrees per second', Prop.flagDegreesInEditor)
	],
	prototype: {
		onUpdate(dt, t) {
			if (this.userControlled) {
				if (!this.entity.localMaster) return;
				
				let dx = 0;
				let dy = 0;
				
				if (keyPressed(key.left)) dx -= 1;
				if (keyPressed(key.right)) dx += 1;
				if (keyPressed(key.up)) dy -= 1;
				if (keyPressed(key.down)) dy += 1;
				if (dx) this.Transform.position.addScalarX(dx * this.speed * dt);
				if (dy) this.Transform.position.addScalarY(dy * this.speed * dt);
				if (dx || dy) {
					this.Transform.position = this.Transform.position;
				}
				if (dx && this.rotationSpeed) {
					this.Transform.rotation += dt * dx * this.rotationSpeed;
				}
			} else {
				let change = new Victor(dt, 0).rotate(t * this.speed).multiply(this.change);
				this.Transform.position.copy(this.Transform.position).add(change);
				
				if (this.rotationSpeed)
					this.Transform.rotation += dt * this.rotationSpeed;
			}
		}
	}
});
