var alltiny = alltiny || {};
alltiny.Editor = function(targetSelector, options) {
	var thisObj = this;
	this.$target = jQuery(targetSelector);
	this.options = jQuery.extend(true, {
		spellchecker : null,
		cursorCharacter : '\u2038',
		afterCheck : null /*fuction(target) {}*/ // a call-back function call after a check was done.
	}, options);
	// ensure that given target is a content-editable.
	jQuery(targetSelector).attr('contenteditable', 'true');
	// hook a change listener onto the element.
	jQuery(targetSelector).keyup(function(e) {
		// store current cursor postion.
		var selection = thisObj.saveSelection(targetSelector);
		// start checking.
		thisObj.performSpellcheck();
		// restore cursor postion.
		thisObj.restoreSelection(selection);
		// call call-back
		if (typeof thisObj.options.afterCheck == 'function') {
			thisObj.options.afterCheck.call(thisObj, thisObj.$target);
		}
	});
};

/**
 * This method will steore the current selection in a selection object.
 * Method {@link alltiny.Editor.prototype.restoreSelection} can restore this selection.
 */
alltiny.Editor.prototype.saveSelection = function(target) {
	var thisObj = this;
	var selection = rangy.saveSelection();
	// store the target in the seelction object. Used in {@link alltiny.Editor.prototype.restoreSelection}
	selection.target = target || document.body;
	// replace all span.rangySelectionBoundary by CARETs. store the original span in the selection to be able to restore them later.
	selection.spans = [];
	jQuery(selection.target).find('span.rangySelectionBoundary').each(function(index, span) {
		selection.spans[index] = span.outerHTML; // store the spans HTML.
		// replace the span.
		jQuery(span).replaceWith(thisObj.options.cursorCharacter);
	});
	return selection;
};

/**
 * This method can restore a selection which was made by {@link alltiny.Editor.prototype.saveSelection}.
 */
alltiny.Editor.prototype.restoreSelection = function(selection) {
	// restore the spans stored in the selection object.
	var index = 0;
	var content = jQuery(selection.target).html().replace(new RegExp(this.options.cursorCharacter, 'g'), function() {
		return selection.spans[index++];
	});
	jQuery(selection.target).html(content);
	return rangy.restoreSelection(selection);
};

alltiny.Editor.prototype.removeMarkers = function() {
	return rangy.removeMarkers();
};

alltiny.Editor.prototype.performSpellcheck = function() {
	// remove any previously done checking highlights.
	this.options.spellchecker.removeAnyHighlights(this.$target);
	// to get as few text nodes as possible we need to rejoin them.
	this.rejoinTextNodes(this.$target);
	// perform our spellcheck.
	this.options.spellchecker.setAssumeStartOfSentence(true);
	this.checkNode(this.$target);
};

alltiny.Editor.prototype.checkNode = function(node, customOptions) {
	var thisObj = this;
	var options = jQuery.extend(true, {}, customOptions); // make a deep copy.

	jQuery.each(jQuery(node).contents().get(), function(index, element) {
		if (element.nodeType === 1) { // if this is a node again.
			if (jQuery(element).is('li')) { // if this node is an list item then activate the set the spellchecker to be case-insensitive for the next coming word.
				thisObj.options.spellchecker.setCaseInsensitiveForNextWord(true);
			}
			thisObj.checkNode(element, options);
		} else if (element.nodeType === 3) { // if this is a text node then check it with the spellChecker.
			var checkedText = thisObj.options.spellchecker.check(element.nodeValue, options);
			if (checkedText !== element.nodeValue) { // since every DOM modification triggers events, modify only if necessary.
				jQuery(element).replaceWith(checkedText);
			}
		}
	});
};

/**
 * Inserting and removing spans in the editor content will create split textNodes.
 * This method will rejoin all the textNodes.
 */
alltiny.Editor.prototype.rejoinTextNodes = function($target) {
	var thisObj = this;
	var previousTextNode = null;
	jQuery.each(jQuery($target).contents(), function() {
		if (this.nodeType === 3) { // if this is a text node then rejoin with previous node.
			if (previousTextNode !== null) {
				previousTextNode.appendData(jQuery(this).text());
				jQuery(this).remove();
			} else {
				previousTextNode = this;
			}
		}
		if (this.nodeType === 1) { // if this is again an node then recursivly walk the children.
			thisObj.rejoinTextNodes(jQuery(this));
			// reset the previous node to freshly start over.
			previousTextNode = null;
		}
	});
};