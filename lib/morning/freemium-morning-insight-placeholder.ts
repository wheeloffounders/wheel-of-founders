/**
 * Synthetic copy for morning / post-morning insight cards when Freemium users do not receive
 * `personal_prompts` rows (fetch is Pro-gated). Shown blurred behind the vault overlay so the
 * card keeps layout presence without exposing paid insight text.
 */
export const FREEMIUM_MORNING_BEFORE_INSIGHT_PLACEHOLDER = `Good morning. Before the inbox wins, notice where your attention actually wants to go.

Today's opening matters less than perfect wording and more than naming the one commitment that would make tonight feel honest.

Look for the gap between what you say matters and where time leaked yesterday—that gap is the real agenda.

When you plan, lead with outcomes over effort. Trade two shallow wins for one block where the needle actually moves.

Finish by writing the decision you would defend on tomorrow's calendar without rewriting it.`

/** Post–Plan Review teaser body (same blur treatment as morning_before when `insightFreemiumLocked`). */
export const FREEMIUM_MORNING_AFTER_INSIGHT_PLACEHOLDER = `You committed the plan—now the real work is alignment, not volume.

A useful audit names the trade you implicitly made: speed versus depth, comfort versus truth, optics versus outcomes.

Notice which tasks are actually carrying the pivot versus which ones are politely pretending to matter.

The gap between intention and calendar is where drift starts; closing it is the founder job no one delegates for you.

When you reopen this tomorrow, the question worth answering is whether today's execution honored the decision you wrote down—not whether you were busy.`
