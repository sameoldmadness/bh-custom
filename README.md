Custom BH build
===============

[![NPM version](https://badge.fury.io/js/bh-custom.svg)](http://badge.fury.io/js/bh-custom)
[![Build Status](https://travis-ci.org/sameoldmadness/bh-custom.svg?branch=master)](https://travis-ci.org/sameoldmadness/bh-custom)
[![Dependency Status](https://gemnasium.com/sameoldmadness/bh-custom.svg)](https://gemnasium.com/sameoldmadness/bh-custom)
[![Coverage Status](https://img.shields.io/coveralls/sameoldmadness/bh-custom.svg?branch=master)](https://coveralls.io/r/sameoldmadness/bh-custom)

Remove BH features you don't need in a few seconds.

After all optimization bh.js contains just 173 lines of code.

Usage
-----

```bash
npm install
node build
```

Features
--------

Strip unused methods:

```bash
? Chose Presets: 
 ◉ positioning
 ◉ sugar
 ◯ infrequent
❯◯ generate
 ◉ js
 ◉ mix
 ◉ matchers
```

Hardcode options into source:

```bash
? Set jsAttrName: data-bem
? Set jsAttrIsJs: false
? Set jsCls: i-bem
? Set jsElem: true
? Set escapeContent: (true) 
```

