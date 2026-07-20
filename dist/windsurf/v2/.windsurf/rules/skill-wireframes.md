---
trigger: model_decision
description: "AI-DLC V2 skill: wireframes"
---


# Wireframes

Design the UI surface of the system — screens, layouts, navigation, and interaction flows — grounded in approved user stories and personas. Produces both visual wireframes for human review and structured markdown for machine consumption by downstream skills.

This skill runs only when the intent includes UI-facing stories. For pure backend/infrastructure intents, it is skipped entirely.

## Figma Integration (Optional)

If the Figma MCP server is available in the toolchain, this skill can generate wireframes directly in Figma instead of (or in addition to) SVG/HTML files. This enables:
- Professional-quality wireframes using real design system components
- Iterative refinement with human feedback directly in Figma
- Code-generation can later read the approved Figma designs via `get_design_context`
- Visual regression testing can compare deployed UI against Figma source-of-truth

### Figma Decision Flow

```
1. Is Figma MCP available? (check toolchain.yaml → design.figma or detect Figma MCP in tools)
   │
   ├── NO → Use SVG/HTML wireframes (default behavior below)
   │
   └── YES → Ask human:
       │
       ├── "Create new wireframes in Figma" → generate_figma_design from stories
       │
       ├── "Use existing Figma wireframes" → human provides Figma URL
       │   → get_design_context to read existing designs
       │   → Validate coverage against stories (are all screens represented?)
       │   → If gaps: generate only the MISSING screens in Figma
       │
       └── "Skip Figma, use SVG/HTML" → default behavior
```

### When Using Existing Figma Wireframes

If human says "I have existing wireframes":
1. Ask for the Figma file URL
2. Call `get_design_context` to read the current designs
3. Compare screens in Figma against stories in `stories.md`
4. Report coverage: "Figma has screens for stories S-1, S-2, S-4. Missing: S-3, S-5, S-6."
5. Ask: "Should I generate the missing screens in the same Figma file, or skip?"
6. Generate `screen-data-map.md` and `screen-structure.md` from the EXISTING Figma designs (machine-readable artifacts still needed for downstream skills)

### When Generating New Figma Wireframes

1. Generate the markdown artifacts first (screen-data-map, screen-structure, wireframe-guidance)
2. Use `generate_figma_design` to create wireframes in Figma based on those specs
3. If human has a design system/library: use `get_libraries` to discover available components, then `search_design_system` to find relevant ones
4. Present Figma link to human for review (artefact-verification gate)
5. If human requests changes: use `use_figma` to iterate
6. Once approved: the Figma file URL is recorded in `wireframe-guidance.md` for code-generation to reference

### Figma Artifacts (additional to standard markdown artifacts)

- `figma_url` field in `wireframe-guidance.md` — link to the approved Figma file
- Code-generation reads this via `get_design_context` when building UI components
- Visual-regression pack can use `get_screenshot` to compare deployed UI against Figma source

## Prerequisites

- `stories.md` and `personas.md` must be approved
- `requirements.md` must be available
- For brownfield: RE artifacts (`code-structure.md`, `technology-stack.md`) or existing source code should be available for UI pattern extraction
- For Figma integration: Figma MCP server available and authenticated

## Input

- `stories.md`, `personas.md`
- `requirements.md`
- For brownfield: `technology-stack.md`, `code-structure.md`, existing UI source files
- For Figma: existing Figma file URL (if provided by human)

## Question Guidance

Focus clarifying questions on:

- **Figma or local?** — If Figma MCP is available, ask: "Do you want wireframes in Figma (recommended for team collaboration and design-to-code), or local SVG/HTML files?" If Figma chosen, ask: "Create new wireframes from scratch, or do you have existing Figma wireframes I should use/extend?"
- **Output format** (if not Figma) — SVG wireframes or HTML prototypes? (SVG for static layout review, HTML for interactive flow review)
- **Design system / stylesheet** — is there an existing CSS framework, component library, or design token set? If so, wireframes should reference its vocabulary (e.g. "use Card component" not "rounded box with shadow").
- **Brand guidance** — colours, typography, logos, skin/theme. If not available, guide the human to add brand guidelines to the org-ai-kb (e.g. `org-ai-kb/design-system/brand-guidelines.md`). Wireframes can proceed with neutral styling but should note where brand decisions are deferred.
- **Language and locale** — primary language for UI labels and copy. Is the UI multilingual? RTL support needed?
- **Responsive requirements** — mobile-first, desktop-only, or adaptive? Key breakpoints?
- **Accessibility target** — WCAG level (AA, AAA)? Specific assistive tech considerations?
- **Navigation model** — tabs, sidebar, breadcrumbs, wizard flow, or hybrid? How do screens connect?
- **Interaction density** — data-heavy dashboard, simple form flow, content site, or mixed? This shapes layout patterns.
- **State representations** — should wireframes cover loading states, empty states, error states, or just happy path?
- **Existing UI patterns** (brownfield) — are there existing screens to match? Should new screens feel consistent with what's already there? Extract patterns from existing code if accessible.
- **Missing story coverage** — if a screen requires data or behaviour not covered by any story in `stories.md`, raise it as a clarification question: "Screen X needs [capability]. No story covers this. Should we go back to user-stories to add coverage, or is this out of scope?"

Do not ask about backend architecture, API design, or component boundaries — those belong to application-design. Wireframes define what the user sees and does; the backend serves it.

## Output

### Machine-readable artifacts (markdown)

#### screen-data-map.md

For each screen/view:
- **Screen name**
- **Purpose** — what the user accomplishes here
- **Data displayed** — fields/values shown to the user, with logical types
- **Data submitted** — fields/values the user inputs or selects
- **Actions** — what happens on each interaction (button click, form submit, navigation)
- **Source stories** — `S-<n>` IDs this screen serves
- **Source components** — which components/services would provide this data (inferred from stories, not dictated — application-design makes the final call)

#### screen-structure.md

System-wide screen architecture:
- **Screen inventory** — complete list of screens with hierarchy (parent/child relationships)
- **Navigation map** — how screens connect (links, tabs, back navigation, deep links)
- **Component tree per screen** — layout hierarchy (header → nav → main → sidebar → footer), with named UI regions and their purpose
- **Shared components** — UI elements that appear across multiple screens (nav bar, footer, notification area, modals)
- **Screen groups** — logical groupings (e.g. "onboarding flow", "settings pages", "dashboard views")

#### wireframe-guidance.md

Step-by-step instructions for code-generation to reproduce the wireframes:
- **Per screen:** element placement (top-to-bottom, left-to-right), sizing ratios, spacing relationships, alignment rules
- **Interaction behaviour:** what happens on hover, click, focus, submit — described as state transitions
- **Responsive adaptations:** how the layout changes at each breakpoint
- **Conditional rendering:** what shows/hides based on user role, data state, or feature flags
- **Animation/transition notes:** any motion design (page transitions, loading indicators, micro-interactions)

### Visual artifacts (for human review)

#### wireframes/ (directory)

One file per screen in the human's chosen format:
- `wireframes/<screen-name>.svg` — if SVG chosen
- `wireframes/<screen-name>.html` — if HTML chosen

Each wireframe shows:
- Layout structure with labelled regions
- Placeholder content (realistic but not final copy)
- Interactive elements clearly marked (buttons, links, inputs, dropdowns)
- Annotations for behaviour not visible in static layout

## Downstream Consumption

- **application-design** reads `screen-data-map.md` to understand what data the UI needs. This surfaces BFF/aggregation questions — if screens pull from multiple backend components, application-design asks the human whether to introduce a BFF or let the frontend call services directly.
- **code-generation** reads all three markdown files (`screen-data-map.md`, `screen-structure.md`, `wireframe-guidance.md`) as primary input for frontend layer generation. Visual wireframe files serve as layout reference.
- The human reviews visual wireframes for UX approval.

## Validation

Validation rules for this skill's output live in `validation-spec.md` at the skill root. See `aidlc-common/protocols/aidlc-validator-protocol.md` for how they are applied.
