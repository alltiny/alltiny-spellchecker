var alltiny = alltiny || {};
alltiny.i18n = function(customOptions) {
	this.options = {
		wordingFileURLPattern   : '/resource/i18n/{language}.json', // this pattern specifies how to load your resoucre files.
		currentLanguageRetriever: function() {}, // this function shall return the current UI language to use.
		messageReplacer         : function(message, map) { // this is the default implementationof the message replacer.
			return message.replace(/\{([^\}]+)\}/g, function(key) {
				return map[key] || key;
			});
		}
	};
	this.wording = {};
	jQuery.extend(this.options, customOptions);
};

/**
 * This method triggers loading a language file.
 * @param language to load. This string is used with the option's wordingFileURLPattern.
 * @param onLoaded callback which is called when loading is done. If not defined then loading is done with a syncronous request.
 */
alltiny.i18n.prototype.loadLanguageFile = function(language, onLoaded) {
	var thisObj = this;
	// load the script
	jQuery.ajax({
		url     : this.options.wordingFileURLPattern.replace('{language}', language),
		dataType: 'json',
		cache   : true, // jQuery should not append the current timestamp.
		async   : typeof onLoaded === 'function', // perform this request only in an asyncronous manner if a callback was given.
		success : function(data, textStatus) {
			thisObj.wording[language] = data;
			if (typeof onLoaded === 'function') {
				onLoaded.call(null, data, textStatus);
			}
		},
		error   : function() {
			// in the error case (for instance if the language file does not exists) we create an empty wording object, to avoid performing the language file request again.
			thisObj.wording[language] = {};
		}
	});
};

alltiny.i18n.prototype.getWordingForLanguage = function(language) {
	// check whether the requested language is currently loaded.
	if (!this.wording[language]) {
		this.loadLanguageFile(language);
	}
	return this.wording[language];
};

/**
 * Returns the wording for the specified key. If the key is not found, the key itself is returned,
 * unless a defaultValue is defined.
 *
 * With the parameter "replacementMap" a JSON object can be specified. The attributes of this object
 * are then used to fill the placeholders in the message text. The mapReplacer implementation can be
 * overwritten in the options. The default implementation expects all placeholders to be written in
 * simple curly brackets, for instance: "He lived in a {color} house."
 *
 * @param {Object} key
 * @param {Object} replacementMap
 * @param {Object} returnKey
 */
alltiny.i18n.prototype.get = function(key, replacementMap, defaultValue) {
	return this.getForLanguage(this.options.currentLanguageRetriever(), key, replacementMap, defaultValue);
};

alltiny.i18n.prototype.getForLanguage = function(language, key, replacementMap, defaultValue) {
	var wording = this.getWordingForLanguage(language) || {};
	var message = wording[key] || (defaultValue === undefined ? key : defaultValue);

	if (replacementMap != null) {
		return this.options.messageReplacer(message, replacementMap);
	} else {
		return message;
	}
};

