var alltiny = alltiny || {};
alltiny.Spellchecker = function(options) {
	this.options = jQuery.extend(true, {
		hyphenation : true,
		highlighting : true,
		highlightUnknownWords : true,
		highlightKnownWords : false,
		highlightMismatches : true,
		highlightCaseWarnings : true,
		highlightNonStandalone : true, // with this option '!', '?', '.', ',', ';', ':' are marked when found standing alone.
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
 * The spellchecker is a state-machine, allowing to connect multiple checks.
 * This method will reset the spellchecker.
 */
alltiny.Spellchecker.prototype.reset = function() {
	this.previousFinding = null;
};

/**
 * This method performs the spell check on the given text.
 * @param text which content should be checked.
 * @param options by default the options given to this spellchecker while
 *        initialization are used, but with this option you can give a different
 *        option set in for this particular spell check run.
 * @return text with spell check highlights
 */
alltiny.Spellchecker.prototype.check = function(text, options) {
	var thisObj = this;
	// determine the check options; fall-back to the spellchecker options if not given.
	var checkOptions = jQuery.extend(true, jQuery.extend(true, {}, this.options), options); // deep copy to avoid overrides. uses this.options as defaults.

	// use the word regex to split text into words.
	text = text.replace(/[^\s]+/ig, function(word, offset, content) {
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
		if (cleanWord.length == 0) { // this happens when the cursor character has been the word to check.
			return alltiny.encodeAsHTML(word);
		}
		
		var current = {
			word               : word,
			cleanWord          : cleanWord,
			offset             : offset,
			node               : options.node,
			contentLength      : content.length,
			variants           : thisObj.askCrossDictionaries(cleanWord), // ask the dictionaries
			isCursorAtBeginning: isCursorAtBeginning,
			isCursorAtEnding   : isCursorAtEnding,
			isCursorInMiddle   : isCursorInMiddle
		};
		
		var result = thisObj.analyze(current, checkOptions);
		thisObj.previousFinding = current;
		thisObj.caseInsensitiveForNextWord = false;
		return result;
	});
	return text;
};

alltiny.Spellchecker.prototype.analyze = function(current, checkOptions) {
	if (current.variants.length == 0) {
		var lastChar = current.cleanWord.length > 0 ? current.cleanWord[current.cleanWord.length - 1] : '';
		this.assumeStartOfSentence = lastChar == '.' || lastChar == '!' || lastChar == '?';
		return (checkOptions.highlighting && checkOptions.highlightUnknownWords) ? '<span class="spellcheck highlight error unknown">'+alltiny.encodeAsHTML(current.word)+'</span>' : alltiny.encodeAsHTML(current.word);
	}
	// if this is an interpunctuation then check against the previous finding that it is not standing alone.
	if (current.variants.length == 1 && (current.variants[0].type == 'interpunctuation' || current.variants[0].type == 'punctuation')) {
		this.assumeStartOfSentence = current.variants[0].endOfSentence == true;
		var isTouchingPrevious = current.offset == 0 && this.previousFinding && (this.previousFinding.contentLength - this.previousFinding.offset - this.previousFinding.word.length == 0);
		return (checkOptions.highlighting && checkOptions.highlightNonStandalone && !isTouchingPrevious) ? '<span class="spellcheck highlight error standalone">'+alltiny.encodeAsHTML(current.word)+'</span>' : alltiny.encodeAsHTML(current.word);
	}
	// check whether one of the variants is an exact hit.
	for (var v = 0; v < current.variants.length; v++) {
		var variant = current.variants[v];
		var foundWord = this.assumeStartOfSentence ? this.upperCaseFirstCharacter(variant.w) : variant.w;
		if (foundWord.replace(/\|/g,'') == current.cleanWord) { // is this variant an exact hit?
			this.assumeStartOfSentence = (variant.composits && variant.composits[variant.composits.length-1].endOfSentence == true) || variant.endOfSentence == true;
			// apply the word from the dictionary, to apply hyphenation.
			var content = (checkOptions.hyphenation && !current.isCursorInMiddle)
				? ((current.isCursorAtBeginning ? checkOptions.cursorCharacter : '') + foundWord.replace(/\|/g,'\u00ad') + (current.isCursorAtEnding ? checkOptions.cursorCharacter : ''))
				: current.word;
			// highlight the word if option tells so.
			return (checkOptions.highlighting && checkOptions.highlightKnownWords) ? '<span class="spellcheck highlight ok">'+alltiny.encodeAsHTML(content)+'</span>' : alltiny.encodeAsHTML(content);
		}
	}
	// if this point is reached then none of the found variants did match exactly. Do a case-insensitive check.
	var lowerCaseWord = current.cleanWord.toLowerCase();
	for (var v = 0; v < current.variants.length; v++) {
		var variant = current.variants[v];
		if (variant.w.replace(/\|/g,'').toLowerCase() == lowerCaseWord) { // is this variant an exact hit?
			this.assumeStartOfSentence = variant.endOfSentence == true;
			// highlight the word if option tells so.
			return (checkOptions.highlighting && checkOptions.highlightCaseWarnings && !this.caseInsensitiveForNextWord) ? '<span class="spellcheck highlight warn case" data-spellcheck-correction="'+variant.w+'">'+alltiny.encodeAsHTML(current.word)+'</span>' : alltiny.encodeAsHTML(current.word);
		}
	}
	this.assumeStartOfSentence = false;
	return (checkOptions.highlighting && checkOptions.highlightMismatches) ? '<span class="spellcheck highlight warn mismatch">'+alltiny.encodeAsHTML(current.word)+'</span>' : alltiny.encodeAsHTML(current.word);
};

alltiny.Spellchecker.prototype.upperCaseFirstCharacter = function(text) {
	for (var i = 0; i < text.length; i++) {
		var lower = text[i].toLowerCase();
		var upper = text[i].toUpperCase();
		if (lower != upper || lower == 'ß') {
			return text.substring(0, i) + upper + text.substring(i+1, text.length);
			break;
		}
	}
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
	var variantsFoundLookup = {}; // this is for avoiding duplicates in the variants array.
	for (var i = 0; i < this.dictionaries.length; i++) {
		var foundWords = this.dictionaries[i].findWord(word);
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

alltiny.Spellchecker.prototype.askCrossDictionaries = function(word) {
	var variants = this.askDictionaries(word);
	var i = word.indexOf('-');
	if (i >= 0) {
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

alltiny.Spellchecker.prototype.processWord = function(word) {
	if (word) {
		var processing = alltiny.Language.DE.wordProcessingLookup[word.type];
		if (processing && processing.upper) {
			word.w = word.w[0].toUpperCase() + word.w.substring(1);
		}
	}
	return word;
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
	this.symbolLookupTable = {
		'.': [{w: '.', type: 'punctuation', endOfSentence: true}],
		'?': [{w: '?', type: 'punctuation', endOfSentence: true}],
		'!': [{w: '!', type: 'punctuation', endOfSentence: true}],
		',': [{w: ',', type: 'interpunctuation'}],
		';': [{w: ';', type: 'interpunctuation'}],
		':': [{w: ':', type: 'interpunctuation'}],
		'-': [{w: '-', type: 'hyphen'}],
		'(': [{w: '(', type: 'lbracket'}],
		')': [{w: ')', type: 'rbracket'}],
		'{': [{w: '{', type: 'lbracket'}],
		'}': [{w: '}', type: 'rbracket'}],
		'[': [{w: '[', type: 'lbracket'}],
		']': [{w: ']', type: 'rbracket'}],
		'<': [{w: '<', type: 'lbracket'}],
		'>': [{w: '>', type: 'rbracket'}],
		'/': [{w: '/', type: 'structure'}],
		'\\':[{w: '\\',type: 'structure'}],
		'"': [{w: '"', type: 'lquotation'},{w: '"', type: 'rquotation'}],
		'\'':[{w: '\'',type: 'lquotation'},{w: '\'',type: 'rquotation'}],
		'%': [{w: '%', type: 'unit', unit: 'Percent'}],
		'&': [{w: '&', type: 'symbol'}],
		'$': [{w: '$', type: 'symbol'}],
		'*': [{w: '*', type: 'symbol',symbol: 'born'}],
		'\u00a9': [{w: '\u00a9', type: 'symbol', symbol: 'Copyright'}],
		'\u00a7': [{w: '\u00a7', type: 'mark', symbol: 'Parapragh Sign'}],
		'\u20ac': [{w: '\u20ac', type: 'symbol', symbol: 'Euro Sign'}],
		'\u271d': [{w: '\u271d', type: 'symbol', symbol: 'Latin Cross'}]
	};
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
	// start with looking the word up directly.
	var variants = this.lookupWord(word) || [];
	// look for various break downs.
	for (var i = word.length - 1; i > 0; i--) {
		var leading = this.lookupWord(word.substring(0, i));
		if (leading && leading.length > 0) {
			var trailing = this.findWord(word.substring(i));
			if (trailing && trailing.length > 0) {
				for (var l = 0; l < leading.length; l++) {
					for (var t = 0; t < trailing.length; t++) {
						// prevent some composits from being build.
						var lword = (leading[l].composits && leading[l].composits.length > 0) ? leading[l].composits[leading[l].composits.length-1] : leading[l];
						var tword = (trailing[t].composits && trailing[t].composits.length > 0) ? trailing[t].composits[0] : trailing[t];
						// lookup the composit table.
						var comp = (alltiny.Dictionary.compositLookup[lword.type] || {})[tword.type];
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
								variants.push({w:w,type:'composit',composits:composits,endOfSentence:comp.endOfSentence||trailing[t].endOfSentence});
							} else {
								variants.push({w:w,type:comp.type});
							}
						}
					}
				}
			}
		}
	}
	return this.process(variants);
};

/**
 * This method looks up a word in the dictionary's index.
*/
alltiny.Dictionary.prototype.lookupWord = function(word) {
	var symbol = this.symbolLookupTable[word];
	if (symbol) {
		return jQuery.extend(true, [], symbol); // create a deep-copy of the array to save the lookup map from modifications.
	}

	// check predefined formats.
	if (this.options.formats) {
		for (var type in this.options.formats) {
			for (var i = 0; i < this.options.formats[type].length; i++) {
				if (word.match(new RegExp('^' + this.options.formats[type][i] + '$'))) {
					return [{w:word,type:type}];
				}
			}
		}
	}
	// if undefined in the dictionary, this call can return the prototype functions of arrays (filter, concat, join, ...).
	var words = this.options.words[word.toLowerCase()];
	return typeof words === 'function' ? null : jQuery.extend(true, [], words); // create a deep-copy of the array to save the lookup map from modifications.
};

alltiny.Dictionary.prototype.process = function(words) {
	return this.options.processor(words);
};

alltiny.encodeAsHTML = function(text) {
	return text && text.length > 0 ? text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;') : text;
};

alltiny.Dictionary.compositLookup = {
'abbreviation': {
	'hyphen'          : { join: false, type: 'composit' },
	'interpunctuation': { join: false, type: 'composit' },
	'punctuation'     : { join: false, type: 'composit', endOfSentence: true },
	'rbracket'        : { join: false, type: 'composit' },
	'rquotation'      : { join: false, type: 'composit' },
	'structure'       : { join: false, type: 'composit' }
},
'adj': {
	'adj'             : { join: true,  type: 'adj' },
	'hyphen'          : { join: false, type: 'composit' },
	'interpunctuation': { join: false, type: 'composit' },
	'noun'            : { join: true,  type: 'noun', lupper: true, tlower: true },
	'part'            : { join: true,  type: 'part' },
	'punctuation'     : { join: false, type: 'composit', endOfSentence: true },
	'rbracket'        : { join: false, type: 'composit' },
	'rquotation'      : { join: false, type: 'composit' },
	'structure'       : { join: false, type: 'composit' }
},
'adv': {
	'adv'             : { join: true,  type: 'adv' },
	'hyphen'          : { join: false, type: 'composit' },
	'interpunctuation': { join: false, type: 'composit' },
	'noun'            : { join: true,  type: 'noun', lupper: true, tlower: true },
	'part'            : { join: true,  type: 'part' },
	'punctuation'     : { join: false, type: 'composit', endOfSentence: true },
	'rbracket'        : { join: false, type: 'composit' },
	'rquotation'      : { join: false, type: 'composit' },
	'verb'            : { join: true,  type: 'verb' }
},
'article': {
	'interpunctuation': { join: false, type: 'composit' },
	'punctuation'     : { join: false, type: 'composit', endOfSentence: true }
},
'conjunction': {
	'structure'       : { join: false, type: 'composit' }
},
'contraction': {},
'dash': {
	'number': { join: false, type: 'composit' }
},
'date': {
	'interpunctuation': { join: false, type: 'composit' }
},
'fragment': {
	'interpunctuation': { join: false, type: 'composit' },
	'punctuation'     : { join: false, type: 'composit', endOfSentence: true },
	'rbracket'        : { join: false, type: 'composit' },
	'rquotation'      : { join: false, type: 'composit' }
},
'greeting': {
	'interpunctuation': { join: false, type: 'composit' },
	'punctuation'     : { join: false, type: 'composit', endOfSentence: true }
},
'hyphen': {
	'fragment'        : { join: false, type: 'composit' },
	'interpunctuation': { join: false, type: 'composit' },
	'noun'            : { join: false, type: 'composit', tupper: true },
	'number'          : { join: false, type: 'composit' },
	'lquotation'      : { join: false, type: 'composit' }
},
'indefpronoun': {},
'interjection': {
	'interpunctuation': { join: false, type: 'composit' },
	'punctuation'     : { join: false, type: 'composit', endOfSentence: true },
	'rbracket'        : { join: false, type: 'composit' },
	'rquotation'      : { join: false, type: 'composit' }
},
'interpunctuation': {
	'rquotation'  : { join: false, type: 'composit' }
},
'lbracket': {
	'abbreviation': { join: false, type: 'composit' },
	'adj'         : { join: false, type: 'composit' },
	'adv'         : { join: false, type: 'composit' },
	'article'     : { join: false, type: 'composit' },
	'conjunction' : { join: false, type: 'composit' },
	'contraction' : { join: false, type: 'composit' },
	'indefpronoun': { join: false, type: 'composit' },
	'interjection': { join: false, type: 'composit' },
	'lbracket'    : { join: false, type: 'composit' },
	'lquotation'  : { join: false, type: 'composit' },
	'mark'        : { join: false, type: 'composit' },
	'name'        : { join: false, type: 'composit' },
	'noun'        : { join: false, type: 'composit', tupper: true },
	'number'      : { join: false, type: 'composit' },
	'numeral'     : { join: false, type: 'composit' },
	'part'        : { join: true,  type: 'composit' },
	'particle'    : { join: false, type: 'composit' },
	'prenoun'     : { join: false, type: 'composit' },
	'prepos'      : { join: false, type: 'composit' },
	'pronoun'     : { join: false, type: 'composit' },
	'subjunction' : { join: false, type: 'composit' },
	'verb'        : { join: false, type: 'composit' }
},
'lquotation': {
	'abbreviation': { join: false, type: 'composit' },
	'adj'         : { join: false, type: 'composit' },
	'adv'         : { join: false, type: 'composit' },
	'article'     : { join: false, type: 'composit' },
	'contraction' : { join: false, type: 'composit' },
	'indefpronoun': { join: false, type: 'composit' },
	'interjection': { join: false, type: 'composit' },
	'lquotation'  : { join: false, type: 'composit' },
	'mark'        : { join: false, type: 'composit' },
	'name'        : { join: false, type: 'composit' },
	'noun'        : { join: false, type: 'composit', tupper: true },
	'part'        : { join: true,  type: 'composit' },
	'prenoun'     : { join: false, type: 'composit' },
	'prepos'      : { join: false, type: 'composit' },
	'pronoun'     : { join: false, type: 'composit' },
	'subjunction' : { join: false, type: 'composit' },
	'verb'        : { join: false, type: 'composit' }
},
'mark': {
	'rbracket'  : { join: false, type: 'composit' },
	'rquotation': { join: false, type: 'composit' }
},
'name': {
	'hyphen'          : { join: false, type: 'composit' },
	'interpunctuation': { join: false, type: 'composit' },
	'punctuation'     : { join: false, type: 'composit', endOfSentence: true },
	'rbracket'        : { join: false, type: 'composit', lupper: true },
	'rquotation'      : { join: false, type: 'composit', lupper: true }
},
'noun': {
	'adj'             : { join: true,  type: 'adj'  },
	'hyphen'          : { join: false, type: 'composit', lupper: true },
	'interpunctuation': { join: false, type: 'composit', lupper: true },
	'noun'            : { join: true,  type: 'noun', lupper: true, tlower: true },
	'part'            : { join: true,  type: 'part' }, /* this is only valid for part1, for part2 it's not. */
	'punctuation'     : { join: false, type: 'composit', lupper: true, endOfSentence: true },
	'prenoun'         : { join: true,  type: 'prenoun', lupper: true, tlower: true},
	'rbracket'        : { join: false, type: 'composit', lupper: true },
	'rquotation'      : { join: false, type: 'composit', lupper: true },
	'structure'       : { join: false, type: 'composit', lupper: true },
	'verb'            : { join: true,  type: 'verb' }
},
'number': {
	'dash'            : { join: false, type: 'composit' },
	'hyphen'          : { join: false, type: 'composit' },
	'interpunctuation': { join: false, type: 'composit' },
	'punctuation'     : { join: false, type: 'composit', endOfSentence: true },
	'rbracket'        : { join: false, type: 'composit' },
	'structure'       : { join: false, type: 'composit' },
	'unit'            : { join: false, type: 'composit' }
},
'numeral': {
	'adj'             : { join: true,  type: 'adj' },
	'hyphen'          : { join: false, type: 'composit' },
	'interpunctuation': { join: false, type: 'composit' },
	'noun'            : { join: true,  type: 'noun', lupper: true, tlower: true },
},
'ordinal': {},
'part': {
	'hyphen'          : { join: false, type: 'composit' },
	'interpunctuation': { join: false, type: 'composit' },
	'punctuation'     : { join: false, type: 'composit', endOfSentence: true },
	'rbracket'        : { join: false, type: 'composit' },
	'rquotation'      : { join: false, type: 'composit' },
	'structure'       : { join: false, type: 'composit' }
},
'particle': {
	'adj'             : { join: true,  type: 'adj' },
	'hyphen'          : { join: false, type: 'composit' },
	'interpunctuation': { join: false, type: 'composit' },
	'part'            : { join: true,  type: 'part' },
	'punctuation'     : { join: false, type: 'composit', endOfSentence: true },
	'verb'            : { join: true,  type: 'verb' }
},
'prefix': {
	'adj'   : { join: true,  type: 'adj' },
	'hyphen': { join: false, type: 'composit' },
	'noun'  : { join: true,  type: 'noun', lupper: true, tlower: true },
	'part'  : { join: true,  type: 'part' },
	'verb'  : { join: true,  type: 'verb' }
},
'prepos': {
	'adj'             : { join: true,  type: 'adj' },
	'adv'             : { join: true,  type: 'adv' },
	'interpunctuation': { join: false, type: 'composit' },
	'noun'            : { join: true,  type: 'noun', lupper: true, tlower: true },
	'rbracket'        : { join: false, type: 'composit' },
	'rquotation'      : { join: false, type: 'composit' }
},
'prenoun': {
	'adj'   : { join: true,  type: 'adj' },
	'hyphen': { join: false, type: 'composit' },
	'noun'  : { join: true,  type: 'noun', lupper: true, tlower: true },
	'part'  : { join: true,  type: 'part' }
},
'preverb': {
	'part' : { join: true, type: 'part' },
	'verb' : { join: true, type: 'verb' }
},
'pronoun': {
	'interpunctuation': { join: false, type: 'composit' },
	'punctuation'     : { join: false, type: 'composit', endOfSentence: true },
	'structure'       : { join: false, type: 'composit' }
},
'punctuation': {
	'rbracket'  : { join: false, type: 'composit' },
	'rquotation': { join: false, type: 'composit' }
},
'rbracket': {
	'interpunctuation': { join: false, type: 'composit' },
	'punctuation'     : { join: false, type: 'composit', endOfSentence: true },
	'rbracket'        : { join: false, type: 'composit' },
	'rquotation'      : { join: false, type: 'composit' }
},
'rquotation': {
	'hyphen'          : { join: false, type: 'composit' },
	'interpunctuation': { join: false, type: 'composit' },
	'punctuation'     : { join: false, type: 'composit', endOfSentence: true },
	'rbracket'        : { join: false, type: 'composit' },
	'rquotation'      : { join: false, type: 'composit' }
},
'subjunction': {},
'suffix': {},
'structure': {
	'adj'         : { join: false, type: 'composit' },
	'abbreviation': { join: false, type: 'composit' },
	'conjunction' : { join: false, type: 'composit' },
	'fragment'    : { join: false, type: 'composit' },
	'hyphen'      : { join: false, type: 'composit' },
	'noun'        : { join: false, type: 'noun', tupper: true },
	'number'      : { join: false, type: 'composit' },
	'part'        : { join: false, type: 'composit' },
	'pronoun'     : { join: false, type: 'composit' }
},
'symbol': {},
'unit': {
	'hyphen'          : { join: false, type: 'composit' },
	'interpunctuation': { join: false, type: 'composit' },
	'punctuation'     : { join: false, type: 'composit', endOfSentence: true },
	'rbracket'        : { join: false, type: 'composit' },
	'rquotation'      : { join: false, type: 'composit' }
},
'verb': {
	'hyphen'          : { join: false, type: 'composit' },
	'interpunctuation': { join: false, type: 'composit' },
	'punctuation'     : { join: false, type: 'composit', endOfSentence: true },
	'rbracket'        : { join: false, type: 'composit' },
	'rquotation'      : { join: false, type: 'composit' }
}
};