import Vue from 'vue'

// import plugins
import kivaPlugins from '@/plugins';
Vue.use(kivaPlugins)

import StoryRouter from 'storybook-vue-router';
import IWD2021Homepage from '@/pages/Homepage/iwd/IWD2021Homepage';
import apolloStoryMixin from '../mixins/apollo-story-mixin';

export default {
	title: 'Pages/IWD/2021Homepage',
	component: IWD2021Homepage,
	decorators: [StoryRouter()],
};

export const Default = () => ({
	components: {
		'iwd-2021-homepage': IWD2021Homepage,
	},
	mixins: [apolloStoryMixin()],
	template: `<iwd-2021-homepage />`,
});
