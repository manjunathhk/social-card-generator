---
title: Redis caching in .NET
highlight: Bound the staleness.
subtitle: A cache-aside read with an explicit expiration policy.
issue: '01'
insight: A TTL limits staleness; it does not prevent it. Invalidate on writes
  when freshness matters, and coalesce concurrent misses to protect the
  database.
tags:
  - .NET
  - Redis
  - Cache-aside
---

## ProductCache.cs / read path

```csharp {11-15}
// cache: IDistributedCache; db: your data source
var key = $"product:{id}";
var json = await cache.GetStringAsync(key, ct);

if (json is null)
{
    var product = await db.FindAsync(id, ct);
    if (product is null) return Results.NotFound();

    json = JsonSerializer.Serialize(product);
    await cache.SetStringAsync(key, json, new()
    {
        AbsoluteExpirationRelativeToNow =
            TimeSpan.FromMinutes(5)
    }, ct);
}

return Results.Content(json, "application/json");
```
