# SNS desktop implementation plan

Implement R001–R028 from the approved SVGs and 2026-11-17 design spec. Keep Electron, JavaScript, gallery-dl, yt-dlp and ffprobe. Work inline in this directory, which has no Git metadata.

1. Probe tools with bounded read-only requests. Verify extractor event shapes and preserve exact source IDs. Record access limits separately from empty profiles.
2. Implement adapter and archive in src/main/sns/. Normalize platform events, validate ownership, store files by platform/account/date, probe media, verify cached hashes, record gaps and snapshot text/ALT revisions. Test repeat, revision and missing-file repair against fixture transfers.
3. Wire a new Electron entry point/preload to persistent targets, a serial manual job, isolated optional login, controlled archive reads and folder selection. Keep old server modules and checks available.
4. Implement desktop screens from the approved SVGs with local assets, plain status copy, alternate language, keyboard access and archive navigation. Verify a fixture end-to-end inside Electron and run the existing regression suite. Live credentials, platform coverage and packaged OS verification are tracked independently.
