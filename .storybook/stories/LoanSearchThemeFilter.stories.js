import LoanSearchThemeFilter from '@/components/Lend/LoanSearch/LoanSearchThemeFilter';

export default {
	title: 'Loan Search/Loan Search Theme Filter',
	component: LoanSearchThemeFilter,
};

const story = (args = {}) => {
	const template = (_, { argTypes }) => ({
		props: Object.keys(argTypes),
		components: { LoanSearchThemeFilter },
		template: '<loan-search-theme-filter :themes="themes" />',
	})
	template.args = args;
	return template;
};

const items = (disabled = false) => [...Array(4)].map((_, i) => ({ id: i, name: `Option ${i}`, numLoansFundraising: disabled ? 0 : 5 }));

export const Default = story({ themes: items() });

export const NoneFundraising = story({ themes: items(true) });
