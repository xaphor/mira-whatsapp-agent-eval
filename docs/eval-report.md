# Evaluating a Production WhatsApp Sales Agent

**System:** "Mira", a customer-facing sales agent for Easy Gardens Landscape Works (Dubai, UAE), running on n8n with WhatsApp and Chatwoot.
**Model under test:** Google Gemini 3.5 Flash.
**Eval framework:** n8n native Evaluation nodes, dataset stored as an n8n Data Table.
**Eval design:** built with Claude as the engineering copilot.
**Run:** #2, 15 cases.

## Why evaluate at all
This agent runs in production against real customers, so the bar is not "looks good in a demo." The behaviors that matter are specific to the business: quote a real price instead of deflecting, avoid burning field resources by offering a site visit too early, escalate genuine complaints and payments to a human, and stay warm. I run a continuous evaluation loop so these behaviors are measured rather than assumed, and so every prompt or model change can be checked against real cases before it reaches a customer.

## What the dataset is
Fifteen test cases drawn from real WhatsApp conversations with customers, plus a few deliberate edge cases (a customer insisting on a visit, "just give me one fixed price," "how much?" with no size given, a wholesale request, and an angry no-show complaint). Each row carries the customer message, an expected signal, the expected category, and whether the case should escalate to a human.

The harness runs each message through the same knowledge base and agent the production bot uses, but it stops before the WhatsApp and Chatwoot send steps, so evaluation never messages a real person.

## Metrics (1 = good)
- **Price Given, No Deflection.** On a pricing question, did the agent actually give the figure from the knowledge base instead of dodging to a callback?
- **No Early Visit or Call.** On a normal lead, did it avoid pushing a site visit or phone callback too early? (Genuine escalation cases are exempt.)
- **Escalate Correct.** On complaints and payment requests, did it hand off to a human with empathy?
- **Warm Tone.** Did it greet and sound human rather than cold and transactional?

## Results (Run #2)

| Metric | Score |
| --- | --- |
| Price Given, No Deflection | 100% |
| No Early Visit or Call | 87% |
| Escalate Correct | 100% |
| Warm Tone | 100% |

Per case: roughly 3,700 tokens and 2.5 seconds.

## Reading the numbers
Price honesty, escalation, and tone are clean at 100%. The one to watch is **No Early Visit or Call at 87%**, which is exactly the behavior I am still tuning. The product decision behind it: this is a digital-first company in the UAE, where customers do not pay for site visits and, in this operation's experience, about 8 in 10 site visits never converted. So "offer a visit" is treated as a cost, not a default, and the eval is what tells me when the agent slips back into offering one.

## What the eval has driven so far
Changes this loop has already validated. Grounding the agent strictly in the company knowledge base (exported to text, parsed, injected) moved Price Given to 100% and removed invented figures. Reframing the strategy to digital-first, and giving the agent real tools instead of a single generic action, is what the No Early Visit metric now protects. Each change shipped only after the dataset confirmed it did not regress the other behaviors.

## Honest limitations
- The metrics here are deterministic keyword and logic checks. They catch regressions well but do not judge nuance. The next layer is an LLM-as-judge metric (Claude) for warmth and correctness.
- The harness uses a condensed version of the production prompt. For true regression parity it should carry the exact production system message.
- Fifteen cases is a starting set, not coverage. It grows every time a real conversation surprises us.

## Next
Move warmth and correctness to an LLM judge, expand the dataset, and gate prompt changes on metric thresholds so a regression blocks a deploy instead of reaching customers.
