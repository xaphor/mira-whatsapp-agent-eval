// ACTION FIDELITY GUARDRAIL
//
// Runs post-generation, pre-send. Compares what the reply COMMITTED TO against
// what actually HAPPENED in this execution.
//
// Why it exists
// -------------
// The agent told a customer "I have noted both down and our team will be in
// touch shortly" for a warranty complaint, and called neither
// create_ticket_tool nor escalate_to_human_tool. Only the irrigation estimate
// fired. The complaint existed nowhere: no ticket, no escalation, no private
// note, no alert. The execution logged as SUCCESS.
//
// That is worse than dropping the question. A dropped question produces
// silence, the customer repeats themselves, and the system self-corrects
// through the customer. A false confirmation removes their reason to chase, and
// the complaint disappears until it resurfaces as a much angrier message.
//
// Groundedness checking does not catch this. "Our team will be in touch" is not
// factually false. It is a PROMISE WITH NO BACKING ACTION, and the only way to
// catch it is to compare commitments in the reply against side effects.
//
// Fails safe: rather than blocking the reply, the downstream repair branch
// posts a private note, pauses the bot on that contact, and alerts the
// operator. The customer was promised a human, so a human gets it.
//
// n8n Code node, runOnceForAllItems. Input: the agent node output.

const reply = String($json.output || '');

// --- 1. Did the reply commit us to a human doing something? ---
const COMMITMENT = [
  /team will (be in touch|contact|call|reach out|get back|take a look|look at)/i,
  /(someone|somebody|a colleague|our (team|guys|crew)) will (call|contact|visit|come|be in touch)/i,
  /i(?: have|'ve| ha[sv]e)? (noted|logged|recorded|raised|passed|flagged|forwarded)/i,
  /(noted (it|this|both|that) down|passed (it|this|both|that) (on|to))/i,
  /under warranty/i,
  /we'?ll (send|arrange|organise|organize|schedule) (someone|a technician|a team)/i,
  /have (our|the) team (send|review|look|check)/i,
];
const promised = COMMITMENT.some(re => re.test(reply));

// --- 2. Did anything actually happen? ---
// Tool sub-nodes are not always reachable via $(). Probe defensively: an
// unexecuted node throws, which is itself the answer.
function fired(nodeName) {
  try {
    const items = $(nodeName).all();
    return Array.isArray(items) && items.length > 0;
  } catch (e) {
    return false;
  }
}

const ticketed  = fired('create_ticket_tool');
const escalated = fired('escalate_to_human_tool');
const booked    = fired('book_visit_tool');
const actionTaken = ticketed || escalated || booked;

// An estimate is NOT a human follow-up. It is a document. It does not satisfy a
// promise that a person will look at something. This distinction is the whole
// bug: create_estimate_tool fired, so the turn felt productive, and the
// complaint was still lost.

// --- 3. Is there an unambiguous complaint about work we already did? ---
const src = String($('who_is_this').first().json.user_query || '');
const COMPLAINT = [
  /(your|the) team (installed|laid|did|fitted|built|planted)/i,
  /(installed|laid|done|fitted|delivered) (last|this) (month|week|year)/i,
  /(dying|died|dead|damaged|broken|leaking|not working|stopped working|faulty)/i,
  /(complain|complaint|unhappy|disappointed|refund|redo|warranty)/i,
];
const complaintSignals = COMPLAINT.filter(re => re.test(src)).length;

// Two independent signals, not one. A single keyword like "dead" appears in
// ordinary enquiries ("my old lawn is dead, want to replace it") and escalating
// those trains the team to ignore the queue. False positives are how a
// guardrail gets switched off.
const isComplaint = complaintSignals >= 2;

const unbacked = promised && !actionTaken;

return [{
  json: {
    output: reply,
    af_promised: promised,
    af_action_taken: actionTaken,
    af_ticketed: ticketed,
    af_escalated: escalated,
    af_booked: booked,
    af_is_complaint: isComplaint,
    af_complaint_signals: complaintSignals,
    af_unbacked_promise: unbacked,
    af_needs_repair: unbacked || (isComplaint && !escalated),
    af_reason: unbacked
      ? 'reply promised human follow-up but no ticket, escalation or booking fired'
      : (isComplaint && !escalated
          ? 'unambiguous complaint about existing work but no escalation fired'
          : 'ok'),
  }
}];

// KNOWN REGRESSION, fixed downstream
// ----------------------------------
// The repair branch routes through Chatwoot and WhatsApp API nodes before
// reaching the reply splitter, and each of those replaces $json with its own
// API response. The splitter read $json.output, got undefined, and sent an
// empty body, which Meta rejects with 400.
//
// Net effect: whenever this guardrail fired, the customer received nothing at
// all. A safety mechanism that introduced the failure mode it was built to
// prevent.
//
// Fix: the splitter now reads the reply from THIS node by name, and throws
// rather than sending an empty body so the failure is loud instead of silent.
