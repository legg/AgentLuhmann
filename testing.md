# Manual Testing Guide: Agent Luhmann Phase 1 (Capture & Filter)

## Prerequisites

- Obsidian desktop app (v0.15.0 or later) installed
- Plugin built successfully (`npm run build` completed without errors)
- `main.js`, `manifest.json`, and `styles.css` copied to your test vault:
  ```
  <Vault>/.obsidian/plugins/agent-luhmann/
  ```

---

## Test 1: Plugin Loads Successfully

**Goal**: Verify the plugin initializes without errors and required folders are created.

### Steps
1. Open Obsidian with a test vault.
2. Go to **Settings → Community plugins**.
3. Enable **Agent Luhmann**.
4. Check the console (Ctrl+Shift+I / Cmd+Opt+I) for any red errors on load.

### Expected Result
- No console errors.
- Folders are auto-created in vault root:
  - `00_Inbox/`
  - `04_Archive/`
  - `99_Templates/`
- File exists: `99_Templates/fleeting-note.md`

### Pass Criteria
- [ ] Plugin appears in Community plugins list as enabled.
- [ ] Folders exist in file explorer.
- [ ] Template file exists with YAML frontmatter.

---

## Test 2: Capture Fleeting Note (Basic)

**Goal**: Verify the quick-capture command creates a note in the inbox with correct frontmatter.

### Steps
1. Open the Command Palette (Ctrl/Cmd+P).
2. Type and select: **Capture fleeting note**.
3. In the modal, type: `This is a test fleeting thought about emergence.`
4. Click **Capture note**.

### Expected Result
- Modal closes.
- A notice appears: "Fleeting note captured".
- A new file appears in `00_Inbox/` with a timestamp-based name (e.g., `20260501143000.md`).

### Verification
Open the created file and confirm frontmatter:
```yaml
---
type: fleeting
status: captured
captured_at: "2026-05-01T14:30:00.000Z"
surprise_score: null
tags:
  - zk-spark
---
```

### Pass Criteria
- [ ] File created in `00_Inbox/`.
- [ ] Filename is timestamp-based (`YYYYMMDDHHMMSS.md`).
- [ ] Frontmatter contains all required fields.
- [ ] Body contains the text entered in the modal.

---

## Test 3: Empty Capture Rejected

**Goal**: Verify empty input is handled gracefully.

### Steps
1. Run **Capture fleeting note**.
2. Leave the textarea empty (or type only spaces).
3. Click **Capture note**.

### Expected Result
- Modal does NOT close.
- A notice appears: "Note content is empty".
- No file is created.

### Pass Criteria
- [ ] Notice shown.
- [ ] No file created.

---

## Test 4: Capture Cancellation

**Goal**: Verify the Cancel button works.

### Steps
1. Run **Capture fleeting note**.
2. Type some text.
3. Click **Cancel**.

### Expected Result
- Modal closes.
- No file is created.

### Pass Criteria
- [ ] Modal closes cleanly.
- [ ] No file created.

---

## Test 5: Duplicate Timestamp Collision Handling

**Goal**: Verify the plugin handles filename collisions.
  
### Steps
1. Run **Capture fleeting note**.
2. Type `First note` and capture.
3. Within the same second, run **Capture fleeting note** again.
4. Type `Second note` and capture.

### Expected Result
- Both notes are created successfully.
- Second note has a suffix like `20260501143000-1.md`.

### Pass Criteria
- [ ] Both files exist.
- [ ] Second file has a unique name (not overwriting the first).

---

## Test 6: Process Inbox (No Notes Ready)

**Goal**: Verify the "Process inbox" command handles empty state.

### Steps
1. Ensure inbox is empty or only contains non-incubated notes.
2. Run **Process inbox**.

### Expected Result
- A notice appears: "No notes need review right now."

### Pass Criteria
- [ ] Notice shown.
- [ ] No suggest modal appears.

---

## Test 7: Incubation Detection

**Goal**: Verify notes only appear for review after the incubation period.

### Setup
- Set incubation period to **1 hour** in settings for faster testing.
- Or manually create a note with an old `captured_at` date.

### Steps (Option A: Short Incubation)
1. Open **Settings → Agent Luhmann**.
2. Set **Incubation period** to `1` hour.
3. Save settings.
4. Capture a note.
5. Wait 1 hour (or change system clock forward).
6. Run **Process inbox**.

### Steps (Option B: Manual Backdate)
1. Create a note manually in `00_Inbox/` with this frontmatter:
   ```yaml
   ---
   type: fleeting
   status: captured
   captured_at: "2026-04-01T12:00:00.000Z"
   surprise_score: null
   tags:
     - zk-spark
   ---
   ```
2. Run **Process inbox**.

### Expected Result
- A fuzzy suggest modal appears listing the incubated note(s).
- Each item shows the note's basename (timestamp).

### Pass Criteria
- [ ] Incubated note appears in the list.
- [ ] Non-incubated notes do NOT appear.

---

## Test 8: Surprise Rating → Archive (Low Score)

**Goal**: Verify a low surprise score moves the note to archive.

### Setup
- Ensure there is an incubated note in `00_Inbox/` (see Test 7).
- Default threshold is `3` (scores ≤ 3 archive, > 3 keep).

### Steps
1. Run **Process inbox**.
2. Select the incubated note from the list.
3. In the **Rate surprise** modal, click rating **2**.
4. Click **Confirm**.

### Expected Result
- A notice appears: "Note archived (surprise 2)".
- The note disappears from `00_Inbox/`.
- The note appears in `04_Archive/`.
- Frontmatter updated:
  ```yaml
  status: archived
  surprise_score: 2
  tags:
    - zk-spark
    - low-surprise
  ```

### Pass Criteria
- [ ] File moved to `04_Archive/`.
- [ ] `status` is `archived`.
- [ ] `surprise_score` is `2`.
- [ ] `#low-surprise` tag added.

---

## Test 9: Surprise Rating → Process (High Score)

**Goal**: Verify a high surprise score keeps the note for processing.

### Setup
- Ensure there is an incubated note in `00_Inbox/`.

### Steps
1. Run **Process inbox**.
2. Select the incubated note.
3. In the **Rate surprise** modal, click rating **5**.
4. Click **Confirm**.

### Expected Result
- A notice appears: "Note marked for processing (surprise 5)".
- The note stays in `00_Inbox/`.
- Frontmatter updated:
  ```yaml
  status: needs-processing
  surprise_score: 5
  tags:
    - zk-spark
    - process
  ```

### Pass Criteria
- [ ] File remains in `00_Inbox/`.
- [ ] `status` is `needs-processing`.
- [ ] `surprise_score` is `5`.
- [ ] `#process` tag added.

---

## Test 10: Skip Rating

**Goal**: Verify the Skip button works without applying a rating.

### Steps
1. Run **Process inbox**.
2. Select an incubated note.
3. Click **Skip**.

### Expected Result
- Modal closes.
- No notice appears.
- Note remains in `00_Inbox/` with `status: captured`.

### Pass Criteria
- [ ] Modal closes.
- [ ] No rating applied.
- [ ] Note unchanged.

---

## Test 11: Auto-Prompt on File Open (Enabled)

**Goal**: Verify the auto-prompt triggers when opening an incubated inbox note.

### Setup
- Ensure **Auto-prompt on open** is enabled in settings (default: on).
- Ensure there is an incubated note in `00_Inbox/` with `status: captured`.

### Steps
1. Navigate to `00_Inbox/` in the file explorer.
2. Click the incubated note to open it.

### Expected Result
- After a brief delay (~300ms), the **Rate surprise** modal opens automatically.

### Pass Criteria
- [ ] Surprise modal opens automatically.
- [ ] Modal shows note preview.

---

## Test 12: Auto-Prompt Disabled

**Goal**: Verify disabling auto-prompt prevents the modal from opening.

### Setup
- Ensure there is an incubated note in `00_Inbox/` with `status: captured`.

### Steps
1. Open **Settings → Agent Luhmann**.
2. Toggle **Auto-prompt on open** to **OFF**.
3. Close settings.
4. Open the incubated note from `00_Inbox/`.

### Expected Result
- Note opens normally.
- No surprise modal appears.

### Pass Criteria
- [ ] No modal opens.
- [ ] Note opens for normal editing.

---

## Test 13: Rate Surprise for Current Note (Command)

**Goal**: Verify the context-aware command only appears for eligible notes.

### Steps A: Eligible Note
1. Open an incubated inbox note with `status: captured`.
2. Open the Command Palette.
3. Search for: **Rate surprise for current note**.

### Expected A
- Command is available.
- Running it opens the **Rate surprise** modal.

### Steps B: Ineligible Note (Not Incubated)
1. Capture a new note (not yet incubated).
2. Open it.
3. Open the Command Palette.
4. Search for: **Rate surprise for current note**.

### Expected B
- Command is NOT available (does not appear in palette).

### Steps C: Ineligible Note (Already Rated)
1. Open a note with `status: archived` or `needs-processing`.
2. Open the Command Palette.

### Expected C
- Command is NOT available.

### Pass Criteria
- [ ] Command available only for incubated, un-rated inbox notes.

---

## Test 14: Settings Persistence

**Goal**: Verify settings survive plugin reload.

### Steps
1. Open **Settings → Agent Luhmann**.
2. Change **Inbox folder path** to `TestInbox`.
3. Change **Incubation period** to `72`.
4. Toggle **Auto-prompt on open** to **OFF**.
5. Close settings.
6. Disable the plugin in **Community plugins**.
7. Re-enable the plugin.
8. Re-open **Settings → Agent Luhmann**.

### Expected Result
- All changed values are preserved:
  - Inbox path: `TestInbox`
  - Incubation: `72`
  - Auto-prompt: OFF

### Pass Criteria
- [ ] All settings persist across reload.

---

## Test 15: Keyboard Accessibility

**Goal**: Verify all modals are fully keyboard-navigable.

### Steps (Capture Modal)
1. Run **Capture fleeting note**.
2. Press **Tab** repeatedly — focus should cycle through textarea and buttons.
3. Press **Escape** — modal should close.

### Steps (Surprise Modal)
1. Run **Process inbox** and select a note.
2. Press **Tab** — focus should move through rating buttons 1-5, Skip, Confirm.
3. Use **Enter** or **Space** to select a rating.
4. Press **Escape** — modal should close.

### Pass Criteria
- [ ] Tab navigation works in all modals.
- [ ] Escape closes modals.
- [ ] Enter/Space activates focused buttons.

---

## Test 16: Plugin Unload Cleanup

**Goal**: Verify no memory leaks or dangling listeners after unload.

### Steps
1. Enable the plugin.
2. Capture a few notes.
3. Disable the plugin in **Community plugins**.
4. Re-enable the plugin.
5. Open an incubated note.

### Expected Result
- Plugin works normally after re-enable.
- No duplicate event handlers (only one surprise modal opens).

### Pass Criteria
- [ ] Plugin works after reload.
- [ ] No duplicate modals.

---

## Test 17: Mobile Compatibility (if testing on mobile)

**Goal**: Verify touch targets and layout work on mobile.

### Steps
1. Install plugin on mobile vault.
2. Run **Capture fleeting note**.
3. Verify the textarea and buttons are usable with touch.
4. Run **Process inbox** and rate a note.
5. Verify rating buttons are easy to tap (≥ 44×44px).

### Pass Criteria
- [ ] All interactive elements are tappable.
- [ ] Layout fits within mobile screen.

---

## Regression Checklist

Run these after any code change:

- [ ] Plugin loads without console errors.
- [ ] Capture command creates note with correct frontmatter.
- [ ] Incubated notes appear in "Process inbox".
- [ ] Low score moves note to archive.
- [ ] High score keeps note in inbox.
- [ ] Auto-prompt respects settings toggle.
- [ ] Settings persist across reloads.
- [ ] Keyboard navigation works.

---

## Known Limitations (Phase 1)

1. **No daily note integration**: Notes must be captured via the modal.
2. **No branching IDs**: Filenames are simple timestamps.
3. **No linking features**: Phase 3 will add editor suggestions and link typing.
4. **No index builder**: Phase 4 will add dynamic views.
5. **Manual incubation testing**: The 48-hour default incubation requires waiting or backdating frontmatter manually.

---

*Test guide version: 1.0*
*Last updated: 2026-05-01*
