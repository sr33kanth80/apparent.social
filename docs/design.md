---
version: alpha
name: Apparent Parchment
description: A premium editorial product system built from warm paper, forest ink, emerald signals, and role-aware investor gold.
colors:
  primary: "#003F2E"
  on-primary: "#FDF9F7"
  accent: "#039861"
  on-accent: "#FFFFFF"
  surface: "#FDF9F7"
  surface-raised: "#FFFFFF"
  on-surface: "#333333"
  on-surface-muted: "#6E7673"
  border: "#D6D6D6"
  border-strong: "#A6A6A6"
  investor-gold: "#B79A5B"
  error: "#B42318"
  success: "#039861"
  warning: "#9A6700"
typography:
  display:
    fontFamily: "Inter Tight, PP Mori, Avenir Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: 4.125rem
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: -0.045em
  heading:
    fontFamily: "Inter Tight, PP Mori, Avenir Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: 3.25rem
    fontWeight: 600
    lineHeight: 1
    letterSpacing: -0.04em
  heading-sm:
    fontFamily: "Inter Tight, PP Mori, Avenir Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.03em
  body-lg:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: -0.03em
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: -0.03em
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: -0.02em
rounded:
  none: 0px
  control: 800px
  full: 9999px
spacing:
  1: 4px
  2: 8px
  3: 12px
  5: 20px
  8: 32px
  10: 40px
  12: 48px
  16: 64px
  20: 80px
  24: 96px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: 10px 20px
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.accent}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: 10px 20px
  button-investor:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: 10px 20px
  card:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: 20px
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: 10px 12px
---

# Apparent Parchment Design System

## Overview

Apparent should feel like a well-typeset investment letter that also happens to be a working product. Warm paper, deep green ink, compact display typography, and quiet structure create the premium tone. The system is visually bold without becoming ornamental. Public pages can use more scale and white space, while dashboards keep the same materials at a denser working rhythm.

## Colors

Cream Canvas is the default page surface and Pure Paper is reserved for working surfaces layered above it. Forest Ink carries brand authority across headlines, navigation, and high-priority controls. Vivid Emerald is a signal color for focus, links, and founder actions. Investor actions are the deliberate exception: they use Forest Ink fills with a one-pixel Investor Gold edge. Gold is never a fill, large surface, or decorative gradient.

## Typography

The supplied reference uses PP Mori for display work. Because the licensed files are not in the repository, the implementation uses Inter Tight as the production-safe geometric substitute and keeps PP Mori in the fallback stack for a future licensed font drop. Inter remains the body and interface face, tightened to `-0.03em` so it reads as editorial copy rather than browser-default UI. Display line heights stay compact, while dashboard labels use conventional spacing for scan speed.

## Layout

The spacing system follows a four-pixel base and gives public sections generous vertical rhythm. Public reading copy should usually stay below 640px, while product workspaces can expand to the existing 1440px dashboard frame. Marketing surfaces may be asymmetric, but dashboard grids retain their established information architecture. Mobile layouts collapse to a single readable column without changing content order.

## Elevation & Depth

The system is intentionally flat. Depth comes from Cream Canvas against Pure Paper, not from drop shadows. Hairline borders structure cards, rows, dialogs, and form fields. Overlays may use a translucent scrim, but the dialog itself remains a flat paper sheet.

## Shapes

Cards, panels, inputs, and dialogs use square corners. Buttons, compact filters, badges, and segmented controls use the capsule radius. This mixed rule is semantic and must stay consistent: paper objects are square, interactive tokens are pills. Avatars and identity marks may remain circular where the content itself requires it.

## Components

Primary investor buttons use `button-investor` with a gold border applied in CSS. Founder and neutral public actions default to restrained ghost or emerald treatments. Cards and inputs use hairline borders with no shadows. Hover states change ink, border, or paper tone only, and active controls move down by one pixel for tactile feedback.

## Do's and Don'ts

Do use Forest Ink for display hierarchy, preserve generous whitespace, and keep repeated dashboard information separated by hairlines. Do use Emerald sparingly for interactive feedback and keep investor gold to thin borders. Do preserve current route names, field order, behavior, and accessibility semantics.

Do not reintroduce orange, lavender, blue, or generic black as competing brand accents. Do not add gradients, glows, glass cards, or soft drop shadows. Do not round paper panels or square off capsule actions. Do not change product functionality to make a layout easier to style.
