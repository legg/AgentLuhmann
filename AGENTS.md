# Agent Luhman Obsidian community plugin

## Project overview

- Target: Obsidian Community Plugin (TypeScript → bundled JavaScript).
- Entry point: `main.ts` compiled to `main.js` and loaded by Obsidian.
- Required release artifacts: `main.js`, `manifest.json`, and optional `styles.css`.

## Environment & tooling

- Node.js: use current LTS (Node 18+ recommended).
- **Package manager: npm** (required for this sample - `package.json` defines npm scripts and dependencies).
- **Bundler: esbuild** (required for this sample - `esbuild.config.mjs` and build scripts depend on it). Alternative bundlers like Rollup or webpack are acceptable for other projects if they bundle all external dependencies into `main.js`.
- Types: `obsidian` type definitions.

**Note**: This sample project has specific technical dependencies on npm and esbuild. If you're creating a plugin from scratch, you can choose different tools, but you'll need to replace the build configuration accordingly.

### SKILLS

See .agents/skills directory for available skills

### Install

```bash
npm install
```

### Dev (watch)

```bash
npm run dev
```

### Production build

```bash
npm run build
```

## Linting

- To use eslint install eslint from terminal: `npm install -g eslint`
- To use eslint to analyze this project use this command: `eslint main.ts`
- eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder: `eslint ./src/`

## File & folder conventions

- **Organize code into multiple files**: Split functionality across separate modules rather than putting everything in `main.ts`.
- Source lives in `src/`. Keep `main.ts` small and focused on plugin lifecycle (loading, unloading, registering commands).
- **Example file structure**:
  ```
  src/
    main.ts           # Plugin entry point, lifecycle management
    settings.ts       # Settings interface and defaults
    commands/         # Command implementations
      command1.ts
      command2.ts
    ui/              # UI components, modals, views
      modal.ts
      view.ts
    utils/           # Utility functions, helpers
      helpers.ts
      constants.ts
    types.ts         # TypeScript interfaces and types
  ```
- **Do not commit build artifacts**: Never commit `node_modules/`, `main.js`, or other generated files to version control.
- Keep the plugin small. Avoid large dependencies. Prefer browser-compatible packages.
- Generated output should be placed at the plugin root or `dist/` depending on your build setup. Release artifacts must end up at the top level of the plugin folder in the vault (`main.js`, `manifest.json`, `styles.css`).

## Manifest rules (`manifest.json`)

- Must include (non-exhaustive):  
  - `id` (plugin ID; for local dev it should match the folder name)  
  - `name`  
  - `version` (Semantic Versioning `x.y.z`)  
  - `minAppVersion`  
  - `description`  
  - `isDesktopOnly` (boolean)  
  - Optional: `author`, `authorUrl`, `fundingUrl` (string or map)
- Never change `id` after release. Treat it as stable API.
- Keep `minAppVersion` accurate when using newer APIs.
- Canonical requirements are coded here: https://github.com/obsidianmd/obsidian-releases/blob/master/.github/workflows/validate-plugin-entry.yml

## Testing

- Manual install for testing: copy `main.js`, `manifest.json`, `styles.css` (if any) to:
  ```
  <Vault>/.obsidian/plugins/<plugin-id>/
  ```
- Reload Obsidian and enable the plugin in **Settings → Community plugins**.

## Commands & settings

- Any user-facing commands should be added via `this.addCommand(...)`.
- If the plugin has configuration, provide a settings tab and sensible defaults.
- Persist settings using `this.loadData()` / `this.saveData()`.
- Use stable command IDs; avoid renaming once released.

## Versioning & releases

- Bump `version` in `manifest.json` (SemVer) and update `versions.json` to map plugin version → minimum app version.
- Create a GitHub release whose tag exactly matches `manifest.json`'s `version`. Do not use a leading `v`.
- Attach `manifest.json`, `main.js`, and `styles.css` (if present) to the release as individual assets.
- After the initial release, follow the process to add/update your plugin in the community catalog as required.

## Security, privacy, and compliance

Follow Obsidian's **Developer Policies** and **Plugin Guidelines**. In particular:

- Default to local/offline operation. Only make network requests when essential to the feature.
- No hidden telemetry. If you collect optional analytics or call third-party services, require explicit opt-in and document clearly in `README.md` and in settings.
- Never execute remote code, fetch and eval scripts, or auto-update plugin code outside of normal releases.
- Minimize scope: read/write only what's necessary inside the vault. Do not access files outside the vault.
- Clearly disclose any external services used, data sent, and risks.
- Respect user privacy. Do not collect vault contents, filenames, or personal information unless absolutely necessary and explicitly consented.
- Avoid deceptive patterns, ads, or spammy notifications.
- Register and clean up all DOM, app, and interval listeners using the provided `register*` helpers so the plugin unloads safely.

## UX & copy guidelines (for UI text, commands, settings)

- Prefer sentence case for headings, buttons, and titles.
- Use clear, action-oriented imperatives in step-by-step copy.
- Use **bold** to indicate literal UI labels. Prefer "select" for interactions.
- Use arrow notation for navigation: **Settings → Community plugins**.
- Keep in-app strings short, consistent, and free of jargon.

## Performance

- Keep startup light. Defer heavy work until needed.
- Avoid long-running tasks during `onload`; use lazy initialization.
- Batch disk access and avoid excessive vault scans.
- Debounce/throttle expensive operations in response to file system events.

## Coding conventions

- TypeScript with `"strict": true` preferred.
- **Keep `main.ts` minimal**: Focus only on plugin lifecycle (onload, onunload, addCommand calls). Delegate all feature logic to separate modules.
- **Split large files**: If any file exceeds ~200-300 lines, consider breaking it into smaller, focused modules.
- **Use clear module boundaries**: Each file should have a single, well-defined responsibility.
- Bundle everything into `main.js` (no unbundled runtime deps).
- Avoid Node/Electron APIs if you want mobile compatibility; set `isDesktopOnly` accordingly.
- Prefer `async/await` over promise chains; handle errors gracefully.

## Mobile

- Where feasible, test on iOS and Android.
- Don't assume desktop-only behavior unless `isDesktopOnly` is `true`.
- Avoid large in-memory structures; be mindful of memory and storage constraints.

## Agent do/don't

**Do**
- Add commands with stable IDs (don't rename once released).
- Provide defaults and validation in settings.
- Write idempotent code paths so reload/unload doesn't leak listeners or intervals.
- Use `this.register*` helpers for everything that needs cleanup.

**Don't**
- Introduce network calls without an obvious user-facing reason and documentation.
- Ship features that require cloud services without clear disclosure and explicit opt-in.
- Store or transmit vault contents unless essential and consented.

## Common tasks

### Organize code across multiple files

**main.ts** (minimal, lifecycle only):
```ts
import { Plugin } from "obsidian";
import { MySettings, DEFAULT_SETTINGS } from "./settings";
import { registerCommands } from "./commands";

export default class MyPlugin extends Plugin {
  settings: MySettings;

  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    registerCommands(this);
  }
}
```

**settings.ts**:
```ts
export interface MySettings {
  enabled: boolean;
  apiKey: string;
}

export const DEFAULT_SETTINGS: MySettings = {
  enabled: true,
  apiKey: "",
};
```

**commands/index.ts**:
```ts
import { Plugin } from "obsidian";
import { doSomething } from "./my-command";

export function registerCommands(plugin: Plugin) {
  plugin.addCommand({
    id: "do-something",
    name: "Do something",
    callback: () => doSomething(plugin),
  });
}
```

### Add a command

```ts
this.addCommand({
  id: "your-command-id",
  name: "Do the thing",
  callback: () => this.doTheThing(),
});
```

### Persist settings

```ts
interface MySettings { enabled: boolean }
const DEFAULT_SETTINGS: MySettings = { enabled: true };

async onload() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  await this.saveData(this.settings);
}
```

### Register listeners safely

```ts
this.registerEvent(this.app.workspace.on("file-open", f => { /* ... */ }));
this.registerDomEvent(window, "resize", () => { /* ... */ });
this.registerInterval(window.setInterval(() => { /* ... */ }, 1000));
```

## Troubleshooting

- Plugin doesn't load after build: ensure `main.js` and `manifest.json` are at the top level of the plugin folder under `<Vault>/.obsidian/plugins/<plugin-id>/`. 
- Build issues: if `main.js` is missing, run `npm run build` or `npm run dev` to compile your TypeScript source code.
- Commands not appearing: verify `addCommand` runs after `onload` and IDs are unique.
- Settings not persisting: ensure `loadData`/`saveData` are awaited and you re-render the UI after changes.
- Mobile-only issues: confirm you're not using desktop-only APIs; check `isDesktopOnly` and adjust.

## Boilerplate patterns from template

This section documents the standard patterns found in the Obsidian plugin template that should be applied to new features and refactors.

### Plugin class structure (main.ts)

**Pattern**: The main plugin class extends `Plugin` and manages lifecycle, settings, and registration.

```ts
import {Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings;

  async onload() {
    await this.loadSettings();
    // Register all features here
  }

  onunload() {
    // Cleanup if needed (register* methods handle most cleanup)
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MyPluginSettings>);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
```

**Key principles**:
- Settings property is typed with an interface
- `loadSettings()` uses `Object.assign` to merge defaults with saved data, casting to `Partial<MyPluginSettings>`
- `saveSettings()` is a simple wrapper around `saveData()`
- All feature registration happens in `onload()`
- Keep business logic out of the main class - delegate to separate modules

### Settings module structure (settings.ts)

**Pattern**: Settings are defined in a separate module with interface, defaults, and UI tab.

```ts
import {App, PluginSettingTab, Setting} from "obsidian";
import MyPlugin from "./main";

export interface MyPluginSettings {
  mySetting: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
  mySetting: 'default'
}

export class SampleSettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const {containerEl} = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Settings #1')
      .setDesc('It\'s a secret')
      .addText(text => text
        .setPlaceholder('Enter your secret')
        .setValue(this.plugin.settings.mySetting)
        .onChange(async (value) => {
          this.plugin.settings.mySetting = value;
          await this.plugin.saveSettings();
        }));
  }
}
```

**Key principles**:
- Export interface for type safety across the plugin
- Export `DEFAULT_SETTINGS` constant matching the interface
- Settings tab extends `PluginSettingTab`
- Store reference to plugin instance for accessing settings
- Always call `containerEl.empty()` at start of `display()`
- Call `await this.plugin.saveSettings()` in `onChange` handlers
- Use fluent API for building settings UI

### Command registration patterns

**Pattern 1: Simple callback**
```ts
this.addCommand({
  id: 'open-modal-simple',
  name: 'Open modal (simple)',
  callback: () => {
    new SampleModal(this.app).open();
  }
});
```

**Pattern 2: Editor callback** (operates on active editor)
```ts
this.addCommand({
  id: 'replace-selected',
  name: 'Replace selected content',
  editorCallback: (editor: Editor, view: MarkdownView) => {
    editor.replaceSelection('Sample editor command');
  }
});
```

**Pattern 3: Conditional command** (checkCallback pattern)
```ts
this.addCommand({
  id: 'open-modal-complex',
  name: 'Open modal (complex)',
  checkCallback: (checking: boolean) => {
    const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (markdownView) {
      if (!checking) {
        new SampleModal(this.app).open();
      }
      return true;
    }
    return false;
  }
});
```

**Key principles**:
- Use `callback` for general commands
- Use `editorCallback` when you need direct access to the editor
- Use `checkCallback` when command availability depends on context
- In `checkCallback`, check conditions first, then execute only if `!checking`
- Command IDs must be stable after release

### Modal pattern

**Pattern**: Modals extend `Modal` and implement `onOpen()` and `onClose()`.

```ts
class SampleModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen() {
    let {contentEl} = this;
    contentEl.setText('Woah!');
  }

  onClose() {
    const {contentEl} = this;
    contentEl.empty();
  }
}
```

**Key principles**:
- Always call `contentEl.empty()` in `onClose()` to clean up DOM
- Use `contentEl` for adding content
- Pass `app` to parent constructor

### Event and listener registration patterns

**Pattern**: Always use `register*` methods for automatic cleanup.

```ts
// DOM events
this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
  new Notice("Click");
});

// Workspace events
this.registerEvent(this.app.workspace.on("file-open", (file) => {
  // Handle file open
}));

// Intervals
this.registerInterval(window.setInterval(() => 
  console.log('setInterval'), 5 * 60 * 1000
));
```

**Key principles**:
- Never add event listeners without `registerDomEvent()` or `registerEvent()`
- Never create intervals without `registerInterval()`
- These methods ensure cleanup happens automatically on plugin disable

### UI element registration patterns

**Ribbon icon**:
```ts
this.addRibbonIcon('dice', 'Sample', (evt: MouseEvent) => {
  new Notice('This is a notice!');
});
```

**Status bar**:
```ts
const statusBarItemEl = this.addStatusBarItem();
statusBarItemEl.setText('Status bar text');
// Note: Does not work on mobile
```

### TypeScript configuration patterns

From `tsconfig.json`, these are the recommended strict settings:
- `noImplicitAny: true`
- `noImplicitThis: true`
- `noImplicitReturns: true`
- `strictNullChecks: true`
- `strictBindCallApply: true`
- `noUncheckedIndexedAccess: true`
- `useUnknownInCatchVariables: true`
- `target: "ES6"`, `module: "ESNext"`

### Build configuration patterns (esbuild)

From `esbuild.config.mjs`:
- Entry point: `src/main.ts`
- Output: `main.js` at project root
- Format: CommonJS (`cjs`)
- Target: `es2018`
- Bundle: `true` (all dependencies bundled)
- External: `obsidian`, `electron`, `@codemirror/*`, `@lezer/*`, and Node builtins
- Production: minified, no sourcemap
- Development: watch mode, inline sourcemap

**Key principles**:
- Never bundle `obsidian` or `electron` - they're provided by the app
- CodeMirror and Lezer packages are also external
- Use watch mode for development (`npm run dev`)
- Production builds should be minified

### Import patterns

**Standard imports**:
```ts
import {App, Editor, MarkdownView, Modal, Notice, Plugin} from 'obsidian';
```

**Key principles**:
- Import specific classes/functions, not entire module
- Keep imports organized (Obsidian APIs, then local modules)
- Use relative imports for local modules (`./settings`, `./commands`)

### Error handling and user feedback

**Pattern**: Use `Notice` for user feedback:
```ts
import {Notice} from 'obsidian';
new Notice('Operation completed!');
```

**Key principles**:
- Use `Notice` for status messages and quick feedback
- Use modals for complex interactions requiring user input
- Handle async errors gracefully with try-catch

## References

- Obsidian sample plugin: https://github.com/obsidianmd/obsidian-sample-plugin
- API documentation: https://docs.obsidian.md
- Developer policies: https://docs.obsidian.md/Developer+policies
- Plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- Style guide: https://help.obsidian.md/style-guide
