var alltiny = alltiny || {};
alltiny.Spellchecker = function(options) {
	this.options = jQuery.extend(true, {
		hyphenation : true,
		highlighting : true,
		highlightUnknownWords : true,
		highlightKnownWords : false,
		highlightMismatches : true,
		highlightCaseWarnings : true,
		cursorCharacter : '\u2038'
	}, options);
	this.dictionaries = [];
	this.fragments = {};
	this.assumeStartOfSentence = true; // if true the first word in a check is assumed to be the start of a sentence.
	this.caseInsensitiveForNextWord = false; // if true then for the next upcoming word case-sensitivity is disabled.
};

/**
 * This method adds a dictionary to the spellchecker.
 * A dictionary looks like this:
 * {
 *   name: 'trademarks'
 *   fragments: ['a-z','A-Z','0-9']
 *   words:
 * }
 */
alltiny.Spellchecker.prototype.addDictionary = function(dictionary) {
	this.dictionaries.push(dictionary);
	if (dictionary) {
		var fragments = dictionary.getFragments();
		for (var i = 0; i < fragments.length; i++) {
			var fragment = fragments[i];
			this.fragments[fragment] = fragment;
		}
	}
};

/**
 * This method performs the spell check.
 * @param text which content should be checked.
 * @param options by default the options given to this spellchecker while
 *        initialization are used, but with this option you can give a different
 *        option set in for this particular spell check run.
 * @return text with spell check highlights
 */
alltiny.Spellchecker.prototype.check = function(text, options) {
	var thisObj = this;
	var checkOptions = jQuery.extend(true, jQuery.extend(true, {}, this.options), options); // deep copy to avoid overrides. uses this.options as defaults.

	// build the regular expression to search words in the given text.
	var groups = '\\.\\?\\!\\-\\u00ad' + checkOptions.cursorCharacter;
	for (var fragment in this.fragments) {
		groups += fragment;
	}
	var wordsRegEx = new RegExp('[' + groups + ']+', 'g');

	// remove previous spellcheck-spans.
	var $filter = jQuery('<div></div>').text(text);
	this.removeAnyHighlights($filter);
	// get the targets text.
	var text = $filter.text();
	// use the word regex to split text into words.
	text = text.replace(wordsRegEx, function(word, contents, offset, s) {
		var caseInsensitiveForNextWord = thisObj.caseInsensitiveForNextWord;
		thisObj.caseInsensitiveForNextWord = false;
		var cursorPos = word.indexOf(checkOptions.cursorCharacter);
		var isCursorAtBeginning = cursorPos == 0;
		var isCursorAtEnding = cursorPos == word.length - checkOptions.cursorCharacter.length;
		var isCursorInMiddle = cursorPos >= 0 && !isCursorAtBeginning && !isCursorAtEnding;
		var cleanWord = word.replace(checkOptions.cursorCharacter, '').replace(/\u00ad/g,''); // remove all soft-hyphens from the word.
		var variants = [];
		for (var i = 0; i < thisObj.dictionaries.length; i++) {
			var foundWords = thisObj.dictionaries[i].findWord(cleanWord);
			if (foundWords != null) {
				for (var f = 0; f < foundWords.length; f++) {
					if (foundWords[f].w) {
						var foundWord = jQuery.extend(true, {}, foundWords[f]);
						if (thisObj.assumeStartOfSentence) {
							foundWord.w = foundWord.w[0].toUpperCase() + foundWord.w.substring(1, foundWord.w.length);
						}
						variants.push(foundWord);
					}
				}
			}
		}
		if (variants.length == 0) {
			var lastChar = cleanWord.length > 0 ? cleanWord[cleanWord.length - 1] : '';
			thisObj.assumeStartOfSentence = lastChar == '.' || lastChar == '!' || lastChar == '?';
			return (checkOptions.highlighting && checkOptions.highlightUnknownWords) ? '<span class="spellcheck highlight error unknown">'+word+'</span>' : word;
		}
		// check whether one of the variants is an exact hit.
		for (var v = 0; v < variants.length; v++) {
			if (variants[v].w.replace(/\|/g,'') == cleanWord) { // is this variant an exact hit?
				thisObj.assumeStartOfSentence = variants[v].endOfSentence == true;
				// apply the word from the dictionary, to apply hyphenation.
				var content = (checkOptions.hyphenation && !isCursorInMiddle)
					? ((isCursorAtBeginning ? checkOptions.cursorCharacter : '') + variants[v].w.replace(/\|/g,'\u00ad') + (isCursorAtEnding ? checkOptions.cursorCharacter : ''))
					: word;
				// highlight the word if option tells so.
				return (checkOptions.highlighting && checkOptions.highlightKnownWords) ? '<span class="spellcheck highlight ok">'+content+'</span>' : content;
			}
		}
		// if this point is reached then none of the found variants did match exactly. Do a case-insensitive check.
		var lowerCaseWord = cleanWord.toLowerCase();
		for (var v = 0; v < variants.length; v++) {
			if (variants[v].w.replace(/\|/g,'').toLowerCase() == lowerCaseWord) { // is this variant an exact hit?
				thisObj.assumeStartOfSentence = variants[v].endOfSentence == true;
				// highlight the word if option tells so.
				return (checkOptions.highlighting && checkOptions.highlightCaseWarnings && !caseInsensitiveForNextWord) ? '<span class="spellcheck highlight warn case" data-spellcheck-correction="'+variants[v].w+'">'+word+'</span>' : word;
			}
		}
		thisObj.assumeStartOfSentence = false;
		return (checkOptions.highlighting && checkOptions.highlightMismatches) ? '<span class="spellcheck highlight warn mismatch">'+word+'</span>' : word;
	});
	return text;
};

/**
 * This method will remove any check result highlights from the given target.
 */
alltiny.Spellchecker.prototype.removeAnyHighlights = function(target) {
	jQuery(target).find('span.spellcheck.highlight').each(function() {
		jQuery(this).replaceWith(jQuery(this).html());
	});
};

alltiny.Spellchecker.prototype.setAssumeStartOfSentence = function(isStart) {
	this.assumeStartOfSentence = isStart
};

alltiny.Spellchecker.prototype.setCaseInsensitiveForNextWord = function(isInsensitive) {
	this.caseInsensitiveForNextWord = isInsensitive;
};

alltiny.Dictionary = function(customOptions) {
	if (customOptions.processor && customOptions.processor.length > 0) {
		customOptions.processor = new Function('variants', customOptions.processor);
	} else {
		customOptions.processor = new Function('variants', 'return variants;');
	}
	this.options = jQuery.extend(true, {
		name         : '',
		language     : '',
		dateformats  : [],
		numberformats: [],
		words        : [],
		fragments    : [],
		processor    : function(words){ return words; }
	}, customOptions);
	this.usedCharacters = [];
	this.usedCharactersFragment = '';
};

alltiny.Dictionary.prototype.getFragments = function() {
	return this.options.fragments.concat(this.usedCharactersFragment);
};

/**
 * This method adds the given word to the dictionary.
 */
alltiny.Dictionary.prototype.addWord = function(word) {
	if (word && word.w && word.w.length > 0 && word.type) {
		// updated the used characters
		this.updateUsedCharacters(word.w);
		// add the given word to the index.
		var lowerCaseWord = word.w.toLowerCase();
		if (!this.options.words[lowerCaseWord]) {
			this.options.words[lowerCaseWord] = [];
		}
		this.options.words[lowerCaseWord].push(word);
	}
};

alltiny.Dictionary.prototype.updateUsedCharacters = function(word) {
	var hasChanged = false;
	for (var i = 0; i < word.length; i++) {
		var character = word.charAt(i);
		if (character != ' ' && this.usedCharacters.indexOf(character) < 0) {
			this.usedCharacters.push(character);
			hasChanged = true;
		}
	}
	if (hasChanged) { // update the fragments string as well.
		this.usedCharacters.sort();
		this.usedCharactersFragment = '';
		for (var c = 0; c < this.usedCharacters.length; c++) {
			var character = this.usedCharacters[c];
			if (['.','-','+','!','?','[',']','{','}','(',')','\\'].indexOf(character) >= 0) {
				this.usedCharactersFragment += '\\' + character; // escape the character in RegEx-style.
			} else {
				this.usedCharactersFragment += character;
			}
		}
	}
};

/* this method will return null if the word is unknown. */
alltiny.Dictionary.prototype.findWord = function(word, fracture) {
	var foundWords = this.lookupWord(word);
	if (foundWords) {
		if (!fracture) { // no fracture left?
			return this.process(foundWords);
		} else if (fracture == '.' || fracture == '?' || fracture == '!') { // if the fracture is just a period from the sentence then append it to the found word.
			var composits = [];
			for (var i = 0; i < foundWords.length; i++) {
				var foundWord = jQuery.extend(true, {}, foundWords[i]); // deep-copy the word to avoid that the following operation alters the dictionary entry.
				foundWord.w = foundWord.w + fracture;
				foundWord.endOfSentence = true;
				composits.push(foundWord);
			}
			return this.process(composits);
		} else {
			var foundFractures = this.findWord(fracture);
			if (foundFractures) {
				var composits = [];
				for (var i = 0; i < foundWords.length; i++) {
					for (var f = 0; f < foundFractures.length; f++) {
						// only insert a split character if word or fracture do not have a hyphen next to it.
						var splitCharacter = (foundWords[i].w[foundWords[i].w.length - 1] == '-' || foundFractures[f].w[0] == '-') ? '' : '|';
						var composit = {
							w: (foundWords[i].w + splitCharacter + foundFractures[f].w),
							type: foundFractures[f].type == 'hyphen' ? foundWords[i].type : foundFractures[f].type,
							composits: [foundWords[i]],
							endOfSentence: foundFractures[f].endOfSentence == true ? true : undefined
						};
						if (foundFractures[f].composits) {
							for (var c = 0; c < foundFractures[f].composits.length; c++) {
								composit.composits.push(foundFractures[f].composits[c]);
							}
						} else {
							composit.composits.push(foundFractures[f]);
						}
						composits.push(composit);
					}
				}
				return this.process(composits);
			} else {
				return this.findWord(word.substring(0, word.length - 1), word[word.length - 1] + fracture);
			}
		}
	} else if (word.length > 1) { // start splitting the word.
		// define fracture if it is not yet defined.
		fracture = fracture || '';
		return this.findWord(word.substring(0, word.length - 1), word[word.length - 1] + fracture);
	} else {
		return null; // unknown word.
	}
};

/**
 * This method looks up a word in the dictionary's index.
*/
alltiny.Dictionary.prototype.lookupWord = function(word) {
	if (word === '-') {
		return [{w:word,type:'hyphen'}];
	}
	// check whether it is a date.
	if (this.options.dateformats) {
		for (var i = 0; i < this.options.dateformats.length; i++) {
			if (word.match(new RegExp('^' + this.options.dateformats[i] + '$'))) {
				return [{w:word,type:'date'}];
			}
		}
	}
	// check whether it is a number.
	if (this.options.numberformats) {
		for (var i = 0; i < this.options.numberformats.length; i++) {
			if (word.match(new RegExp('^' + this.options.numberformats[i] + '$'))) {
				return [{w:word,type:'numerical'}];
			}
		}
	}
	return this.options.words[word.toLowerCase()];
};

alltiny.Dictionary.prototype.process = function(words) {
	return this.options.processor(words);
};