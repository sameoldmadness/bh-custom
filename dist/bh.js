var BH = function () {
  /**
 * BH: BEMJSON -> HTML процессор.
 * @constructor
 */
  function BH() {
    /**
     * Оптимизация коротких тегов. Они могут быть расширены через setOptions({ shortTags: [...] })
     */
    this._shortTags = {};
    for (var i = 0; i < SHORT_TAGS.length; i++) {
      this._shortTags[SHORT_TAGS[i]] = 1;
    }
    this._optJsAttrName = 'onclick';
    this._optJsAttrIsJs = true;
    this._optJsCls = 'i-bem';
    this._optJsElem = true;
    this._optEscapeContent = true;
    this._optNobaseMods = false;
    this._optDelimElem = '__';
    this._optDelimMod = '_';
  }
  BH.prototype = {
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
          var base = json.block + (json.elem ? this._optDelimElem + json.elem : '');
          if (json.block) {
            cls = toBemCssClasses(json, base, null, this._optNobaseMods, this._optDelimMod);
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
                var mixBlock = mix.block || json.block || '', mixElem = mix.elem || (mix.block ? null : json.block && json.elem), mixBase = mixBlock + (mixElem ? this._optDelimElem + mixElem : '');
                if (mixBlock) {
                  cls += toBemCssClasses(mix, mixBase, base, this._optNobaseMods, this._optDelimMod);
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
        if (this._shortTags[tag]) {
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
  var SHORT_TAGS = 'area base br col command embed hr img input keygen link menuitem meta param source track wbr'.split(' ');
  var xmlEscape = BH.prototype.xmlEscape = function (str) {
    return (str + '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  var attrEscape = BH.prototype.attrEscape = function (str) {
    return (str + '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  };
  var jsAttrEscape = BH.prototype.jsAttrEscape = function (str) {
    return (str + '').replace(/&/g, '&amp;').replace(/'/g, '&#39;');
  };
  var toBemCssClasses = function (json, base, parentBase, nobase, delimMod) {
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
          res += ' ' + (nobase ? delimMod : base + delimMod) + i + (mod === true ? '' : delimMod + mod);
        }
      }
    }
    return res;
  };
  return BH;
}();