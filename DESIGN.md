# Gush Design System

## Design Intent

Gush should feel like a premium reading product, not a noisy content marketplace and not a generic SaaS dashboard. The interface needs to balance two moods:

1. Quiet editorial restraint.
2. Rich story atmosphere.

The target feeling is:

- calm
- literary
- tactile
- premium without luxury clichés
- visually led, but never cluttered

This design language is informed by the DESIGN.md approach popularized in the `awesome-design-md` collection, especially the clarity and product discipline seen in the Apple, Notion, and Sanity examples.

## Core Principles

### 1. Content First
Stories, covers, creators, and reading progress come first. Decorative UI should support discovery, not compete with it.

### 2. Editorial, Not Promotional
Avoid loud gradients, KPI energy, “growth” visuals, fake urgency, or marketplace-style crowding. Each section should feel selected and composed.

### 3. Soft Luxury Through Material
Use warm paper neutrals, dark ink surfaces, hairline borders, restrained shadow, and generous spacing. Quality should come from proportion and finish, not visual noise.

### 4. One Strong Action
Every major view should have one primary CTA. Supporting actions should be visually lighter and clearly secondary.

### 5. Shared Product Family
Header, navigation, cards, buttons, empty states, and footer should feel like one system. No isolated “special page” styling unless it is part of a documented pattern.

## Color System

### Light Theme
- Background: warm paper, not flat white
- Surface: soft ivory
- Border: thin, ink-tinted hairline
- Accent: burnished bronze / editorial gold
- Text: deep espresso ink

### Dark Theme
- Background: midnight navy-black
- Surface: ink slate
- Accent: warm brass highlight
- Text: soft parchment

### Rules
- Use accent sparingly.
- Avoid pure black on light mode and pure white on dark mode.
- Status colors are allowed only for actual status.

## Typography

### Display
Use an elegant editorial serif for major headlines and key section titles.

### Body
Use a modern, readable sans serif with slightly compact spacing.

### Rules
- Headlines should feel composed and deliberate.
- Eyebrows should be uppercase, fine, and quiet.
- Supporting text should be short and breathable.
- Do not over-explain inside the UI.

## Layout Rhythm

- Prefer large, calm sections over many small panels.
- Use strong vertical spacing between homepage sections.
- Keep line lengths controlled.
- Cards should have internal hierarchy, not just stacked text.

## Components

### Buttons
- Primary: dark ink or warm accent with weight and polish
- Secondary: paper surface with border
- Ghost: low-pressure text action
- Hover states: refined, never flashy

### Cards
- Rounded, tactile, and lightly elevated
- Thin border before shadow
- Covers should lead, metadata should follow
- Avoid chunky badges and loud overlays

### Header
- Desktop header should feel like a floating editorial bar
- State change on scroll must be visible but subtle
- Search should feel integrated, not bolted on

### Mobile Bottom Nav
- Floating paper panel
- Active item highlighted with a soft inset pill
- Non-active items should recede cleanly

## Homepage Composition

The homepage should read like a brand magazine cover plus a browsing shelf:

1. Hero: one story-led focal point
2. Supporting rail: a small set of next picks
3. Discovery shelves: orderly, visual, spacious
4. Format and creator guidance: quiet utility, not marketing blocks

## Anti-Patterns

Do not use:

- dashboard-like metric walls
- oversized shadows
- hard blue SaaS styling
- too many badges
- CTA overload
- dense comparison-table energy on public storefront pages
- copy that explains obvious UI

## Implementation Notes

- Prefer token changes before one-off styling.
- Shared shell components must be updated together.
- If a component needs a special style, define the reason clearly.
- Visual upgrades must not break route behavior or reading flows.
