# alltiny-spellchecker
Is a dictionary-based spellchecker written in JavaScript and ready to be build into your page.
It not only offers spellchecking but also hyphenation/syllabification of the words in your text.
All checks are done completely in the clients browser. Nothing is transmitted to a server.

Integration in your page is fairly easy:

    // initialize the spellchecker.
    var spellchecker = new alltiny.Spellchecker();

    // load all the distionaries you want to use.
    jQuery.getJSON("dict/alltiny.dict.base.de_de.json", function(dict) {
        spellchecker.addDictionary(dict);
    });

    // let the spellchecker perform a spell check.
    jQuery(target).html(spellchecker.check(jQuery(target).text()));

The spellchecker can use multiple dictionaries at once. You can also build a dictionary on the fly.
For instance if you know already some keywords from the context our user is currently in.

    // building a dictionary on the fly
    var dict = {
        name: 'Customer Dictionary',
        words: {}
    };
    // 'words' is an index. spellchecker's convention is that the key is always lower case.
    dict.words[customer.firstName.toLowerCase()] = [{type:'name', w:customer.firstName}];
    dict.words[customer.lastName.toLowerCase()] = [{type:'name', w:customer.lastName}];

# Dictionaries
Right now only a German base dictionary exists. But this will change soon.
Our goal is to have base dictionaries in almost any language.

## Dictionary coverage
We measure the coverage by opening up a random news article and see how many words the dictionary did recognize.

    alltiny.dict.base.de_de.json   72%
