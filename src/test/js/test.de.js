QUnit.test("test dash-connected compound nouns", function(assert) {
	// let the spellchecker run.
	var output = spellchecker.checkText('Internet-Plattform');
	assert.equal(output, 'Internet-Plattform', "Should not contain any spellcheck spans." );
});
QUnit.test("test compound noun", function(assert) {
	// let the spellchecker run.
	var output = spellchecker.checkText('Außenministerium');
	assert.equal(output, 'Außenministerium', "Should not contain any spellcheck spans." );
});
QUnit.test("test composit of name and noun", function(assert) {
	// let the spellchecker run.
	var output = spellchecker.checkText('EU-Kommission');
	assert.equal(output, 'EU-Kommission', "Should not contain any spellcheck spans." );
});
QUnit.test("test composit of abbreviation and adjectiv", function(assert) {
	// let the spellchecker run.
	var output = spellchecker.checkText('IT-gestützte');
	assert.equal(output, 'IT-gestützte', "Should not contain any spellcheck spans." );
});
QUnit.test("test composit of noun and adjectiv", function(assert) {
	// let the spellchecker run.
	var output = spellchecker.checkText('menschenunwürdig');
	assert.equal(output, 'menschenunwürdig', "Should not contain any spellcheck spans." );
});
QUnit.test("test composit of noun and adjectiv with hyphen", function(assert) {
	// let the spellchecker run.
	var output = spellchecker.checkText('Menschen-unwürdig');
	assert.equal(output, 'Menschen-unwürdig', "Should not contain any spellcheck spans." );
});
QUnit.test("test finding the correct compositum", function(assert) {
	// let the spellchecker run.
	var output = spellchecker.checkText('Trampolinspringen');
	assert.equal(output, 'Trampolinspringen', "Should not contain any spellcheck spans." );
});
QUnit.test("test finding the correct compositum", function(assert) {
	// let the spellchecker run.
	var output = spellchecker.checkText('Fertigteilen');
	assert.equal(output, 'Fertigteilen', "Should not contain any spellcheck spans." );
});
QUnit.test("test no soft-hyphen are introduced around regular hyphen", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	var output = spellchecker.checkText('IT-Kenntnisse', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, 'IT-Kennt|nis|se', "Should not contain any spellcheck spans." );
});
QUnit.test("test no soft-hyphen are introduced around regular hyphen", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	var output = spellchecker.checkText('Lösungsvorschläge', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, 'Lö|sungs|vor|schlä|ge', "Soft-hyphen should be set correctly." );
});
QUnit.test("test construct is found correctly", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	var output = spellchecker.checkText('Texte/Berichte', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, 'Tex|te/Be|rich|te', "Soft-hyphen should not contain any spellcheck spans. Soft-hyphen should be placed correctly." );
});
QUnit.test("test composit with special characters", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	var output = spellchecker.checkText('"Natur"');
	assert.equal(output, '"Natur"', "Output should not contain any spellcheck spans." );
});
QUnit.test("test multi-dictionary-composit", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	var output = spellchecker.checkText('IOC-Präsident');
	assert.equal(output, 'IOC-Präsident', "Output should not contain any spellcheck spans." );
});
QUnit.test("test no soft-hyphen are introduced at end of word", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	var output = spellchecker.checkText('Softwareunternehmen', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, 'Soft|ware|un|ter|neh|men', "Soft-hyphen should be set correctly." );
});
QUnit.test("test no soft-hyphen are introduced before period", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	var output = spellchecker.checkText('Informationsverarbeitung.', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, 'In|for|ma|tions|ver|ar|bei|tung.', "Soft-hyphen should be set correctly." );
});
QUnit.test("test no soft-hyphen are introduced before comma", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	var output = spellchecker.checkText('Applikationen,', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, 'Ap|pli|ka|tio|nen,', "Soft-hyphen should be set correctly." );
});
QUnit.test("test conflicting variants", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	spellchecker.setAssumeStartOfSentence(false);
	var output = spellchecker.checkText('eng.', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, 'eng.', "Soft-hyphen should be set correctly." );
});
QUnit.test("test composit of abbreviations with slash", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	spellchecker.setAssumeStartOfSentence(false);
	var output = spellchecker.checkText('ASP/XSP', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, 'ASP/XSP', "Soft-hyphen should be set correctly." );
});
QUnit.test("test composit of prenoun", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	spellchecker.setAssumeStartOfSentence(false);
	var output = spellchecker.checkText('Kundenentwicklungsplänen', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, 'Kun|den|ent|wick|lungs|plä|nen', "Soft-hyphen should be set correctly." );
});
QUnit.test("test composit with prenoun and trailing comma", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	spellchecker.setAssumeStartOfSentence(false);
	var output = spellchecker.checkText('Kundenentwicklungsplänen,', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, 'Kun|den|ent|wick|lungs|plä|nen,', "Soft-hyphen should be set correctly." );
});
QUnit.test("test composit with lbracket, noun and rbracket", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	spellchecker.setAssumeStartOfSentence(false);
	var output = spellchecker.checkText('(Auswahl)', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, '(Aus|wahl)', "no warning should be given" );
});
QUnit.test("test composit of adv and verb", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	spellchecker.setAssumeStartOfSentence(false);
	var output = spellchecker.checkText('zurückkehren', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, 'zu|rück|keh|ren', "no warning should be given" );
});
QUnit.test("test composit year and structure", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	spellchecker.setAssumeStartOfSentence(false);
	var output = spellchecker.checkText('1920/21', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, '1920/21', "no warning should be given" );
});
QUnit.test("test composit of brackets, years and structure", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	spellchecker.setAssumeStartOfSentence(false);
	var output = spellchecker.checkText('(1920-1944)', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, '(1920-1944)', "no warning should be given" );
});
QUnit.test("test composit of number, commas and dashes", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	spellchecker.setAssumeStartOfSentence(false);
	var output = spellchecker.checkText('Band 2, 1953, S. 42–43', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, 'Band 2, 1953, S. 42–43', "no warning should be given" );
});
QUnit.test("test composit", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	spellchecker.setAssumeStartOfSentence(false);
	var output = spellchecker.checkText('Nachkriegsjahre', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, 'Nach|kriegs|jah|re', "no warning should be given" );
});
QUnit.test("test joinables", function(assert) {
	var leading = spellchecker.checkWord('Be-');
	var trailing = spellchecker.checkWord('Verarbeitung');
	// lets join both words.
	spellchecker.checkJoinable(leading, trailing);
	// check that leading and trailing has been found as searched.
	assert.ok(leading.variants.length > 0, 'leading portion should have been found as elision');
	// one of the found variant should be a elision.
	for (var i = 0; i < leading.variants.length; i++) {
		if (leading.variants[i].type == 'elision') {
			assert.equal(leading.variants[i].w, 'Be-', 'content of leading portion should be as expected');
			assert.equal(leading.variants[i].type, 'elision', 'type of leading portion should be as expected');
			assert.equal(leading.variants[i].elision, 'Be|ar|bei|tung', 'entire word of leading portion should be as expected');
			return;
		}
	}
	assert.ok(false, 'elision for leading part has not been found');
});

QUnit.test("test enumeration", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	spellchecker.setAssumeStartOfSentence(false);
	var output = spellchecker.checkText('die Mit- und Zusammenarbeit', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, 'die Mit- und Zu|sam|men|ar|beit', "no warning should be given" );
});
QUnit.test("test enumeration", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	spellchecker.setAssumeStartOfSentence(false);
	var output = spellchecker.checkText('die Wohn- und Pflegegruppen', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, 'die Wohn- und Pfle|ge|grup|pen', "no warning should be given" );
});
QUnit.test("test enumeration", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	spellchecker.setAssumeStartOfSentence(false);
	var output = spellchecker.checkText('die Arbeitsmarktbeobachtung und -berichterstattung', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, 'die Ar|beits|markt|beo|bach|tung und -be|richt|er|stat|tung', "no warning should be given" );
});
QUnit.test("test enumeration", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	spellchecker.setAssumeStartOfSentence(false);
	var output = spellchecker.checkText('die Ein- und Wiedereingliederung', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, 'die Ein- und Wie|der|ein|glie|de|rung', "no warning should be given" );
});
QUnit.test("test enumeration", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	spellchecker.setAssumeStartOfSentence(false);
	var output = spellchecker.checkText('die Brillenfassungen und -gläser', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, 'die Bril|len|fas|sun|gen und -glä|ser', "no warning should be given" );
});
QUnit.test("test enumeration with 'bzw.'", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	spellchecker.setAssumeStartOfSentence(false);
	var output = spellchecker.checkText('Aktiv- bzw. Passivkonten', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, 'Ak|tiv- bzw. Pas|siv|kon|ten', "no warning should be given" );
});
QUnit.test("test enumeration with comma", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	spellchecker.setAssumeStartOfSentence(false);
	var output = spellchecker.checkText('Damen-, Herren- und Kindermode', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, 'Da|men-, Her|ren- und Kin|der|mo|de', "no warning should be given" );
});
QUnit.test("test enumeration with comma", function(assert) {
	// let the spellchecker run. replace soft-hyphen back to pipe characters.
	spellchecker.setAssumeStartOfSentence(false);
	var output = spellchecker.checkText('Bewegungs-, Fitness- und Sportaktivitäten', {hyphenation: true}).replace(/\u00ad/g, '|');
	assert.equal(output, 'Be|we|gungs-, Fit|ness- und Sport|ak|ti|vi|tä|ten', "no warning should be given" );
});
