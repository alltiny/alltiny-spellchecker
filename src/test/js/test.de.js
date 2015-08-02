QUnit.test("test dash-connected compound nouns", function(assert) {
	// let the spellchecker run.
	var output = spellchecker.check('Internet-Plattform');
	assert.equal(output, 'Internet-Plattform', "Should not contain any spellcheck spans." );
});
QUnit.test("test compound noun", function(assert) {
	// let the spellchecker run.
	var output = spellchecker.check('Außenministerium');
	assert.equal(output, 'Außenministerium', "Should not contain any spellcheck spans." );
});
QUnit.test("test composit of name and noun", function(assert) {
	// let the spellchecker run.
	var output = spellchecker.check('EU-Kommission');
	assert.equal(output, 'EU-Kommission', "Should not contain any spellcheck spans." );
});
QUnit.test("test composit of abbreviation and adjectiv", function(assert) {
	// let the spellchecker run.
	var output = spellchecker.check('IT-gestützte');
	assert.equal(output, 'IT-gestützte', "Should not contain any spellcheck spans." );
});