var alltiny = alltiny || {};
alltiny.Spellchecker = function(options) {
	this.options = jQuery.extend(true, {
		hyphenation               : true,
		highlighting              : true,
		highlightUnknownWords     : true,
		highlightKnownWords       : false,
		highlightMismatches       : true,
		highlightCaseWarnings     : true,
		highlightNonStandalone    : true, // with this option '!', '?', '.', ',', ';', ':' are marked when found standing alone.
		highlightMissingWhitespace: true,
		cursorCharacter           : '\u2038',
		autoResetAfterApply       : true,
		patternsToIgnore          : [/^-{3,}$/, /^\.{5,}$/, /^_{3,}$/], // regular expressions for custom patterns that should not be spellchecked (performance increase cause they must not be analyzed)
		patternsToMark            : [/-{2}/]  // regular expressions for custom patterns that should be marked as misspellings
	}, options);
	this.dictionaries = [];
	this.assumeStartOfSentence = true; // if true the first word in a check is assumed to be the start of a sentence.
	this.caseInsensitiveForNextWord = false; // if true then for the next upcoming word case-sensitivity is disabled.
	this.variantCache = [];
	this.findings = [];
};

/**
 * This method adds a dictionary to the spellchecker.
 * A dictionary looks like this:
 * {
 *   name: 'trademarks'
 *   words:
 * }
 */
alltiny.Spellchecker.prototype.addDictionary = function(dictionary) {
	if (dictionary) {
		this.dictionaries.push(dictionary);
	}
};

/**
 * @return all currently loaded dictionaries.
 */
alltiny.Spellchecker.prototype.getDictionaries = function() {
	return this.dictionaries;
};

/**
 * The spellchecker is a state-machine, allowing to connect multiple checks.
 * This method will reset the spellchecker.
 */
alltiny.Spellchecker.prototype.reset = function() {
	this.findings = [];
};

/**
 * This method exposes the internal findings the spellchecker had for every word of the text.
 * The findings can be used for analysis but should not be modified.
 */
alltiny.Spellchecker.prototype.getFindings = function() {
	return this.findings;
};

/**
 * This method performs the spell check on the given text. This is a convenience
 * method relying on {@link #check()}.
 * @param text which content should be checked.
 * @param options by default the options given to this spellchecker while
 *        initialization are used, but with this option you can give a different
 *        option set in for this particular spell check run.
 * @return text with spell check highlights
 */
alltiny.Spellchecker.prototype.checkText = function(text, options) {
	this.check(text, options);
	this.analyze();
	return this.applyFindings(alltiny.clone({content: text}, options));
};

/**
 * This method performs the spell check on the given text. Calling this method will
 * add all findings to the internal array. You should use analyze() and applyFindings()
 * after all the text is checked.
 * @param text which content should be checked.
 * @param options by default the options given to this spellchecker while
 *        initialization are used, but with this option you can give a different
 *        option set in for this particular spell check run.
 * @return none
 */
alltiny.Spellchecker.prototype.check = function(text, options) {
	var thisObj = this;
	// determine the check options; fall-back to the spellchecker options if not given.
	var checkOptions = alltiny.clone(this.options, options); // deep copy to avoid overrides. uses this.options as defaults.

	checkOptions.context = checkOptions.context || {};
	/* prepare the symbol map: if a language locale is defined only use symbols
	 * from this language, else merge all symbols of all dictionaries together. */
	for (var i = 0; i < this.dictionaries.length; i++) {
		var dictionary = this.dictionaries[i];
		if (!checkOptions.language || dictionary.options.locale == checkOptions.language) {
			checkOptions.context.symbols = alltiny.Spellchecker.mergeDictionaries(checkOptions.context.symbols, dictionary.options.symbols);
		}
	}
	/* load the demanded composit map. */
	for (var i = 0; i < this.dictionaries.length; i++) {
		var dictionary = this.dictionaries[i];
		if ((!checkOptions.language || dictionary.options.locale == checkOptions.language) && dictionary.options.composits) {
			checkOptions.context.composits = dictionary.options.composits;
			break;
		}
	}

	// ignore if the text only contains of the cursor character.
	if (text === checkOptions.cursorCharacter) {
		return;
	}
	// use the word regex to split text into words.
	text.replace(/[^\s]+/ig, function(word, offset, content) {
		var current = thisObj.checkWord(word, checkOptions);
		current.offset = offset;
		current.contentLength = content.length;
		current.caseInsensitive = thisObj.caseInsensitiveForNextWord;
		thisObj.caseInsensitiveForNextWord = false;
		current.assumeStartOfSentence = thisObj.assumeStartOfSentence;
		thisObj.assumeStartOfSentence = false;

		thisObj.findings.push(current);
	});
	// if the text is white-spaces-only, then flag the previous finding.
	if (/^\s+$/.test(text.replace(new RegExp(checkOptions.cursorCharacter, 'g'), '')) && thisObj.findings.length > 0) {
		thisObj.findings[thisObj.findings.length - 1].checkOptions.checkWhitespaceAtEnd = false;
	}
};

/**
 * This method will check for a single given word.
 * @return findings as a structure
 */
alltiny.Spellchecker.prototype.checkWord = function(word, options) {
	var thisObj = this;
	// determine the check options; fall-back to the spellchecker options if not given.
	var checkOptions = options || this.options;

	var cursorPos = thisObj.getCursorPositions(word, checkOptions.cursorCharacter);
	var isCursorAtBeginning = false;
	var isCursorAtEnding = false;
	var isCursorInMiddle = false;
	var lastPossiblePos = word.length - checkOptions.cursorCharacter.length;
	for (var i = 0; i < cursorPos.length; i++) {
		if (i == 0 && cursorPos[i] == 0) {
			isCursorAtBeginning = true;
		} else if (i == cursorPos.length - 1 && cursorPos[i] == lastPossiblePos) {
			isCursorAtEnding = true;
		} else {
			isCursorInMiddle = true;
		}
	}
	var cleanWord = word
		.replace(new RegExp(checkOptions.cursorCharacter, 'g'), '') // remove the cursor character
		.replace(/\u00ad/g, '')   // remove all soft-hyphens from the word.
		.replace(/\u200b/g, '')	  // remove zero-width-white-spaces from the word.
		.replace(/\u2011/g, '-'); // replace non breakable hyphens with normal hyphens

	var finding = new alltiny.Finding({
		word               : word,
		cleanWord          : cleanWord,
		checkOptions       : checkOptions,
		node               : checkOptions.node,
		variants           : null,
		isCursorAtBeginning: isCursorAtBeginning,
		isCursorAtEnding   : isCursorAtEnding,
		isCursorInMiddle   : isCursorInMiddle
	});

	for (var i = 0; i < this.options.patternsToIgnore.length; i++) {
		if (cleanWord.match(this.options.patternsToIgnore[i])) {
			finding.variants = [{
				w   : cleanWord,
				type: 'ignored'
			}];
			return finding;
		}
	}

	for (var i = 0; i < this.options.patternsToMark.length; i++) {
		if (cleanWord.match(this.options.patternsToMark[i])) {
			finding.variants = [];
			return finding;
		}
	}

	if (cleanWord.length === 0) {
		finding.variants = null;
	} else if (this.variantCache[cleanWord] &&  typeof this.variantCache[cleanWord] !== 'function') { // lookup the document-cache before searching with the dictionaries.
		finding.variants = this.variantCache[cleanWord];
	} else { // start searching the dictionaries.
		finding.variants = this.askCrossDictionaries(cleanWord, checkOptions.context);
		this.variantCache[cleanWord] = finding.variants;
	}	

	return finding;
};

/**
 * This method will analyze the current findings on higher levels.
 */
alltiny.Spellchecker.prototype.analyze = function() {
	alltiny.Spellchecker.analyzeMissingWhiteSpaces(this.findings, this);
	var previous = null;
	for (var i = 0; i < this.findings.length; i++) {
		var current = this.findings[i];
		if (previous && previous.endOfSentence) {
			current.assumeStartOfSentence = true;
		}
		if (!current.variants || current.variants.length == 0) {
			var lastChar = current.cleanWord.length > 0 ? current.cleanWord[current.cleanWord.length - 1] : '';
			current.endOfSentence = lastChar == '.' || lastChar == '!' || lastChar == '?';
		}
		// if this is an interpunctuation then check against the previous finding that it is not standing alone.
		if (current.variants && current.variants.length > 0) {
			var allVariantsAreEndOfSentence = true;
			for (var v = 0; v < current.variants.length; v++) {
				if (!current.variants[v].endOfSentence) {
					allVariantsAreEndOfSentence = false;
				}
			}
			if (allVariantsAreEndOfSentence) {
				current.endOfSentence = true;
			}
			if (current.variants.length == 1 && (current.variants[0].type == 'interpunctuation' || current.variants[0].type == 'punctuation')) {
				current.isTouchingPrevious = current.offset == 0 && previous && (previous.contentLength - previous.offset - previous.word.length == 0);
			}
		}

		// if the current finding ends with '-,' or '-' then search for enumerations.
		if (current.cleanWord.substring(current.cleanWord.length - 2) == '-,' || current.cleanWord[current.cleanWord.length - 1] == '-') {
			// search until a conjunction is found.
			var joinDone = false;
			for (var p = i + 1; p < this.findings.length && !joinDone; p++) {
				var trailingFinding = this.findings[p];
				var isConjunction = false;
				if (trailingFinding.variants) {
					for (var v = 0; v < trailingFinding.variants.length && !joinDone; v++) {
						var trailingVariant = trailingFinding.variants[v];
						if (trailingVariant.type == 'conjunction' || (trailingVariant.type == 'abbr' && trailingVariant.abbrType == 'conjunction')) {
							isConjunction = true;
							break;
						}
					}
				}
				if (isConjunction || trailingFinding.cleanWord.substring(trailingFinding.cleanWord.length - 2) == '-,' || trailingFinding.cleanWord[trailingFinding.cleanWord.length - 1] == '-') {
					continue;
				} else {
					this.checkJoinable(current, trailingFinding, current.checkOptions.context);
					joinDone = true;
					break;
				}
			}
		}
		// if the current finding starts with '-' then search for enumerations.
		if (current.cleanWord.length > 0 && current.cleanWord[0] == '-') {
			// search in both directions.
			var joinDone = false;
			for (var p = i - 1; p >= 0 && !joinDone; p--) {
				var otherFinding = this.findings[p];
				var isConjunction = false;
				if (otherFinding.variants) {
					for (var v = 0; v < otherFinding.variants.length && !joinDone; v++) {
						var variant = otherFinding.variants[v];
						if (variant.type == 'conjunction' || (variant.type == 'abbr' && variant.abbrType == 'conjunction')) {
							isConjunction = true;
							break;
						}
					}
				}
				if (isConjunction || otherFinding.cleanWord[0] == '-') {
					continue;
				} else {
					this.checkJoinable(otherFinding, current, current.checkOptions.context);
					joinDone = true;
					break;
				}
			}
			var joinDone = false;
			for (var p = i + 1; p < this.findings.length && !joinDone; p++) {
				var otherFinding = this.findings[p];
				var isConjunction = false;
				if (otherFinding.variants) {
					for (var v = 0; v < otherFinding.variants.length && !joinDone; v++) {
						var variant = otherFinding.variants[v];
						if (variant.type == 'conjunction' || (variant.type == 'abbr' && variant.abbrType == 'conjunction')) {
							isConjunction = true;
							break;
						}
					}
				}
				if (isConjunction || otherFinding.cleanWord[0] == '-') {
					continue;
				} else {
					this.checkJoinable(this.findings[p], current, current.checkOptions.context);
					joinDone = true;
					break;
				}
			}
		}

		// if the current finding contains '/-' then test for an elision.
		var slashPos = current.cleanWord.length > 0 ? current.cleanWord.indexOf('/-') : -1;
		if (slashPos > -1) {
			var leadingWord = current.cleanWord.substring(0, slashPos);
			var trailingWord = current.cleanWord.substring(slashPos + 1);
			// search the leading part separately.
			var leading = this.checkWord(leadingWord, current.checkOptions);
			var trailing = this.checkWord(trailingWord, current.checkOptions);
			// check for trailing being an elision.
			this.checkJoinable(leading, trailing, current.checkOptions.context);
			for (var l = 0; l < leading.variants.length; l++) {
				var lvar = leading.variants[l];
				for (var t = 0; t < trailing.variants.length; t++) {
					var tvar = trailing.variants[t];
					if (tvar.type == 'elision') {
						current.addVariant({
							w            : lvar.w + '/' + tvar.w,
							type         : 'composit',
							composits    : [].concat(lvar.composits ? lvar.composits : lvar).concat({w: '/', type: 'structure'}).concat(tvar.composits ? tvar.composits : tvar),
							endOfSentence: tvar.endOfSentence == true ? true : undefined
						});
					}
				}
			}
		}
		previous = current;
	}
};

/**
 * Calling this method will trigger the spellchecker to apply all current findings.
 */
alltiny.Spellchecker.prototype.applyFindings = function(options) {
	var checkOptions = alltiny.clone(this.options, options); // deep copy to avoid overrides. uses this.options as defaults.
	var currentNode = null;
	var currentContent = checkOptions.content || '';
	// work backwards through the findings since the offsets are no longer true after a replacement.
	for (var i = this.findings.length - 1; i >= 0; i--) {
		var finding = this.findings[i];
		if (finding.node != currentNode) {
			if (currentNode != null) {
				jQuery(currentNode).replaceWith(currentContent);
			}
			currentNode = finding.node;
			currentContent = currentNode.nodeValue;
		}
		if (currentContent != null && checkOptions.highlighting) {
			currentContent = currentContent.substring(0, finding.offset) + this.createReplacement(finding) + currentContent.substring(finding.offset + finding.word.length);
		}
	}
	if (checkOptions.autoResetAfterApply) {
		this.reset();
	}
	if (currentNode != null) {
		jQuery(currentNode).replaceWith(currentContent);
	} else { // if no node has been defined then this must have been a text-check.
		return currentContent;
	}
};

alltiny.Spellchecker.prototype.createReplacement = function(current) {
	var checkOptions = current.checkOptions;
	if (current.cleanWord.length == 0) { // this happens when the cursor character has been the word to check.
		return alltiny.encodeAsHTML(current.word);
	}
	var errorClasses = '';
	// show error unknown
	if (checkOptions.highlightUnknownWords && current.variants.length === 0) {
		errorClasses += ' unknown';
	}
	// show error standalone
	if (checkOptions.highlightNonStandalone && !current.isTouchingPrevious && current.variants.length == 1 && (current.variants[0].type == 'interpunctuation' || current.variants[0].type == 'punctuation')) {
		errorClasses += ' standalone';
	}
	// show error for missing whitespace at begin
	if (checkOptions.highlightMissingWhitespace && current.hasMissingWhitespaceAtBegin) {
		errorClasses += ' missing-whitespace-begin';
	}
	// show error for missing whitespace at end
	if (checkOptions.highlightMissingWhitespace && current.hasMissingWhitespaceAtEnd) {
		errorClasses += ' missing-whitespace-end';
	}
	// render a error span if on of the errors needs to be shown.
	if (errorClasses.length > 0) {
		return '<span class="spellcheck highlight error' + errorClasses + '">' + alltiny.encodeAsHTML(current.word) + '</span>';
	}
	// check whether one of the variants is an exact hit.
	for (var v = 0; v < current.variants.length; v++) {
		var variant = current.variants[v];
		var foundWord = current.assumeStartOfSentence ? this.upperCaseFirstCharacter(variant.w) : variant.w;
		if (foundWord.replace(/\|/g, '') == current.cleanWord) { // is this variant an exact hit?
			// apply the word from the dictionary, to apply hyphenation.
			var content = (checkOptions.hyphenation && !current.isCursorInMiddle)
				? ((current.isCursorAtBeginning ? checkOptions.cursorCharacter : '') + foundWord.replace(/\|/g, '\u00ad') + (current.isCursorAtEnding ? checkOptions.cursorCharacter : ''))
				: current.word;
			// highlight the word if option tells so.
			return checkOptions.highlightKnownWords ? '<span class="spellcheck highlight ok">' + alltiny.encodeAsHTML(content) + '</span>' : alltiny.encodeAsHTML(content);
		}
	}
	// if this point is reached then none of the found variants did match exactly. Do a case-insensitive check.
	var lowerCaseWord = current.cleanWord.toLowerCase();
	for (var v = 0; v < current.variants.length; v++) {
		var variant = current.variants[v];
		if (variant.w.replace(/\|/g, '').toLowerCase() == lowerCaseWord) { // is this variant an exact hit?
			var expectedWord = current.assumeStartOfSentence ? this.upperCaseFirstCharacter(variant.w) : variant.w;
			// highlight the word if option tells so.
			return (checkOptions.highlightCaseWarnings && !current.caseInsensitive) ? '<span class="spellcheck highlight warn case" data-spellcheck-correction="' + expectedWord + '">' + alltiny.encodeAsHTML(current.word) + '</span>' : alltiny.encodeAsHTML(current.word);
		}
	}
	return checkOptions.highlightMismatches ? '<span class="spellcheck highlight warn mismatch">' + alltiny.encodeAsHTML(current.word) + '</span>' : alltiny.encodeAsHTML(current.word);
};

alltiny.Spellchecker.prototype.upperCaseFirstCharacter = function(text) {
	for (var i = 0; i < text.length; i++) {
		var lower = text[i].toLowerCase();
		var upper = text[i].toUpperCase();
		if (lower != upper || lower == 'ß') {
			return text.substring(0, i) + upper + text.substring(i + 1, text.length);
		}
	}
	return text;
};

/**
 * This method determines all cursor positions. Note that with multi-selection
 * more than one cursor position can exist.
 */
alltiny.Spellchecker.prototype.getCursorPositions = function(word, cursorCharacter) {
	var positions = [];
	var index = -1;
	while ((index = word.indexOf(cursorCharacter, index + 1)) >= 0) {
		positions.push(index);
	}
	return positions;
};

alltiny.Spellchecker.prototype.askDictionaries = function(word, context) {
	var variants = [];
	var variantsFoundLookup = {}; // this is for avoiding duplicates in the variants array.
	context = context || {};
	for (var i = 0; i < this.dictionaries.length; i++) {
		if (!this.dictionaries[i].isEnabled()) {
			continue;
		}
		// reset the unsuccessful-finds-map
		context.cachedWordFindings = {};
		var foundWords = this.dictionaries[i].findWord(word, context);
		if (foundWords != null) {
			for (var v = 0; v < foundWords.length; v++) {
				var variant = foundWords[v];
				var key = variant.type + '#' + variant.w;
				if (!variantsFoundLookup[key]) {
					variants.push(variant);
					variantsFoundLookup[key] = true;
				}
			}
		}
	}
	return variants;
};

alltiny.Spellchecker.prototype.askCrossDictionaries = function(word, context) {
	var variants = this.askDictionaries(word, context);
	var i = word.indexOf('-');
	if (i >= 0) {
		var leading = this.askDictionaries(word.substring(0, i + 1), context);
		if (leading && leading.length > 0) {
			var trailing = this.askCrossDictionaries(word.substring(i + 1), context);
			if (trailing && trailing.length > 0) {
				for (var l = 0; l < leading.length; l++) {
					for (var t = 0; t < trailing.length; t++) {
						// create a composit of leading and trailing.
						variants.push({
							w            : leading[l].w + trailing[t].w,
							type         : trailing[t].type == 'hyphen' ? leading[l].type : trailing[t].type,
							composits    : [].concat(leading[l].composits ? leading[l].composits : leading[l]).concat(trailing[t].composits ? trailing[t].composits : trailing[t]),
							endOfSentence: trailing[t].endOfSentence == true ? true : undefined
						});
					}
				}
			}
		}
	}
	return variants;
};

/**
 * This method will remove any check result highlights from the given target.
 */
alltiny.Spellchecker.prototype.removeAnyHighlights = function(target) {
	while (this.dissolveNode(jQuery(target)[0].querySelector('span.spellcheck.highlight'))) {}
};

/**
 * This method will replace the given node by its children.
 */
alltiny.Spellchecker.prototype.dissolveNode = function(node) {
	if (node) {
		// move all children before the span.
		while (node.childNodes.length > 0) {
			node.parentNode.insertBefore(node.childNodes[0], node);
		}
		// remove the now empty span.
		node.parentNode.removeChild(node);
	}
	return node;
};

alltiny.Spellchecker.prototype.setAssumeStartOfSentence = function(isStart) {
	this.assumeStartOfSentence = isStart;
};

alltiny.Spellchecker.prototype.setCaseInsensitiveForNextWord = function(isInsensitive) {
	this.caseInsensitiveForNextWord = isInsensitive;
};

/**
 * This method is used to handle joinable words like "Be- und Verarbeiten", which contains two words
 * "Bearbeitung" and "Verarbeitung".
 */
alltiny.Spellchecker.prototype.checkJoinable = function(leadingFinding, trailingFinding, context) {
	if (trailingFinding.variants && (leadingFinding.cleanWord[leadingFinding.cleanWord.length - 1] == '-' || leadingFinding.cleanWord.substring(leadingFinding.cleanWord.length - 2) == '-,')) {
		var elisionChar = (leadingFinding.cleanWord[leadingFinding.cleanWord.length - 1] == '-') ? '-' : '-,';
		var leadingWord = leadingFinding.cleanWord.substring(0, leadingFinding.cleanWord.length - elisionChar.length);
		for (var v = 0; v < trailingFinding.variants.length; v++) {
			var trailingVariant = trailingFinding.variants[v];
			var pipePos = trailingVariant.w.indexOf('|');
			while (pipePos >= 0) {
				var searchWord = leadingWord + trailingVariant.w.substring(pipePos + 1).replace(/\|/g, '');
				var findings = this.askDictionaries(searchWord, context);
				if (findings && findings.length > 0) {
					for (var f = 0; f < findings.length; f++) {
						var finding = findings[f];
						leadingFinding.addVariant({
							w      : finding.w.substring(0, finding.w.length - trailingVariant.w.length + pipePos) + elisionChar,
							type   : 'elision',
							elision: finding.w
						});
					}
				}
				pipePos = trailingVariant.w.indexOf('|', pipePos + 1);
			}
		}
		// have a look at the found elision and check whether combination with trailing are possible.
		for (var v = 0; v < leadingFinding.variants.length; v++) {
			var leadingVariant = leadingFinding.variants[v];
			var pipePos = leadingVariant.w.indexOf('|');
			while (pipePos >= 0) {
				var searchWord = leadingVariant.w.substring(0, pipePos).replace(/\|/g, '') + trailingFinding.cleanWord;
				var findings = this.askDictionaries(searchWord, context);
				if (findings && findings.length > 0) {
					for (var f = 0; f < findings.length; f++) {
						var finding = findings[f];
						trailingFinding.addVariant({
							w            : finding.w.substring(pipePos + 1),
							type         : 'elision',
							elision      : finding.w,
							endOfSentence: finding.endOfSentence
						});
					}
				}
				pipePos = leadingVariant.w.indexOf('|', pipePos + 1);
			}
		}
	}
	if (trailingFinding.cleanWord[0] == '-' && leadingFinding.variants) {
		var trailingWord = trailingFinding.cleanWord.substring(1);
		for (var v = 0; v < leadingFinding.variants.length; v++) {
			var leadingVariant = leadingFinding.variants[v];
			var pipePos = leadingVariant.w.indexOf('|');
			while (pipePos >= 0) {
				var searchWord = leadingVariant.w.substring(0, pipePos).replace(/\|/g, '') + trailingWord;
				var findings = this.askDictionaries(searchWord, context);
				if (findings && findings.length > 0) {
					for (var f = 0; f < findings.length; f++) {
						var finding = findings[f];
						trailingFinding.addVariant({
							w      : '-' + finding.w.substring(pipePos + 1),
							type   : 'elision',
							elision: finding.w
						});
					}
				}
				pipePos = leadingVariant.w.indexOf('|', pipePos + 1);
			}
		}
	}
};

/**
 * This a helper method for merging two dictionaries together.
 */
alltiny.Spellchecker.mergeDictionaries = function(dictionary1, dictionary2) {
	var result = {};
	for (var w in dictionary1) {
		if (w) {
			result[w] = alltiny.clone(dictionary1[w]); // create a clone of this entry to prevent unwanted modifications.
		}
	}
	for (var w in dictionary2) {
		if (w) {
			if (result[w]) {
				result[w] = alltiny.Spellchecker.mergeWordList(result[w], dictionary2[w]);
			} else {
				result[w] = alltiny.clone(dictionary2[w]); // create a clone of this entry to prevent unwanted modifications.
			}
		}
	}
	return result;
};

/**
 * This a helper method for merging two word lists together.
 */
alltiny.Spellchecker.mergeWordList = function(wordList1, wordList2) {
	var result = [];
	var wordsFoundLookup = {}; // this helps for checking whether a word is already contained.
	var list = wordList1.concat(wordList2);
	for (var i = 0; i < list.length; i++) {
		var word = list[i];
		var key = word.type + '#' + word.w;
		if (!wordsFoundLookup[key]) {
			result.push(alltiny.clone(word)); // create a deep copy to avoid modifications of the dictionary.
			wordsFoundLookup[key] = true;
		}
	}
	return result;
};

alltiny.Spellchecker.analyzeMissingWhiteSpaces = function(findings, spellchecker) {
	var current = findings.length > 0 ? findings[0] : null;
	for (var i = 1; i < findings.length; i++) {
		var next = findings[i];
		// only check between the both findings if they belong to different nodes.
		if (current.checkOptions.checkWhitespaceAtEnd && next.checkOptions.checkWhitespaceAtBegin && current.checkOptions.node !== next.checkOptions.node) {
			var currentHasMissingWhiteSpace = current.offset + current.word.length === current.node.nodeValue.length;
			var nextHasMissingWhiteSpace = next.offset === 0;
			// are both finding lacking a white-space?
			if (currentHasMissingWhiteSpace && nextHasMissingWhiteSpace) {
				// since both nodes lacking a white-space check, whether joining them would acceptable.
				var variants = spellchecker.askCrossDictionaries(current.cleanWord + next.cleanWord, current.checkOptions.context);
				if (!variants || variants.length === 0) { // nothing found?
					current.hasMissingWhitespaceAtEnd = true;
					next.hasMissingWhitespaceAtBegin = true;
				}
			}
		}
		current = next;
	}
};

alltiny.Dictionary = function(customOptions) {
	this.options = jQuery.extend(true, {
		enabled      : true,
		name         : '',
		language     : '',
		dateformats  : [],
		numberformats: [],
		words        : [],
		processor    : function(variants) {
			return variants;
		}
	}, customOptions);
	// check whether process was given as string; interpret it as function if so.
	if (typeof this.options.processor === 'string') {
		this.options.processor = new Function('variants', this.options.processor);
	}
	this.symbolLookupTable = {
		'.'     : [{w: '.', type: 'punctuation', endOfSentence: true}],
		'?'     : [{w: '?', type: 'punctuation', endOfSentence: true}],
		'!'     : [{w: '!', type: 'punctuation', endOfSentence: true}],
		','     : [{w: ',', type: 'interpunctuation'}],
		';'     : [{w: ';', type: 'interpunctuation'}],
		':'     : [{w: ':', type: 'interpunctuation'}],
		'-'     : [{w: '-', type: 'hyphen'}],
		'('     : [{w: '(', type: 'lbracket'}],
		')'     : [{w: ')', type: 'rbracket'}],
		'{'     : [{w: '{', type: 'lbracket'}],
		'}'     : [{w: '}', type: 'rbracket'}],
		'['     : [{w: '[', type: 'lbracket'}],
		']'     : [{w: ']', type: 'rbracket'}],
		'<'     : [{w: '<', type: 'lbracket'}],
		'>'     : [{w: '>', type: 'rbracket'}],
		'/'     : [{w: '/', type: 'structure'}],
		'\\'    : [{w: '\\', type: 'structure'}],
		'"'     : [{w: '"', type: 'lquotation'}, {w: '"', type: 'rquotation'}],
		'\''    : [{w: '\'', type: 'lquotation'}, {w: '\'', type: 'rquotation'}],
		'%'     : [{w: '%', type: 'unit', unit: 'Percent'}],
		'&'     : [{w: '&', type: 'symbol'}],
		'$'     : [{w: '$', type: 'symbol'}],
		'#'     : [{w: '#', type: 'symbol', symbol: 'hash'}],
		'+'     : [{w: '+', type: 'symbol'}],
		'*'     : [{w: '*', type: 'symbol', symbol: 'born'}],
		'\u00a7': [{w: '\u00a7', type: 'mark', symbol: 'Parapragh Sign'}],
		'\u00a9': [{w: '\u00a9', type: 'symbol', symbol: 'Copyright'}],
		'\u2013': [{w: '\u2013', type: 'symbol', symbol: 'EN Dash'}],
		'\u2014': [{w: '\u2014', type: 'symbol', symbol: 'EM Dash'}],
		'\u20ac': [{w: '\u20ac', type: 'symbol', symbol: 'Euro Sign'}],
		'\u271d': [{w: '\u271d', type: 'symbol', symbol: 'Latin Cross'}]
	};
};

/**
 * This method adds the given word to the dictionary.
 */
alltiny.Dictionary.prototype.setEnabled = function(enabled) {
	this.options.enabled = enabled;
};

/**
 * @return true if this dictionary is currently enabled.
 */
alltiny.Dictionary.prototype.isEnabled = function() {
	return this.options.enabled;
};

/**
 * @return language this dictionary is intended for.
 */
alltiny.Dictionary.prototype.getLocale = function() {
	return this.options.locale;
};

/**
 * This method adds the given word to the dictionary.
 */
alltiny.Dictionary.prototype.addWord = function(word) {
	if (word && word.w && word.w.length > 0 && word.type) {
		// add the given word to the index.
		var lowerCaseWord = word.w.toLowerCase();
		// words like 'map' or 'push' will interfere with object standard methods, but we want to override them.
		if (!this.options.words[lowerCaseWord] || typeof this.options.words[lowerCaseWord] === 'function') {
			this.options.words[lowerCaseWord] = [];
		}
		this.options.words[lowerCaseWord].push(word);
	}
};

/* this method will return null if the word is unknown. */
alltiny.Dictionary.prototype.findWord = function(word, context) {
	// quick-check whether this word or break has already been tried to lookup.
	if (context.cachedWordFindings[word] && typeof context.cachedWordFindings[word] !== 'function') {
		return context.cachedWordFindings[word];
	}
	context.composits = context.composits || {}; // ensure at least an empty map exists.
	// start with looking the word up directly.
	var variants = this.lookupWord(word, context) || [];
	// look for all possible break downs.
	for (var i = word.length - 1; i > 0; i--) {
		var leading = this.lookupWord(word.substring(0, i), context);
		if (leading && leading.length > 0) {
			var trailing = this.findWord(word.substring(i), context);
			if (trailing && trailing.length > 0) {
				for (var l = 0; l < leading.length; l++) {
					for (var t = 0; t < trailing.length; t++) {
						// prevent some composits from being build.
						var lword = (leading[l].composits && leading[l].composits.length > 0) ? leading[l].composits[leading[l].composits.length - 1] : leading[l];
						var tword = (trailing[t].composits && trailing[t].composits.length > 0) ? trailing[t].composits[0] : trailing[t];
						// lookup the composit table.
						var comp = (context.composits[lword.type] || {})[tword.type];
						if (comp) {
							var w = '';
							var composits = [];
							for (var lc = 0; leading[l].composits && lc < leading[l].composits.length - 1; lc++) {
								w += leading[l].composits[lc].w;
								composits.push(leading[l].composits[lc]);
							}
							var flw = (comp.lupper) ? lword.w[0].toUpperCase() + lword.w.substring(1) : ((comp.llower) ? lword.w.toLowerCase() : lword.w);
							var ftw = (comp.tupper) ? tword.w[0].toUpperCase() + tword.w.substring(1) : ((comp.tlower) ? tword.w.toLowerCase() : tword.w);
							if (comp.join) {
								w += flw + '|' + ftw;
								composits.push({w: flw + '|' + ftw, type: comp.type});
							} else {
								w += flw + ftw;
								composits.push({w: flw, type: lword.type});
								composits.push({w: ftw, type: tword.type});
							}
							for (var tc = 1; trailing[t].composits && tc < trailing[t].composits.length; tc++) {
								w += trailing[t].composits[tc].w;
								composits.push(trailing[t].composits[tc]);
							}
							if (composits.length > 1) {
								variants.push({w: w, type: 'composit', composits: composits, endOfSentence: comp.endOfSentence || trailing[t].endOfSentence});
							} else {
								variants.push({w: w, type: comp.type});
							}
						}
					}
				}
			}
		}
	}
	var processed = this.process(variants);
	context.cachedWordFindings[word] = processed; // cache the result of this finding process.
	return processed;
};

/**
 * This method looks up a word in the dictionary's index.
 */
alltiny.Dictionary.prototype.lookupWord = function(word, context) {
	// check for context specific symbols first.
	var contextSymbol = (context && context.symbols) ? context.symbols[word] : null;
	if (contextSymbol && typeof contextSymbol !== 'function') {
		return alltiny.clone(contextSymbol); // create a deep-copy of the array to save the lookup map from modifications.
	}
	// query the standard symbol table.
	var symbol = this.symbolLookupTable[word];
	if (symbol && typeof symbol !== 'function') { // exclude array function members from being delivered.
		return alltiny.clone(symbol); // create a deep-copy of the array to save the lookup map from modifications.
	}

	// check predefined formats.
	if (this.options.formats) {
		for (var type in this.options.formats) {
			for (var i = 0; i < this.options.formats[type].length; i++) {
				if (word.match(new RegExp('^' + this.options.formats[type][i] + '$'))) {
					return [{w: word, type: type}];
				}
			}
		}
	}
	// if undefined in the dictionary, this call can return the prototype functions of arrays (filter, concat, join, ...).
	var words = this.options.words[word.toLowerCase()];
	return typeof words === 'function' ? null : alltiny.clone(words); // create a deep-copy of the array to save the lookup map from modifications.
};

alltiny.Dictionary.prototype.process = function(words) {
	return this.options.processor(words);
};

alltiny.Finding = function(finding) {
	this.variants = [];
	for (var field in finding) {
		if (field != 'variants') { // spare out the variants, they are handled separately.
			this[field] = finding[field];
		}
	}
	if (finding.variants) {
		for (var v = 0; v < finding.variants.length; v++) {
			this.addVariant(finding.variants[v]);
		}
	}
};

alltiny.Finding.prototype.addVariant = function(variant) {
	for (var v = 0; v < this.variants.length; v++) {
		if (variant.type == this.variants[v].type && variant.w == this.variants[v].w) {
			return; // skip adding the given variant.
		}
	}
	this.variants.push(variant);
};

alltiny.encodeAsHTML = function(text) {
	return text && text.length > 0 ? text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;') : text;
};

alltiny.clone = function(object, extension) {
	// do not clone undefined objects, primitive types or DOM nodes.
	if (!object || typeof object !== 'object' || object instanceof Node || object instanceof RegExp) {
		return object;
	}
	var clone = (object instanceof Date) ? new Date(object) : object.constructor();
	if (extension) {
		for (var attribute in object) {
			clone[attribute] = alltiny.clone((extension[attribute]) ? extension[attribute] : object[attribute]);
		}
		for (var attribute in extension) {
			if (!clone[attribute]) {
				clone[attribute] = alltiny.clone(extension[attribute]);
			}
		}
	} else {
		for (var attribute in object) {
			clone[attribute] = alltiny.clone(object[attribute]);
		}
	}
	return clone;
};