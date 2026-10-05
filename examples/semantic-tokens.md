---
title: Name the role, not the colour.
highlight: Semantic design tokens
subtitle: 'A stylesheet that says "accent" picks up the next palette release; one that says #2a5aa8 never will.'
tags: [CSS, Design Tokens]
issue: '05'
theme: light
sandboxLabel: stack · light, verdicts
insight: Primitives hold raw values and never reach CSS; semantic tokens hold meaning and are all a site sees. Renaming one breaks consumers, changing its value does not.
---

## ❌ Raw values

```css
.button {
  background: #2a5aa8;
  color: #ffffff;
  border: 1px solid #87816f;
}
```

## ✅ Semantic tokens

```css {2-4}
.button {
  background: var(--mk-color-accent);
  color: var(--mk-color-on-accent);
  border: 1px solid var(--mk-color-border-control);
}
```
