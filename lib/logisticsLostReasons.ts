export type LostReasonCategory =
  | 'RATE'
  | 'NO_TRUCK'
  | 'LATE_QUOTE'
  | 'SHIPPER_CANCELED'
  | 'CARRIER_REJECTED'
  | 'INTERNAL_ERROR'
  | 'OTHER';

export interface LostReasonConfig {
  id: LostReasonCategory;
  label: string;
  description: string;
  kpiImpact: string;
  sopSteps: string[];
  coachingQuestions: string[];
}

export const LOST_REASON_CONFIGS: LostReasonConfig[] = [
  {
    id: 'RATE',
    label: 'Rate too high / undercut by other broker',
    description:
      'We lost because the shipper had a better rate or we quoted above their internal target.',
    kpiImpact:
      'Direct hit on coverage rate and margin. Repeated RATE losses mean pricing or carrier strategy is off.',
    sopSteps: [
      'Ask the shipper: "Where did we land vs the winning rate?" and log the competitor rate if they share.',
      'Check if we had at least 2–3 carrier options quoted before sending the rate.',
      'Tag the lane as "Rate-sensitive" and review with pricing lead in daily huddle.',
      'If this lane repeats 3+ times per week, consider a targeted carrier list for this lane and a rate band.',
    ],
    coachingQuestions: [
      'Did we rush the quote without checking enough carriers?',
      'Did we ask why the shipper chose someone else and capture that in notes?',
      'Could we have structured the load differently (partial, multi-stop, flexible pickup)?',
    ],
  },
  {
    id: 'NO_TRUCK',
    label: 'No truck / capacity available',
    description:
      'We couldn\'t find a truck willing to run this lane at a workable number in time.',
    kpiImpact:
      'Coverage rate drops while demand is present. Indicates carrier base gaps by lane, equipment, or day of week.',
    sopSteps: [
      'Log which carriers were contacted and their responses (rate, reason for refusal).',
      'Tag the lane as "Capacity gap" if 5+ carriers say no or you get no serious offers.',
      'Send lane details to carrier sales / capacity team for targeted carrier mapping.',
      'If this repeats, create a "Top 20 carriers" list for this lane/region and pre-warm them.',
    ],
    coachingQuestions: [
      'Did we only try our usual 1–2 carriers or did we go wider?',
      'Are we always fighting for trucks for this shipper on last-minute notice?',
      'Do we need a recurring outbound campaign to build carrier base on this lane?',
    ],
  },
  {
    id: 'LATE_QUOTE',
    label: 'Quote sent too late',
    description:
      'The shipper gave the load to someone else before our quote was in or before we confirmed capacity.',
    kpiImpact:
      'Coverage and relationship risk. Signals process/speed issues, especially if shipper is sending regular freight.',
    sopSteps: [
      'Capture when the load was received vs when the quote was sent.',
      'Identify any internal bottleneck (missing info, approvals, waiting on one person).',
      'For repeat shippers, set a speed SLA (e.g., quote within 15–30 minutes).',
      'Adjust workflow so high-priority shippers trigger a Slack/Teams alert when loads arrive.',
    ],
    coachingQuestions: [
      'Could we have given a range/placeholder rate faster?',
      'Did the dispatcher know this shipper is "speed-sensitive"?',
      'Is there a pattern of slow responses from this team/office?',
    ],
  },
  {
    id: 'SHIPPER_CANCELED',
    label: 'Shipper canceled / changed plan',
    description:
      'The load disappeared due to shipper-side reasons (customer canceled, route changed, moved in-house).',
    kpiImpact:
      'Coverage drops but not always due to internal failure. Still useful for forecasting and relationship context.',
    sopSteps: [
      'Log the exact reason provided by the shipper (price, internal asset, their customer, etc.).',
      'Ask if there is future similar freight we should watch for.',
      'Check if we could have locked in commitment earlier with a soft confirmation.',
      'If frequent, schedule a quick account review call with the shipper.',
    ],
    coachingQuestions: [
      'Are we too passive about getting early commitments?',
      'Is this shipper unstable or is their end-customer unstable?',
      'Does this require changing how we count this shipper in the forecast?',
    ],
  },
  {
    id: 'CARRIER_REJECTED',
    label: 'Carrier rejected terms after verbal',
    description:
      'Carrier verbally agreed then backed out due to rate, layover, detention, or other terms.',
    kpiImpact:
      'Coverage and reputation risk. May also create exposure if we told the shipper we were covered.',
    sopSteps: [
      'Capture the carrier\'s rejection reason (rate, layover, detention, appointment, equipment).',
      'Flag any carriers with repeated fall-offs and share in morning huddle.',
      'Review whether we locked too tight a spread (margin) that killed the deal.',
      'Adjust carrier notes (e.g., "needs min $/mile on this lane").',
    ],
    coachingQuestions: [
      'Did we fully explain accessorials and timing to the carrier?',
      'Are we over-optimistic about certain carriers when bidding?',
      'Should this carrier be restricted for certain lanes/clients?',
    ],
  },
  {
    id: 'INTERNAL_ERROR',
    label: 'Internal error / miscommunication',
    description:
      'We dropped the ball – wrong rate, wrong info, missed email, duplicate handling, or miscommunication.',
    kpiImpact:
      'Direct impact on coverage, and worst for reputation. This category must trigger process fixes.',
    sopSteps: [
      'Document exactly what went wrong in the load notes (no blame, just facts).',
      'Identify the broken step (handoff, missing field, wrong template, etc.).',
      'Add a simple guardrail (checklist item or system validation) so it cannot repeat silently.',
      'If severe or repeated, review in weekly ops meeting as "process bug," not personal attack.',
    ],
    coachingQuestions: [
      'Was this caused by unclear SOPs or training, or by ignoring existing SOPs?',
      'Do we need a checklist item on the load creation or quoting step?',
      'What is the smallest system change that would have prevented this?',
    ],
  },
  {
    id: 'OTHER',
    label: 'Other',
    description:
      'Edge-case reasons that don\'t map yet. Over time, many of these should be recategorized.',
    kpiImpact:
      'Useful as a "parking lot" until you see patterns and create new categories.',
    sopSteps: [
      'Write a clear short summary of what happened.',
      'During weekly review, see if this "other" fits an existing category or needs a new category.',
      'Avoid leaving important recurring reasons in "Other" for more than a week.',
    ],
    coachingQuestions: [
      'Is this truly unique or is it really RATE / NO_TRUCK / INTERNAL_ERROR in disguise?',
      'Do we need a new category because this is happening 3+ times per week?',
    ],
  },
];

export const LOST_REASON_OPTIONS = LOST_REASON_CONFIGS.map(cfg => ({
  value: cfg.id,
  label: cfg.label,
}));

export function getLostReasonConfig(
  id: LostReasonCategory | string | null | undefined,
): LostReasonConfig | undefined {
  if (!id) return undefined;
  return LOST_REASON_CONFIGS.find(c => c.id === id) as LostReasonConfig | undefined;
}
