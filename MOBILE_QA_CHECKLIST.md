# SAIL mobile QA checklist

Use this checklist before demos or data collection. It covers the risks that desktop mocks do not catch.

## Device matrix
- iPhone Safari
- Android Chrome
- Laptop Chrome as fallback

## Core session flow
1. Open `https://sail-dia.pages.dev`.
2. Try without an account.
3. Create a coursework or seminar-reading session.
4. Start the timer, tick one goal, send one mentor message, then finish.
5. Confirm Reflection opens and the session remains visible on the home screen.

## Live tracking checks
1. Start in `Study spot` mode while sitting still indoors.
2. Confirm the map shows one current-position dot, not a route line.
3. Confirm text says `indoor coarse` when accuracy is broad.
4. Tap `I'm staying still`; confirm meters return to `0` and state is `Still`.
5. Switch to `Route` mode only while actually moving.
6. Finish the session and confirm export stores `trackingState: ended`, `trackingMode`, and `rawLocationStored: false`.

## Research data checks
1. Open Research Evidence.
2. Confirm Method status is visible.
3. Export JSON and check that spatial traces contain summaries only, not raw route samples.
4. Treat learner state, help-seeking, and scaffold fidelity as proxies until human-coded validation is complete.
