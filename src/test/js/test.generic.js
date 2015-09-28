QUnit.test("test searching filter in empty dictionary", function(assert) {
	// create an empty dictionary.
	spellchecker.addDictionary(new alltiny.Dictionary({fragments: ["a-z"]}));
	// search for the word filter
	var output = spellchecker.check('filter');
	assert.equal(output, '<span class=\"spellcheck highlight error unknown\">filter</span>', "Since word is unknown, it should be wrapped by a spellcheckspan.");
});
QUnit.test("test with range selection", function(assert) {
	// search for the word filter
	var output = spellchecker.check(' \u2038TEST\u2038 ');
	assert.equal(output, ' <span class=\"spellcheck highlight error unknown\">\u2038TEST\u2038</span> ', "Word should still be wrapped by cursor characters.");
});
QUnit.test("test with range selection and HTML entities", function(assert) {
	// search for the word filter
	var output = spellchecker.check(' \u2038<TEST>\u2038 ');
	assert.equal(output, ' <span class=\"spellcheck highlight error unknown\">\u2038&lt;TEST&gt;\u2038</span> ', "Word should still be wrapped by cursor characters and HTML entities should be correct.");
});
QUnit.test("test cursor positions", function(assert) {
	var cursorPositions = new alltiny.Spellchecker().getCursorPositions('||foo|', '|');
	assert.equal(cursorPositions.length, 3, "number of found positions");
	assert.equal(cursorPositions[0], 0, "index of first position");
	assert.equal(cursorPositions[1], 1, "index of second position");
	assert.equal(cursorPositions[2], 5, "index of third position");
});
QUnit.test("test word in range selection is found", function(assert) {
	// initialize the spellchecker.
	var spellchecker = new alltiny.Spellchecker({hyphenation : false, highlightKnownWords: false});
	var dictionary = new alltiny.Dictionary();
	dictionary.addWord({w:"<TEST>",type:"name"});
	spellchecker.addDictionary(dictionary);
	// search for the word filter
	var output = spellchecker.check('\u2038<TEST>\u2038');
	assert.equal(output, '\u2038<TEST>\u2038', "Word should have been found.");
});