import KvMapLeaflet from '@/components/Kv/KvMapLeaflet';

export default {
	title: 'Kv/KvMapLeaflet',
	component: KvMapLeaflet,
	args: {
		autoZoomDelay: 1000,
		lat: 37.700091,
		long: -123.013243,
		zoomLevel: 4,
		initialZoom: null,
		mapId: 0,
	},
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: { KvMapLeaflet },
	template: '<kv-map-leaflet :auto-zoom-delay="autoZoomDelay" :lat="lat" :long="long" :zoom-level="zoomLevel" :initial-zoom="initialZoom" :map-id="mapId" />',
});

export const Default = Template.bind({});
Default.args = {
	zoomLevel: 14,
	initialZoom: null,
	mapId: 1,
};

export const AutoZoom = Template.bind({});
AutoZoom.args = {
	lat: -0.023559,
	long: 37.906193,
	initialZoom: 1,
	zoomLevel: 4,
	mapId: 2,
}

