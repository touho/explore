import { Component, Prop } from '../core/component';
import { key, keyPressed, listenKeyDown } from '../util/input';
import assert from '../util/assert'
import Vector from '../util/vector';
import { getWorld, default as p2 } from '../feature/physics';

Component.register({
	name: 'CharacterController',
	category: 'Core',
	properties: [
		Prop('type', 'player', Prop.enum, Prop.enum.values('player', 'AI')),
		Prop('keyboardControls', 'arrows or WASD', Prop.enum, Prop.enum.values('arrows', 'WASD', 'arrows or WASD')),
		Prop('controlType', 'jumper', Prop.enum, Prop.enum.values('jumper', 'top down'/*, 'space ship'*/)),
		Prop('jumpSpeed', 30, Prop.float, Prop.float.range(0, 1000), Prop.visibleIf('controlType', 'jumper')),
		Prop('speed', 500, Prop.float, Prop.float.range(0, 1000)),
		Prop('acceleration', 500, Prop.float, Prop.float.range(0, 1000)),
		Prop('breaking', 500, Prop.float, Prop.float.range(0, 1000))
	],
	prototype: {
		init() {
			this.Physics = this.entity.getComponent('Physics');

			this.keyListener = listenKeyDown(keyCode => {
				if (this.controlType !== 'jumper' || !this.scene.playing)
					return;
				
				if (this.keyboardControls === 'arrows') {
					if (keyCode === key.up)
						this.jump();
				} else if (this.keyboardControls === 'WASD') {
					if (keyCode === key.w)
						this.jump();
				} else if (this.keyboardControls === 'arrows or WASD') {
					if (keyCode === key.up || keyCode === key.w)
						this.jump();
				} else {
					assert(false, 'Invalid CharacterController.keyboardControls');
				}
			});
		},
		sleep() {
			if (this.keyListener) {
				this.keyListener();
				this.keyListener = null;
			}
		},
		getInput() {
			if (this.keyboardControls === 'arrows') {
				return {
					up: keyPressed(key.up),
					down: keyPressed(key.down),
					left: keyPressed(key.left),
					right: keyPressed(key.right)
				};
			} else if (this.keyboardControls === 'WASD') {
				return {
					up: keyPressed(key.w),
					down: keyPressed(key.s),
					left: keyPressed(key.a),
					right: keyPressed(key.d)
				};
			} else if (this.keyboardControls === 'arrows or WASD') {
				return {
					up: keyPressed(key.up) || keyPressed(key.w),
					down: keyPressed(key.down) || keyPressed(key.s),
					left: keyPressed(key.left) || keyPressed(key.a),
					right: keyPressed(key.right) || keyPressed(key.d)
				};
			} else {
				assert(false, 'Invalid CharacterController.keyboardControls');
			}
		},
		onUpdate(dt, t) {
			let { up, down, left, right } = this.getInput();
			
			let dx = 0,
				dy = 0;
			
			if (right) dx++;
			if (left) dx--;
			if (up) dy--;
			if (down) dy++;
			
			if (this.controlType === 'top down') {
				this.moveTopDown(dx, dy, dt);
			} else if (this.controlType === 'jumper') {
				this.moveJumper(dx, dy, dt);
			}
		},
		// dx and dy between [-1, 1]
		moveTopDown(dx, dy, dt) {
			if (!this.Physics) {
				if (dx !== 0 || dy !== 0) {
					let Transform = this.Transform;
					let p = Transform.position;
					let delta = this.speed * dt;
					Transform.position = new Vector(p.x + dx * delta, p.y + dy * delta);
				}
				return;
			}

			if (!this.Physics.body)
				return;
			
			// Physics based
			// #############

			let bodyVelocity = this.Physics.body.velocity;

			bodyVelocity[0] = absLimit(this.calculateNewVelocity(bodyVelocity[0], dx, dt), this.speed);
			bodyVelocity[1] = absLimit(this.calculateNewVelocity(bodyVelocity[1], dy, dt), this.speed);
			return;
		},
		moveJumper(dx, dy, dt) {
			if (!this.Physics || !this.Physics.body)
				return false;
			
			let bodyVelocity = this.Physics.body.velocity;

			bodyVelocity[0] = this.calculateNewVelocity(bodyVelocity[0], dx, dt);
		},
		jump() {
			if (this.checkIfCanJump()) {
				let bodyVelocity = this.Physics.body.velocity;
				if (bodyVelocity[1] > 0) {
					// going down
					bodyVelocity[1] = -this.jumpSpeed;
				} else {
					// going up
					bodyVelocity[1] = bodyVelocity[1] - this.jumpSpeed;
				}
			}
		},
		checkIfCanJump() {
			if (!this.Physics || this.controlType !== 'jumper')
				return false;
			
			let contactEquations = getWorld(this.scene).narrowphase.contactEquations;
			let body = this.Physics.body;
			
			if (body.sleepState === p2.Body.SLEEPING)
				return true;
			
			for (let i = contactEquations.length - 1; i >= 0; --i) {
				let contact = contactEquations[i];
				if (contact.bodyA === body || contact.bodyB === body) {
					let normalY = contact.normalA[1];
					if (contact.bodyB === body)
						normalY *= -1;
					if (normalY > 0.5)
						return true;
				}
			}
			
			return false;
		},
		calculateNewVelocity(velocity, input, dt) {
			if (input !== 0) {
				if (velocity >= this.speed && input > 0) {
					// don't do anything
				} else if (velocity <= -this.speed && input < 0) {
					// don't do anything
				} else {
					// do something
					velocity += input * this.acceleration * dt;

					if (input < 0 && velocity < -this.speed)
						velocity = -this.speed;

					if (input > 0 && velocity > this.speed)
						velocity = this.speed;
				}
			} else {
				if (velocity !== 0 && (this.checkIfCanJump() || this.controlType !== 'jumper')) {
					let absVel = Math.abs(velocity);
					absVel -= this.breaking * dt;
					if (absVel < 0)
						absVel = 0;

					if (velocity > 0)
						velocity = absVel;
					else
						velocity = -absVel;
				}
			}
			
			return velocity;
		}
	}
});

function absLimit(value, absMax) {
	if (value > absMax)
		return absMax;
	else if (value < -absMax)
		return -absMax;
	else
		return value;
}