var esprima = require('esprima');
var escodegen = require('escodegen');

var read = require('fs').readFileSync;
var write = require('fs').writeFileSync;

var code = read('./node_modules/bh/lib/bh.js');
var syntax = esprima.parse(code, { raw: true, tokens: true, range: true, comment: true });

// write('./ast.json', JSON.stringify(syntax));

syntax = escodegen.attachComments(syntax, syntax.comments, syntax.tokens);

// transform tree
var utilsNode = syntax.body[0].declarations[0].init.callee.body.body[1].body.body[11];

var helpersToStrip = ['isSimple', 'position', 'isFirst', 'isLast', 'process',
                      'generateId', 'mod', 'attr', 'bem', 'cls', 'json'];
var helpers = utilsNode.expression.right.properties;

helpers.forEach(function (method, index) {
	var name = method.key.name;

	if (helpersToStrip.indexOf(name) !== -1) {
		delete helpers[index];
	}
});

utilsNode.expression.right.properties = helpers.filter(Boolean);
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
