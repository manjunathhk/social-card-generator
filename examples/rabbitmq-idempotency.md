---
title: RabbitMQ redelivery in .NET
highlight: Dedupe before you process.
subtitle: A consumer that rejects a redelivered message instead of reprocessing it.
issue: '01'
insight: Brokers guarantee at-least-once delivery, not exactly-once. Track
  processed message IDs with a short TTL so a redelivery is a no-op, not a
  duplicate order.
tags:
  - RabbitMQ
  - .NET
  - Idempotency
---

## OrderConsumer.cs / dedupe guard

```csharp {6-13}
public async Task HandleAsync(BasicDeliverEventArgs ea, CancellationToken ct)
{
    var messageId = ea.BasicProperties.MessageId;
    var key = $"processed:{messageId}";

    var isNew = await cache.StringSetAsync(
        key, "1", TimeSpan.FromHours(24), When.NotExists);

    if (!isNew)
    {
        channel.BasicAck(ea.DeliveryTag, false);
        return;
    }

    await ProcessOrderAsync(ea.Body, ct);
    channel.BasicAck(ea.DeliveryTag, false);
}
```
