import orderBy from 'lodash/orderBy';
import updateLoanSearchMutation from '@/graphql/mutation/updateLoanSearchState.graphql';
import loanFacetsQuery from '@/graphql/query/loanFacetsQuery.graphql';
import { fetchFacets, fetchLoans } from '@/util/flssUtils';

/**
 * API query types, FLSS and lend (standard)
 */
export const FLSS_QUERY_TYPE = 'flss';
export const STANDARD_QUERY_TYPE = 'standard';

/**
 * Map used to convert lend <> FLSS sort option values
 */
const lendToFlssSort = new Map([
	['expiringSoon', 'expiringSoon'],
	['popularity', 'personalized'],
	['loanAmountDesc', 'amountHighToLow'],
	['loanAmount', 'amountLowToHigh'],
]);

/**
 * Used to map the sort value to display value
 */
export const sortByNameToDisplay = {
	// Shared
	expiringSoon: 'Ending soon',
	// Standard (lend)
	amountLeft: 'Amount left',
	loanAmount: 'Amount: Low to High',
	loanAmountDesc: 'Amount: High to Low',
	newest: 'Most recent',
	popularity: 'Trending now',
	random: 'Random',
	repaymentTerm: 'Loan length',
	// FLSS specific
	amountHighToLow: 'Amount: High to Low',
	amountLowToHigh: 'Amount: Low to High',
	personalized: 'Recommended'
};

/**
 * Returns loan search state that has been validated against the available facets
 *
 * @param {Object} loanSearchState The current loan search state from Apollo cache
 * @param {Object} allFacets All available facets from the APIs
 * @param {string} queryType The current query type (lend vs FLSS)
 * @returns {Object} Validated search state, including default enum null values expected by GraphQL
 */
export function getValidatedSearchState(loanSearchState, allFacets, queryType) {
	const validSorts = queryType === FLSS_QUERY_TYPE ? allFacets.flssSorts : allFacets.standardSorts;

	const validatedGender = allFacets.genders.includes(loanSearchState?.gender?.toUpperCase())
		? loanSearchState.gender : null;
	const validatedIsoCodes = loanSearchState?.countryIsoCode
		?.filter(c => allFacets.countryIsoCodes.includes(c.toUpperCase())) ?? [];
	const validatedSectorIds = loanSearchState?.sectorId?.filter(s => allFacets.sectorIds.includes(s)) ?? [];
	const validatedSortBy = validSorts.some(s => s.name === loanSearchState.sortBy) ? loanSearchState.sortBy : null;
	const validatedThemes = loanSearchState?.theme?.filter(t => allFacets.themes.includes(t.toUpperCase())) ?? [];

	return {
		gender: validatedGender,
		countryIsoCode: validatedIsoCodes,
		sectorId: validatedSectorIds,
		sortBy: validatedSortBy,
		theme: validatedThemes
	};
}

/**
 * Updates the search state using the provided apollo client and filters
 *
 * @param {Object} apollo The Apollo client instance
 * @param {Object} loanQueryFilters The filters for the loan query
 * @param {Object} allFacets All available facets from the APIs
 * @param {string} queryType The current query type (lend vs FLSS)
 * @param {Object} previousState The previous search state
 * @returns {Promise<Array>} Promise for the results of the mutation
 */
export async function updateSearchState(apollo, loanQueryFilters, allFacets, queryType, previousState) {
	const validatedFilters = getValidatedSearchState(loanQueryFilters, allFacets, queryType);

	// Quick JSON compare works because both states are results of getValidatedSearchState
	if (JSON.stringify(previousState) === JSON.stringify(validatedFilters)) return;

	return apollo.mutate({
		mutation: updateLoanSearchMutation,
		variables: {
			searchParams: {
				...validatedFilters
			}
		}
	});
}

/**
 * Categorizes Sort Options
 *
 * @param {Array<Object>} standardSorts Sort options from the lend API
 * @param {Array<Object>} flssSorts Sort options from the FLSS API
 * @returns New formatted array
 */
export function formatSortOptions(standardSorts, flssSorts) {
	const labeledStandardSorts = standardSorts.map(sort => {
		return {
			name: sort.name,
			sortSrc: STANDARD_QUERY_TYPE,
		};
	});
	const labeledFlssSorts = flssSorts.map(sort => {
		return {
			name: sort.name,
			sortSrc: FLSS_QUERY_TYPE,
		};
	});
	return [...labeledStandardSorts, ...labeledFlssSorts];
}

/**
 * Sorts the provided regions and countries of regions
 *
 * @param {Array<Object>} regions The regions to sort
 * @returns {Array<Object>} New sorted array
 */
export function sortRegions(regions) {
	const sorted = orderBy(regions, 'region');

	// eslint-disable-next-line no-param-reassign
	sorted.forEach(region => { region.countries = orderBy(region.countries, 'name'); });

	return sorted;
}

/**
 * Transforms ISO codes into regions usable by the filters
 *
 * @param {Array<Object>} countryFacets The ISO codes from FLSS
 * @param {Array<Object>} allCountryFacets The countries from lend API
 * @returns {Array<Object>} Regions with lists of countries
 */
export function transformIsoCodes(filteredIsoCodes, allCountryFacets = []) {
	const transformed = [];

	filteredIsoCodes.forEach(({ key: isoCode, value: numLoansFundraising }) => {
		// Create company object based on country defined by lend API
		const lookupCountry = allCountryFacets.find(({ country }) => {
			// Case insensitive matching just in case lend and FLSS APIs have different casing
			return country.isoCode.toUpperCase() === isoCode.toUpperCase();
		});
		if (!lookupCountry) return;
		const country = { ...lookupCountry.country, isoCode, numLoansFundraising };

		// Find existing transformed region or add a new region
		const region = transformed.find(t => t.region === country.region);
		if (region) {
			region.countries.push(country);
			region.numLoansFundraising += numLoansFundraising;
		} else {
			transformed.push({ region: country.region, countries: [country], numLoansFundraising });
		}
	});

	return sortRegions(transformed);
}

/**
 * Transforms filtered themes into a form usable by the filters
 *
 * @param {Array<Object>} filteredThemes The themes from FLSS
 * @param {Array<Object>} allThemes The themes from lend API
 * @returns {Array<Object>} Themes with number of loans fundraising
 */
export function transformThemes(filteredThemes, allThemes = []) {
	const transformed = [];

	filteredThemes.forEach(({ key: name, value: numLoansFundraising }) => {
		// Case insensitive matching since lend and FLSS APIs can use different casing for themes
		const lookupTheme = allThemes.find(a => a.name.toUpperCase() === name.toUpperCase());
		if (!lookupTheme) return;
		const theme = { id: lookupTheme.id, name, numLoansFundraising };
		transformed.push(theme);
	});

	return orderBy(transformed, 'name');
}

/**
 * Gets an updated regions list to display in the filter with updated numLoansFundraising
 *
 * @param {Array<Object>} regions The regions previously displayed in the filter
 * @param {Array<Object>} nextRegions The regions returned by the latest FLSS facets query
 * @returns {Array<Object>} The updated regions list
 */
export function getUpdatedRegions(regions, nextRegions) {
	// Default to nextRegions
	if (!regions) return nextRegions;

	const updated = [];

	// Get updated numLoansFundraising
	regions.forEach(region => {
		const nextRegion = nextRegions.find(r => r.region === region.region);
		const nextRegionExists = !!nextRegion;
		const updatedRegion = {
			region: region.region,
			numLoansFundraising: nextRegionExists ? nextRegion.numLoansFundraising : 0,
			countries: []
		};

		updated.push(updatedRegion);

		region.countries.forEach(country => {
			const updatedCountry = { ...country };

			if (!nextRegionExists) {
				updatedCountry.numLoansFundraising = 0;
			} else {
				const nextCountry = nextRegion.countries.find(c => c.name === updatedCountry.name);
				updatedCountry.numLoansFundraising = nextCountry?.numLoansFundraising || 0;
			}

			updatedRegion.countries.push(updatedCountry);
		});
	});

	// Add missing regions that have been added since previous query
	nextRegions.forEach(region => {
		let updatedRegion = updated.find(r => r.region === region.region);

		if (!updatedRegion) {
			updatedRegion = {
				region: region.region,
				numLoansFundraising: region.numLoansFundraising,
				countries: []
			};
			updated.push(updatedRegion);
		}

		region.countries.forEach(country => {
			if (!updatedRegion.countries.find(c => c.name === country.name)) {
				updatedRegion.countries.push({ ...country });
			}
		});
	});

	return sortRegions(updated);
}

/**
 * Gets an updated themes list to display in the filter with updated numLoansFundraising
 *
 * @param {Array<Object>} themes The themes previously displayed in the filter
 * @param {Array<Object>} nextThemes The themes returned by the FLSS facets query
 * @returns {Array<Object>} The updated themes list
 */
export function getUpdatedThemes(themes, nextThemes) {
	// Default to next
	if (!themes) return nextThemes;

	const updated = [];

	// Get updated numLoansFundraising
	themes.forEach(theme => {
		const nextTheme = nextThemes.find(a => a.id === theme.id);
		const updatedTheme = {
			...theme,
			numLoansFundraising: nextTheme?.numLoansFundraising || 0,
		};

		updated.push(updatedTheme);
	});

	// Add missing themes that have been added since previous query
	nextThemes.forEach(theme => {
		if (!updated.find(a => a.id === theme.id)) {
			updated.push({ ...theme });
		}
	});

	return orderBy(updated, 'name');
}

/**
 * Gets an updated sectors list to display in the filter
 *
 * @param {Array<Object>} sectors The sectors previously displayed in the filter
 * @param {Array<Object>} nextSectors The sectors returned by the FLSS facets query
 * @returns {Array<Object>} The updated sectors list
 */
export function getUpdatedSectors(sectors, nextSectors) {
	// Default to next
	if (!sectors) return nextSectors;

	const updated = [];

	// Add missing sectors that have been added since previous query
	nextSectors.forEach(sector => {
		if (!updated.find(a => a.id === sector.id)) {
			updated.push({ ...sector });
		}
	});

	return orderBy(updated, 'name');
}

/**
 * Builds a flattened list of the ISO codes of the provided regions with countries
 *
 * @param {Array<Object>} regions All of the regions with countries
 * @param {Object} selectedCountries An object where the props are regions and values are countries
 * @returns {Array<string>} Flat list of the ISO codes
 */
export function getIsoCodes(regions, selectedCountries) {
	return Object.keys(selectedCountries).reduce((prev, current) => {
		const codes = regions
			.find(r => r.region === current)?.countries
			.filter(c => selectedCountries[current].includes(c.name))
			.map(c => c.isoCode);
		return [...prev, ...(codes || [])];
	}, []);
}

/**
 * Gets the filters for FLSS
 *
 * @param {Object} loanSearchState The current loan search state from Apollo
 * @returns {Object} The filters in the correct FLSS format
 */
export function getFlssFilters(loanSearchState) {
	return {
		...(loanSearchState?.gender && { gender: { any: loanSearchState.gender } }),
		...(loanSearchState?.countryIsoCode?.length && {
			countryIsoCode: { any: loanSearchState.countryIsoCode }
		}),
		...(loanSearchState?.theme?.length && {
			theme: { any: loanSearchState.theme }
		}),
		...(loanSearchState?.sectorId?.length && { sectorId: { any: loanSearchState.sectorId } }),
	};
}

/**
 * Runs the query to get the filter facets
 *
 * @param {Object} apollo The Apollo client instance
 * @param {Object} loanSearchState The current loan search state from Apollo
 * @returns {Object} The filter facets
 */
export async function runFacetsQueries(apollo, loanSearchState = {}) {
	// Filtered ISO codes that match loan results without filtering on ISO code
	const isoCodeFilters = { ...getFlssFilters(loanSearchState), countryIsoCode: undefined };
	const isoCodes = (await fetchFacets(apollo, isoCodeFilters))?.isoCode || [];

	const themeFilters = { ...getFlssFilters(loanSearchState), theme: undefined };
	const themes = (await fetchFacets(apollo, themeFilters))?.themes || [];

	return { isoCodes, themes };
}

/**
 *	Runs the FLSS loan query
 *
 * @param {Object} apollo The Apollo client instance
 * @param {Object} loanSearchState The current loan search state from Apollo
 * @returns {Object} The results of the loan query
 */
export async function runLoansQuery(apollo, loanSearchState = {}) {
	const flssData = await fetchLoans(
		apollo,
		getFlssFilters(loanSearchState),
		loanSearchState?.sortBy ?? null
	);

	return { loans: flssData?.values || [], totalCount: flssData?.totalCount || 0 };
}

/**
 * Fetches the facets data for the lend and FLSS APIs
 *
 * @param {Object} apollo The apollo client instance
 * @returns {Promise<Array<Object>>} Promise for facets data
 */
export async function fetchLoanFacets(apollo) {
	try {
		const result = await apollo.query({ query: loanFacetsQuery, fetchPolicy: 'network-only' });

		const countryFacets = result.data?.lend?.countryFacets ?? [];
		const sectorFacets = result.data?.lend?.sector ?? [];
		const themeFacets = result.data?.lend?.loanThemeFilter ?? [];
		const genderFacets = result.data?.genderOptions?.enumValues ?? [];

		return {
			countryFacets,
			countryIsoCodes: countryFacets.map(c => c.country.isoCode.toUpperCase()),
			sectorFacets,
			sectorIds: sectorFacets.map(s => s.id),
			themeFacets,
			themes: themeFacets.map(t => t.name.toUpperCase()),
			genderFacets,
			genders: genderFacets.map(g => g.name.toUpperCase()),
			flssSorts: result.data?.flssSorts?.enumValues ?? [],
			standardSorts: result.data?.standardSorts?.enumValues ?? [],
		};
	} catch (e) {
		console.log('Fetching loan facets failed:', e.message);
	}
}

/**
 * Returns the item label with fundraising amount in parens
 *
 * @param {Object} item The item for generating the label
 * @returns {string} The item label
 */
export function getCheckboxLabel(item) {
	return `${item.name || item.region} (${item.numLoansFundraising})`;
}

/**
 * Pulls the query string params using the Vue Router and applies them to the search state
 *
 * @param {Object} apollo The Apollo client instance
 * @param {Object} query The Vue Router query object (this.$route.query)
 * @param {Object} allFacets All available facets from the APIs
 * @param {string} queryType The current query type (lend vs FLSS)
 * @param {Object} previousState The previous search state
 */
export async function applyQueryParams(apollo, query, allFacets, queryType, previousState = {}) {
	const filters = {
		gender: query.gender,
		sortBy: queryType === FLSS_QUERY_TYPE ? lendToFlssSort.get(query.sortBy) : query.sortBy,
		// TODO: replace previous state usage as query param support expands
		...(previousState && {
			countryIsoCode: previousState.countryIsoCode,
			sectorId: previousState.sectorId,
			theme: previousState.theme,
		})
	};

	await updateSearchState(apollo, filters, allFacets, queryType, previousState);
}

/**
 * Pushes a new route to the Vue Router with the updated query string params, which ensures that Vue knows about the
 * route change, and it enables watching the browser navigation via back/forward buttons to update filters
 *
 * @param {Object} loanSearchState The current loan search state from Apollo
 * @param {Object} router The Vue Router object
 * @param {string} queryType The current query type (lend vs FLSS)
 */
export function updateQueryParams(loanSearchState, router, queryType) {
	const oldParamKeys = Object.keys(router.currentRoute.query);

	// Preserve UTM params
	const utmParams = {};
	oldParamKeys.forEach(key => {
		if (key.includes('utm_')) {
			utmParams[key] = router.currentRoute.query[key];
		}
	});

	// The query param uses the standard sort values, so map from FLSS as needed
	const queryParamSortBy = queryType === FLSS_QUERY_TYPE
		// eslint-disable-next-line no-unused-vars
		? [...lendToFlssSort].find(([_, value]) => value === loanSearchState.sortBy)?.[0]
		: loanSearchState.sortBy;

	// Create new query params object
	const newParams = {
		...(loanSearchState.gender && { gender: loanSearchState.gender }),
		...(queryParamSortBy && { sortBy: queryParamSortBy }),
		// TODO: add params as query param support expands
		...utmParams,
	};

	const newParamKeys = Object.keys(newParams);

	// Check if the query params differ from current route query params
	const doParamsMatch = [...newParamKeys, ...oldParamKeys]
		.reduce((prev, key) => prev && router.currentRoute.query[key] === newParams[key], true);

	// Vue throws duplicate navigation exception when identical paths are pushed to the router
	if (!doParamsMatch) {
		router.push({ ...router.currentRoute, query: newParams, params: { noScroll: true } });
	}
}
