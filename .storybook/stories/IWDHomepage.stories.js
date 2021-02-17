import Vue from 'vue'

// import plugins
import kivaPlugins from '@/plugins';
Vue.use(kivaPlugins)

import StoryRouter from 'storybook-vue-router';
import IWDHomepage from '@/pages/Homepage/iwd/IWDHomepage';
import apolloStoryMixin from '../mixins/apollo-story-mixin';

export default {
	title: 'Pages/IWD/2020Homepage',
	component: IWDHomepage,
	decorators: [StoryRouter()],
};

export const Default = () => ({
	components: {
		'iwd-homepage': IWDHomepage,
	},
	mixins: [apolloStoryMixin()],
	template: `
		<iwd-homepage style="margin: -2rem" />
	`,
});
