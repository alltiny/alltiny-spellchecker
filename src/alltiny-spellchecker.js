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

	// remove previous spellcheck-spans.
	var $filter = jQuery('<div></div>').text(text);
	this.removeAnyHighlights($filter);
	// get the targets text.
	var text = $filter.text();

	// use the word regex to split text into words.
	text = text.replace(/[^\s]+/ig, function(word, contents, offset, s) {
		var caseInsensitiveForNextWord = thisObj.caseInsensitiveForNextWord;
		thisObj.caseInsensitiveForNextWord = false;
		var cursorPos = word.indexOf(checkOptions.cursorCharacter);
		var isCursorAtBeginning = cursorPos == 0;
		var isCursorAtEnding = cursorPos == word.length - checkOptions.cursorCharacter.length;
		var isCursorInMiddle = cursorPos >= 0 && !isCursorAtBeginning && !isCursorAtEnding;
		var cleanWord = word.replace(checkOptions.cursorCharacter, '').replace(/\u00ad/g,''); // remove all soft-hyphens from the word.
		// ask the dictionaries
		var variants = thisObj.askDictionaries(cleanWord);

		if (variants.length == 0) {
			var lastChar = cleanWord.length > 0 ? cleanWord[cleanWord.length - 1] : '';
			thisObj.assumeStartOfSentence = lastChar == '.' || lastChar == '!' || lastChar == '?';
			return (checkOptions.highlighting && checkOptions.highlightUnknownWords) ? '<span class="spellcheck highlight error unknown">'+word+'</span>' : word;
		}
		// check whether one of the variants is an exact hit.
		for (var v = 0; v < variants.length; v++) {
			var foundWord = thisObj.assumeStartOfSentence ? variants[v].w[0].toUpperCase() + variants[v].w.substring(1) : variants[v].w;
			if (foundWord.replace(/\|/g,'') == cleanWord) { // is this variant an exact hit?
				thisObj.assumeStartOfSentence = variants[v].endOfSentence == true;
				// apply the word from the dictionary, to apply hyphenation.
				var content = (checkOptions.hyphenation && !isCursorInMiddle)
					? ((isCursorAtBeginning ? checkOptions.cursorCharacter : '') + foundWord.replace(/\|/g,'\u00ad') + (isCursorAtEnding ? checkOptions.cursorCharacter : ''))
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

alltiny.Spellchecker.prototype.askDictionaries = function(word) {
	var variants = [];
	for (var i = 0; i < this.dictionaries.length; i++) {
		var foundWords = this.dictionaries[i].findWord(word);
		if (foundWords != null) {
			for (var f = 0; f < foundWords.length; f++) {
				if (foundWords[f].w) {
					variants.push(jQuery.extend(true, {}, foundWords[f])); // create a copy of that word.
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
	this.options = jQuery.extend(true, {
		name         : '',
		language     : '',
		dateformats  : [],
		numberformats: [],
		words        : [],
		fragments    : [],
		processor    : function(variants){ return variants; }
	}, customOptions);
	// check whether process was given as string; interpret it as function if so.
	if (typeof this.options.processor === 'string') {
		this.options.processor = new Function('variants', this.options.processor);
	}
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
alltiny.Dictionary.prototype.findWord = function(word) {
	if (word == '.' || word == '?' || word == '!') { // if the word is just a period from the sentence then append it to the found word.
		return [{w:word, type:'interpunction', endOfSentence:true}];
	} else if (word == ':' || word == ',' || word == ';') {
		return [{w:word, type:'interpunction'}];
	} else if (word == '-') {
		return [{w:word, type:'hyphen'}];
	} else if (word == '(' || word == ')' || word == '{' || word == '}' || word == '[' || word == ']' || word == '<' || word == '>' || word == '"') {
		return [{w:word, type:'structure', endOfSentence:true}];
	}
	var foundWords = this.lookupWord(word);
	if (foundWords) {
		return this.process(foundWords);
	} else {
		var variants = [];
		for (var i = word.length - 1; i > 0; i--) {
			var leading = this.lookupWord(word.substring(0, i));
			if (leading && leading.length > 0) {
				var trailing = this.findWord(word.substring(i));
				if (trailing && trailing.length > 0) {
					for (var l = 0; l < leading.length; l++) {
						for (var t = 0; t < trailing.length; t++) {
							// only insert a split character if leading or trailing do not have a hyphen next to it.
							var splitCharacter = (leading[l].w[leading[l].w.length - 1] == '-' || trailing[t].w[0] == '-') ? '' : '|';
							// create a composit of leading and trailing.
							variants.push({
								w: leading[l].w + splitCharacter + trailing[t].w,
								type: trailing[t].type == 'hyphen' ? leading[l].type : trailing[t].type,
								composits: [].concat(leading[l].composits ? leading[l].composits : leading[l]).concat(trailing[t].composits ? trailing[t].composits : trailing[t]),
								endOfSentence: trailing[t].endOfSentence == true ? true : undefined
							});
						}
					}
				}
			}
		}
		return this.process(variants);
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
	// if undefined in the dictionary, this call can return the prototype functions of arrays (filter, concat, join, ...).
	var words = this.options.words[word.toLowerCase()];
	return typeof words === 'function' ? null : words;
};

alltiny.Dictionary.prototype.process = function(words) {
	return this.options.processor(words);
};