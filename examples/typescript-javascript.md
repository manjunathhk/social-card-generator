---
title: Same behaviour.
highlight: Two languages.
subtitle: Type annotations disappear at runtime.
tags: [TypeScript, JavaScript]
issue: '03'
---

## TypeScript
```typescript
function greet(name: string): string {
  return `Hello, ${name}`;
}

console.log(greet('Manjunath'));
```

## JavaScript
```javascript
function greet(name) {
  return `Hello, ${name}`;
}

console.log(greet('Manjunath'));
```
