import assert from './assert'

function isColor(color) {

}

export class Color {
	r: number;
	g: number;
	b: number;
	constructor(r: number | Color | string, g?: number, b?: number) {
		if (r instanceof Color) {
			this.r = r.r;
			this.g = r.g;
			this.b = r.b;
		} else if (typeof r === 'number') {
			this.r = Math.round(r);
			this.g = Math.round(g);
			this.b = Math.round(b);
		} else if (typeof r === 'string') {
			let rgb = hexToRgb(r);
			this.r = rgb.r;
			this.g = rgb.g;
			this.b = rgb.b;
		} else {
			assert(false, 'Invalid Color parameters');
		}
	}
	toHexString() {
		return rgbToHex(this.r, this.g, this.b);
	}
	toHexNumber() {
		return this.r * 256 * 256 + this.g * 256 + this.b;
	}
	toString() {
		return `[${this.r},${this.g},${this.b}]`;
	}
	/**
	 *
	 * @param color Color to interpolate to
	 * @param t 0 .. 1
	 */
	interpolateLinear(color: Color, t: number) {
		return new Color(
			this.r + (color.r - this.r) * t,
			this.g + (color.g - this.g) * t,
			this.b + (color.b - this.b) * t
		);
	}
	interpolateCubic(color: Color, control1: Color, control2: Color, t: number) {
		let t2 = 1 - t;
		return new Color(
			t2 ** 3 * this.r +
				3 * t2 * t2 * t * control1.r +
				3 * t2 * t * t * control2.r +
				t ** 3 * color.r,
			t2 ** 3 * this.g +
				3 * t2 * t2 * t * control1.g +
				3 * t2 * t * t * control2.g +
				t ** 3 * color.g,
			t2 ** 3 * this.b +
				3 * t2 * t2 * t * control1.b +
				3 * t2 * t * t * control2.b +
				t ** 3 * color.b
		);
	}
	isEqualTo(other: Color) {
		return this.r === other.r && this.g === other.g && this.b === other.b;
	}
	static fromHexString(hexString: string) {
		let rgb = hexToRgb(hexString);
		return new Color(rgb.r, rgb.g, rgb.b);
	}
}

export function hexToRgb(hex) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16)
	} : null;
}

export function componentToHex(c: number) {
	var hex = c.toString(16);
	return hex.length == 1 ? "0" + hex : hex;
}

export function rgbToHex(r: number, g: number, b: number) {
	return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

export function isHexString(hex: string) {
	return hex && hex.match(/^#[0-9a-f]{6}$/i) ? true : false;
}
