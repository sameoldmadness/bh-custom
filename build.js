var inquirer = require("inquirer");

function bool(value) {
  var pass = value === 'true' || value === 'false';
  if (pass) {
    return true;
  } else {
    return "Please enter boolean value";
  }
}

function attr(value) {
  var pass = value.match(/^[\w-]+$/);
  if (pass) {
    return true;
  } else {
    return "Please enter valid attribute";
  }
}

function toBool(value) {
  return value === 'true';
}

function whenOptions(answers) {
  return answers.presets.indexOf('options') !== -1;
}

inquirer.prompt([
  {
    type: "checkbox",
    message: "Chose Presets",
    name: "presets",
    choices: [
      { name: 'modules', checked: true },
      { name: 'positioning', checked: true },
      { name: 'sugar', checked: true },
      { name: 'infrequent', checked: true },
      { name: 'generate', checked: true },
      { name: 'js', checked: true },
      { name: 'mix', checked: true },
      { name: 'matchers', checked: true },
      { name: 'recursionCheck', checked: true },
      { name: 'options', checked: true }
    ]
  },
  {
    type: 'input',
    name: 'jsAttrName',
    message: 'Set jsAttrName',
    default: 'onclick',
    when: whenOptions,
    validate: attr
  },
  {
    type: 'input',
    name: 'jsAttrIsJs',
    message: 'Set jsAttrIsJs',
    default: 'true',
    when: whenOptions,
    validate: bool,
    filter: toBool
  },
  {
    type: 'input',
    name: 'jsCls',
    message: 'Set jsCls',
    default: 'i-bem',
    when: whenOptions,
    validate: attr
  },
  {
    type: 'input',
    name: 'jsElem',
    message: 'Set jsElem',
    default: 'true',
    when: whenOptions,
    validate: bool,
    filter: toBool
  },
  {
    type: 'input',
    name: 'escapeContent',
    message: 'Set escapeContent',
    default: 'true',
    when: whenOptions,
    validate: bool,
    filter: toBool
  },
  {
    type: 'input',
    name: 'nobaseMods',
    message: 'Set nobaseMods',
    default: 'false',
    when: whenOptions,
    validate: bool,
    filter: toBool
  },
  {
    type: 'input',
    name: 'delimElem',
    message: 'Set delimElem',
    default: '__',
    when: whenOptions,
    validate: attr
  },
  {
    type: 'input',
    name: 'delimMod',
    message: 'Set delimMod',
    default: '_',
    when: whenOptions,
    validate: attr
  }
], function( answers ) {

var esprima = require('esprima');
var escodegen = require('escodegen');

var read = require('fs').readFileSync;
var write = require('fs').writeFileSync;

var code = read('./node_modules/bh/lib/bh.js');
var syntax = esprima.parse(code, { raw: true, tokens: true, range: true, comment: true });
// var syntax = esprima.parse(code);

// write('./ast.json', JSON.stringify(syntax));

syntax = escodegen.attachComments(syntax, syntax.comments, syntax.tokens);

// transform tree
var walker = require('./src/astWalker')(syntax);

var presets = answers.presets;
delete answers.presets;

presets.forEach(function (preset) {
  walker[preset](answers);
});
// end transformations

// write('./ast-comments.json', JSON.stringify(syntax));

code = escodegen.generate(syntax, {
    comment: true,
    format: {
        indent: {
            style: '  '
        },
        quotes: 'single'
    }
});

write('./dist/bh.js', code);

});


