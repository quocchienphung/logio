# Account menu and Where you log

Public references inspected through their rendered preview/DOM only:

- https://uiarc.dev/components/user-menu
- https://uiarc.dev/components/blocks/security-settings

No registry/CLI installation, gated source, source-site API, screenshot renderer or iframe is used in the implementation.

## Final placement

The existing workspace account menu keeps the identity header, workspaces, search, collapse, **Settings**, inline **Theme** and Back to Stripe. **Profile**, **Help & feedback** and **Appearance & notifications** were removed at the user's request, including their dialog implementations. `QuickSettings.tsx` was removed. The account's existing name/email/avatar are still read for the identity display.

**Where you log** is a seventh section of the existing Settings panel, after Security. Open it at `/personalize?section=process&settings=where-you-log`, from its Settings navigation item, or by searching for sessions, devices, password, authenticator or its name. Workspace security-policy rows remain in Security; account sign-in controls live in Where you log.

## What was observed

User menu: compact identity header, a 36px theme row (44px touch minimum), 88×26 segmented track with 28×22 choices, 7px track / 5px thumb radii, and a 580ms monotone CSS `linear()` thumb transition. `AccountTheme.tsx` / `account-theme.css` reproduce these measurements and the observed Sun/Moon/Monitor icons. Theme stays open when selected, supports Left/Right and shares the existing preference with the full Settings. System follows device appearance. Existing workspace menu positioning/motion is retained, because the user requested adding attributes to this menu, rather than replacing its workspace controls with UIArc's top-bar menu or mobile sheet.

Security: 16px card radius, 1px neutral border, Inter 14px/19.6px, 16px Geist heading, 16px 20px section padding, 36px pill buttons and approximately 55px device rows. The public flow was exercised through Scan → Verify (including automatic completion of six OTP digits) → Save codes → download/acknowledge → enabled; password form and immediate single-session revoke were observed. Password has two fields, four requirements (12 characters, upper/lowercase, number, symbol) and an optional sign-out checkbox. Enabled 2FA and signing out the other sessions require a 1.2s hold. Expansion uses an independently selected damped height spring; exact spring coefficients are not claimed as measured source internals. Codes use two columns below 640px; the QR stacks below 560px. The decorative QR cells were measured from rendered DOM into `preview-qr.ts` and drawn as SVG; they are not a functioning enrollment QR.

`*-styles.json`, `*.txt` and source PNGs are inspection evidence. Source captures can include the documentation site's sticky preview controls, which sometimes obscure a card edge. Local screenshots in `qa/` record the integrated Settings at desktop, 390px and 320px, plus the setup/password states.

## Honest runtime boundary

The source Security settings block itself simulates security actions. This app currently has no per-user authentication/session/TOTP/password service, so the local card explicitly says **Preview** and **Sample sessions and simulated security actions**. Device names, places and old password date are the source's sample content, not an assertion about the person's account or location. The account email comes from the existing profile resource.

The flows work as a preview: code validation, errors, copy, a real clearly labelled sample-code text download, acknowledged completion, password requirement/visibility controls, single-session removal, and cancellable pointer/keyboard hold. Only non-secret preview metadata persists (`security-preview`, account scope, **device** storage): enabled flag/date, password-change date, revoked sample ids. Password values, OTP, setup key and backup codes are not persisted or sent. Those operations do not change real account security. Reduced motion / Interface motion off disable the animated section transitions.

## Ownership and checks

- `affectui-crm/Crm.tsx`, `AccountTheme.tsx`, `account-theme.css`: account menu and shared theme.
- `affectui-crm/WorkspaceEditors.tsx`: remaining workspace/view/changelog dialogs; deleted profile/help/preferences flows.
- `settings-command/SettingsCommand.tsx`, `SettingsOverlay.tsx`, `SettingsPalette.tsx`, `settings-model.ts`, `section-icons.ts`: placement, email, deep link and search.
- `security-settings/`: independent UI, state validation, decorative QR and hold interaction.
- `workspace-resources.ts`, `workspace-backend/types.ts`: device-only non-secret preview metadata.

Commands:

```text
node scripts/qa/account-settings.mjs [base-url]
node scripts/qa/settings-command.mjs [base-url]
node --experimental-strip-types --test src/components/sites/security-settings/security-model.test.mjs
npm run build
npm test
```

Account QA covers removed menu entries; theme click/keyboard/System and reload; Settings search; OTP errors/paste; code download and acknowledgment; password validation and absence from storage; revoke, short/full holds, persisted metadata; 390/320px and reduced motion; no page errors or external requests. The updated canonical Settings suite passed **71 checks**. Production build and **418 unit tests** passed. Results and screenshots are in `qa/`, `regression/`; final verification outcomes are in `validation.json`.
