<template>
	<div ref="sectionTop" class="tw-w-full tw-bg-secondary">
		<div class="tw-mx-auto tw-pt-2 tw-pb-1 tw-px-2.5 md:tw-px-4 lg:tw-px-8" style="max-width: 1200px;">
			<div
				v-show="showOverlay"
				style="opacity: 0.5;" class="tw-fixed tw-inset-0 tw-bg-black tw-z-3"
			></div>
			<h2 class="tw-text-h2 tw-mb-1 tw-text-primary">
				Find a loan by category and location
			</h2>
			<quick-filters
				class="tw-z-2"
				:total-loans="totalCount"
				:filter-options="quickFiltersOptions"
				:filters-loaded="filtersLoaded"
				:targeted-loan-channel-url="targetedLoanChannelURL"
				:with-categories="true"
				default-sort="amountLeft"
				tracking-category="lending-home"
				@update-filters="updateQuickFilters"
				@reset-filters="resetFilters"
				@handle-overlay="handleQuickFiltersOverlay"
			/>
			<!-- emtpy state for no loans result -->
			<empty-state v-show="emptyState" />

			<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-4 tw-mt-2">
				<kv-classic-loan-card-container
					v-for="(loan, index) in loans"
					:key="`new-card-${loan.id}-${index}`"
					:loan-id="loan.id"
					:use-full-width="true"
					:show-tags="true"
					:enable-five-dollars-notes="enableFiveDollarsNotes"
					:user-balance="userBalance"
					@add-to-basket="addToBasket"
				/>
			</div>
			<div class="tw-w-full tw-my-4">
				<kv-pagination
					v-show="!emptyState"
					:total="totalCount"
					:limit="loanSearchState.pageLimit"
					:offset="loanSearchState.pageOffset"
					@page-changed="pageChange"
					:scroll-to-top="false"
				/>
			</div>
		</div>
	</div>
</template>

<script>
import QuickFilters from '@/components/LoansByCategory/QuickFilters/QuickFilters';
import { runFacetsQueries, fetchLoanFacets, runLoansQuery } from '@/util/loanSearch/dataUtils';
import { fetchCategories, FLSS_ORIGIN_LEND_BY_CATEGORY } from '@/util/flssUtils';
import { transformIsoCodes } from '@/util/loanSearch/filters/regions';
import KvClassicLoanCardContainer from '@/components/LoanCards/KvClassicLoanCardContainer';
import KvPagination from '@/components/Kv/KvPagination';
import EmptyState from './EmptyState';

export default {
	name: 'QuickFiltersSection',
	components: {
		QuickFilters,
		KvClassicLoanCardContainer,
		KvPagination,
		EmptyState
	},
	inject: ['apollo'],
	props: {
		enableFiveDollarsNotes: {
			type: Boolean,
			default: false
		},
		userBalance: {
			type: String,
			default: undefined
		},
	},
	data() {
		return {
			totalCount: 0,
			targetedLoanChannelURL: '',
			filtersLoaded: false,
			flssLoanSearch: {},
			loanSearchState: {
				pageOffset: 0,
				pageLimit: 6,
				sortBy: 'amountLeft'
			},
			// Default loans for loading animations
			loans: [
				{ id: 0 }, { id: 0 }, { id: 0 },
				{ id: 0 }, { id: 0 }, { id: 0 }
			],
			backupLoans: [],
			quickFiltersOptions: {
				categories: [{
					title: 'All categories',
					key: 0
				}],
				gender: [{
					key: 'all',
					title: 'All genders'
				}],
				sorting: [{
					title: 'Almost funded',
					key: 'amountLeft',
				}],
			},
			allFacets: [],
			emptyState: false,
			showOverlay: false,
		};
	},
	async mounted() {
		this.allFacets = await fetchLoanFacets(this.apollo);
		await this.fetchFilterData(this.flssLoanSearch);
		const { loans, totalCount } = await runLoansQuery(
			this.apollo,
			{ ...this.flssLoanSearch, ...this.loanSearchState },
			FLSS_ORIGIN_LEND_BY_CATEGORY
		);
		this.loans = loans;
		this.totalCount = totalCount;
		this.backupLoans = this.loans.slice(3);
	},
	methods: {
		addToBasket(payload) {
			this.$emit('add-to-basket', payload);
		},
		// TODO: Rearchitect this at some point.
		// This won't work for categories that have
		// multiple criteria applied to their FLSSLoanSearch criteria.
		// See CORE-944
		async updateQuickFilters(filter) {
			this.loanSearchState.pageOffset = 0;
			if (filter?.gender !== undefined) {
				this.flssLoanSearch.gender = filter.gender;
			} else if (filter?.sortBy) {
				this.flssLoanSearch.sortBy = filter.sortBy;
				this.loanSearchState.sortBy = filter.sortBy;
			} else if (filter?.country) {
				this.flssLoanSearch.countryIsoCode = filter.country;
			} else {
				// We want to reset the flss paramaters for categories
				delete this.flssLoanSearch.sectorId;
				delete this.flssLoanSearch.tagId;
				delete this.flssLoanSearch.activityId;
				delete this.flssLoanSearch.themeId;
				delete this.flssLoanSearch.partnerId;
				this.flssLoanSearch = {
					...this.flssLoanSearch,
					...filter
				};
			}
			this.fetchFilterData(this.flssLoanSearch);
			const { loans, totalCount } = await runLoansQuery(
				this.apollo,
				{ ...this.flssLoanSearch, ...this.loanSearchState },
				FLSS_ORIGIN_LEND_BY_CATEGORY
			);
			this.totalCount = totalCount;
			if (loans.length > 0) {
				this.emptyState = false;
				this.loans = loans;
			} else {
				this.emptyState = true;
				this.loans = this.backupLoans;
				this.$kvTrackEvent(
					'lending-home',
					'show',
					'quick-filters-empty-state'
				);
			}
		},
		async resetFilters() {
			this.loanSearchState.pageOffset = 0;
			this.flssLoanSearch = {};
			this.updateLoans();
		},
		handleQuickFiltersOverlay(showOverlay) {
			this.showOverlay = showOverlay;
		},
		async fetchFilterData(loanSearchState = {}) {
			// TODO: Prevent this from running on every query (not needed for sorting and paging)
			const { isoCodes } = await runFacetsQueries(this.apollo, loanSearchState, FLSS_ORIGIN_LEND_BY_CATEGORY);
			const fetchedCategories = await fetchCategories(this.apollo);

			// Merge all facet options with filtered options
			const facets = {
				regions: transformIsoCodes(isoCodes, this.allFacets?.countryFacets),
			};

			const categories = fetchedCategories?.lend?.loanChannels?.values ?? [];
			const sortedCategories = [...categories].sort(
				// eslint-disable-next-line no-nested-ternary
				(catA, catB) => {
					if (catA.title < catB.title) return -1;
					if (catA.title > catB.title) return 1;
					return 0;
				}
			);

			this.quickFiltersOptions.categories = [
				...[{ title: 'All categories', key: 0 }],
				...sortedCategories
			];

			this.quickFiltersOptions.location = facets.regions;
			// TODO: Pull sort by and gender filters from API
			this.quickFiltersOptions.sorting = [
				{
					title: 'Almost funded',
					key: 'amountLeft',
				},
				{
					title: 'Recommended',
					key: 'personalized',
				},
				{
					title: 'Amount high to low',
					key: 'amountHighToLow'
				},
				{
					title: 'Amount low to high',
					key: 'amountLowToHigh'
				},
				{
					title: 'Ending soon',
					key: 'expiringSoon'
				}
			];
			this.quickFiltersOptions.gender = [
				{
					title: 'All genders',
					key: 'all',
				},
				{
					title: 'Women',
					key: 'female',
				},
				{
					title: 'Men',
					key: 'male',
				},
				{
					title: 'Non-binary',
					key: 'nonbinary',
				}
			];

			this.filtersLoaded = true;
		},
		pageChange({ pageOffset }) {
			const label = this.loanSearchState.pageOffset === 0 ? 'next' : 'back';
			this.$kvTrackEvent(
				'lending-home',
				'click',
				label
			);
			this.loanSearchState.pageOffset = pageOffset;
			this.updateLoans();
			this.$refs.sectionTop.scrollIntoView({ behavior: 'smooth' });
		},
		async updateLoans() {
			const { loans } = await runLoansQuery(
				this.apollo,
				{ ...this.flssLoanSearch, ...this.loanSearchState },
				FLSS_ORIGIN_LEND_BY_CATEGORY
			);
			this.loans = loans;
		}
	},
	watch: {
		loans(data) {
			this.$emit('data-loaded', {
				data,
				pageOffset: this.loanSearchState?.pageOffset ?? 0
			});
		},
	},
};
</script>
