# affectUI public library inventory

Captured 2026-10-19. Read [the handoff](../../affectui-handoff.md) before implementation.

These are reference observations, not installed Pro source. CRM, Analytics and Settings & Billing have separate local implementations and interaction/mobile audits. The library inventory itself records a desktop initial-state screenshot, public documentation/API text, visible controls, class inventory and deduplicated runtime styles for each item.

| Family | Public items |
| --- | ---: |
| components | 54 |
| screens | 12 |
| blocks | 11 |
| illustrations | 24 |
| motion | 8 |

`manifest.json` maps source routes to style hashes. `engine-map.json` maps observed CSS namespaces to routes. Each `pages/<family>--<slug>.json` contains public documentation, API reference text, assets and controls; the adjacent PNG shows the initial viewport. A style hash resolves to `styles/<hash>.css`. A stylesheet appearing on a page does not prove a component dependency: globally injected styles can be present without visible UI. Check the DOM roots and interaction states before reusing it.

## Most frequently observed style modules

| Hash | Namespaces | Pages |
| --- | --- | ---: |
| [bdc9f7e471d2](styles/bdc9f7e471d2.css) | ui-ts | 109 |
| [118a7eb73e3d](styles/118a7eb73e3d.css) | ui-as, ui-pl, ui-df, ui-ap, ui-tc, ui-um, ui-cb, ui-button, ui-sg, ui-fm, ui-fd | 12 |
| [f082d3f7954f](styles/f082d3f7954f.css) | ui-button | 9 |
| [5cca34febce2](styles/5cca34febce2.css) | ui-fd | 5 |
| [29bdbc64574f](styles/29bdbc64574f.css) | ui-as, ui-fd | 2 |
| [c6791317a164](styles/c6791317a164.css) | ui-df | 2 |
| [8dd1260ffd63](styles/8dd1260ffd63.css) | ui-kpi | 2 |
| [4ef6915e98a9](styles/4ef6915e98a9.css) | ui-seg | 2 |
| [989f446119d7](styles/989f446119d7.css) | ui-ag | 1 |
| [d8f8a2ab27d9](styles/d8f8a2ab27d9.css) | ui-aw, ui-chat | 1 |
| [74df688b6da5](styles/74df688b6da5.css) | ui-chat | 1 |
| [d347af5e4f60](styles/d347af5e4f60.css) | ui-ad | 1 |

## Source index

- [Agent Gallery](https://www.affectui.com/blocks/agent-gallery) — [local evidence](pages/blocks--agent-gallery.json)
- [AI Workspace](https://www.affectui.com/blocks/ai-workspace) — [local evidence](pages/blocks--ai-workspace.json)
- [App Directory](https://www.affectui.com/blocks/app-directory) — [local evidence](pages/blocks--app-directory.json)
- [Client Context](https://www.affectui.com/blocks/client-context) — [local evidence](pages/blocks--client-context.json)
- [Invoice & Credit Note](https://www.affectui.com/blocks/invoice-credit) — [local evidence](pages/blocks--invoice-credit.json)
- [KPI Board](https://www.affectui.com/blocks/kpi-board) — [local evidence](pages/blocks--kpi-board.json)
- [Logo Marquee](https://www.affectui.com/blocks/logo-marquee) — [local evidence](pages/blocks--logo-marquee.json)
- [Metrics Dashboard](https://www.affectui.com/blocks/metrics-dashboard) — [local evidence](pages/blocks--metrics-dashboard.json)
- [Pricing Plans](https://www.affectui.com/blocks/pricing-plans) — [local evidence](pages/blocks--pricing-plans.json)
- [Task Board](https://www.affectui.com/blocks/task-board) — [local evidence](pages/blocks--task-board.json)
- [Testimonial Wall](https://www.affectui.com/blocks/testimonial-wall) — [local evidence](pages/blocks--testimonial-wall.json)
- [Agent Inbox](https://www.affectui.com/components/agent-inbox) — [local evidence](pages/components--agent-inbox.json)
- [Agent Lanes](https://www.affectui.com/components/agent-lanes) — [local evidence](pages/components--agent-lanes.json)
- [Agent Plan](https://www.affectui.com/components/agent-plan) — [local evidence](pages/components--agent-plan.json)
- [Agent Steering](https://www.affectui.com/components/agent-steering) — [local evidence](pages/components--agent-steering.json)
- [Agent Tree](https://www.affectui.com/components/agent-tree) — [local evidence](pages/components--agent-tree.json)
- [AI Answer](https://www.affectui.com/components/ai-answer) — [local evidence](pages/components--ai-answer.json)
- [Approval Card](https://www.affectui.com/components/approval-card) — [local evidence](pages/components--approval-card.json)
- [Autonomy Dial](https://www.affectui.com/components/autonomy-dial) — [local evidence](pages/components--autonomy-dial.json)
- [Billing Schedule](https://www.affectui.com/components/billing-schedule) — [local evidence](pages/components--billing-schedule.json)
- [Breakdown Chart](https://www.affectui.com/components/breakdown-chart) — [local evidence](pages/components--breakdown-chart.json)
- [Button](https://www.affectui.com/components/button) — [local evidence](pages/components--button.json)
- [Change Summary](https://www.affectui.com/components/change-summary) — [local evidence](pages/components--change-summary.json)
- [Chat Composer](https://www.affectui.com/components/chat-composer) — [local evidence](pages/components--chat-composer.json)
- [Cited Answer](https://www.affectui.com/components/cited-answer) — [local evidence](pages/components--cited-answer.json)
- [Combobox](https://www.affectui.com/components/combobox) — [local evidence](pages/components--combobox.json)
- [Command Menu](https://www.affectui.com/components/command-menu) — [local evidence](pages/components--command-menu.json)
- [Comment Thread](https://www.affectui.com/components/comment-thread) — [local evidence](pages/components--comment-thread.json)
- [Comments Panel](https://www.affectui.com/components/comments-panel) — [local evidence](pages/components--comments-panel.json)
- [Compact Breakdown](https://www.affectui.com/components/compact-breakdown) — [local evidence](pages/components--compact-breakdown.json)
- [Context Window](https://www.affectui.com/components/context-window) — [local evidence](pages/components--context-window.json)
- [Data Table](https://www.affectui.com/components/data-table) — [local evidence](pages/components--data-table.json)
- [Date Range Picker](https://www.affectui.com/components/date-range-picker) — [local evidence](pages/components--date-range-picker.json)
- [Decision Inbox](https://www.affectui.com/components/decision-inbox) — [local evidence](pages/components--decision-inbox.json)
- [Delegate Board](https://www.affectui.com/components/delegate-board) — [local evidence](pages/components--delegate-board.json)
- [Dropzone](https://www.affectui.com/components/dropzone) — [local evidence](pages/components--dropzone.json)
- [Email Draft](https://www.affectui.com/components/email-draft) — [local evidence](pages/components--email-draft.json)
- [Experiment Card](https://www.affectui.com/components/experiment-card) — [local evidence](pages/components--experiment-card.json)
- [Filter Menu](https://www.affectui.com/components/filter-menu) — [local evidence](pages/components--filter-menu.json)
- [Inline Diff](https://www.affectui.com/components/inline-diff) — [local evidence](pages/components--inline-diff.json)
- [Integration Picker](https://www.affectui.com/components/integration-picker) — [local evidence](pages/components--integration-picker.json)
- [Integration Settings](https://www.affectui.com/components/integration-settings) — [local evidence](pages/components--integration-settings.json)
- [KPI Chart](https://www.affectui.com/components/kpi-chart) — [local evidence](pages/components--kpi-chart.json)
- [Memory Panel](https://www.affectui.com/components/memory-panel) — [local evidence](pages/components--memory-panel.json)
- [Message Actions](https://www.affectui.com/components/message-actions) — [local evidence](pages/components--message-actions.json)
- [Model Picker](https://www.affectui.com/components/model-picker) — [local evidence](pages/components--model-picker.json)
- [Notification Stack](https://www.affectui.com/components/notification-stack) — [local evidence](pages/components--notification-stack.json)
- [OTP Input](https://www.affectui.com/components/otp-input) — [local evidence](pages/components--otp-input.json)
- [Permission Request](https://www.affectui.com/components/permission-request) — [local evidence](pages/components--permission-request.json)
- [Profile Menu](https://www.affectui.com/components/profile-menu) — [local evidence](pages/components--profile-menu.json)
- [Progress Tracker](https://www.affectui.com/components/progress-tracker) — [local evidence](pages/components--progress-tracker.json)
- [Project Card](https://www.affectui.com/components/project-card) — [local evidence](pages/components--project-card.json)
- [Prompt Library](https://www.affectui.com/components/prompt-library) — [local evidence](pages/components--prompt-library.json)
- [Reaction Bar](https://www.affectui.com/components/reaction-bar) — [local evidence](pages/components--reaction-bar.json)
- [Segmented Control](https://www.affectui.com/components/segmented-control) — [local evidence](pages/components--segmented-control.json)
- [Setup Guide](https://www.affectui.com/components/setup-guide) — [local evidence](pages/components--setup-guide.json)
- [Smart Recommendation](https://www.affectui.com/components/smart-recommendation) — [local evidence](pages/components--smart-recommendation.json)
- [Stepper Form](https://www.affectui.com/components/stepper-form) — [local evidence](pages/components--stepper-form.json)
- [Thinking Loader](https://www.affectui.com/components/thinking-loader) — [local evidence](pages/components--thinking-loader.json)
- [Thinking State](https://www.affectui.com/components/thinking-state) — [local evidence](pages/components--thinking-state.json)
- [Tips Panel](https://www.affectui.com/components/tips-panel) — [local evidence](pages/components--tips-panel.json)
- [Toaster](https://www.affectui.com/components/toaster) — [local evidence](pages/components--toaster.json)
- [Tool Call Card](https://www.affectui.com/components/tool-call-card) — [local evidence](pages/components--tool-call-card.json)
- [Usage Meter](https://www.affectui.com/components/usage-meter) — [local evidence](pages/components--usage-meter.json)
- [Writing Assistant](https://www.affectui.com/components/writing-assistant) — [local evidence](pages/components--writing-assistant.json)
- [Agent Team](https://www.affectui.com/illustrations/agent-team) — [local evidence](pages/illustrations--agent-team.json)
- [Cover Flow](https://www.affectui.com/illustrations/cover-flow) — [local evidence](pages/illustrations--cover-flow.json)
- [Empty Calendar](https://www.affectui.com/illustrations/empty-calendar) — [local evidence](pages/illustrations--empty-calendar.json)
- [Enrichment Orbit](https://www.affectui.com/illustrations/enrichment-orbit) — [local evidence](pages/illustrations--enrichment-orbit.json)
- [Frost Cloud](https://www.affectui.com/illustrations/frost-cloud) — [local evidence](pages/illustrations--frost-cloud.json)
- [Ghosted Chat](https://www.affectui.com/illustrations/ghosted-chat) — [local evidence](pages/illustrations--ghosted-chat.json)
- [Glass Folder](https://www.affectui.com/illustrations/glass-folder) — [local evidence](pages/illustrations--glass-folder.json)
- [Glow Cloud](https://www.affectui.com/illustrations/glow-cloud) — [local evidence](pages/illustrations--glow-cloud.json)
- [Glow Keyboard](https://www.affectui.com/illustrations/glow-keyboard) — [local evidence](pages/illustrations--glow-keyboard.json)
- [Integration Beam](https://www.affectui.com/illustrations/integration-beam) — [local evidence](pages/illustrations--integration-beam.json)
- [Integration Flow](https://www.affectui.com/illustrations/integration-flow) — [local evidence](pages/illustrations--integration-flow.json)
- [Integration Grid](https://www.affectui.com/illustrations/integration-grid) — [local evidence](pages/illustrations--integration-grid.json)
- [Layer Stack](https://www.affectui.com/illustrations/layer-stack) — [local evidence](pages/illustrations--layer-stack.json)
- [Lead Sourcing](https://www.affectui.com/illustrations/lead-sourcing) — [local evidence](pages/illustrations--lead-sourcing.json)
- [Logo Cluster](https://www.affectui.com/illustrations/logo-cluster) — [local evidence](pages/illustrations--logo-cluster.json)
- [Model Wheel](https://www.affectui.com/illustrations/model-wheel) — [local evidence](pages/illustrations--model-wheel.json)
- [Outreach Branches](https://www.affectui.com/illustrations/outreach-branches) — [local evidence](pages/illustrations--outreach-branches.json)
- [Project Flow](https://www.affectui.com/illustrations/project-flow) — [local evidence](pages/illustrations--project-flow.json)
- [DACH Region](https://www.affectui.com/illustrations/region-dach) — [local evidence](pages/illustrations--region-dach.json)
- [Side Folder](https://www.affectui.com/illustrations/side-folder) — [local evidence](pages/illustrations--side-folder.json)
- [Tab Overload](https://www.affectui.com/illustrations/tab-overload) — [local evidence](pages/illustrations--tab-overload.json)
- [Team Invite](https://www.affectui.com/illustrations/team-invite) — [local evidence](pages/illustrations--team-invite.json)
- [Voice Orb](https://www.affectui.com/illustrations/voice-orb) — [local evidence](pages/illustrations--voice-orb.json)
- [World Map Continental](https://www.affectui.com/illustrations/world-map) — [local evidence](pages/illustrations--world-map.json)
- [Blur Crossfade](https://www.affectui.com/motion/blur-crossfade) — [local evidence](pages/motion--blur-crossfade.json)
- [Gradient Floor](https://www.affectui.com/motion/gradient-floor) — [local evidence](pages/motion--gradient-floor.json)
- [Gradient Text](https://www.affectui.com/motion/gradient-text) — [local evidence](pages/motion--gradient-text.json)
- [Grid Background](https://www.affectui.com/motion/grid-background) — [local evidence](pages/motion--grid-background.json)
- [Number Ticker](https://www.affectui.com/motion/number-ticker) — [local evidence](pages/motion--number-ticker.json)
- [Shimmer Loader](https://www.affectui.com/motion/shimmer-loader) — [local evidence](pages/motion--shimmer-loader.json)
- [Text Reveal](https://www.affectui.com/motion/text-reveal) — [local evidence](pages/motion--text-reveal.json)
- [Tilt Card](https://www.affectui.com/motion/tilt-card) — [local evidence](pages/motion--tilt-card.json)
- [Agent Chat](https://www.affectui.com/screens/agent-chat) — [local evidence](pages/screens--agent-chat.json)
- [Agent Run](https://www.affectui.com/screens/agent-run) — [local evidence](pages/screens--agent-run.json)
- [Analytics](https://www.affectui.com/screens/analytics) — [local evidence](pages/screens--analytics.json)
- [App Shell](https://www.affectui.com/screens/app-shell) — [local evidence](pages/screens--app-shell.json)
- [Assistant Home](https://www.affectui.com/screens/assistant-home) — [local evidence](pages/screens--assistant-home.json)
- [CRM](https://www.affectui.com/screens/crm) — [local evidence](pages/screens--crm.json)
- [Evals](https://www.affectui.com/screens/evals) — [local evidence](pages/screens--evals.json)
- [Folders](https://www.affectui.com/screens/files) — [local evidence](pages/screens--files.json)
- [Folder](https://www.affectui.com/screens/folder) — [local evidence](pages/screens--folder.json)
- [Integrations](https://www.affectui.com/screens/integrations) — [local evidence](pages/screens--integrations.json)
- [Onboarding](https://www.affectui.com/screens/onboarding) — [local evidence](pages/screens--onboarding.json)
- [Settings & Billing](https://www.affectui.com/screens/settings-billing) — [local evidence](pages/screens--settings-billing.json)

Reproduce with `node scripts/forensics/affectui-library.mjs`, then `node scripts/forensics/affectui-engine-map.mjs`. This inventory excludes authenticated code/CLI endpoints, Classic variants and unobserved interaction states.
