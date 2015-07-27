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