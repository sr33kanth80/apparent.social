# Apparent design system — how to build with it

Apparent is a two-sided marketplace for venture (founders ⇄ investors). The UI is a **shadcn/ui** primitive set plus branded product blocks, styled with **Tailwind v4** utilities over **CSS-variable design tokens**. Import every component from the package; render with the utility classes and tokens below.

## Setup & wrapping

- **No provider is required** for the primitives (Button, Card, Input, Badge, Avatar, Switch, DropdownMenu, etc.) — they're self-contained and read their colors from CSS variables defined globally in `styles.css`.
- The marketing surface opts into the branded "Monad" look by wrapping a region in **`className="monad"`** (cream parchment canvas, serif headlines, mono accents) or **`className="monad-page"`** for app pages. Tokens still resolve without it; the wrapper only adds the editorial typography/background treatment.
- Dark mode: add `className="dark"` on an ancestor — tokens have `.dark` overrides.

## Styling idiom — Tailwind utilities over semantic tokens

Style with Tailwind v4 utility classes bound to **semantic color tokens** (never hard-coded hex for UI chrome). The vocabulary that carries the design language:

| Concern | Utilities (real, in the compiled CSS) |
|---|---|
| Surfaces | `bg-background`, `bg-card`, `bg-popover`, `bg-muted`, `bg-secondary`, `bg-accent` |
| Text | `text-foreground`, `text-muted-foreground`, `text-primary`, `text-primary-foreground`, `text-card-foreground` |
| Primary action | `bg-primary text-primary-foreground` (ink-on-cream) |
| Destructive | `bg-destructive text-destructive-foreground` |
| Borders / inputs | `border`, `border-input`, `border-border`, `ring-ring` |
| Radius | `rounded-lg` / `rounded-md` / `rounded-full` (scaled off `--radius`) |
| Type | `font-sans` (Inter, body), `font-serif` (Source Serif 4 — editorial headlines), `font-mono` (JetBrains Mono) |

**Brand palette** (Monad), available as `--color-*` tokens and `bg-*`/`text-*` utilities: `parchment` `#f6f3f1`, `ink` `#000`, `graphite` `#4e4d4d`, `lavender` `#cfdaf5`, `mint` `#a7fccd`, `peach` `#ff9473`, and olive `#42520d` (the founder-proof accent). Use these for marketing surfaces; use the semantic tokens above for component chrome.

The core token set (`--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`) is defined on `:root` in the bundled stylesheet — read it before introducing new colors, and prefer an existing token to a new hex.

## Where the truth lives

- **`styles.css`** — the import closure every design receives: the compiled Tailwind layer, the `@theme` tokens, and `_ds_bundle.css` (component styles). Read it to confirm a utility or token exists.
- **`components/<group>/<Name>/<Name>.prompt.md`** and **`<Name>.d.ts`** — per-component usage and the prop contract. Read these before composing a component.

## Idiomatic example

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Badge } from 'apparent';

<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle className="text-lg">Acme AI</CardTitle>
      <Badge variant="secondary">Seed</Badge>
    </div>
    <CardDescription>Agentic data infrastructure · verified build history</CardDescription>
  </CardHeader>
  <CardContent className="flex gap-2">
    <Badge variant="outline">$22k MRR</Badge>
    <Badge variant="outline">1.2k commits</Badge>
  </CardContent>
  <CardFooter className="gap-2">
    <Button>View matches</Button>
    <Button variant="outline">Save thesis</Button>
  </CardFooter>
</Card>
```

`Button` variants: `default` `secondary` `outline` `ghost` `destructive` `link`; sizes `default` `sm` `lg` `icon`. `Badge` variants: `default` `secondary` `destructive` `outline`. Compose `DropdownMenu` from `DropdownMenuTrigger` + `DropdownMenuContent` + `DropdownMenuItem`/`DropdownMenuLabel`/`DropdownMenuSeparator`/`DropdownMenuCheckboxItem`. `Switch` is a **segmented toggle** — children are `Switch.Control` with `value`/`label`.
