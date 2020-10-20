import appInstallQuery from '@/graphql/query/appInstall.graphql';
import _get from 'lodash/get';

export default {
	metaInfo() {
		return {
			meta: this.showBanner ? [
				// Apple specific meta tag to show native app install banner
				// eslint-disable-next-line
				// https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/PromotingAppswithAppBanners/PromotingAppswithAppBanners.html
				{
					name: 'apple-itunes-app',
					content: 'app-id=1453093374',
				}
			] : []
		};
	},
	inject: ['apollo'],
	data() {
		return {
			appInstallHasFreeCredits: false,
			appInstallLendingRewardOffered: false,
		};
	},
	computed: {
		showBanner() {
			if (this.appInstallHasFreeCredits || this.appInstallLendingRewardOffered) {
				return false;
			}

			// Show Android and iOS app install banners if user is on a whitelisted page but not coming from a promo
			const route = this.$route;
			const whitelistedRoutes = [
				'start',
				'portfolio',
				'lend',
				'lend-by-category',
				'about'
			];
			const blacklistedParams = [
				'upc',
				'promo_code',
				'lending_reward',
			];

			let show = false;
			if (whitelistedRoutes.includes(route.path.split('/')[1]) || route.path === '/') {
				show = true;

				Object.keys(route.query).forEach(key => {
					if (blacklistedParams.includes(key)) {
						show = false;
					}
				});
			}

			return show;
		}
	},
	created() {
		this.apollo.query({
			query: appInstallQuery,
		}).then(({ data }) => {
			this.appInstallHasFreeCredits = _get(data, 'shop.basket.hasFreeCredits');
			this.appInstallLendingRewardOffered = _get(data, 'shop.lendingRewardOffered');
		});
	},
	mounted() {
		// Chrome Android uses manifest.webmanifest and their hueristics to display android install banner on all pages
		// Blacklisted pages need to prevent that behavior
		// https://developers.google.com/web/fundamentals/app-install-banners/native#prefer_related
		if (!this.showBanner) {
			window.addEventListener('beforeinstallprompt', e => {
				e.preventDefault();
			});
		}
	}
};
