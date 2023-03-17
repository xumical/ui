import { render } from '@testing-library/vue';
import TeamAttribution from '../../../../../src/components/Checkout/TeamAttribution';
import basketLoanTeams from '../../../fixtures/BasketLoanTeams.json';

describe('TeamDropDown', () => {
	beforeEach(() => {
	});
	afterEach(jest.clearAllMocks);

	it('should contain these components', async () => {
		const {
			getByText, getAllByTestId, getByRole, getByDisplayValue
		} = render(
			TeamAttribution,
			{
				provide: {
					apollo: {
						readQuery: () => {
						},
					},
				},
				props: {
					teams: basketLoanTeams,
				}
			}
		);
		const TeamSelector = getAllByTestId('basket-loan-team-selector');
		const Team = document.getElementById('team_select');
		const TeamSelected = Team.options[Team.selectedIndex].getAttribute('value');
		expect(TeamSelected).toBe('0'); // None should be selected by default
		// all team options should be present, though not selected
		const TeamOption1 = getByText('Donut Empire');
		const TeamOption2 = getByText('Nerdfighters');
		const TeamOption3 = getByText(
			'(A+) Atheists, Agnostics, Skeptics, Freethinkers, Secular Humanists and the Non-Religious'
		);

		const TeamShowing = getByDisplayValue('None');
		const TeamAttributionOption0 = getByRole('option', { name: 'None' });
		const TeamAttributionOption1 = getByRole('option', { name: 'Donut Empire' });
		const TeamAttributionOption2 = getByRole('option', { name: 'Nerdfighters' });
		const TeamAttributionOption3 = getByRole('option', {
			name: '(A+) Atheists, Agnostics, Skeptics, Freethinkers, Secular Humanists and the Non-Religious'
		});

		expect(TeamSelector[1]).toMatchObject(TeamAttributionOption0);
		expect(TeamShowing).toBeDefined();
		expect(TeamOption1).toBe(TeamAttributionOption1);
		expect(TeamOption2).toBe(TeamAttributionOption2);
		expect(TeamOption3).toBe(TeamAttributionOption3);
	});

	it('should be hidden entirely if there are no teams given', async () => {
		const {
			getAllByTestId, getByRole
		} = render(
			TeamAttribution,
			{
				provide: {
					apollo: {
						readQuery: () => {
						},
					},
				},
			}
		);
		const TeamSelection = getAllByTestId('basket-loan-team-selector');
		const TeamSelector = getByRole('img', { hidden: true });
		const TeamSelectorHidden = TeamSelector.getAttribute('aria-hidden');
		const TeamSelect = document.getElementById('team_select');

		expect(TeamSelect.classList[8]).toBe('tw-appearance-none');
		expect(TeamSelectorHidden).toBe('true');
		expect(TeamSelection).toBeDefined();
	});
});
