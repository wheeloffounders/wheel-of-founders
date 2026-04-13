/**
 * Screen recording (“pitch mode”): morning nudge + blueprints off, fixed post-morning insight,
 * matching evening insight + spacing on `/evening`. Set to `false` after your take.
 */
export const MORNING_PITCH_CLEAN_RECORDING = true

/** Fixed copy for Loom — avoids AI variance during `morning_after` AICoachPrompt. */
export const MORNING_PITCH_HARDCODED_POST_MORNING_INSIGHT =
  "Today is about trust. Debugging the checkout and resolving shipping delays aren't just tasks—they are the foundation of your launch. Let that launch be your North Star, not the noise. Ready to lead?"

/** Evening page — matches morning pitch framing when `MORNING_PITCH_CLEAN_RECORDING` is on. */
export const EVENING_PITCH_HARDCODED_POST_INSIGHT =
  "Loop closed. You prioritized structural integrity over surface-level aesthetics today, and that is where the shift from Busy Founder to Strategic Leader happens. Rest now—the foundation is ready."

/** Stable key for Mrs. Deer calibration when no `evening_insight` row exists (e.g. fresh pitch load). */
export const PITCH_EVENING_CALIBRATION_PLACEHOLDER_ID = 'pitch-evening-calibration-placeholder'
