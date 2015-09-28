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
	this.assumeStartOfSentence = true; // if true the first word in a check is assumed to be the start of a sentence.
	this.caseInsensitiveForNextWord = false; // if true then for the next upcoming word case-sensitivity is disabled.
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
				isCursorInMiddle = true
			}
		}
		var cleanWord = word.replace(new RegExp(checkOptions.cursorCharacter, 'g'), '').replace(/\u00ad/g,''); // remove all soft-hyphens from the word.
		// ask the dictionaries
		var variants = thisObj.askDictionaries(cleanWord);
		// check for composits of words out of multiple dictionarys (like language and tradenames)
		variants = variants.concat(thisObj.askCrossDictionaries(cleanWord));

		if (variants.length == 0) {
			var lastChar = cleanWord.length > 0 ? cleanWord[cleanWord.length - 1] : '';
			thisObj.assumeStartOfSentence = lastChar == '.' || lastChar == '!' || lastChar == '?';
			return (checkOptions.highlighting && checkOptions.highlightUnknownWords) ? '<span class="spellcheck highlight error unknown">'+alltiny.encodeAsHTML(word)+'</span>' : word;
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
				return (checkOptions.highlighting && checkOptions.highlightKnownWords) ? '<span class="spellcheck highlight ok">'+alltiny.encodeAsHTML(content)+'</span>' : content;
			}
		}
		// if this point is reached then none of the found variants did match exactly. Do a case-insensitive check.
		var lowerCaseWord = cleanWord.toLowerCase();
		for (var v = 0; v < variants.length; v++) {
			if (variants[v].w.replace(/\|/g,'').toLowerCase() == lowerCaseWord) { // is this variant an exact hit?
				thisObj.assumeStartOfSentence = variants[v].endOfSentence == true;
				// highlight the word if option tells so.
				return (checkOptions.highlighting && checkOptions.highlightCaseWarnings && !caseInsensitiveForNextWord) ? '<span class="spellcheck highlight warn case" data-spellcheck-correction="'+variants[v].w+'">'+alltiny.encodeAsHTML(word)+'</span>' : word;
			}
		}
		thisObj.assumeStartOfSentence = false;
		return (checkOptions.highlighting && checkOptions.highlightMismatches) ? '<span class="spellcheck highlight warn mismatch">'+alltiny.encodeAsHTML(word)+'</span>' : word;
	});
	return text;
};

/**
 * This method determines all cursor postions. Note that with multiselection
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

alltiny.Spellchecker.prototype.askCrossDictionaries = function(word) {
	var variants = [];
	var i = word.indexOf('-');
	if (i < 0) {
		return this.askDictionaries(word);
	} else {
		var leading = this.askDictionaries(word.substring(0, i + 1));
		if (leading && leading.length > 0) {
			var trailing = this.askCrossDictionaries(word.substring(i + 1));
			if (trailing && trailing.length > 0) {
				for (var l = 0; l < leading.length; l++) {
					for (var t = 0; t < trailing.length; t++) {
						// create a composit of leading and trailing.
						variants.push({
							w: leading[l].w + trailing[t].w,
							type: trailing[t].type == 'hyphen' ? leading[l].type : trailing[t].type,
							composits: [].concat(leading[l].composits ? leading[l].composits : leading[l]).concat(trailing[t].composits ? trailing[t].composits : trailing[t]),
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
		processor    : function(variants){ return variants; }
	}, customOptions);
	// check whether process was given as string; interpret it as function if so.
	if (typeof this.options.processor === 'string') {
		this.options.processor = new Function('variants', this.options.processor);
	}
};

/**
 * This method adds the given word to the dictionary.
 */
alltiny.Dictionary.prototype.addWord = function(word) {
	if (word && word.w && word.w.length > 0 && word.type) {
		// add the given word to the index.
		var lowerCaseWord = word.w.toLowerCase();
		if (!this.options.words[lowerCaseWord]) {
			this.options.words[lowerCaseWord] = [];
		}
		this.options.words[lowerCaseWord].push(word);
	}
};

/* this method will return null if the word is unknown. */
alltiny.Dictionary.prototype.findWord = function(word) {
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
	if (word == '.' || word == '?' || word == '!') { // if the word is just a period from the sentence then append it to the found word.
		return [{w:word, type:'interpunction', endOfSentence:true}];
	} else if (word == ':' || word == ',' || word == ';') {
		return [{w:word, type:'interpunction'}];
	} else if (word == '-') {
		return [{w:word, type:'hyphen'}];
	} else if (word == '(' || word == ')' || word == '{' || word == '}' || word == '[' || word == ']' || word == '<' || word == '>' || word == '"' || word == '/' || word == '\\') {
		return [{w:word, type:'structure'}];
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

alltiny.encodeAsHTML = function(text) {
	return text && text.length > 0 ? text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;') : text;
};