# affectUI Pro dependency audit

Checked 2026-10-20 against the current checkout.

## Result

No technical dependency on an affectUI subscription, Pro access key, registry
response or hosted affectUI runtime was found in the current application.

This is separate from the classification of the original designs: the official
Writing Assistant, Model Picker, Usage Meter and several reference screens are
Pro items. A local implementation running without a key does not establish its
license or purchase history. This audit does not certify rights to copied source,
styles, designs, fonts or assets.

## Static scope

- Scanned all 681 source text files under `src` (`ts`, `tsx`, `css`, `json`,
  `js`/`mjs`), including inactive components and tests. Of these, 571 are component
  directory files, including 326 `.tsx` files; these are file counts, not counts
  of distinct UI widgets.
- Inspected `components.json`, `package.json`, `package-lock.json` and Next config.
- `components.json` has an empty `registries` object. No affectUI package entry
  occurs in the lockfile. Absence of a package alone would not rule out copied
  registry source; application code was scanned separately.
- No HTTP imports, external affectUI package imports, executable string references
  to affectui.com or the Writing Assistant registry endpoint, `AFFECTUI_TOKEN`
  references, or long `aui_...` token literals were found under `src`.
- affectUI domain references in source are provenance comments. Shared Inter fonts
  use local `/sites/affectui-usage-meter/fonts/...` files.
- No `.env*` files were present at the project root. No credential values were
  needed or printed during this audit. Global user/editor MCP credentials and
  purchase records were not inspected.

## Component families checked

| Local component family | Current technical dependency on affectUI Pro |
| --- | --- |
| Writing Assistant | None found; local TSX, hook, model and CSS |
| Model Picker, Combobox | None found |
| CRM, Analytics, Settings & Billing, Usage Meter | None found |
| Assistant Home, Files, Agent Run, Agent Steering | None found |
| Gradient Floor, Guide navigation | None found |
| Mapping, Invoice | None found |
| Stripe homepage, product pages, navigation, motion, shared UI | None found |

The Writing Assistant and Model Picker research notes explicitly document
reconstruction from public previews without reading the gated Pro source. This
is recorded provenance, not independent verification of the entire history of
every file. Some older component comments describe reconstruction from a shipped
component; they do not establish a purchase or license either way.

## Network behavior

Runtime observation: `runtime.json`.

A fresh Chrome browser context visited 19 initial route states on the current
local development server: homepage; Payments, Tax and Billing; Guide selector;
Home, Companies, Contacts, Deals, Reports, New chat, Files, Run, Mapping, Invoice;
and the four Settings tabs. The Writing Assistant's first suggestion was also
submitted and produced a local sample reply.

Requests to affectui.com were explicitly denied for the test. All 19 route states
returned HTTP 200 with visible main content and no page errors. There were zero
attempted affectUI requests and zero external HTTP hosts observed in this sample.
This is an initial-route smoke test plus one card interaction, not exhaustive
coverage of every state, viewport, upload or backend configuration.

Two configurable HTTP adapters exist: the workspace adapter and the Assistant
adapter. Their endpoint and authentication come from workspace configuration,
not affectUI. The default workspace backend is browser-local when no API URL is
configured. Real chat/backend service costs would be separate from a UI-source
purchase. The selector Writing Assistant uses its built-in sample responder;
the full Assistant screen requires a separately configured backend for real chat.

## Official installation terms checked

- [Installation](https://www.affectui.com/docs/installation#pro): official Pro
  downloads require a personal key, configured as `AFFECTUI_TOKEN` and supplied
  to the registry in an Authorization header. This is an installation/download
  configuration; none is present in this project's registry config.
- [Pricing](https://www.affectui.com/pricing): affectUI describes Individual and
  Team Pro as one-time purchases with lifetime updates, no subscription/renewal.
- [Introduction](https://www.affectui.com/docs/introduction): Pro previews and
  documentation are public; the source comes with Pro.

The provided `npx shadcn ... writing-assistant-clean.json` command was treated as
the object of this audit and was not executed. No application code was changed.
