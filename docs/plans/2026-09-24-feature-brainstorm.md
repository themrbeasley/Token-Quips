# Feature Brainstorm — 2026-09-24

Notes from a brainstorming pass on new Token Quips features. Captures what's next, what's parked, and what's declined (with reasoning, so it doesn't get re-litigated later).

## Next up

### Sequencer / JB2A effect hook

Attach a Sequencer effect key to a saying so it fires alongside (or instead of) the existing audio/chat output — e.g. a critical hit quip also triggers a screen shake or particle burst. Big overlap with tables that already run Sequencer.

Open questions to resolve before writing an implementation plan:

- Where the field lives on the saying form (Audio tab vs. a new Effects tab)
- Detecting Sequencer as an optional dependency, same pattern as `tokenSaysHasMQ` / `tokenSaysHasPolyglot` in `scripts/index.js`
- Whether the effect anchors on the triggering token, the target, or both

## Parked

### Text-to-speech playback

Original pitch was reading every saying aloud via the Web Speech API. Doesn't earn its place as a table-facing feature on its own. Reframe as an accessibility option in module settings instead (off by default) rather than part of the core "fun" pitch. Revisit later.

### Death / downed / killing-blow trigger tier

Good idea, but sits awkwardly against the module's system-agnostic core. "Takes Damage" already buckets by HP% generically; a clean "downed" concept doesn't obviously generalize across dnd5e/pf1/pf2e/Crooked Falls without more system-specific branching than `constants.js` currently has, and the concept has only really been validated against dnd5e. Worth another look once there's a clearer pattern for adding system-specific action types.

## Declined

- **Banter chains** (a Reacts saying responding to another Reacts saying) — scope creep relative to the value it adds.
- **Scene-entry boss bark** — already achievable today via the existing Prompt trigger or a macro; not a new feature.
