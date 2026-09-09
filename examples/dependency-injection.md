---
title: Ask for it.
highlight: Don't build it.
subtitle: Constructor injection keeps OrderService testable and unaware of concrete mail delivery.
tags: [.NET, DI, Testability]
issue: '06'
theme: midnight
---

## ❌ Without DI

```csharp
public class OrderService
{
    private readonly EmailService _email = new();
}
```

- Hard-wired to one implementation
- Cannot be unit tested in isolation

## ✅ With DI

```csharp {3}
public class OrderService(INotificationService notifications)
{
    private readonly INotificationService _notifications = notifications;
}
```

- Depends on an abstraction
- Swappable in tests and in production
