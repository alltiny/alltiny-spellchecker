# alltiny-spellchecker
Is a dictionary-based spellchecker written in JavaScript and ready to be build into your page.
It not only provides spellchecking but also hyphenation/syllabification for the words in your text.
All checks are done completely in the client's browser. No content must be transmitted to the server.

Integration in your page is fairly easy:

    // initialize the spellchecker.
    var spellchecker = new alltiny.Spellchecker();

    // load all the distionaries you want to use.
    jQuery.getJSON("dict/alltiny.dict.base.de_de.json", function(dict) {
        spellchecker.addDictionary(new alltiny.Dictionary(dict));
    });

    // let the spellchecker perform a spell check.
    jQuery(target).html(spellchecker.checkText(jQuery(target).text()));

The spellchecker can use multiple dictionaries at once. You can also build a dictionary on the fly.
For instance if you know already some keywords of the context your user is currently in.

    // building a dictionary on the fly
    var dict = new alltiny.Dictionary({name: 'Customer Dictionary'});
    // add words to the dictionary.
    dict.addWord({type: 'name', w: customer.firstName});
    dict.addWord({type: 'name', w: customer.lastName});

# Dictionaries
Right now a German base dictionary exists. It still misses some words.
For international known trademarks and tradenames a separate dictionary exists.
Also for English a dictionary has been started but still is in the intitial build up phase.
Final goal is indeed to provide base dictionaries in most common languages.

## Dictionary coverage
We measure the coverage by opening random news articles and count how many words the dictionary did recognize.

    alltiny.dict.base.de_de.json   87%
