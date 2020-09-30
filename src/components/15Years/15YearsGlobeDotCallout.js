import {
	Callout
} from '@/lib/globekit/globekit.esm';

class DotCallout extends Callout {
	createElement() {
		const div = document.createElement('div');
		div.className = 'callout dot-callout';
		div.dataset.code = this.definition.data.code;
		return div;
	}

	setPosition(position) {
		const nx = position.screen.x - ((this.size.left + this.size.right) / 2);
		const ny = position.screen.y - ((this.size.left + this.size.right) / 2);
		this.element.style.transform = `translate(${nx}px, ${ny}px)`;
		this.element.style.zIndex = Math.round(10000 * position.world.similarityToCameraVector);
		if (position.world.similarityToCameraVector < 0.7) {
			const scale = Math.max((position.world.similarityToCameraVector - 0.4) / 0.3, 0);
			this.element.style.transform += ` scale(${scale}, ${scale})`;
		}
	}
}

export default DotCallout;
