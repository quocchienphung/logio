# Permission requests in Process

Source: [affectUI Permission Request](https://www.affectui.com/components/permission-request), public **Clean** preview and public API/accessibility documentation, inspected 2026-10-21. Destination: `/personalize?section=process`. This is an independently authored React/CSS adaptation; no Pro source, production JavaScript, iframe or screenshot renderer is used. It reuses the existing Inter font, provider marks and Lucide icons, with no new dependencies or downloaded assets.

## Observed design and adaptation

The source has a compact white card up to 400px wide: provider avatar, “who wants to do what”, target, risk tag, an indented reason, a separated “What will happen” list, scope choices and Deny/Allow. A decision folds into a status row. Measured Clean styles: 13px Inter with 20px line height, 12px reason with 18px line height, 10px card radius, 14–16px header/footer padding, 10px header/list gaps and compact 30px desktop actions. The source supports once/timed/always scopes and documents Enter/Escape, touch targets, narrow layouts and reduced motion.

Process uses the same visual hierarchy with its own block data. The badge says **Ask first**, rather than inferring a risk level that the engine does not report. The list describes the task, configured tools, cost limit and connected descendants. In simulation, tools are explicitly labelled as demo labels. Secondary text has stronger contrast. The footer uses **Just once / Ask again next run**, matching the engine's existing approval semantics.

Timed/permanent grants and Revoke are deliberately absent: the engine has no persisted grant, expiry or revocation contract. A one-shot decision starts/stops a task; reversing a started action would require a separate engine operation. Preview buttons only update isolated preview state. A live decision passes through `ProcessEngine.act` using the existing `{ type: "approve" | "reject", id }` action; HTTP errors keep the request open with a retryable error. The REST transport and snapshot schema remain compatible.

## Placement and behavior

- **Rules → Ask me before it runs → Preview permission request**: a collapsible, interactive sandbox under the question field. It uses the current draft's data and never creates a run or saves an approval.
- **Live Map/Tree**: a nonmodal card at the lower left, above the map dock. It appears when a block is waiting, without stealing focus. On narrow/short screens its contents scroll within the available space, leaving the run controls and bottom dock reachable.
- **Needs you / inspector Review request**: open the same live surface. Explicit review moves focus into the dialog; a dialog opened from the phone inspector first closes that modal.
- Multiple waiting blocks are individually reviewable with previous/next controls. A successful decision folds into a receipt, then “Next request” continues the queue. There is no bulk approval.
- Minimize preserves the pending request and shows a compact Review chip. “Show [block]” minimizes the card, switches to Map and reveals/selects the block.
- Simulated review content comes from the frozen run plan, so editing the draft cannot rewrite what is being approved. Decisions survive reload through the existing run log; transient preview/minimize/receipt state is not persisted.
- Enter on the focused dialog allows; Escape within it denies. Native buttons work with Tab/Enter/Space. Keys elsewhere never decide. The surface has labelled/described dialog semantics, result/live status announcements, pending/error states, reduced motion and 44px touch actions.
- Engine actions are serialized and stale polling responses are ignored while a decision is being submitted.

## Ownership

| File | Responsibility |
| --- | --- |
| `src/components/sites/affectui-permission-request/PermissionRequest.tsx`, `permission-request.css` | Editable single-run request/decision component and source-inspired styling |
| `src/components/sites/process/ProcessPermissions.tsx`, `process-permissions.css` | Draft preview, concrete task details, queue, focus, responsive placement and receipts |
| `src/components/sites/process/NodeInspector.tsx` | Preview next to the rule and live Review request entry point |
| `src/components/sites/process/ProcessPage.tsx` | Engine actions, frozen plan, review entry points and polling/action ordering |
| `src/components/sites/affectui-agent-tree/agent-bar.tsx` | Optional `onReviewWaiting` host callback; other consumers keep the compact waiting popover |
| `scripts/qa/process-permissions.mjs` | Isolated Chromium/touch/WebKit and REST mock coverage; screenshots/results in `qa/` |

## Verification

### UIArc-inspired size morph (2026-10-22)

The live request now stays on one measured surface through initial appearance, minimize/Review, explicit Needs you reviews and decision receipts. It grows/folds over a one-second trajectory sampled from UIArc's public KPI Drilldown preview; content reveals in a short stagger. Reversing the transition retargets from current size, text keeps its final metrics, short screens keep internal scrolling, and reduced motion skips the size animation. Explicit review updates the component instead of remounting a full-size card. The existing approval engine, scope, queue and keyboard decision semantics are unchanged.

See [shared motion evidence, ownership and QA](../../uiarc-interactions/README.md). This is an independently authored adaptation of the public preview, with no UIArc API or Pro source.

Run:

```sh
node --experimental-strip-types scripts/qa/process-permissions.mjs
node scripts/qa/process.mjs
npm test
npm run check
```

Evidence: [desktop request](qa/desktop-request.png), [draft preview](qa/inspector-preview.png), [queue](qa/desktop-queue.png), [folded decision](qa/desktop-allowed.png), [390px touch](qa/mobile-390.png), [320px touch](qa/mobile-320.png), [dark theme](qa/desktop-dark.png), [REST failure](qa/rest-error.png), [results](qa/results.json). These are local integration captures; visual review against the public source checks the shared hierarchy, spacing, typography and folded state, not a pixel-identical claim for the adapted content.

Passed: 13 permission workflow groups, 28 existing Process workflow groups, 194 unit/model tests, full lint/typecheck/production build. Full lint has seven pre-existing warnings outside this feature. Final changed-file lint, typecheck and build also pass. Browser QA uses separate contexts and does not modify the user's browser storage. REST uses a mock; no live external model/tool calls or physical-phone testing was performed.
