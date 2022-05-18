import { render, fireEvent } from '@testing-library/vue';
import LoanSearchGenderFilter,
{
	BOTH_KEY,
	BOTH_TITLE,
	FEMALE_KEY,
	FEMALE_TITLE,
	MALE_KEY,
	MALE_TITLE
} from '@/components/Lend/LoanSearch/LoanSearchGenderFilter';

describe('LoanSearchGenderFilter', () => {
	it('should default to both', async () => {
		const { getByLabelText } = render(LoanSearchGenderFilter);
		const radio = getByLabelText(BOTH_TITLE);
		expect(radio.checked).toBeTruthy();
	});

	it('should select based on prop', async () => {
		const { getByLabelText, updateProps } = render(LoanSearchGenderFilter, { props: { gender: BOTH_KEY } });

		let radio = getByLabelText(BOTH_TITLE);
		expect(radio.checked).toBeTruthy();

		await updateProps({ gender: FEMALE_KEY });
		radio = getByLabelText(FEMALE_TITLE);
		expect(radio.checked).toBeTruthy();

		await updateProps({ gender: MALE_KEY });
		radio = getByLabelText(MALE_TITLE);
		expect(radio.checked).toBeTruthy();

		await updateProps({ gender: '' });
		radio = getByLabelText(BOTH_TITLE);
		expect(radio.checked).toBeTruthy();

		await updateProps({ gender: 'asd' });
		radio = getByLabelText(BOTH_TITLE);
		expect(radio.checked).toBeTruthy();
	});

	it('should select based on click', async () => {
		const { getByLabelText } = render(LoanSearchGenderFilter, { props: { gender: BOTH_KEY } });

		let radio = getByLabelText(BOTH_TITLE);
		expect(radio.checked).toBeTruthy();

		radio = getByLabelText(FEMALE_TITLE);
		expect(radio.checked).toBeFalsy();
		await fireEvent.click(radio);
		expect(radio.checked).toBeTruthy();

		radio = getByLabelText(MALE_TITLE);
		expect(radio.checked).toBeFalsy();
		await fireEvent.click(radio);
		expect(radio.checked).toBeTruthy();
	});
});
