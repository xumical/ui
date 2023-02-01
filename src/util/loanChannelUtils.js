import {
	fetchLoanChannel,
	getCachedLoanChannel,
	getLoanChannelVariables,
	watchLoanChannel
} from '@/util/flssUtils';
import loanChannelQuery from '@/graphql/query/loanChannelDataExpanded.graphql';
import logReadQueryError from '@/util/logReadQueryError';

/**
 * Returns the FLSS loan search state object based on the map and category
 *
 * @param {Array} queryMap The map mixin from loan-channel-query-map.js
 * @param {string} category The category from $route.params.category
 * @returns {Object} The loan search state object
 */
export function getFLSSQueryMap(queryMap, category) {
	return queryMap.find(c => c.url === category)?.flssLoanSearch;
}

/**
 * Transforms the FLSS channel data to match the lend channel data format
 *
 * @param {Object} data The data from FLSS
 * @returns {Object} The transformed channel data
 */
export function transformFLSSData(data) {
	return {
		shop: data?.shop ?? {},
		lend: { loanChannelsById: [{ ...data?.lend?.loanChannelsById?.[0], loans: data?.fundraisingLoans ?? {} }] }
	};
}

/**
 * Used to pre-fetch the loan channel data in the control component
 *
 * @param {Object} apollo The Apollo client instance
 * @param {Array} queryMap The map mixin from loan-channel-query-map.js
 * @param {string} channelUrl The URL of the loan channel
 * @param {Object} loanQueryVars The loan channel query variables
 */
export async function preFetchChannel(apollo, queryMap, channelUrl, loanQueryVars) {
	const queryMapFLSS = getFLSSQueryMap(queryMap, channelUrl);

	if (queryMapFLSS) {
		const filterObj = { ...queryMapFLSS };
		return fetchLoanChannel(apollo, filterObj, loanQueryVars);
	}

	try {
		return apollo.query({
			query: loanChannelQuery,
			variables: loanQueryVars
		});
	} catch (e) {
		logReadQueryError(e, 'loanChannelUtils preFetchChannel loanChannelQuery');
	}
}

/**
 * Gets the loan channel data from the Apollo cache
 *
 * @param {Object} apollo The Apollo client instance
 * @param {Array} queryMap The map mixin from loan-channel-query-map.js
 * @param {string} channelUrl The URL of the loan channel
 * @param {Object} loanQueryVars The loan channel query variables
 * @returns {Object} The loan channel data
 */
export function getCachedChannel(apollo, queryMap, channelUrl, loanQueryVars) {
	const queryMapFLSS = getFLSSQueryMap(queryMap, channelUrl);

	if (queryMapFLSS) {
		return transformFLSSData(getCachedLoanChannel(apollo, queryMapFLSS, loanQueryVars));
	}

	try {
		return apollo.readQuery({ query: loanChannelQuery, variables: loanQueryVars });
	} catch (e) {
		logReadQueryError(e, 'loanChannelUtils getCachedChannel loanChannelQuery');
	}
}

/**
 * Gets the loan channel data from the API
 *
 * @param {Object} apollo The Apollo client instance
 * @param {Array} queryMap The map mixin from loan-channel-query-map.js
 * @param {string} channelUrl The URL of the loan channel
 * @param {Object} loanQueryVars The loan channel query variables
 * @returns {Object} The loan channel data, transformed if FLSS
 */
export async function getLoanChannel(apollo, queryMap, channelUrl, loanQueryVars) {
	const queryMapFLSS = getFLSSQueryMap(queryMap, channelUrl);

	if (queryMapFLSS) {
		return transformFLSSData(await fetchLoanChannel(apollo, queryMapFLSS, loanQueryVars));
	}

	try {
		return apollo.query({ query: loanChannelQuery, variables: loanQueryVars });
	} catch (e) {
		logReadQueryError(e, 'loanChannelUtils getLoanChannel loanChannelQuery');
	}
}

/**
 * Watches the loan channel query and returns the observer
 *
 * @param {Object} apollo The Apollo client instance
 * @param {Array} queryMap The map mixin from loan-channel-query-map.js
 * @param {Object} selectedQuickFilters Selected quick filters
 * @param {string} channelUrl The URL of the loan channel
 * @param {Object} loanQueryVars The loan channel query variables
 * @param {function} next The function to call in the observer subscription next callback
 * @param {function} watch The function to call to setup the component watch
 * @returns {Object} The Apollo watch observer
 */
export function watchChannelQuery(apollo, queryMap, selectedQuickFilters, channelUrl, loanQueryVars, next, watch) {
	const queryMapFLSS = getFLSSQueryMap(queryMap, channelUrl);

	const filterObj = { ...queryMapFLSS, ...selectedQuickFilters };

	// Check if current user should see the FLSS experiment
	const observer = queryMapFLSS
		? watchLoanChannel(apollo, filterObj, loanQueryVars)
		: apollo.watchQuery({ query: loanChannelQuery, variables: loanQueryVars });

	if (observer) {
		observer.subscribe({
			next: ({ data, loading }) => {
				next(queryMapFLSS ? transformFLSSData(data) : data, loading);
			}
		});

		watch(vars => {
			// eslint-disable-next-line max-len
			observer.setVariables(queryMapFLSS ? getLoanChannelVariables(filterObj, vars) : vars);
		});

		return observer;
	}
}
