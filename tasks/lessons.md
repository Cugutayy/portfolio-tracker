# Lessons Learned

## Lesson 1: Plan BEFORE Implement (2026-03-20)
**Trigger:** User frustrated with repeated back-and-forth bug fixes
**Pattern:** Jumping to implementation without auditing existing code → missing data flow gaps, stale state, type mismatches → user finds bugs → we fix → repeat
**Rule:**
- ALWAYS run a deep audit of ALL affected files before ANY implementation
- Create a checklist of every data flow: API field → response mapping → UI binding → refresh trigger
- Verify each flow end-to-end IN THE PLAN, not after implementation
- "Implementing is easy. Planning is where time should be spent."

## Lesson 2: No Fake Data (2026-03-18)
**Trigger:** User explicitly said "bir daha böyle fake şeylerin oluşturulmasını istemiyorum"
**Rule:** Never generate fake/placeholder data. Use real data or clearly labeled demo data with realistic values.

## Lesson 3: Test Comprehensively Before Shipping (2026-03-19)
**Trigger:** User asked "böyle şeylerin olacağını biliyorsan neden kapsamlı bir test yürütmüyorsun?"
**Rule:** Run E2E data flow verification for every feature before marking done. Don't assume it works.

## Lesson 4: Turkish UI (2026-03-18)
**Rule:** All user-facing text must be Turkish. User communicates in Turkish.
