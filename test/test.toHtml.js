var BH = require('../dist/bh');
require('chai').should();

describe('bh.toHtml()', function() {
    describe('json.toHtml', function() {
        var bh;
        beforeEach(function() {
            bh = new BH();
        });

        it('should redefine `toHtml` method for only node', function() {
            function toHtml(json) {return '<!DOCTYPE ' + json.mods.type + '>'; }

            bh.toHtml([
                { block: 'doctype', mods: { type: 'html' }, toHtml: toHtml },
                { block: 'page' }
            ]).should.equal('<!DOCTYPE html><div class="page"></div>');
        });
    });

    describe('content', function() {
        var bh;
        beforeEach(function() {
            bh = new BH();
        });

        it('should return empty content', function() {
            bh.toHtml([
                false,
                null,
                undefined,
                [],
                '',
                { content: false }, // `div` is here
                { tag: false }
            ]).should.equal('<div></div>');
        });

        it('should escape string when option enabled', function() {
            bh.toHtml('<a>&nbsp;</a>').should.equal('&lt;a&gt;&amp;nbsp;&lt;/a&gt;');
        });

        it('should escape content when option enabled', function() {
            bh.toHtml({
                content: [
                    '<&>',
                    { content: '<&>', tag: false },
                    { content: '<&>' }
                ]
            }).should.equal('<div>&lt;&amp;&gt;&lt;&amp;&gt;<div>&lt;&amp;&gt;</div></div>');
        });

        it('should prefer `html` field', function() {
            bh.toHtml({
                content: '<br/>',
                html: '<hr/>'
            }).should.equal('<div><hr/></div>');
        });

        it('should prefer `html` field when tag is empty', function() {
            bh.toHtml({
                tag: '',
                content: '<br/>',
                html: '<hr/>'
            }).should.equal('<hr/>');
        });
    });

    describe('bem', function() {
        var bh;
        beforeEach(function() {
            bh = new BH();
        });

        it('should not set class if not bem', function() {
            bh.toHtml({ block: 'button', bem: false }).should.equal('<div></div>');
        });

        it('should not set js if not bem', function() {
            bh.toHtml({ block: 'button', js: true, bem: false }).should.equal('<div></div>');
        });

        it('should not set mixed class if not bem', function() {
            bh.toHtml({
                block: 'button',
                mix: { block: 'link', bem: false }
            }).should.equal('<div class="button"></div>');
        });

        it('should not set mixed js if not bem', function() {
            bh.toHtml({
                block: 'button',
                mix: { block: 'link', js: true, bem: false }
            }).should.equal('<div class="button"></div>');
        });
    });

    describe('tags', function() {
        var bh;
        beforeEach(function() {
            bh = new BH();
        });
        it('should return html tag <div> by default', function() {
            bh.toHtml({}).should.equal('<div></div>');
        });
        it('should return html tag <span>', function() {
            bh.toHtml({ tag: 'span' }).should.equal('<span></span>');
        });
        it('should return short tag <br>', function() {
            bh.toHtml({ tag: 'br' }).should.equal('<br/>');
        });
        it('should return content when `tag` is empty', function() {
            bh.toHtml({ tag: false, content: 'label' }).should.equal('label');
        });
    });

    describe('attrs', function() {
        var bh;
        beforeEach(function() {
            bh = new BH();
        });
        it('should ignore null attrs', function() {
            bh.toHtml({ block: 'button', attrs: { href: null } }).should.equal(
                '<div class="button"></div>'
            );
        });
        it('should not ignore empty attrs', function() {
            bh.toHtml({ block: 'button', attrs: { href: '' } }).should.equal(
                '<div class="button" href=""></div>'
            );
        });
        it('should escape attrs', function() {
            bh.toHtml({
                tag: 'a',
                attrs: { href: '<script type="javascript">window && alert(document.cookie)</script>' },
                content: 'link'
            }).should.equal(
                '<a href="<script type=&quot;javascript&quot;>window &amp;&amp; alert(document.cookie)</script>">link</a>');
        });
        it('should add boolean attrs', function() {
            bh.toHtml({ block: 'button', attrs: { disabled: true } }).should.equal(
                '<div class="button" disabled></div>'
            );
        });
    });

    describe('mods', function() {
        var bh;
        beforeEach(function() {
            bh = new BH();
        });
        it('should ignore null mods', function() {
            bh.toHtml({ block: 'button', mods: { type: null } }).should.equal(
                '<div class="button"></div>'
            );
        });
        it('should ignore empty mods', function() {
            bh.toHtml({ block: 'button', mods: { type: '' } }).should.equal(
                '<div class="button"></div>'
            );
        });
        it('should not ignore boolean mods', function() {
            bh.toHtml({ block: 'button', mods: { disabled: true } }).should.equal(
                '<div class="button button_disabled"></div>'
            );
        });
        it('should not ignore zero mods', function() {
            bh.toHtml({ block: 'button', mods: { zero: 0 } }).should.equal(
                '<div class="button button_zero_0"></div>'
            );
        });
    });

    describe('mix', function() {
        var bh;
        beforeEach(function() {
            bh = new BH();
        });
        it('should not set undefined mix', function() {
            bh.toHtml({
                block: 'button',
                mix: [null, undefined]
            }).should.equal('<div class="button"></div>');
        });
        it('should not set elem mix on empty node', function() {
            bh.toHtml({ mix: { elem: 'button' } }).should.equal('<div></div>');
        });
        it('should set elem mix', function() {
            bh.toHtml({ block: 'button', mix: { elem: 'mix' } }).should.equal(
                '<div class="button button__mix"></div>'
            );
        });
        it('should set mods mix', function() {
            bh.toHtml({ block: 'button', mods: { disabled: true, theme: 'normal' } }).should.equal(
                '<div class="button button_disabled button_theme_normal"></div>'
            );
        });
        it('should set elem mods mix', function() {
            bh.toHtml({ block: 'button', mix: { elem: 'control', mods: { disabled: true } } }).should.equal(
                '<div class="button button__control button__control_disabled"></div>'
            );
        });
        it('should set elem elemMods mix', function() {
            bh.toHtml({ block: 'button', mix: { elem: 'control', elemMods: { disabled: true } } }).should.equal(
                '<div class="button button__control button__control_disabled"></div>'
            );
        });
        it('should set mixed js', function() {
            bh.toHtml({
                block: 'button',
                mix: [{ block: 'link', js: true }, { elem: 'control', js: { foo: 'bar' } }]
            }).should.equal(
                '<div class="button link button__control i-bem" ' +
                    'onclick=\'return {"link":{},"button__control":{"foo":"bar"}}\'' +
                '></div>'
            );
        });
        it('should set several mixes', function() {
            var mixes = [
                { block: 'link' },
                { elem: 'control' },
                { mods: { disabled: true } },
                { block: 'label', elem: 'first', mods: { color: 'red' } }
            ];
            bh.toHtml({ block: 'button', mix: mixes }).should.equal(
                '<div class="button link button__control button_disabled label__first label__first_color_red"></div>'
            );
        });
    });

    describe('js', function() {
        var bh;
        beforeEach(function() {
            bh = new BH();
        });
        it('should set `i-bem` class on block', function() {
            bh.toHtml({ block: 'button', js: true, content: 'submit' }).should.equal(
                '<div class="button i-bem" onclick=\'return {"button":{}}\'>submit</div>');
        });
        it('should set `i-bem` class on mixed block', function() {
            bh.toHtml({ block: 'button', elem: 'box', content: 'submit', mix: { block: 'icon', js: true } }).should.equal(
                '<div class="button__box icon i-bem" onclick=\'return {"icon":{}}\'>submit</div>');
        });
    });

    describe('cls', function() {
        var bh;
        beforeEach(function() {
            bh = new BH();
        });
        it('should set cls', function() {
            bh.toHtml({ cls: 'clearfix' }).should.equal('<div class="clearfix"></div>');
        });
    });
});
