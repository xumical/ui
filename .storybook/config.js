import { configure, addDecorator, addParameters } from '@storybook/vue';
import { withA11y } from '@storybook/addon-a11y';
import { withKnobs } from '@storybook/addon-knobs';

// same styles that are in App.vue
import '../src/assets/scss/app.scss';

import kvTheme from './kvtheme';

addParameters({
  options: {
    theme: kvTheme,
  },
});

addDecorator(withA11y);
addDecorator(withKnobs);

// automatically import all files ending in *.stories.js
configure(require.context('./stories/', true, /\.stories\.js$/), module);
