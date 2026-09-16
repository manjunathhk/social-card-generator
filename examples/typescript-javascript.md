---
title: Same contract, two runtimes.
highlight: Validate at the edge.
subtitle: A CreateOrder DTO rejected before it reaches the domain layer, in Node and in .NET.
tags: [NestJS, .NET, Validation]
issue: '04'
---

## NestJS

```typescript
class CreateOrderDto {
  @IsUUID()
  customerId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
```

## .NET minimal API

```csharp {2-3}
public record CreateOrderDto(
    [property: Required] Guid CustomerId,
    [property: Range(1, int.MaxValue)] int Quantity
);
```
