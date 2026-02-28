/**
 * Shared parse instructions for AI insight generation.
 * Users often put multiple thoughts in one entry—AI should untangle them.
 */

export const PARSE_INSTRUCTION = `IMPORTANT - INTELLIGENT PARSING:
User entries often contain multiple thoughts in one line (e.g. "App debugging progress, son had great day, revisit approach with son working").

When analyzing:
1. Split each entry into individual thoughts (by commas, "and", or natural breaks)
2. Tag each thought by theme (app, family, community, personal growth, discipline, work, self-care, etc.)
3. Group related thoughts across entries
4. Only create connections between thoughts that genuinely relate—avoid forcing mismatched pairs
5. If a theme has no clear evolution or connection, simply observe the current state

This ensures insights reflect real patterns, not random snippet matching.`

export const PARSE_INSTRUCTION_SHORT = `Note: Entries may contain multiple thoughts. Parse each into themes (app, family, growth, etc.) and only connect ideas that genuinely relate.`
