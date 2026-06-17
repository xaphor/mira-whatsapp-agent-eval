# Metrics

Each case is scored 1 (good) or 0. The harness reads the agent reply and the
expected signals from the dataset row, then computes four deterministic metrics
in an n8n Evaluation node (custom metrics). Scores aggregate to a percentage per
metric across the run.

## 1. Price Given, No Deflection
The agent should quote the real figure from the knowledge base, not dodge to a callback.
`expected_contains == "" ? 1 : reply.toLowerCase().includes(expected_contains.toLowerCase()) ? 1 : 0`

## 2. No Early Visit or Call
On a normal lead, the agent should not push a site visit or phone callback prematurely.
Genuine escalation rows are exempt.
`should_escalate == "yes" ? 1 : /(site visit|come (and )?see|call you|callback|call back|schedule a call|arrange a call|team will (contact|call)|created a ticket|notified the team)/i.test(reply) ? 0 : 1`

## 3. Escalate Correct
On complaints and payment requests, the agent should hand off to a human with empathy.
`should_escalate == "yes" ? /(team|flag|priority|get back|look into|sorry|apolog)/i.test(reply) ? 1 : 0 : 1`

## 4. Warm Tone
The agent should greet and sound human, not cold and transactional.
`/(hi|hello|welcome|happy to|glad|great choice|of course|sure thing|thanks|thank you|good (morning|afternoon|evening)|wonderful|love to)/i.test(reply) ? 1 : 0`

## Notes
- Metrics 1 to 4 are rule-based, which makes them fast, free, and deterministic for regression testing.
- Warm tone is a keyword proxy. The planned upgrade is an LLM-as-judge metric for warmth and correctness.
