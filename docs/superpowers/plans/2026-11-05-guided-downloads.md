# Guided downloads implementation plan

Goal: implement the approved SVG using existing Electron controls and IPC.
Spec: takaneko-simple-ui.svg in this conversation visualization folder.
Constraints: preserve all download/browse functions, exact theme colors, system font, Japanese language and titlebar spacing.
Execution: inline. No Git checkout exists; original renderer files are backed up in a temporary directory.

- [x] Add a fixture desktop test for login guidance and download controls; observe failure before implementation.
- [x] Update index.html, renderer.js and styles.css: three steps, readable copy, collapsed advanced options, guarded start, result guidance, translations.
- [x] Run fixture tests, npm test and desktop smoke; inspect screenshots.

Review focus: stored credentials are not proof of a valid live session; disable start before saving; block folder/scope changes while downloading; distinguish failures and cancellation from success; preserve language switching and narrow layouts.

Verification: guided Electron fixture passed (including stop during save), npm test passed, existing desktop smoke passed. Screenshots inspected at 1240px and 600px. Independent reviewer found no material regressions; collection subtab selection corrected. No live membership login/download was exercised.
