import { Component, Prop } from '../../core/component';
import Widget from '../widget/widget';
import AngleWidget from '../widget/angleWidget';
import PositionWidget from '../widget/positionWidget';
import ScaleWidget from '../widget/scaleWidget';

let primaryColor = 'white';
let hoverColor = 'yellow';
let secondaryColor = 'rgb(200, 200, 200)';
let radius = 10;
let smallR = 5;
let widgetDistance = 30;
let squared2 = Math.sqrt(2);
let aabbSize = widgetDistance + smallR;

function createWidget(component, radius) {
	return {
		x: 0,
		y: 0,
		r: radius,
		component
	};
}

function isMouseInPotentialWidgetArea(mousePosition, position) {
	return mousePosition.x > position.x - aabbSize
		&& mousePosition.x < position.x + aabbSize
		&& mousePosition.y > position.y - aabbSize
		&& mousePosition.y < position.y + radius;
}

/*
How mouse interaction works?

Hovering:
- Scene module: find widgetUnderMouse, call widgetUnderMouse.hover() and widgetUnderMouse.unhover()

Selection:
- Scene module: if widgetUnderMouse is clicked, call editorWidget.select() and editorWidget.deselect()

Dragging:
- Scene module: entitiesToEdit.onDrag()

 */


// Export so that other components can have this component as parent
export default Component.register({
	name: 'EditorWidget',
	category: 'Editor', // You can also make up new categories.
	icon: 'fa-bars', // Font Awesome id
	properties: [
		// Prop('selected', false, Prop.bool)
	],
	prototype: {
		selected: false, // this entity is selected in editor -> all widgets are visible
		activeWidget: null, // widget being dragged
		widgets: null, // All 5 widgets are always here
		mouseOnWidget: null, // If mouse is hovering on a visible widget,
		inSelectionArea: false,
		
		// Widgets
		xScale: null,
		yScale: null,
		scale: null,
		angle: null,
		position: null,

		positionHelper: null,
		
		constructor() {
			this.widgets = [
				this.position = new PositionWidget(this),
				this.xScale = new ScaleWidget(this, 1, 0),
				this.yScale = new ScaleWidget(this, 0, 1),
				this.scale = new ScaleWidget(this, 1, 1),
				this.angle = new AngleWidget(this)
			];
		},
		select() {
			if (!this.selected) {
				this.selected = true;
				for (let i = 1; i < this.widgets.length; ++i) {
					this.widgets[i].init();
				}
				for (let i = 0; i < this.widgets.length; ++i) {
					this.widgets[i].updateVisibility();
				}
			}
		},
		deselect() {
			if (this.selected) {
				this.selected = false;
				for (let i = 1; i < this.widgets.length; ++i) {
					this.widgets[i].sleep();
				}
				for (let i = 0; i < this.widgets.length; ++i) {
					this.widgets[i].updateVisibility();
				}
			}
		},
		updateWidgets() {
			for (let i = 0; i < this.widgets.length; ++i) {
				this.widgets[i].updatePosition();
			}
		},
		preInit() {
			/*
			this._addEventListener('onMouseMove');
			this._addEventListener('onMouseDown');
			this._addEventListener('onMouseUp');
			*/
		},
		init() {
			this.listenProperty(this.Transform, 'position', position => {
				this.updateWidgets();
				this.positionHelper.x = position.x;
				this.positionHelper.y = position.y;
			});
			this.listenProperty(this.Transform, 'angle', () => {
				this.updateWidgets();
			});

			
			this.position.init();
			
			this.updateWidgets();
			
			this.positionHelper = new PIXI.Graphics();
			this.positionHelper.beginFill(0xFFFFFF);
			this.positionHelper.drawCircle(0, 0, 2.7);
			this.positionHelper.endFill();
			this.positionHelper.beginFill(0x000000);
			this.positionHelper.drawCircle(0, 0, 1.3);
			this.positionHelper.endFill();
			this.positionHelper.x = this.Transform.position.x;
			this.positionHelper.y = this.Transform.position.y;
			this.scene.positionHelperLayer.addChild(this.positionHelper);

			// let gra = new PIXI.Graphics();
			// // gra.lineStyle(4, 0xFF3300, 1);
			// gra.beginFill(0x66CCFF);
			// gra.drawRect(0, 0, 10, 10);
			// gra.endFill();
			// gra.x = 0;
			// gra.y = 0;
			// this.stage.addChild(gra);
		},
		sleep() {
			this.selected = true;
			this.widgets.forEach(widget => {
				widget.sleep();
			});
		},
		delete() {
			this.widgets.forEach(widget => {
				widget.delete();
			});
			this.widgets.length = 0;
			this.xScale = null;
			this.yScale = null;
			this.scale = null;
			this.angle = null;
			this.position = null;
			
			this.positionHelper.destroy();
			this.positionHelper = null;
		},
		onMouseMove(mousePosition) {
			return;
			let p = this.Transform.position;
			this.mouseOnWidget = null;
			
			if (this.activeWidget) {
				this.activeWidget.onDrag(mousePosition);
				this.updateWidgets();
			} else {
				if (this.selected) {
					if (isMouseInPotentialWidgetArea(mousePosition, p)) {
						this.mouseOnWidget = this.widgets.find(widget => widget.isMouseInWidget(mousePosition));
					}
					this.updateWidgets();
				} else {
					if (this.position.isMouseInWidget(mousePosition))
						this.mouseOnWidget = this.position;
				}
			}
			
		},
		onMouseDown(mousePosition) {
			return;
			if (this.mouseOnWidget) {
				this.select();
				this.activeWidget = this.mouseOnWidget;
			}
		},
		onMouseUp(mousePosition) {
			return;
			if (this.selected) {
				this.updateWidgets();
			}
			this.activeWidget = null;
		},
		onDrawHelper(context) {
			if (!this.selected && !this.mouseOnWidget)
				return;
			
			context.fillStyle = 'black';
			context.strokeStyle = secondaryColor;

			
			
			if (this.selected) {
				for (let i = 0; i < this.widgets.length; ++i) {
					this.widgets[i].draw(context);
				}
			}
			

			if (this.mouseOnWidget) {
				context.strokeStyle = 'white';
				this.mouseOnWidget.draw(context);
			}
		}
	}
});