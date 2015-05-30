var BH = function () {
  var lastGenId = 0;
  /**
 * BH: BEMJSON -> HTML процессор.
 * @constructor
 */
  function BH() {
    /**
     * Используется для идентификации шаблонов.
     * Каждому шаблону дается уникальный id для того, чтобы избежать повторного применения
     * шаблона к одному и тому же узлу BEMJSON-дерева.
     * @type {Number}
     * @private
     */
    this._lastMatchId = 0;
    /**
     * Плоский массив для хранения матчеров.
     * Каждый элемент — массив с двумя элементами: [{String} выражение, {Function} шаблон}]
     * @type {Array}
     * @private
     */
    this._matchers = [];
    /**
     * Флаг, включающий автоматическую систему поиска зацикливаний. Следует использовать в development-режиме,
     * чтобы определять причины зацикливания.
     * @type {Boolean}
     * @private
     */
    this._infiniteLoopDetection = false;
    /**
     * Неймспейс для библиотек. Сюда можно писать различный функционал для дальнейшего использования в шаблонах.
     * ```javascript
     * bh.lib.i18n = BEM.I18N;
     * bh.lib.objects = bh.lib.objects || {};
     * bh.lib.objects.inverse = bh.lib.objects.inverse || function(obj) { ... };
     * ```
     * @type {Object}
     */
    this.lib = {};
    /**
     * Опции BH. Задаются через setOptions.
     * @type {Object}
     */
    this._options = {};
    this._optJsAttrName = 'onclick';
    this._optJsAttrIsJs = true;
    this._optJsCls = 'i-bem';
    this._optJsElem = true;
    this._optEscapeContent = false;
    this._optNobaseMods = false;
    this.utils = {
      _expandoId: new Date().getTime(),
      bh: this,
      /**
         * Расширяет один объект свойствами другого (других).
         * Аналог jQuery.extend.
         * ```javascript
         * obj = ctx.extend(obj, {a: 1});
         * ```
         * @param {Object} target
         * @returns {Object}
         */
      extend: function (target) {
        if (!target || typeof target !== 'object') {
          target = {};
        }
        for (var i = 1, len = arguments.length; i < len; i++) {
          var obj = arguments[i], key;
          /* istanbul ignore else */
          if (obj) {
            for (key in obj) {
              target[key] = obj[key];
            }
          }
        }
        return target;
      },
      /**
         * Передает параметр вглубь BEMJSON-дерева.
         * **force** — задать значение параметра даже если оно было задано ранее.
         * ```javascript
         * bh.match('input', function(ctx) {
         *     ctx.content({ elem: 'control' });
         *     ctx.tParam('value', ctx.param('value'));
         * });
         * bh.match('input__control', function(ctx) {
         *     ctx.attr('value', ctx.tParam('value'));
         * });
         * ```
         * @param {String} key
         * @param {*} value
         * @param {Boolean} [force]
         * @returns {*|Ctx}
         */
      tParam: function (key, value, force) {
        var keyName = '__tp_' + key;
        var node = this.node;
        if (arguments.length > 1) {
          if (force || !node.hasOwnProperty(keyName))
            node[keyName] = value;
          return this;
        } else {
          while (node) {
            if (node.hasOwnProperty(keyName)) {
              return node[keyName];
            }
            node = node.parentNode;
          }
          return undefined;
        }
      },
      /**
         * Выполняет преобразования данного BEMJSON-элемента остальными шаблонами.
         * Может понадобиться, например, чтобы добавить элемент в самый конец содержимого, если в базовых шаблонах в конец содержимого добавляются другие элементы.
         * Пример:
         * ```javascript
         * bh.match('header', function(ctx) {
         *    ctx.content([
         *        ctx.content(),
         *        { elem: 'under' }
         *    ], true);
         * });
         * bh.match('header_float_yes', function(ctx) {
         *    ctx.applyBase();
         *    ctx.content([
         *        ctx.content(),
         *        { elem: 'clear' }
         *    ], true);
         * });
         * ```
         * @returns {Ctx}
         */
      applyBase: function () {
        var node = this.node;
        var json = node.json;
        var block = json.block;
        var blockMods = json.mods;
        var subRes = this.bh._fastMatcher(this, json);
        if (subRes !== undefined) {
          this.ctx = node.arr[node.index] = node.json = subRes;
          node.block = block;
          node.mods = blockMods;
        }
        return this;
      },
      /**
         * Останавливает выполнение прочих шаблонов для данного BEMJSON-элемента.
         * Пример:
         * ```javascript
         * bh.match('button', function(ctx) {
         *     ctx.tag('button', true);
         * });
         * bh.match('button', function(ctx) {
         *     ctx.tag('span');
         *     ctx.stop();
         * });
         * ```
         * @returns {Ctx}
         */
      stop: function () {
        this.ctx._stop = true;
        return this;
      },
      /**
         * Возвращает/устанавливает модификаторы в зависимости от аргументов.
         * **force** — задать модификаторы даже если они были заданы ранее.
         * ```javascript
         * bh.match('paranja', function(ctx) {
         *     ctx.mods({
         *         theme: 'normal',
         *         disabled: true
         *     });
         * });
         * ```
         * @param {Object} [values]
         * @param {Boolean} [force]
         * @returns {Object|Ctx}
         */
      mods: function (values, force) {
        var field = this.ctx.elem ? 'elemMods' : 'mods';
        var mods = this.ctx[field];
        if (values !== undefined) {
          this.ctx[field] = force ? this.extend(mods, values) : this.extend(values, mods);
          return this;
        } else {
          return mods;
        }
      },
      /**
         * Возвращает/устанавливает тег в зависимости от аргументов.
         * **force** — задать значение тега даже если оно было задано ранее.
         * ```javascript
         * bh.match('input', function(ctx) {
         *     ctx.tag('input');
         * });
         * ```
         * @param {String} [tagName]
         * @param {Boolean} [force]
         * @returns {String|undefined|Ctx}
         */
      tag: function (tagName, force) {
        if (tagName !== undefined) {
          this.ctx.tag = this.ctx.tag === undefined || force ? tagName : this.ctx.tag;
          return this;
        } else {
          return this.ctx.tag;
        }
      },
      /**
         * Возвращает/устанавливает значение mix в зависимости от аргументов.
         * При установке значения, если force равен true, то переданный микс заменяет прежнее значение,
         * в противном случае миксы складываются.
         * ```javascript
         * bh.match('button_pseudo_yes', function(ctx) {
         *     ctx.mix({ block: 'link', mods: { pseudo: 'yes' } });
         *     ctx.mix([
         *         { elem: 'text' },
         *         { block: 'ajax' }
         *     ]);
         * });
         * ```
         * @param {Array|BemJson} [mix]
         * @param {Boolean} [force]
         * @returns {Array|undefined|Ctx}
         */
      mix: function (mix, force) {
        if (mix === undefined) {
          return this.ctx.mix;
        }
        this.ctx.mix = force || !this.ctx.mix ? mix : (Array.isArray(this.ctx.mix) ? this.ctx.mix : [this.ctx.mix]).concat(mix);
        return this;
      },
      /**
         * Возвращает/устанавливает атрибуты в зависимости от аргументов.
         * **force** — задать атрибуты даже если они были заданы ранее.
         * ```javascript
         * bh.match('input', function(ctx) {
         *     ctx.attrs({
         *         name: ctx.param('name'),
         *         autocomplete: 'off'
         *     });
         * });
         * ```
         * @param {Object} [values]
         * @param {Boolean} [force]
         * @returns {Object|Ctx}
         */
      attrs: function (values, force) {
        var attrs = this.ctx.attrs || {};
        if (values !== undefined) {
          this.ctx.attrs = force ? this.extend(attrs, values) : this.extend(values, attrs);
          return this;
        } else {
          return attrs;
        }
      },
      /**
         * Возвращает/устанавливает значение `js` в зависимости от аргументов.
         * **force** — задать значение `js` даже если оно было задано ранее.
         * Значение `js` используется для инициализации блоков в браузере через `BEM.DOM.init()`.
         * ```javascript
         * bh.match('input', function(ctx) {
         *     ctx.js(true);
         * });
         * ```
         * @param {Boolean|Object} [js]
         * @param {Boolean} [force]
         * @returns {Boolean|Object|Ctx}
         */
      js: function (js, force) {
        if (js !== undefined) {
          this.ctx.js = force ? js === true ? {} : js : js ? this.extend(this.ctx.js, js) : this.ctx.js;
          return this;
        } else {
          return this.ctx.js;
        }
      },
      /**
         * Возвращает/устанавливает параметр текущего BEMJSON-элемента.
         * **force** — задать значение параметра, даже если оно было задано ранее.
         * Например:
         * ```javascript
         * // Пример входного BEMJSON: { block: 'search', action: '/act' }
         * bh.match('search', function(ctx) {
         *     ctx.attr('action', ctx.param('action') || '/');
         * });
         * ```
         * @param {String} key
         * @param {*} [value]
         * @param {Boolean} [force]
         * @returns {*|Ctx}
         */
      param: function (key, value, force) {
        if (value !== undefined) {
          this.ctx[key] = this.ctx[key] === undefined || force ? value : this.ctx[key];
          return this;
        } else {
          return this.ctx[key];
        }
      },
      /**
         * Возвращает/устанавливает защищенное содержимое в зависимости от аргументов.
         * **force** — задать содержимое даже если оно было задано ранее.
         * ```javascript
         * bh.match('input', function(ctx) {
         *     ctx.content({ elem: 'control' });
         * });
         * ```
         * @param {BemJson} [value]
         * @param {Boolean} [force]
         * @returns {BemJson|Ctx}
         */
      content: function (value, force) {
        if (arguments.length > 0) {
          this.ctx.content = this.ctx.content === undefined || force ? value : this.ctx.content;
          return this;
        } else {
          return this.ctx.content;
        }
      },
      /**
         * Возвращает/устанавливает незащищенное содержимое в зависимости от аргументов.
         * **force** — задать содержимое даже если оно было задано ранее.
         * ```javascript
         * bh.match('input', function(ctx) {
         *     ctx.html({ elem: 'control' });
         * });
         * ```
         * @param {String} [value]
         * @param {Boolean} [force]
         * @returns {String|Ctx}
         */
      html: function (value, force) {
        if (arguments.length > 0) {
          this.ctx.html = this.ctx.html === undefined || force ? value : this.ctx.html;
          return this;
        } else {
          return this.ctx.html;
        }
      }
    };
  }
  BH.prototype = {
    /**
     * Задает опции шаблонизации.
     *
     * @param {Object} options
     *        {String} options[jsAttrName] Атрибут, в который записывается значение поля `js`. По умолчанию, `onclick`.
     *        {String} options[jsAttrScheme] Схема данных для `js`-значения.
     *                 Форматы:
     *                     `js` — значение по умолчанию. Получаем `return { ... }`.
     *                     `json` — JSON-формат. Получаем `{ ... }`.
     * @returns {BH}
     */
    setOptions: function (options) {
      var i;
      for (i in options) {
        this._options[i] = options[i];
      }
      if (options.jsAttrName) {
        this._optJsAttrName = options.jsAttrName;
      }
      if (options.jsAttrScheme) {
        this._optJsAttrIsJs = options.jsAttrScheme === 'js';
      }
      if (options.jsCls !== undefined) {
        this._optJsCls = options.jsCls;
      }
      if (options.hasOwnProperty('jsElem')) {
        this._optJsElem = options.jsElem;
      }
      if (options.clsNobaseMods) {
        this._optNobaseMods = true;
      }
      if (options.escapeContent) {
        this._optEscapeContent = options.escapeContent;
      }
      return this;
    },
    /**
     * Возвращает опции шаблонизации.
     *
     * @returns {Object}
     */
    getOptions: function () {
      return this._options;
    },
    /**
     * Включает/выключает механизм определения зацикливаний.
     *
     * @param {Boolean} enable
     * @returns {BH}
     */
    enableInfiniteLoopDetection: function (enable) {
      this._infiniteLoopDetection = enable;
      return this;
    },
    /**
     * Преобразует BEMJSON в HTML-код.
     * @param {BemJson} bemJson
     * @returns {String}
     */
    apply: function (bemJson) {
      return this.toHtml(this.processBemJson(bemJson));
    },
    /**
     * Объявляет шаблон.
     * ```javascript
     * bh.match('page', function(ctx) {
     *     ctx.mix([{ block: 'ua' }]);
     *     ctx.cls('ua_js_no ua_css_standard');
     * });
     * bh.match('block_mod_modVal', function(ctx) {
     *     ctx.tag('span');
     * });
     * bh.match('block__elem', function(ctx) {
     *     ctx.attr('disabled', 'disabled');
     * });
     * bh.match('block__elem_elemMod', function(ctx) {
     *     ctx.mix([{ block: 'link' }]);
     * });
     * bh.match('block__elem_elemMod_elemModVal', function(ctx) {
     *     ctx.mod('active', 'yes');
     * });
     * bh.match('block_blockMod__elem', function(ctx) {
     *     ctx.param('checked', true);
     * });
     * bh.match('block_blockMod_blockModVal__elem', function(ctx) {
     *     ctx.content({
     *         elem: 'wrapper',
     *         content: ctx
     *     };
     * });
     * ```
     * @param {String|Array|Object} expr
     * @param {Function} matcher
     * @returns {BH}
     */
    match: function (expr, matcher) {
      if (!expr)
        return this;
      if (Array.isArray(expr)) {
        expr.forEach(function (match, i) {
          this.match(expr[i], matcher);
        }, this);
        return this;
      }
      if (typeof expr === 'object') {
        for (var i in expr) {
          this.match(i, expr[i]);
        }
        return this;
      }
      matcher.__id = '__func' + this._lastMatchId++;
      this._matchers.push([
        expr,
        matcher
      ]);
      this._fastMatcher = null;
      return this;
    },
    /**
     * Объявляет глобальный шаблон, применяемый перед остальными.
     * ```javascript
     * bh.beforeEach(function(ctx, json) {
     *     ctx.attr('onclick', json.counter);
     * });
     * ```
     * @param {Function} matcher
     * @returns {BH}
     */
    beforeEach: function (matcher) {
      return this.match('$before', matcher);
    },
    /**
     * Объявляет глобальный шаблон, применяемый после остальных.
     * ```javascript
     * bh.afterEach(function(ctx) {
     *     ctx.tag('xdiv');
     * });
     * ```
     * @param {Function} matcher
     * @returns {BH}
     */
    afterEach: function (matcher) {
      return this.match('$after', matcher);
    },
    /**
     * Вспомогательный метод для компиляции шаблонов с целью их быстрого дальнейшего исполнения.
     * @returns {String}
     */
    buildMatcher: function () {
      /**
         * Группирует селекторы матчеров по указанному ключу.
         * @param {Array} data
         * @param {String} key
         * @returns {Object}
         */
      function groupBy(data, key) {
        var res = {};
        for (var i = 0, l = data.length; i < l; i++) {
          var item = data[i];
          var value = item[key] || '__no_value__';
          (res[value] || (res[value] = [])).push(item);
        }
        return res;
      }
      /**
         * Вставляет вызов шаблона в очередь вызова.
         * @param {Array} res
         * @param {String} fnId
         * @returns {Number} index
         */
      function pushMatcher(res, fnId, index) {
        res.push('json.' + fnId + ' = true;', 'subRes = _m' + index + '(ctx, json);', 'if (subRes !== undefined) return (subRes || "");', 'if (json._stop) return;');
      }
      var i, j, l;
      var res = [];
      var vars = ['bh = this'];
      var allMatchers = this._matchers;
      var decl, expr, matcherInfo;
      var declarations = [], exprBits, blockExprBits;
      for (i = allMatchers.length - 1; i >= 0; i--) {
        matcherInfo = allMatchers[i];
        expr = matcherInfo[0];
        vars.push('_m' + i + ' = ms[' + i + '][1]');
        decl = {
          fn: matcherInfo[1],
          index: i
        };
        if (~expr.indexOf('__')) {
          exprBits = expr.split('__');
          blockExprBits = exprBits[0].split('_');
          decl.block = blockExprBits[0];
          if (blockExprBits.length > 1) {
            decl.blockMod = blockExprBits[1];
            decl.blockModVal = blockExprBits[2] || true;
          }
          exprBits = exprBits[1].split('_');
          decl.elem = exprBits[0];
          if (exprBits.length > 1) {
            decl.elemMod = exprBits[1];
            decl.elemModVal = exprBits[2] || true;
          }
        } else {
          exprBits = expr.split('_');
          decl.block = exprBits[0];
          if (exprBits.length > 1) {
            decl.blockMod = exprBits[1];
            decl.blockModVal = exprBits[2] || true;
          }
        }
        declarations.push(decl);
      }
      var declByBlock = groupBy(declarations, 'block');
      var beforeEach = declByBlock.$before;
      var afterEach = declByBlock.$after;
      if (afterEach)
        delete declByBlock.$after;
      res.push('var ' + vars.join(', ') + ';', 'function applyMatchers(ctx, json) {', 'var subRes;');
      if (beforeEach) {
        delete declByBlock.$before;
        for (j = 0, l = beforeEach.length; j < l; j++) {
          decl = beforeEach[j];
          pushMatcher(res, decl.fn.__id, decl.index);
        }
      }
      res.push('switch (json.block) {');
      for (var blockName in declByBlock) {
        res.push('case "' + blockName + '":');
        var declsByElem = groupBy(declByBlock[blockName], 'elem');
        res.push('switch (json.elem) {');
        for (var elemName in declsByElem) {
          if (elemName === '__no_value__') {
            res.push('case undefined:');
          } else {
            res.push('case "' + elemName + '":');
          }
          var decls = declsByElem[elemName];
          for (j = 0, l = decls.length; j < l; j++) {
            decl = decls[j];
            var fn = decl.fn;
            var conds = [];
            conds.push('!json.' + fn.__id);
            if (decl.elemMod) {
              conds.push('json.elemMods && json.elemMods["' + decl.elemMod + '"] === ' + (decl.elemModVal === true || '"' + decl.elemModVal + '"'));
            }
            if (decl.blockMod) {
              conds.push('json.mods && json.mods["' + decl.blockMod + '"] === ' + (decl.blockModVal === true || '"' + decl.blockModVal + '"'));
            }
            res.push('if (' + conds.join(' && ') + ') {');
            pushMatcher(res, fn.__id, decl.index);
            res.push('}');
          }
          res.push('break;');
        }
        res.push('}', 'break;');
      }
      res.push('}');
      if (afterEach) {
        for (j = 0, l = afterEach.length; j < l; j++) {
          decl = afterEach[j];
          pushMatcher(res, decl.fn.__id, decl.index);
        }
      }
      res.push('};', 'return applyMatchers;');
      return res.join('\n');
    },
    /**
     * Раскрывает BEMJSON, превращая его из краткого в полный.
     * @param {BemJson} bemJson
     * @param {String} [blockName]
     * @param {Boolean} [ignoreContent]
     * @returns {Object|Array}
     */
    processBemJson: function (bemJson, blockName, ignoreContent) {
      if (bemJson == null)
        return;
      var resultArr = [bemJson];
      var nodes = [{
          json: bemJson,
          arr: resultArr,
          index: 0,
          block: blockName,
          mods: null
        }];
      var node, json, block, blockMods, i, j, l, p, child, subRes;
      var compiledMatcher = this._fastMatcher || (this._fastMatcher = Function('ms', this.buildMatcher())(this._matchers));
      var processContent = !ignoreContent;
      var infiniteLoopDetection = this._infiniteLoopDetection;
      /**
         * Враппер для json-узла.
         * @constructor
         */
      function Ctx() {
        this.ctx = null;
      }
      Ctx.prototype = this.utils;
      var ctx = new Ctx();
      while (node = nodes.shift()) {
        json = node.json;
        block = node.block;
        blockMods = node.mods;
        if (Array.isArray(json)) {
          for (i = 0, j = 0, l = json.length; i < l; i++) {
            child = json[i];
            if (child !== false && child != null && typeof child === 'object') {
              nodes.push({
                json: child,
                arr: json,
                index: i,
                position: ++j,
                block: block,
                mods: blockMods,
                parentNode: node
              });
            }
          }
          json._listLength = j;
        } else {
          var content, stopProcess = false;
          if (json.elem) {
            block = json.block = json.block || block;
            if (!json.elemMods) {
              json.elemMods = json.mods || {};
              json.mods = null;
            }
            blockMods = json.mods = json.mods || blockMods;
          } else if (json.block) {
            block = json.block;
            blockMods = json.mods = json.mods || {};
          }
          if (typeof json === 'object') {
            if (infiniteLoopDetection) {
              json.__processCounter = (json.__processCounter || 0) + 1;
              compiledMatcher.__processCounter = (compiledMatcher.__processCounter || 0) + 1;
              if (json.__processCounter > 100) {
                throw new Error('Infinite json loop detected at "' + json.block + (json.elem ? '__' + json.elem : '') + '".');
              }
              if (compiledMatcher.__processCounter > 1000) {
                throw new Error('Infinite matcher loop detected at "' + json.block + (json.elem ? '__' + json.elem : '') + '".');
              }
            }
            subRes = undefined;
            /* istanbul ignore else */
            if (!json._stop) {
              ctx.node = node;
              ctx.ctx = json;
              subRes = compiledMatcher(ctx, json);
              if (subRes !== undefined) {
                json = subRes;
                node.json = json;
                node.block = block;
                node.mods = blockMods;
                nodes.push(node);
                stopProcess = true;
              }
            }
          }
          if (!stopProcess) {
            if (processContent && (content = json.content)) {
              if (Array.isArray(content)) {
                var flatten;
                do {
                  flatten = false;
                  for (i = 0, l = content.length; i < l; i++) {
                    if (Array.isArray(content[i])) {
                      flatten = true;
                      break;
                    }
                  }
                  if (flatten) {
                    json.content = content = content.concat.apply([], content);
                  }
                } while (flatten);
                for (i = 0, j = 0, l = content.length, p = l - 1; i < l; i++) {
                  child = content[i];
                  if (child !== false && child != null && typeof child === 'object') {
                    nodes.push({
                      json: child,
                      arr: content,
                      index: i,
                      position: ++j,
                      block: block,
                      mods: blockMods,
                      parentNode: node
                    });
                  }
                }
                content._listLength = j;
              } else {
                nodes.push({
                  json: content,
                  arr: json,
                  index: 'content',
                  block: block,
                  mods: blockMods,
                  parentNode: node
                });
              }
            }
          }
        }
        node.arr[node.index] = json;
      }
      return resultArr[0];
    },
    /**
     * Превращает раскрытый BEMJSON в HTML.
     * @param {BemJson} json
     * @returns {String}
     */
    toHtml: function (json) {
      this._buf = '';
      this._html(json);
      var buf = this._buf;
      delete this._buf;
      return buf;
    },
    /**
     * Наполняет HTML-строку.
     * @param {BemJson} json
     * @returns {undefined}
     */
    _html: function (json) {
      var i, l, item;
      if (json === false || json == null)
        return;
      if (typeof json !== 'object') {
        this._buf += this._optEscapeContent ? xmlEscape(json) : json;
      } else if (Array.isArray(json)) {
        for (i = 0, l = json.length; i < l; i++) {
          item = json[i];
          if (item !== false && item != null) {
            this._html(item);
          }
        }
      } else {
        if (json.toHtml) {
          var html = json.toHtml.call(this, json) || '';
          this._buf += html;
          return;
        }
        var isBEM = json.bem !== false;
        if (typeof json.tag !== 'undefined' && !json.tag) {
          if (json.html) {
            this._buf += json.html;
          } else {
            this._html(json.content);
          }
          return;
        }
        if (json.mix && !Array.isArray(json.mix)) {
          json.mix = [json.mix];
        }
        var cls = '', jattr, jval, attrs = '', jsParams, hasMixJsParams = false;
        if (jattr = json.attrs) {
          for (i in jattr) {
            jval = jattr[i];
            if (jval === true) {
              attrs += ' ' + i;
            } else if (jval !== false && jval !== null && jval !== undefined) {
              attrs += ' ' + i + '="' + attrEscape(jval) + '"';
            }
          }
        }
        if (isBEM) {
          var base = json.block + (json.elem ? '__' + json.elem : '');
          if (json.block) {
            cls = toBemCssClasses(json, base, null, this._optNobaseMods);
            if (json.js) {
              (jsParams = {})[base] = json.js === true ? {} : json.js;
            }
          }
          var addJSInitClass = this._optJsCls && (this._optJsElem || !json.elem);
          var mixes = json.mix;
          if (mixes && mixes.length) {
            for (i = 0, l = mixes.length; i < l; i++) {
              var mix = mixes[i];
              if (mix && mix.bem !== false) {
                var mixBlock = mix.block || json.block || '', mixElem = mix.elem || (mix.block ? null : json.block && json.elem), mixBase = mixBlock + (mixElem ? '__' + mixElem : '');
                if (mixBlock) {
                  cls += toBemCssClasses(mix, mixBase, base, this._optNobaseMods);
                  if (mix.js) {
                    (jsParams = jsParams || {})[mixBase] = mix.js === true ? {} : mix.js;
                    hasMixJsParams = true;
                    if (!addJSInitClass) {
                      addJSInitClass = mixBlock && (this._optJsCls && (this._optJsElem || !mixElem));
                    }
                  }
                }
              }
            }
          }
          if (jsParams) {
            if (addJSInitClass)
              cls += ' ' + this._optJsCls;
            var jsData = !hasMixJsParams && json.js === true ? '{"' + base + '":{}}' : jsAttrEscape(JSON.stringify(jsParams));
            attrs += ' ' + (json.jsAttr || this._optJsAttrName) + '=\'' + (this._optJsAttrIsJs ? 'return ' + jsData : jsData) + '\'';
          }
        }
        if (json.cls) {
          cls = (cls ? cls + ' ' : '') + attrEscape(json.cls).trim();
        }
        var tag = json.tag || 'div';
        this._buf += '<' + tag + (cls ? ' class="' + cls + '"' : '') + (attrs ? attrs : '');
        if (selfCloseHtmlTags[tag]) {
          this._buf += '/>';
        } else {
          this._buf += '>';
          if (json.html) {
            this._buf += json.html;
          } else {
            this._html(json.content);
          }
          this._buf += '</' + tag + '>';
        }
      }
    }
  };
  var selfCloseHtmlTags = {
    area: 1,
    base: 1,
    br: 1,
    col: 1,
    command: 1,
    embed: 1,
    hr: 1,
    img: 1,
    input: 1,
    keygen: 1,
    link: 1,
    menuitem: 1,
    meta: 1,
    param: 1,
    source: 1,
    track: 1,
    wbr: 1
  };
  var xmlEscape = BH.prototype.xmlEscape = function (str) {
    return (str + '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  var attrEscape = BH.prototype.attrEscape = function (str) {
    return (str + '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  };
  var jsAttrEscape = BH.prototype.jsAttrEscape = function (str) {
    return (str + '').replace(/&/g, '&amp;').replace(/'/g, '&#39;');
  };
  var toBemCssClasses = function (json, base, parentBase, nobase) {
    var mods, mod, res = '', i;
    if (parentBase !== base) {
      if (parentBase)
        res += ' ';
      res += base;
    }
    if (mods = json.elem && json.elemMods || json.mods) {
      for (i in mods) {
        mod = mods[i];
        if (mod || mod === 0) {
          res += (nobase ? ' _' : ' ' + base + '_') + i + (mod === true ? '' : '_' + mod);
        }
      }
    }
    return res;
  };
  return BH;
}();
/* istanbul ignore else */
if (typeof module !== 'undefined') {
  module.exports = BH;
}