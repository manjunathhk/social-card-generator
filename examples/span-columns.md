---
title: A limit that trips itself.
highlight: limit_req needs burst.
subtitle: Without burst and nodelay, a page load with six assets rate-limits itself.
tags: [NGINX, Rate limiting]
issue: '05'
layout: columns
theme: vesper
insight: A tight rate without burst rejects the same client's own concurrent
  asset requests, not just abusive traffic. Zone size and burst are what
  make the limit usable.
---

## ❌ No burst

```nginx
limit_req_zone $binary_remote_addr
    zone=api:10m rate=5r/s;

location /api/ {
    limit_req zone=api;
}
```

- Six parallel requests trip the limit for one user
- 503s show up in real traffic, not just load tests

## ✅ Zone + burst

```nginx {5}
limit_req_zone $binary_remote_addr
    zone=api:10m rate=5r/s;

location /api/ {
    limit_req zone=api burst=12 nodelay;
}
```

- Absorbs a page's worth of concurrent calls
- Still caps sustained abuse at 5r/s
