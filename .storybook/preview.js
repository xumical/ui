import { addParameters } from '@storybook/vue';
import { MINIMAL_VIEWPORTS} from '@storybook/addon-viewport';
import Vue from 'vue';

//load all the svg icon sprites
import '@/assets/iconLoader';

// same styles that are in App.vue
import '../src/assets/scss/app.scss';

// css for storybook overrides like background color
import './storybookStyles.scss';

// import config file for storybook environment
import config from '../config/local';

// provide global application config
Vue.prototype.$appConfig = config.app;

// add custom viewports
const customViewports = {
  largeDesktop: {
    name: 'Large desktop',
    styles: {
      width: '1540px',
      height: '1000px',
    },
  },
};


addParameters({
	options: {
		storySort: (a, b) => { // sort the categories alphabetically.
			return a[1].kind === b[1].kind ? 0 : a[1].id.localeCompare(b[1].id, undefined, { numeric: true });
		},
		showRoots: true,
		enableShortcuts: false,
	},
	docs: {
		inlineStories: true,
	},
	backgrounds: {
		default: 'white',
		values: [
			{
				name: 'white',
				value: '#ffffff'
			},
			{
				name: 'kiva-bg-lightgray',
				value: '#fafafa'
			},
			{
				name: 'black',
				value: '#000000'
			},
		],
	},
	viewport: {
    viewports: {
			...MINIMAL_VIEWPORTS,
			...customViewports,
    },
  },
});

