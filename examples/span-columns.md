---
title: Slice, don't copy.
highlight: Span<T> in hot paths
subtitle: The same parsing logic, with and without a new string per call.
tags: [.NET, Performance, Span]
issue: '04'
layout: columns
theme: vesper
insight: Substring allocates a new string every call. Slicing a ReadOnlySpan<char> reuses the memory the caller already owns.
---

## ❌ Substring

```csharp
static int ReadId(string line)
{
    var id = line.Substring(4, 6);
    return int.Parse(id);
}

static bool HasFlag(string line)
{
    var lower = line.ToLower();
    return lower.Contains("urgent");
}
```

- Allocates a new string per call
- Extra work for the garbage collector
- Copies bytes that already exist

## ✅ Span

```csharp {3,9}
static int ReadId(ReadOnlySpan<char> line)
{
    var id = line.Slice(4, 6);
    return int.Parse(id);
}

static bool HasFlag(ReadOnlySpan<char> line)
{
    return line.Contains("urgent",
        StringComparison.OrdinalIgnoreCase);
}
```

- Works over the caller's memory
- No temporary strings
- Same readability
