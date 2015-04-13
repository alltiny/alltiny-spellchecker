# Syntax 1.0 of all dictionary files
## Abstract
This document describes the syntax in version 1.0 of all dictionary files.

## Version number of Syntax
The version number of a syntax consists of a major and a minor version number. The minor version number is raised when the syntax is extended with no conflict to the previous version of the syntax. This is the case for instance when an additional field or type is added. The major version number must increased when the new syntax conflicts with the previous one. For instance when a field or type is removed.

## Dictionary file
Each dictionary file is encoded in UTF-8. Each dictionary file contains one JSON-Object. This JSON-Object is the dictionary object.

## Dictionary Object
The dictionary object has following attributes:
 * "name" - String, containing the name of the dictionary
 * "syntax" - Array of Integer, containing the version number of the syntax this dictionary follows. Index 0 is major and index 1 is minor version number
 * "fragments" - Array of String, contains all character used by the words in this dictionary as regex groups.
 * "index" - Object, see Index Object
 
## Index Object
The index object is an index. The attributes are the written all lower case. For better maintainability they are in alphabetical order. The value of each attribute is an array of word objects.

## Word Object
All word objects have follwoing attributes:
 * "w" - String containing the word. The word may contain pipe characters to indicate where the word can be splitted by a hyphen.
 * "type" - String declaring the type of the word. See the different type definitions.

## Word Type Definitions.
### Noun
### Verb
### Numeral
A numeral is a word representing a number. The attribute "value" contains this number.
Example: {"w":"sev|en","type":"numeral","value":7}
### Ordernal
An ordernal is a word representing a position or place in an ordered sequence. The attribute "value" contains this place as integer.
Example: {"w":"sev|enth","type":"orderal","value":7}
### Abbreviation
{"w":"AG","type":"abbreviation","abbreviation":"Aktiengesellschaft"}
### Contractions
{"type":"contraction","contraction":["an","dem"]}