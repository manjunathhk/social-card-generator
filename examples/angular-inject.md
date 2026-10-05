---
title: Same DI, less ceremony.
highlight: inject() in Angular
subtitle: Constructor injection still works; inject() drops the boilerplate.
tags: [Angular, DI, Signals]
issue: '03'
theme: dark
sandboxLabel: stack · dark, notes
insight: inject() only works in an injection context — a constructor, field
  initializer, or factory — not a later callback.
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
