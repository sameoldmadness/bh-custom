module.exports = function (tree) {
	var get = {
		root: function () {
			return tree.body;
		},

		closure: function () {
			return get.root()[0].declarations[0].init.callee.body.body;
		},

		constructor: function () {
			var result;

			get.closure().some(function (node, index) {
				if (node.type === 'FunctionDeclaration' && node.id.name === 'BH') {
					result = index;

					return true;
				}
			});		

			return get.closure()[result];
		},

		constructorProperties: function () {
			return get.constructor().body.body;
		},

		constructorProperty: function (name) {
			var result;

			get.constructorProperties().some(function (node) {
				if (node.expression.left.property.name === name) {
					result = node;

					return true;
				}
			});

			return result;
		},

		utils: function () {
			return get.constructorProperty('utils');
		},

		utilsProperties: function () {
			var utils = get.utils();

			return utils ? utils.expression.right.properties : [];
		},

		proto: function () {
			var result;

			get.closure().some(function (node, index) {
				if (node.type === 'ExpressionStatement' && 
					node.expression.left.object.name === 'BH' &&
					node.expression.left.property.name === 'prototype'
				) {
					result = index;

					return true;
				}
			});		

			return get.closure()[result];
		},

		protoProperties: function () {
			return get.proto().expression.right.properties;
		},

		protoProperty: function (name) {
			var result;

			get.protoProperties().some(function (node) {
				if (node.key.name === name) {
					result = node;

					return true;
				}
			});

			return result;
		},

		processBemJson: function () {
			var prop = get.protoProperty('processBemJson');

			return prop ? prop.value.body.body : [];
		}
	};

	var del = {
		utilsProperties: function (names) {
			var nodes = get.utilsProperties();
			var indexesToStrip = [];

			nodes.forEach(function (node, index) {
				if (names.indexOf(node.key.name) !== -1) {
					indexesToStrip.push(index);
				}
			});

			indexesToStrip.reverse().forEach(function (index) {
				nodes.splice(index, 1);
			});
		},

		closureVariables: function (names) {
			var nodes = get.closure();
			var indexesToStrip = [];

			nodes.forEach(function (node, index) {
				if (node.type !== 'VariableDeclaration') {
					return;
				}

				if (names.indexOf(node.declarations[0].id.name) !== -1) {
					indexesToStrip.push(index);
				}
			});

			indexesToStrip.reverse().forEach(function (index) {
				nodes.splice(index, 1);
			});
		},

		protoProperties: function (names) {
			var nodes = get.protoProperties();
			var indexesToStrip = [];

			nodes.forEach(function (node, index) {
				if (names.indexOf(node.key.name) !== -1) {
					indexesToStrip.push(index);
				}
			});

			indexesToStrip.reverse().forEach(function (index) {
				nodes.splice(index, 1);
			});
		},

		constructorProperty: function (names) {
			var nodes = get.constructorProperties();
			var indexesToStrip = [];

			nodes.forEach(function (node, index) {
				if (names.indexOf(node.expression.left.property.name) !== -1) {
					indexesToStrip.push(index);
				}
			});

			indexesToStrip.reverse().forEach(function (index) {
				nodes.splice(index, 1);
			});
		},

		moduleWrapper: function () {
			get.root().splice(1,1);
		},

		processBemJsonVariables: function (names) {
			var nodes = get.processBemJson();
			var indexesToStrip = [];

			nodes.forEach(function (node, index) {
				if (node.type !== 'VariableDeclaration') {
					return;
				}

				if (names.indexOf(node.declarations[0].id.name) !== -1) {
					indexesToStrip.push(index);
				}
			});

			indexesToStrip.reverse().forEach(function (index) {
				nodes.splice(index, 1);
			});
		}
	};

	return {
		modules: function () {
			del.moduleWrapper();
		},

		positioning: function () {
			del.utilsProperties(['position', 'isFirst', 'isLast']);
		},

		sugar: function () {
			del.constructorProperty(['lib']);
			del.utilsProperties(['bh', 'mod', 'attr', 'json']);
		},

		infrequent: function () {
			del.utilsProperties(['isSimple', 'process', 'bem', 'html',
				                 'cls', 'tParam', 'applyBase', 'stop']);
			del.protoProperties(['beforeEach', 'afterEach']);
		},

		generate: function () {
			del.utilsProperties(['generateId', '_expandoId']);
			del.closureVariables(['lastGenId']);
		},

		js: function () {
			del.utilsProperties(['js']);
		},

		mix: function () {
			del.utilsProperties(['mix']);
		},

		matchers: function () {
			del.constructorProperty(['_lastMatchId', '_matchers', 'utils']);
			del.protoProperties(['match', 'apply', 'buildMatcher', 'processBemJson']);
		},

		recursionCheck: function () {
			del.constructorProperty(['_infiniteLoopDetection']);
			del.protoProperties(['enableInfiniteLoopDetection']);
			del.processBemJsonVariables(['infiniteLoopDetection']);
		},

		options: function (options) {
			del.constructorProperty(['_options']);
			del.protoProperties(['setOptions', 'getOptions']);

			Object.keys(options).forEach(function (option) {
				var property = '_opt' + option.slice(0, 1).toUpperCase() + option.slice(1);
				var node = get.constructorProperty(property);
				var value = options[option];

				node.expression.right.value = value;
				node.expression.right.raw = JSON.stringify(value);
			});
		}
	}
};