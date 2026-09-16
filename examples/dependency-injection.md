---
title: Same DI, less ceremony.
highlight: inject() in Angular
subtitle: Constructor injection still works; the inject() function removes the boilerplate around it.
tags: [Angular, DI, Signals]
issue: '03'
theme: vesper
insight: inject() must run in an injection context — a constructor, a field
  initializer, or a factory function — not inside a later callback or
  setTimeout.
---

## ❌ Constructor injection

```typescript
export class OrderListComponent {
  constructor(
    private orders: OrderService,
    private auth: AuthService,
  ) {}
}
```

- Verbose for components with several dependencies
- Parameter order matters for readability

## ✅ inject()

```typescript {2-3}
export class OrderListComponent {
  private orders = inject(OrderService);
  private auth = inject(AuthService);
}
```

- Reads top to bottom as plain field assignment
- Works in functional guards and resolvers too
