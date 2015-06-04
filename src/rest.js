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

walker.modules();
walker.positioning();
walker.sugar();
walker.infrequent();
walker.js();
walker.mix();
// walker.matchers();
walker.recursionCheck();
walker.options({
	jsAttrName: 'foo',
	jsAttrIsJs: false,
	jsCls: 'hey',
	jsElem: false,
	escapeContent: true,
	nobaseMods: true
});
walker.generate();
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

write('./dist/bh-tiny.js', code);
