import { fetchData } from '@/util/flssUtils';
import flssLoanQuery from '@/graphql/query/flssLoansQuery.graphql';

describe('flssUtils.js', () => {
	describe('fetchData', () => {
		const result = { values: [], totalCount: 0 };
		const dataObj = {
			data: { fundraisingLoans: result }
		};

		const apollo = {
			query: jest.fn(() => Promise.resolve(dataObj)),
		};

		const loanQueryFilters = { any: ['US'] };

		const apolloVariables = {
			query: flssLoanQuery,
			variables: {
				filterObject: loanQueryFilters,
				limit: 20
			},
			fetchPolicy: 'network-only',
		};

		it('Checks if the query filters are run through apollo', () => {
			fetchData(loanQueryFilters, apollo);
			expect(apollo.query).toHaveBeenCalledWith(apolloVariables);
		});

		it('Returns the currently fundraising loans data', done => {
			fetchData(loanQueryFilters, apollo).then(data => {
				expect(data).toBe(result);
				done();
			});
		});
	});
});
