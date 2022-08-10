import _orderBy from 'lodash/orderBy';
import { sortRegions } from '@/util/loanSearch/countryUtils';

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

export const visibleFLSSSortOptions = ['expiringSoon', 'amountHighToLow', 'amountLowToHigh', 'personalized'];

/**
 * The themes/attributes that are always visible in the filter UI
 */
export const visibleThemeIds = [2, 6, 8, 11, 14, 28, 29, 32, 36];

/**
 * FLSS API query type
 */
export const FLSS_QUERY_TYPE = 'flss';

/**
 * Standard/lend API query type
 */
export const STANDARD_QUERY_TYPE = 'standard';

/**
 * Categorizes Sort Options
 *
 * @param {Array<Object>} standardSorts Sort options from the lend API
 * @param {Array<Object>} flssSorts Sort options from the FLSS API
 * @returns New formatted array
 */
export function formatSortOptions(standardSorts, flssSorts) {
	const labeledStandardSorts = standardSorts?.map(sort => {
		return {
			name: sort.name,
			sortSrc: STANDARD_QUERY_TYPE,
		};
	}) ?? [];
	const labeledFlssSorts = flssSorts?.reduce((prev, current) => {
		if (visibleFLSSSortOptions.includes(current.name)) {
			prev.push({ name: current.name, sortSrc: FLSS_QUERY_TYPE });
		}

		return prev;
	}, []) ?? [];
	return [...labeledStandardSorts, ...labeledFlssSorts];
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
 * Transforms filtered sectors into a form usable by the filters
 *
 * @param {Array<Object>} filteredSectors The sector IDs from FLSS
 * @param {Array<Object>} allSectors The sectors from lend API
 * @returns {Array<Object>} Sectors with number of loans fundraising
 */
export function transformSectors(filteredSectors, allSectors = []) {
	const transformed = [];

	filteredSectors.forEach(({ key: id, value: numLoansFundraising }) => {
		const lookupSector = allSectors.find(s => s.id === +id);
		if (!lookupSector) return;
		const sector = { id: lookupSector.id, name: lookupSector.name, numLoansFundraising };
		transformed.push(sector);
	});

	return _orderBy(transformed, 'name');
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

	// Always show certain themes regardless of whether there are applicable loans
	visibleThemeIds.forEach(id => {
		const themeFromLend = allThemes.find(a => a.id === id);

		if (!themeFromLend) return;

		// Case insensitive matching since lend and FLSS APIs can use different casing for themes
		const themeFromFlss = filteredThemes.find(t => t.key.toUpperCase() === themeFromLend.name.toUpperCase());

		const theme = { id, name: themeFromLend.name, numLoansFundraising: themeFromFlss?.value ?? 0 };

		transformed.push(theme);
	});

	return _orderBy(transformed, 'name');
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
 * Gets an updated items list to display in the filter with updated numLoansFundraising. Expected items and next format:
 * [{
 *   id: 1,
 *   name: '',
 *   numLoansFundraising: 1,
 * }]
 *
 * @param {Array<Object>} items The items previously displayed in the filter
 * @param {Array<Object>} next The items returned by the FLSS facets query
 * @returns {Array<Object>} The updated items list
 */
export function getUpdatedNumLoansFundraising(items, next) {
	const updated = [];

	// Get updated numLoansFundraising
	items?.forEach(item => {
		const nextItem = next.find(a => a.id === item.id);
		const updatedItem = {
			...item,
			numLoansFundraising: nextItem?.numLoansFundraising || 0,
		};

		updated.push(updatedItem);
	});

	// Add missing items that have been added since previous query
	next?.forEach(item => {
		if (!updated.find(a => a.id === item.id)) {
			updated.push({ ...item });
		}
	});

	return _orderBy(updated, 'name');
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
