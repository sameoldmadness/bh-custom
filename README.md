Custom BH build
===============

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

