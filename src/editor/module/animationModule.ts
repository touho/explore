import { el, list, mount, RedomComponent, List, text } from 'redom';
import Module from './module';
import Scene, { scene } from '../../core/scene';
import { editorEventDispacher, EditorEvent } from '../editorEventDispatcher';
import { editorSelection, unfocus, selectInEditor } from '../editorSelection';
import EntityPrototype from '../../core/entityPrototype';
import ComponentData from '../../core/componentData';
import Property from '../../core/property';
import { animation } from '../../features/animation/animation';
import { redomDispatch, redomListen } from '../../util/redomEvents';
import { isMouseButtonDown, listenKeyDown, key, keyPressed } from '../../util/input';
import { editorGlobals, SceneMode } from '../editorGlobals';
import { Change, changeType, setChangeOrigin, getChangeOrigin, executeWithOrigin } from '../../core/change';
import Entity from '../../core/entity';
import { Component } from '../../core/component';
import Confirmation from '../views/popup/Confirmation';
import { isMultiSelectModifierPressed } from '../util/sceneEditUtil';
import Prototype from '../../core/prototype';

class AnimationModule extends Module {
	animations: animation.Animation[] = [];
	animationComponentId: string = null;
	editedEntityPrototype: EntityPrototype = null;
	animationData: animation.AnimationData = null;
	animationSelector: AnimationSelector;
	animationTimelineView: AnimationTimelineView;

	selectedAnimation: animation.Animation = null;

	focusedKeyFrameViews: TrackFrameView[] = [];

	recordButton: HTMLButtonElement;
	frameCountEditor: FrameCountEditor;
	frameRateEditor: FrameRateEditor;

	constructor() {
		super();

		this.addElements(
			el('div.animationModule',
				el('div',
					el('button.button', 'Add animation', { onclick: () => this.addAnimation() }),
					this.animationSelector = new AnimationSelector(),
					// el('button.button', 'Add keyframe', { onclick: () => this.addKeyframe() }),
					this.recordButton = <HTMLButtonElement>el('button.button.recordButton', el('i.fas.fa-circle'), 'Record key frames', {
						onclick: () => {
							if (editorGlobals.sceneMode === SceneMode.RECORDING) {
								editorGlobals.sceneMode = SceneMode.NORMAL;
							} else {
								editorGlobals.sceneMode = SceneMode.RECORDING;
							}
						},
						style: {
							display: 'none' // until an animation is selected
						}
					}),
					this.frameCountEditor = new FrameCountEditor(),
					this.frameRateEditor = new FrameRateEditor()
				),
				this.animationTimelineView = new AnimationTimelineView()
			)
		);

		editorEventDispacher.listen(EditorEvent.EDITOR_SCENE_MODE_CHANGED, () => {
			if (editorGlobals.sceneMode === SceneMode.RECORDING) {
				this.recordButton.classList.add('selected');
				selectInEditor([], this);
			} else {
				this.recordButton.classList.remove('selected');
				if (editorGlobals.sceneMode === SceneMode.NORMAL && this.editedEntityPrototype) {
					executeWithOrigin(this, () => {
						this.editedEntityPrototype.previouslyCreatedEntity.resetComponents();
					})
					// selectInEditor([this.editedEntityPrototype], this);
					this.editedEntityPrototype = null;
				}
			}
		});

		this.name = 'Animation';
		this.id = 'animation';

		redomListen(this, 'frameSelected', frameNumber => {
			this.setFrameInEntity();
		});
		redomListen(this, 'animationSelected', animation => {
			this.selectedAnimation = animation;

			this.updateChildren();

			// this.animationTimelineView.update(this.selectedAnimation);
			let component = this.getEntityComponent();
			setChangeOrigin(this);
			component.animator.setAnimation(animation && animation.name); // send falsy if initial pose should be selected
			if (!animation && editorGlobals.sceneMode === SceneMode.PREVIEW) {
				editorGlobals.sceneMode = SceneMode.NORMAL;
			}
			this.animationTimelineView.selectFrame(1);

			this.recordButton.style.display = animation ? 'inline-block' : 'none';

			editorEventDispacher.dispatch(EditorEvent.EDITOR_DRAW_NEEDED)
		});
		redomListen(this, 'frameCountChanged', frameCount => {
			if (!(frameCount > 0 && frameCount <= animation.MAX_FRAME_COUNT)) {
				this.updateChildren();
				return;
			}
			const setFrameCount = () => {
				this.selectedAnimation.frames = frameCount === animation.DEFAULT_FRAME_COUNT ? undefined : frameCount;
				this.updateAnimationData();
			}
			let highestKeyframe = this.selectedAnimation.getHighestKeyFrame();
			if (highestKeyframe > frameCount) {
				new Confirmation(`Are you sure you want to remove keyframes?`, null, setFrameCount, () => this.updateChildren());
			} else {
				setFrameCount();
			}
		});
		redomListen(this, 'frameRateChanged', fps => {
			if (!(fps > 0 && fps <= animation.MAX_FRAME_RATE)) {
				this.updateChildren();
				return;
			}
			this.selectedAnimation.fps = fps === animation.DEFAULT_FRAME_RATE ? undefined : fps;
			this.updateAnimationData();
		});

		editorEventDispacher.listen(EditorEvent.EDITOR_CHANGE, (change: Change) => {
			if (change.type === changeType.move) {
				if (change.reference instanceof Prototype) {
					let movedPrototype = change.reference
					let movedSiblingId = movedPrototype.siblingId
					let path = this.editedEntityPrototype.getPrototypePath(movedPrototype)
					if (path === null) {
						// moved out from animated tree. lets do nothing.
						return
					}
					let animationPrototypeFinder = movedPrototype

					// No need to do any changes if moved prototype is the animated prototype itself
					animationPrototypeFinder = animationPrototypeFinder.getParent() as Prototype

					while (animationPrototypeFinder instanceof Prototype) {
						// TODO: what if you break entityPrototype animated tree when it using PreFab?

						let animationComponentData = animationPrototypeFinder.findChild('cda', (cda: ComponentData) => cda.name === 'Animation') as ComponentData
						if (animationComponentData) {
							let animationData = animationComponentData.getValue('animationData')
							animationData = replaceAnimationDataPrototypePath(animationData, movedSiblingId, path)
							animationComponentData.setValue('animationData', animationData)
						}
						animationPrototypeFinder = animationPrototypeFinder._parent as Prototype
					}
					return
				}
			}
			if (editorGlobals.sceneMode !== SceneMode.RECORDING) {
				if (change.type === 'editorSelection' && this.editedEntityPrototype) {
					let editorSelection = change.reference as any;
					if (editorSelection.items.length === 1 && editorSelection.items[0] === this.editedEntityPrototype) {
						// Do nothing
					} else {
						editorGlobals.sceneMode = SceneMode.NORMAL;
						/*
						if (editorGlobals.sceneMode === SceneMode.PREVIEW) {
							executeWithOrigin(this, () => {
								this.editedEntityPrototype.previouslyCreatedEntity.resetComponents();
							})
							editorGlobals.sceneMode = SceneMode.NORMAL;
						}
						this.editedEntityPrototype = null;
						*/
					}
				}
				return;
			}

			if (change.origin === this) {
				return;
			}

			if (change.reference.threeLetterType !== 'prp')
				return;

			if (change.type === changeType.setPropertyValue) {
				let property = change.reference as Property;

				let component = property.getParent() as Component;
				if (!component || component.threeLetterType !== 'com' || component.componentClass.componentName === 'Animation')
					return;

				let entity = component.getParent() as Entity;
				if (!entity || entity.threeLetterType !== 'ent')
					return;

				let entityPrototype = entity.prototype as EntityPrototype;
				if (!entityPrototype)
					return;

				let isChildOfEdited = !!entityPrototype.findParent('epr', (epr: EntityPrototype) => epr === this.editedEntityPrototype);
				if (!isChildOfEdited)
					return;

				this.saveValue(entityPrototype, component._componentId, property);
			}
		});

		listenKeyDown(keyCode => {
			if (keyCode === key.backspace) {
				if (this._selected && this._enabled && !editorSelection.focused) {
					this.focusedKeyFrameViews.forEach(view => {
						delete view.trackKeyFrames[view.frame]
					});
					this.updateAnimationData();
					unfocus();
				}
			}
		});
		redomListen(this, 'selectKeyFrameView', keyFrameView => {
			if (editorSelection.focused) {
				// If something else is focused, unfocus. But we don't want to unfocus TrackFrameViews which are focused more hackily.
				unfocus();
			}

			let keyFrameList: TrackFrameView[] = Array.isArray(keyFrameView) ? keyFrameView : [keyFrameView];
			keyFrameList = keyFrameList.filter(frameView => frameView.isKeyFrame());
			let allAreSelected = !keyFrameList.find(frameView => !this.focusedKeyFrameViews.includes(frameView));

			if (isMultiSelectModifierPressed()) {
				if (keyFrameList.length > 0) {
					if (allAreSelected) {
						for (let frameView of keyFrameList) {
							let indexOfFrame = this.focusedKeyFrameViews.indexOf(frameView);
							if (indexOfFrame >= 0) {
								this.focusedKeyFrameViews.splice(indexOfFrame, 1);
							}
							frameView.el.classList.remove('selected');
						}
					} else {
						for (let frameView of keyFrameList) {
							if (!this.focusedKeyFrameViews.includes(frameView)) {
								this.focusedKeyFrameViews.push(frameView);
							}
							frameView.el.classList.add('selected');
						}
					}
				}
			} else {
				// unfocus();

				this.animationTimelineView.el.querySelectorAll('td.trackFrame.selected').forEach(frameView => {
					frameView.classList.remove('selected');
				});

				this.focusedKeyFrameViews.length = 0;

				if (keyFrameList.length > 0) {
					this.focusedKeyFrameViews.push(...keyFrameList);
					for (let frameView of keyFrameList) {
						frameView.el.classList.add('selected');
					}
				}
			}
		});
		editorEventDispacher.listen(EditorEvent.EDITOR_UNFOCUS, () => {
			if (this.focusedKeyFrameViews.length > 0) {
				this.animationTimelineView.el.querySelectorAll('td.trackFrame.selected').forEach(frameView => {
					frameView.classList.remove('selected');
				})
				this.focusedKeyFrameViews.length = 0;
			}

			if (editorGlobals.sceneMode !== SceneMode.RECORDING) {
				editorGlobals.sceneMode = SceneMode.NORMAL;
			}
		});
	}
	getEntityComponent() {
		if (scene.playing) {
			return null;
		}
		if (!this.editedEntityPrototype) {
			return null;
		}
		let entity = this.editedEntityPrototype.previouslyCreatedEntity;
		if (entity) {
			return entity.getComponents('Animation').find(comp => comp._componentId === this.animationComponentId);
		}
		return null;
	}
	update() {
		if (editorGlobals.sceneMode === SceneMode.RECORDING && this.editedEntityPrototype && this.editedEntityPrototype._alive) {
			return true;
		}

		if (editorSelection.type === 'epr' && editorSelection.items.length === 1) {
			let entityPrototype = editorSelection.items[0] as EntityPrototype;
			if (entityPrototype.hasComponentData('Animation') && entityPrototype.previouslyCreatedEntity) {
				let inheritedComponentDatas = entityPrototype.getInheritedComponentDatas((cda: ComponentData) => cda.name === 'Animation');
				if (inheritedComponentDatas.length === 1) {
					if (this.editedEntityPrototype !== entityPrototype) {
						let inheritedComponentData = inheritedComponentDatas[0];
						this.updateRaw(inheritedComponentData);
					}
					return true;
				}
				return false;
			}
		}

		/*
		How about Prefab?

		Editing must be done in entities.
		How do I make sure that entityPrototypes haven't overridden stuff?
		Sounds a little troublesome to edit prefab using entities.
		Would be cool if this could be done someday.

		else if (editorSelection.type === 'pfa' && editorSelection.items.length === 1) {
			let prefab = editorSelection.items[0] as Prefab;
			let animationComponentData = entityPrototype.findChild('cda', (cda: ComponentData) => cda.name === 'Animation') as ComponentData;
		} */
		return false;
	}
	activate() {
		let component = this.getEntityComponent();
		if (!component) {
			return;
		}
		component.animator.setAnimation(this.selectedAnimation && this.selectedAnimation.name); // send falsy if initial pose should be selected
		this.setFrameInEntity();
	}

	updateRaw(inheritedComponentData) {
		this.editedEntityPrototype = inheritedComponentData.generatedForPrototype;
		editorGlobals.animationEntityPrototype = inheritedComponentData.generatedForPrototype;
		this.animationComponentId = inheritedComponentData.componentId;
		let animationDataString = inheritedComponentData.properties.find((prop: Property) => prop.name === 'animationData').value;

		this.animationData = animation.parseAnimationData(animationDataString);

		// We are sneaky and store Animation objects in jsonable object.
		this.animationData.animations = this.animationData.animations.map(animation.Animation.create);
		this.animations = this.animationData.animations as animation.Animation[];

		this.updateChildren();
	}

	updateChildren() {
		this.animationSelector.update(this.animations);
		this.selectedAnimation = this.animationSelector.getSelectedAnimation();
		this.animationTimelineView.update(this.selectedAnimation);

		this.frameCountEditor.update(this.selectedAnimation && (this.selectedAnimation.frames || animation.DEFAULT_FRAME_COUNT));
		this.frameRateEditor.update(this.selectedAnimation && (this.selectedAnimation.fps || animation.DEFAULT_FRAME_RATE));
	}

	addAnimation() {
		let name = prompt('name', 'idle');
		if (name) {
			let newAnimation = new animation.Animation(name);
			this.animations.push(newAnimation);
			this.updateAnimationData();
			this.updateChildren();
			this.animationSelector.select(name);
		}
	}

	updateAnimationData() {
		let componentData = this.editedEntityPrototype.getOwnComponentDataOrInherit(this.animationComponentId);

		// Delete empty tracks:
		for (let anim of this.animations) {
			anim.deleteEmptyTracks();
			anim.deleteOutOfBoundsKeyFrames();
		}

		setChangeOrigin(this);
		componentData.setValue('animationData', JSON.stringify(this.animationData));
		this.animationTimelineView.update(this.selectedAnimation);

		// Reload entity Animator:
		let component = this.getEntityComponent();
		if (component) {
			component.animationData = componentData.getValue('animationData');
		}
	}

	saveValue(entityPrototype: EntityPrototype, componendId: string, property: Property) {
		let path = this.editedEntityPrototype.getPrototypePath(entityPrototype)
		// If this is the first keyframe, make sure there is a keyframe on frame 1.
		if (this.animationTimelineView.selectedFrame !== 1) {
			let keyFrames = this.selectedAnimation.getKeyFrames(entityPrototype.id, componendId, property.name);
			if (!keyFrames || Object.keys(keyFrames).length === 0) {
				let frame1Value = entityPrototype.getValue(componendId, property.name);
				this.selectedAnimation.saveValue(path, componendId, property.name, 1, property.propertyType.type.toJSON(frame1Value));
			}
		}

		this.selectedAnimation.saveValue(path, componendId, property.name, this.animationTimelineView.selectedFrame, property.propertyType.type.toJSON(property._value));
		this.updateAnimationData();
	}

	setFrameInEntity() {
		if (scene.playing) {
			return;
		}
		let component = this.getEntityComponent();
		if (component) {
			if (component.animator.currentAnimation) {
				if (editorGlobals.sceneMode !== SceneMode.RECORDING) {
					editorGlobals.sceneMode = SceneMode.PREVIEW;
				}

				setChangeOrigin(this);
				component.animator.currentAnimation.setFrame(this.animationTimelineView.selectedFrame);

				editorEventDispacher.dispatch(EditorEvent.EDITOR_DRAW_NEEDED)
			}
		}
	}

	free() {

	}
}
Module.register(AnimationModule, 'bottom');

class AnimationSelector implements RedomComponent {
	el: HTMLSelectElement;
	list: List;
	animations: animation.Animation[];
	constructor() {
		this.el = el('select.animationSelector', {
			onchange: () => redomDispatch(this, 'animationSelected', this.getSelectedAnimation())
		}) as HTMLSelectElement;
		this.list = list(this.el, AnimationSelectorOption, (key => key) as any);
	}
	update(animations: animation.Animation[]) {
		this.animations = animations;
		this.list.update([null, ...animations.map(anim => anim.name)]);
	}
	select(name: string) {
		this.el.value = name || '';
		this.el.onchange(null);
	}
	/**
	 * If this returns null, it means the initial pose the entity is without animations
	 */
	getSelectedAnimation() {
		return this.animations.find(anim => anim.name === this.el.value);
	}
}
class AnimationSelectorOption implements RedomComponent {
	el: HTMLElement;
	constructor() {
		this.el = el('option');
	}
	update(name) {
		this.el.setAttribute('value', name || '');
		this.el.innerText = name || 'Initial pose';
	}
}

class FrameCountEditor implements RedomComponent {
	el: HTMLElement;
	input: HTMLInputElement;
	constructor() {
		this.el = el('div.frameCountEditor',
			'Frames',
			this.input = <HTMLInputElement>el('input.genericInput', {
				style: {
					width: '45px'
				},
				type: 'number',
				min: 1,
				max: animation.MAX_FRAME_COUNT,
				onchange: () => {
					redomDispatch(this, 'frameCountChanged', +this.input.value);
				}
			})
		);
	}
	update(frameCount) {
		this.el.style.display = frameCount ? 'inline-block' : 'none';
		if (frameCount) {
			this.input.value = frameCount;
		}
	}
}

class FrameRateEditor implements RedomComponent {
	el: HTMLElement;
	input: HTMLInputElement;
	constructor() {
		this.el = el('div.frameRateEditor',
			'Fps',
			this.input = <HTMLInputElement>el('input.genericInput', {
				style: {
					width: '45px'
				},
				type: 'number',
				min: 1,
				max: animation.MAX_FRAME_RATE,
				onchange: () => {
					redomDispatch(this, 'frameRateChanged', +this.input.value);
				}
			})
		);
	}
	update(fps) {
		this.el.style.display = fps ? 'inline-block' : 'none';
		if (fps) {
			this.input.value = fps;
		}
	}
}

class AnimationTimelineView implements RedomComponent {
	el: HTMLElement;
	frameNumbers: List;
	trackList: List;
	selectedFrame: number;
	constructor() {
		this.el = el('table.animationTimeline',
			el('thead',
				this.frameNumbers = list('tr', FrameNumberHeader, 'frame')
			),
			this.trackList = list('tbody', TrackView)
		);

		redomListen(this, 'selectAllOnFrame', frame => {
			let views = [];
			this.trackList.views.forEach((trackView: TrackView) => {
				trackView.list.views.forEach((frameView: TrackFrameView) => {
					if (frameView.frame === frame) {
						views.push(frameView);
					}
				})
			});
			redomDispatch(this, 'selectKeyFrameView', views);
		});
		redomListen(this, 'frameSelected', frame => this.selectedFrame = frame);
	}
	update(currentAnimation: animation.Animation) {
		if (!currentAnimation) {
			this.selectedFrame = 0;
			this.frameNumbers.update([]);
			this.trackList.update([]);
			return;
		}

		let frameCount = currentAnimation.frames || animation.DEFAULT_FRAME_COUNT;
		let frameNumbers = [];
		let cellWidth = (80 / frameCount).toFixed(2) + '%';
		for (let frame = 0; frame <= frameCount; frame++) {
			frameNumbers.push({
				frame,
				cellWidth: frame === 0 ? 'auto' : cellWidth
			});
		}

		this.frameNumbers.update(frameNumbers);

		let trackUpdateData = currentAnimation.tracks.map(track => {
			let entityPrototype = editorGlobals.animationEntityPrototype.getPrototypeByPath(track.path) as EntityPrototype;
			let name = (entityPrototype ? entityPrototype.makeUpAName() : '?') + ' ' + track.prpName;
			return {
				name,
				keyFrames: track.keyFrames,
				frameCount
			};
		});

		trackUpdateData.sort((a, b) => a.name.localeCompare(b.name));

		this.trackList.update(trackUpdateData);
	}
	selectFrame(frame) {
		this.selectedFrame = frame;
		let views = (this.frameNumbers as any).views as FrameNumberHeader[];
		for (let view of views) {
			if (view.frameNumber === frame) {
				view.select();
				break;
			}
		}
	}
}
class FrameNumberHeader implements RedomComponent {
	el: HTMLElement;
	frameNumber: number;
	constructor() {
		this.el = el('th.frameHeader', {
			onmousedown: () => this.select(),
			onmouseover: () => isMouseButtonDown() && this.select(),
			ondblclick: () => redomDispatch(this, 'selectAllOnFrame', this.frameNumber)
		});
	}
	update(data) {
		this.el.style.width = data.cellWidth;
		this.frameNumber = data.frame;
		this.el.textContent = data.frame || '';
	}
	select() {
		if (this.frameNumber === 0) return;

		let selectedFrameElement = this.el.parentElement.querySelector('.selected');
		if (selectedFrameElement) {
			selectedFrameElement.classList.remove('selected');
		}
		this.el.classList.add('selected');
		redomDispatch(this, 'frameSelected', this.frameNumber);
	}
}
class TrackView implements RedomComponent {
	el: HTMLElement;
	list: List;
	constructor() {
		this.el = el('tr.track');
		this.list = list(this.el, TrackFrameView)

		redomListen(this, 'selectKeyFramesInTrack', () => {
			let keyFrameViews = this.list.views.filter((view: TrackFrameView) => view.isKeyFrame());
			redomDispatch(this, 'selectKeyFrameView', keyFrameViews);
		});
	}
	update(trackData) {
		let keyFrames = trackData.keyFrames;
		let trackFrameData = [];
		trackFrameData.push({
			frame: 0,
			name: trackData.name,
			keyFrames
		});
		for (let frame = 1; frame <= trackData.frameCount; frame++) {
			let keyFrame = keyFrames[frame];
			trackFrameData.push({
				frame,
				keyFrames,
				keyFrame
			});

		}

		this.list.update(trackFrameData);
	}
}
class TrackFrameView implements RedomComponent {
	el: HTMLElement;
	icon: HTMLElement;
	trackKeyFrames: { [frame: number]: any };
	frame: number;
	constructor() {
		this.el = el('td.trackFrame', {
			onclick: () => {
				if (this.frame === 0) {
					return;
				}
				redomDispatch(this, 'selectKeyFrameView', this);
			},
			ondblclick: () => {
				if (this.frame === 0) {
					redomDispatch(this, 'selectKeyFramesInTrack');
				}
			}
		});
	}
	isKeyFrame() {
		return this.trackKeyFrames[this.frame] != null;
	}
	update(data) {
		this.frame = data.frame;
		this.trackKeyFrames = data.keyFrames;

		this.el.innerHTML = '';
		if (this.frame === 0) {
			this.el.textContent = data.name;
		} else {
			if (this.isKeyFrame()) {
				mount(this, el('i.fas.fa-star'));
			}
		}
	}
}


/*
class AnimationFrameView implements RedomComponent {
	el: HTMLElement;
	frameNumber: number;
	frameNumberText: Text;
	keyFrameContainer: HTMLElement;
	constructor(public parent?: AnimationTimelineView) {
		this.el = el('div.animationFrame',
			this.frameNumberText = text(''),
			this.keyFrameContainer = el('div.keyFrameContainer'),
			{
				onmousedown: () => this.select(),
				onmouseover: () => isMouseButtonDown() && this.select()
			}
		);
	}
	select() {
		let selectedFrameElement = this.el.parentElement.querySelector('.selected');
		if (selectedFrameElement) {
			selectedFrameElement.classList.remove('selected');
		}
		this.el.classList.add('selected');
		redomDispatch(this, 'frameSelected', this.frameNumber);
	}
	update(data) {
		this.frameNumber = data.frame;
		this.frameNumberText.textContent = data.frame;
		if (data.keyFrame) {
			this.keyFrameContainer.textContent = 'KEY';
		} else {
			this.keyFrameContainer.textContent = '';
		}
	}
}
*/

/*
animationData: 'path: "aaaaa/bbbbb/ccccc/ddddd" ...'
siblingId: "ccccc"
newPath: "aaaaa/ccccc"

output: path: "aaaaa/ccccc/ddddd"
*/
function replaceAnimationDataPrototypePath(animationData, siblingId, newPath) {
	return animationData.replace(new RegExp(`"[^"]*${siblingId}`, 'g'), `"${newPath}`)
}
