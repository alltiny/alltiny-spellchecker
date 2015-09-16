QUnit.test("test searching filter in empty dictionary", function(assert) {
	// create an empty dictionary.
	spellchecker.addDictionary(new alltiny.Dictionary({fragments: ["a-z"]}));
	// search for the word filter
	var output = spellchecker.check('filter');
	assert.equal(output, '<span class=\"spellcheck highlight error unknown\">filter</span>', "Since wor is unknown, it should be wrapped by a spellcheckspan." );
});