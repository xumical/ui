const get = require('lodash/get');
const argv = require('../argv');
const config = require('../../../config/selectConfig')(argv.config);
const fetch = require('../fetch');
const log = require('../log');

// Number of loans to fetch
const loanCount = 4;

// Which loan properties to fetch
const loanValues = `values {
	name
	id
	borrowerCount
	geocode {
		country {
			name
		}
	}
	use
	loanAmount
	status
	loanFundraisingInfo {
		fundedAmount
	}
	image {
		retina: url(customSize: "w960h720")
	}
}`;

// Make a graphql query <request> and return the results found at <resultPath>
async function fetchGraphQL(request, resultPath) {
	try {
		const endpoint = config.app.graphqlUri;
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(request),
		});
		const result = await response.json();
		return get(result, resultPath, []);
	} catch (err) {
		log(`Error fetching loans: ${err}`, 'error');
	}
}

// Get per-user recommended loans from the ML service
async function fetchRecommendationsByLoginId(id) {
	return fetchGraphQL(
		{
			query: `{
				ml {
					recommendationsByLoginId(
						segment: all
							loginId: ${id}
							offset: 0
							limit: ${loanCount}
					) {
						${loanValues}
					}
				}
			}`,
		},
		'data.ml.recommendationsByLoginId.values'
	);
}

// Get loan-to-loan recommended loans from the ML service
async function fetchRecommendationsByLoanId(id) {
	return fetchGraphQL(
		{
			query: `{
				ml {
					relatedLoansByTopics(
						loanId: ${id},
						offset: 0,
						topics: [story]
						limit: ${loanCount},
					) {
						${loanValues}
					}
				}
			}`,
		},
		'data.ml.relatedLoansByTopics[0].values'
	);
}

// Get mapping of sector name to id
async function fetchSectors() {
	// If needed, these could be fetched async from legacy api, though be sure to cache results!
	// return fetchGraphQL(
	// 	{ query: '{ lend { sector { id name } } }' },
	// 	'data.lend.sector'
	// );
	// Return constant result for now.
	return Promise.resolve([
		{ id: 1, name: 'Agriculture' },
		{ id: 3, name: 'Transportation' },
		{ id: 4, name: 'Services' },
		{ id: 5, name: 'Clothing' },
		{ id: 6, name: 'Health' },
		{ id: 7, name: 'Retail' },
		{ id: 8, name: 'Manufacturing' },
		{ id: 9, name: 'Arts' },
		{ id: 10, name: 'Housing' },
		{ id: 12, name: 'Food' },
		{ id: 13, name: 'Wholesale' },
		{ id: 14, name: 'Construction' },
		{ id: 15, name: 'Education' },
		{ id: 16, name: 'Personal Use' },
		{ id: 17, name: 'Entertainment' }
	]);
}

// Get possible themes
async function fetchThemes() {
	// If needed, these could be fetched async from legacy api, though be sure to cache results!
	// return fetchGraphQL(
	// 	{ query: '{ lend { loanThemeFilter { id name } } }' },
	// 	'data.lend.loanThemeFilter'
	// );
	// Return constant result for now.
	return Promise.resolve([
		{ id: 1, name: 'Green' },
		{ id: 2, name: 'Higher Education' },
		{ id: 5, name: 'Islamic Finance' },
		{ id: 6, name: 'Youth' },
		{ id: 7, name: 'Start-Up' },
		{ id: 8, name: 'Water and Sanitation' },
		{ id: 9, name: 'Vulnerable Groups' },
		{ id: 10, name: 'Fair Trade' },
		{ id: 11, name: 'Rural Exclusion' },
		{ id: 12, name: 'Mobile Technology' },
		{ id: 13, name: 'Underfunded Areas' },
		{ id: 14, name: 'Conflict Zones' },
		{ id: 15, name: 'Job Creation' },
		{ id: 17, name: 'Growing Businesses' },
		{ id: 20, name: 'Disaster recovery' },
		{ id: 24, name: 'Innovative Loans' },
		{ id: 28, name: 'Refugees/Displaced' },
		{ id: 29, name: 'Social Enterprise' },
		{ id: 30, name: 'Earth Day Campaign' },
		{ id: 32, name: 'Clean Energy' },
		{ id: 36, name: 'Crisis Support Loans' }
	]);
}

// Parse the filter string and return an array of filter arrays, e.g. [['sector', 'arts'], ['country', 'ke']]
// Returns an empty array if the filter string does not contain any valid matches.
const getFilterArrays = filterString => {
	// This regex matches strings like 'sector_arts,country_ke' and captures each
	// param name and value (for example 'sector', 'arts', 'country', 'ke' would be captured).
	// See tests, examples, and a more detailed explanation at regexr.com/659in
	const searchParamRegex = /(?:([a-z]+)_([a-z0-9 \\/-]+),?)+?/g;
	// Match the regex against the filter string, returning an iterator of all the matches and captured groups
	const matches = filterString.toLowerCase().matchAll(searchParamRegex);
	// Return an array of the matches as filter names and values, like [['sector', 'arts'], ['country', 'ke']]
	return [...matches].map(match => [match[1], match[2]]);
};

// Only returns true for supported FLSS loan search filters
const supportedFilterFLSS = name => {
	switch (name) {
		case 'country':
		case 'gender':
		case 'sector':
			return true;
		default:
			log(`Unsupported FLSS filter "${name}"`, 'warning');
			return false;
	}
};

// Takes a string like: "gender_female,sector_education"
// and returns an array of objects like: [ { gender: { eq: 'female' } }, { sector: { eq: 'education' } } ]
const parseFilterStringFLSS = filterString => {
	// If the filter string is not valid, return an empty array
	if (!filterString || typeof filterString !== 'string') {
		return [];
	}
	return getFilterArrays(filterString)
		.filter(([name]) => supportedFilterFLSS(name))
		.map(([name, value]) => {
			// FLSS uses 'countryIsoCode' for the country filter
			if (name === 'country') {
				return { countryIsoCode: { eq: value } };
			}
			// Other filters can be passed through directly
			return { [name]: { eq: value } };
		});
};

// Get loans from the Fundraising Loan Search Service matching a set of filters
async function fetchRecommendationsByFilter(filterString) {
	return fetchGraphQL(
		{
			query: `query($filters: [FundraisingLoanSearchFilterInput!]) {
				fundraisingLoans(pageNumber:0, limit: ${loanCount}, filters: $filters) {
					${loanValues}
				}
			}`,
			variables: {
				filters: parseFilterStringFLSS(filterString),
			}
		},
		'data.fundraisingLoans.values'
	);
}

// Only returns true for supported legacy loan search filters
const supportedFilterLegacy = name => {
	switch (name) {
		case 'country':
		case 'gender':
		case 'sector':
		case 'theme':
			return true;
		default:
			log(`Unsupported legacy filter "${name}"`, 'warning');
			return false;
	}
};

// Takes a string like: "gender_female,sector_education"
// and converts it to a legacy filter object
async function parseFilterStringLegacy(filterString) {
	const filters = {};

	// Helper function to seet a single filter value
	const setFilterValue = (name, value) => {
		// Set the value directly
		filters[name] = value;
	};
	// Helper function to add to a value to an array filter
	const addArrayFilterValue = (name, value) => {
		// Make sure existing value is an array if it isn't already
		filters[name] = filters[name] || [];
		// Add the new value to the existing array
		filters[name].push(value);
	};
	// Helper function to find possible filter options from a given list
	const findFilterOption = (options, name, value) => {
		const option = options.find(o => o?.name?.toLowerCase() === value);
		if (!option) {
			log(`Unknown ${name} "${value}"`, 'warning');
		}
		return option;
	};

	// only try parsing if the input is valid
	if (filterString && typeof filterString === 'string') {
		// Fetch possible filter options
		const [sectors, themes] = await Promise.all([fetchSectors(), fetchThemes()]);
		// Start parsing the filter string
		getFilterArrays(filterString)
			// Remove any unsupported filters
			.filter(([name]) => supportedFilterLegacy(name))
			// Add each filter to the filter object
			.forEach(([name, value]) => {
				if (name === 'country') {
					addArrayFilterValue(name, value);
				} else if (name === 'gender') {
					setFilterValue(name, value);
				} else if (name === 'sector') {
					// Find the sector from the list of possible sectors
					const sector = findFilterOption(sectors, name, value);
					if (sector) {
						addArrayFilterValue(name, sector.id);
					}
				} else if (name === 'theme') {
					// Find the theme from the list of possible themes
					const theme = findFilterOption(themes, name, value);
					if (theme) {
						addArrayFilterValue(name, theme.name);
					}
				}
			});
	}
	return filters;
}

// Get loans from legacy lend search matching a set of filters
async function fetchRecommendationsByLegacyFilter(filterString) {
	const filters = await parseFilterStringLegacy(filterString);
	return fetchGraphQL(
		{
			query: `query($filters: LoanSearchFiltersInput) {
				lend {
					loans(limit: ${loanCount}, offset: 0, filters: $filters) {
						${loanValues}
					}
				}
			}`,
			variables: {
				filters,
			},
		},
		'data.lend.loans.values'
	);
}

// Export a function that will fetch loans by live-loan type and id
module.exports = async function fetchLoansByType(type, id) {
	if (type === 'user') {
		return fetchRecommendationsByLoginId(id);
	} if (type === 'loan') {
		return fetchRecommendationsByLoanId(id);
	} if (type === 'filter') {
		// Swap which line below is commented out to switch between FLSS and legacy (monolith) lend search
		// return fetchRecommendationsByFilter(id);
		return fetchRecommendationsByLegacyFilter(id);
	}
	throw new Error('Type must be user, loan, or filter');
};
