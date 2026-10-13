# Routine: tech card and LinkedIn post

A scheduled Claude routine that writes one social card's source and the LinkedIn post options to go with it. It never renders the card: paste the source into the [sandbox](https://social-card.apps.manjunathhk.in) to export the PNG.

| Item     | Value                                                                                                                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schedule | Tuesdays and Fridays, 12:53 IST (`CRON_TZ=Asia/Calcutta 53 12 * * 2,5`)                                                                                                                              |
| Delivers | One card source, validated with `--check`, then LinkedIn post options                                                                                                                                |
| Skills   | [`social-card-source`](../../skills/social-card-source/SKILL.md) (this repository) and `card-post-copy` (not in this repository; replace STEP 2 with your own post-writing instructions, or drop it) |
| Needs    | A shell with npm, so `npx @manjunathhk/social-card-generator --check` can run. Without it the routine still writes the card and reports it as unvalidated                                            |

## Adapting it

Change these before scheduling your own copy:

- **`TOPICS`** in STEP 0: the subjects the rotation cycles through. If you change the list's length, change the `% 13` that indexes it to match.
- **The anchor date** in STEP 0 (`d.date(2026,1,5)`): run `N` counts up from this Monday. Set it to the Monday of your first run's week so your rotation starts at topic 0, light theme, `stack` layout.
- **"for Manj"** and the audience line in STEP 1, if the cards are for someone else.

## Keeping this in sync

This file is the master copy. To change the routine, edit the prompt here first, then paste it into the routine's prompt. Editing the routine alone leaves this copy stale.

## Prompt

```text
Generate one social card and its LinkedIn post for Manj. Deliver both as clean, copy-pasteable Markdown. No em dashes anywhere. No padding: card source first, then the post options.

STEP 0: compute the rotation. Run this and call the printed number N (runs happen Tuesday and Friday, so N rises by 1 every run and never resets):

python3 -c "import datetime as d;t=d.date.today();print(((t-d.date(2026,1,5)).days//7)*2+(0 if t.isoweekday()<=3 else 1))"

- Topic = TOPICS[N % 13], with TOPICS (zero-indexed) = [".NET/C#", "TypeScript and Angular", "GraphQL", "SQL Server and PostgreSQL", "Redis", "RabbitMQ", "Docker and Kubernetes", "Azure and Azure DevOps", "n8n and LLM engineering", "Playwright", "GCP", "Traefik", "Cloudflare"]
- Theme = `light` if N is even, `dark` if N is odd. Always set `theme` explicitly in the card source.
- Target layout = ["stack", "columns", "grid"][N % 3].

STEP 1: card. Use the /social-card-source skill to write exactly one card on the topic above, in the target layout and theme. Pick a specific, architecturally interesting angle (a trade-off, pattern, or edge case) for a senior Solution Architect audience, with real, correct code. Fit the angle to the layout: stack is one snippet or a before/after, columns is a two-sided comparison, grid is three or four short variants of one concept. Only if the topic truly cannot be framed in the target layout, use the best-fitting layout instead and say why in one line. Omit `issue`. Never put branding (author, series, website, handles) in the source.

Validate: write the source to a file in the working directory and run `npx @manjunathhk/social-card-generator --check <file>`. Fix any failure it names (it enforces current character, panel and line limits) and re-run until it passes. If npx cannot run in this environment, say the card is unvalidated.

Output the card source in one fenced block (four backticks for Markdown so inner fences survive), then one line: topic, N, layout, theme, validated yes/no.

STEP 2: post. Use the /card-post-copy skill to write the LinkedIn post options that accompany this card. Do not write blog narrative arcs.
```
