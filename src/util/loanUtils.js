import numeral from 'numeral';
import _get from 'lodash/get';

/** Utility functions for working with loan objects */

/**
 * Loan Statuses Available on borrower profile
 */
export const ALLOWED_LOAN_STATUSES = [
	// 'defaulted',
	// 'deleted',
	// 'ended',
	'expired',
	'funded',
	'fundraising',
	'inactive',
	// 'inactiveExpired',
	// 'issue',
	// 'payingBack',
	'pfp',
	'raised',
	// 'refunded',
	// 'reviewed'
];

/**
 * Returns true if loan is fundraising / can be lent to
 *
 * @param {object} loan
 * @returns {boolean|null}
 */
export function isLoanFundraising(loan) {
	// check status
	if (_get(loan, 'status') !== 'fundraising') {
		return false;
	}
	// check fundraising information
	const loanAmount = numeral(_get(loan, 'loanAmount'));
	const fundedAmount = numeral(_get(loan, 'loanFundraisingInfo.fundedAmount'));
	const reservedAmount = numeral(_get(loan, 'loanFundraisingInfo.reservedAmount'));
	// loan amount vs funded amount
	if (loanAmount.value() === fundedAmount.value()) {
		return false;
	}
	// loan amount vs funded + reserved amount
	if (loanAmount.value() <= (fundedAmount.value() + reservedAmount.value())) {
		return false;
	}
	// all clear
	return true;
}

/**
 * Returns the why special string for the loan if it is defined
 *
 * @param {string} whySpecial from LoanBasic.whySpecial
 * @returns {string}
 */
export function formatWhySpecial(whySpecial = '') {
	if (whySpecial) {
		const lowerCaseWhySpecial = whySpecial.toString().charAt(0).toLowerCase() + whySpecial.toString().slice(1);
		return `This loan is special because ${lowerCaseWhySpecial.trim()}`;
	}
	return '';
}

export function buildPriceArray(amountLeft, minAmount) {
	// get count of shares based on available remaining amount.
	const N = amountLeft / minAmount;
	// convert this to formatted array for our select element
	const priceArray = []; // ex. priceArray = ['25', '50', '75']
	for (let i = 1; i <= N; i += 1) {
		priceArray.push(numeral(minAmount * i).format('0,0'));
	}
	return priceArray;
}

export function build5DollarsPriceArray(amountLeft) {
	const limit5Notes = amountLeft < 50 ? amountLeft : 50;
	const numberOf5 = limit5Notes / 5;
	const numberOf25 = Math.ceil((amountLeft - limit5Notes) / 25) + 1;
	const priceArray = [];
	for (let i = 1; i <= numberOf5; i += 1) {
		priceArray.push(numeral(5 * i).format('0,0'));
	}
	if (amountLeft > limit5Notes) {
		for (let i = 3; i <= numberOf25; i += 1) {
			priceArray.push(numeral(25 * i).format('0,0'));
		}
	}
	return priceArray;
}

export function getDropdownPriceArray(unreservedAmount, minAmount, enableFiveDollarsNotes, inPfp = false) {
	const parsedAmountLeft = parseFloat(unreservedAmount);
	return (enableFiveDollarsNotes && !inPfp) ? build5DollarsPriceArray(parsedAmountLeft).slice(0, 28) : buildPriceArray(parsedAmountLeft, minAmount).slice(0, 20); // eslint-disable-line max-len
}

export function getDropdownPriceArrayCheckout(remainingAmount, minAmount, enableFiveDollarsNotes) {
	if (enableFiveDollarsNotes) {
		const parsedAmountLeft = parseFloat(remainingAmount);
		return build5DollarsPriceArray(parsedAmountLeft).slice(0, 47);
	}
	const pricesArray = buildPriceArray(remainingAmount, minAmount);
	const reducedArray = pricesArray.filter(element => {
		return element % 25 === 0;
	});
	return reducedArray;
}

export function toParagraphs(text) {
	return String(text).replace(/\r|\n|<br\s*\/?>/g, '\n').split(/\n+/);
}

/**
 * Determines if the remaining amount of a loan is less than the match amount
 * If the full match amount can't be purchased we hide the match text as the purchase would not be matched
 *
 * @param {object} loan from LoanBasic
 * @returns {boolean}
 */
export function isMatchAtRisk(loan) {
	// exit if this loan isn't matched
	if (!loan || !loan.matchingText) return false;
	// get vars
	const {
		fundedAmount,
		reservedAmount
	} = loan.loanFundraisingInfo;
	// make strings numbers + perform preliminary calculations
	const loanAmountCalc = numeral(loan.loanAmount || 0).value();
	const loanFundraisingCalc = numeral(reservedAmount || 0).add(numeral(fundedAmount || 0).value());
	const remainingAmountCalculation = loanAmountCalc - loanFundraisingCalc.value();
	// 25_hard_coded - match ratio * 25 (match purchase) + 25 (lowest lender purchase possible)
	const matchAmountCalculation = numeral(numeral(loan.matchRatio || 1).multiply(25)).add(25);
	// final comparison: is the loan amount remaining less than the potential match amount?
	return numeral(remainingAmountCalculation).value()
		< numeral(matchAmountCalculation).value();
}

export function queryLoanData({
	apollo, cookieStore, loanId, loanQuery
}) {
	return apollo.query({
		query: loanQuery,
		variables: {
			basketId: cookieStore.get('kvbskt'),
			loanId,
		},
	});
}

export function readLoanData({
	apollo, cookieStore, loanId, loanQuery
}) {
	// Read loan data from the cache (synchronus)
	try {
		return apollo.readQuery({
			query: loanQuery,
			variables: {
				basketId: cookieStore.get('kvbskt'),
				loanId,
			},
		});
	} catch (e) {
		// if there's an error it means there's no loan data in the cache yet, so return null
		return null;
	}
}

export function watchLoanData({
	apollo, cookieStore, loanId, loanQuery, callback
}) {
	// Setup query observer to watch for changes to the loan data (async)
	const queryObserver = apollo.watchQuery({
		query: loanQuery,
		variables: {
			basketId: cookieStore.get('kvbskt'),
			loanId,
		},
	});

	// Subscribe to the observer to see each result
	queryObserver.subscribe({
		next: result => callback(result),
		error: error => callback({ error }),
	});

	// Return the observer to allow modification of variables
	return queryObserver;
}

export function watchLoanCardData({
	apollo, loanId, loanCardQuery, callback
}) {
	// Setup query observer to watch for changes to the loan data (async)
	const queryObserver = apollo.watchQuery({
		query: loanCardQuery,
		variables: {
			loanId,
		},
	});

	// Subscribe to the observer to see each result
	queryObserver.subscribe({
		next: result => callback(result),
		error: error => callback({ error }),
	});

	// Return the observer to allow modification of variables
	return queryObserver;
}

export function readLoanFragment({
	apollo, loanId, fragment
}) {
	let partnerFragment;
	let directFragment;
	try {
		// Attempt to read the loan card fragment for LoanPartner from the cache
		// If cache is missing fragment fields, this will throw an invariant error
		partnerFragment = apollo.readFragment({
			id: `LoanPartner:${loanId}`,
			fragment,
		}) || null;
	} catch (e) {
		// no-op
	}
	try {
		// Attempt to read the loan card fragment for LoanDirect from the cache
		// If cache is missing fragment fields, this will throw an invariant error
		directFragment = apollo.readFragment({
			id: `LoanDirect:${loanId}`,
			fragment,
		}) || null;
	} catch (e) {
		// no-op
	}
	return partnerFragment || directFragment;
}

export function isLessThan25(unreservedAmount) {
	return unreservedAmount < 25 && unreservedAmount > 0;
}

export function isBetween25And50(unreservedAmount) {
	return unreservedAmount <= 50 && unreservedAmount > 25;
}

export function isBetween25And500(unreservedAmount) {
	return unreservedAmount < 500 && unreservedAmount >= 25;
}

/**
 * Returns an array of loan callouts following a hierarchy of importance
 *
 * @param {Object} loan The loan data object
 * @param {String} categoryPageName The optional name of the category
 * @returns An array of loan callout strings
 */
export function loanCallouts(loan, categoryPageName) {
	const callouts = [];
	const activityName = loan?.activity?.name ?? '';
	const sectorName = loan?.sector?.name ?? '';
	const tags = loan?.tags?.filter(tag => tag.charAt(0) === '#')
		.map(tag => tag.substring(1)) ?? [];
	const themes = loan?.themes ?? [];
	const categories = {
		ecoFriendly: !!tags
			.filter(t => t.toUpperCase() === 'ECO-FRIENDLY' || t.toUpperCase() === 'SUSTAINABLE AG').length,
		refugeesIdps: !!themes.filter(t => t.toUpperCase() === 'REFUGEES/DISPLACED').length,
		singleParents: !!tags.filter(t => t.toUpperCase() === 'SINGLE PARENT').length
	};

	// P1 Category
	// Exp limited to: Eco-friendly, Refugees and IDPs, Single Parents
	if (!categoryPageName) {
		if (categories.ecoFriendly) {
			callouts.push('Eco-friendly');
		} else if (categories.refugeesIdps) {
			callouts.push('Refugees and IDPs');
		} else if (categories.singleParents) {
			callouts.push('Single Parent');
		}
	}

	// P2 Activity
	if (activityName && categoryPageName?.toUpperCase() !== activityName.toUpperCase()) {
		callouts.push(activityName);
	}

	// P3 Sector
	if (sectorName
		&& (activityName.toUpperCase() !== sectorName.toUpperCase())
		&& (sectorName.toUpperCase() !== categoryPageName?.toUpperCase())
		&& callouts.length < 2) {
		callouts.push(sectorName);
	}

	// P4 Tag
	if (!!tags.length && callouts.length < 2) {
		const position = Math.floor(Math.random() * tags.length);
		const tag = tags[position];
		if (!callouts.filter(c => c.toUpperCase() === tag.toUpperCase()).length) {
			callouts.push(tag);
		}
	}

	// P5 Theme
	if (!!themes.length && callouts.length < 2) {
		const position = Math.floor(Math.random() * themes.length);
		const theme = themes[position];
		if (!callouts.filter(c => c.toUpperCase() === theme.toUpperCase()).length) {
			callouts.push(theme);
		}
	}

	return callouts;
}

/**
 * Enables session cookie
 *
 * @param	{String}	cookieName	The cookie name
 * @param	{Object}	cookieStore The cookie store
 * @param	{String}	expDate		The expiration
 * @returns {void}
 */
export function enableCookie(cookieName, cookieStore, expDate) {
	if (!cookieStore.get(cookieName)) {
		cookieStore.set(
			cookieName,
			true,
			{ expires: expDate }
		);
	}
}

/**
 * Checks if ERL cookie is active
 * @param 	{Object} 		cookieStore The cookie store
 * @returns {String}		Active cookie name
 */
export function isErlCookieActive(cookieStore) {
	if (cookieStore.get('erl-five-notes-base')) {
		return 'erl-five-notes-base';
	}
	if (cookieStore.get('erl-five-notes-top')) {
		return 'erl-five-notes-top';
	}
	return '';
}

/**
 * Get CTA dropdown default value based on cookie
 * @param 	{String} 	cookieName
 * @param	{Number}	balance
 * @returns	{Number}	Default selected value
 */
export function getCookieDropdown(cookieName, balance, unreservedAmount) {
	if (cookieName === 'erl-five-notes-base') {
		const val = Math.floor(balance / 5) * 5;
		return (unreservedAmount < balance || val === 0) ? 5 : val;
	}
	return 5;
}
