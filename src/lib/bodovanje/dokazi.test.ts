import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dokazanoDo } from './dokazi.ts';

test('dokaz vrijedi od dana potvrde; odbijen i onaj koji čeka ne vrijede', () => {
	const dokazi = [
		{ kriterij: 'staz_izvan', stanje: 'potvrden' as const, odluceno: '2026-07-28' },
		{ kriterij: 'uzdrzavani', stanje: 'odbijen' as const, odluceno: '2026-07-18' },
		{ kriterij: 'samohrani', stanje: 'ceka' as const, odluceno: null },
	];
	assert.equal(dokazanoDo(dokazi, '2026-07-20')('staz_izvan'), false);
	assert.equal(dokazanoDo(dokazi, '2026-07-28')('staz_izvan'), true);
	assert.equal(dokazanoDo(dokazi, '2026-08-24T12:00')('staz_izvan'), true);
	assert.equal(dokazanoDo(dokazi, '2026-12-31')('uzdrzavani'), false);
	assert.equal(dokazanoDo(dokazi, '2026-12-31')('samohrani'), false);
});
