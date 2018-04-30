// install method for plugin
export default Vue => {
	const inBrowser = typeof window !== 'undefined';
	let snowplowLoaded;
	let gaLoaded;

	const kvActions = {
		checkLibs: () => {
			gaLoaded = inBrowser && typeof window.ga === 'function';
			snowplowLoaded = inBrowser && typeof window.snowplow === 'function';
		},
		pageview: (to, from) => {
			const toUrl = window.location.origin + to.path;
			const asyncFromUrl = window.location.origin + from.path;

			// Snowplown pageview
			if (snowplowLoaded) {
				// - snowplow seems to know better than the path rewriting performed by vue-router
				window.snowplow('setCustomUrl', toUrl);
				// set referrer for async page transitions
				if (from.matched && from.path !== '') {
					window.snowplow('setReferrerUrl', asyncFromUrl);
				}
				window.snowplow('trackPageView');
			}

			// Google Analytics Pageview
			if (gaLoaded) {
				window.ga('set', 'page', toUrl);
				window.ga('set', 'location', toUrl);
				window.ga('set', 'referrer', asyncFromUrl);
				window.ga('send', 'pageview');
			}
		}
	};

	/* eslint-disable no-param-reassign */
	Vue.prototype.$setKvAnalyticsData = app => {
		// establish loaded libs
		kvActions.checkLibs();
		// extract userid from state
		const userId = app.$store.state.my.userAccount.id || undefined;
		// Setup Global Snowplow
		if (snowplowLoaded) {
			window.snowplow('setUserId', userId);
		}
		// Setup Global GA Data
		if (gaLoaded) {
			window.ga('set', { userId });
			window.ga('set', 'useBeacon', true);
			window.ga('require', 'ec');
			window.ga('set', 'dimension1', userId);
		}
	};

	/* eslint-disable no-param-reassign */
	Vue.prototype.$fireAsyncPageView = (to, from) => {
		kvActions.pageview(to, from);
	};

	/* eslint-disable no-param-reassign */
	Vue.prototype.$fireServerPageView = () => {
		const to = { path: window.location.pathname };
		const from = { path: document.referrer };
		kvActions.pageview(to, from);
	};
};
