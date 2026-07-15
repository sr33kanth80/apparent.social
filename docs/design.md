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
  sidebar: "#F7F2EE"
  investor-gold: "#B79A5B"
  error: "#B42318"
  success: "#039861"
  warning: "#9A6700"
typography:
  display:
    fontFamily: "DM Serif Display, Source Serif 4, Georgia, ui-serif, serif"
    fontSize: 4.125rem
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: -0.035em
  heading:
    fontFamily: "DM Serif Display, Source Serif 4, Georgia, ui-serif, serif"
    fontSize: 3.25rem
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: -0.035em
  heading-sm:
    fontFamily: "DM Serif Display, Source Serif 4, Georgia, ui-serif, serif"
    fontSize: 1.5rem
    fontWeight: 400
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
  metadata:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0.08em
rounded:
  button: 8px
  input: 10px
  card: 12px
  panel: 16px
  pill: 999px
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
    rounded: "{rounded.button}"
    padding: 10px 20px
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.accent}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: 10px 20px
  button-investor:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: 10px 20px
  card:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: 24px
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.input}"
    padding: 12px 14px
---

# Apparent Parchment Design System

## Overview

Apparent should feel like a well-typeset investment letter that also happens to be a working product. Warm paper, deep green ink, elegant serif display typography, and quiet structure create the premium tone. The system is visually bold without becoming ornamental. Public pages can use more scale and white space, while dashboards keep the same materials at a denser working rhythm.

## Colors

Cream Canvas is the default page surface and Pure Paper is reserved for working surfaces layered above it. Forest Ink carries brand authority across headlines, navigation, and high-priority controls. Vivid Emerald is a signal color for focus, links, and founder actions. Investor actions are the deliberate exception: they use Forest Ink fills with a one-pixel Investor Gold edge. Gold is never a fill, large surface, or decorative gradient.

## Typography

DM Serif Display carries large headlines, brand moments, section titles, and editorial page headings. Inter remains the body and interface face, tightened to `-0.03em` so it reads as considered product copy rather than browser-default UI. JetBrains Mono is reserved for compact metadata, statuses, technical details, and uppercase labels. Display line heights stay compact; body copy keeps generous leading for comfortable reading.

## Layout

The spacing system follows a four-pixel base and gives public sections generous vertical rhythm. Focused landing workflows should stay near 680px, active reading and chat work near 900px, and larger dashboard compositions can expand within the existing frame. Authenticated desktop layouts use a fixed 260px navigation rail while the main pane scrolls independently. Marketing surfaces may be asymmetric, but dashboard grids retain their established information architecture. Mobile layouts collapse the rail and stack content into one readable column without changing content order.

## Elevation & Depth

The system is intentionally flat. Depth comes from Cream Canvas against Pure Paper, not from drop shadows. Hairline borders structure cards, rows, dialogs, and form fields. Overlays may use a translucent scrim, but the dialog itself remains a flat paper sheet.

## Shapes

Buttons use an 8px crafted corner, inputs 10px, working cards 12px, and prominent editorial panels or dialogs 16px. Capsule shapes are reserved for tags, filters, statuses, compact metadata, and toggles. Avatars and identity marks may remain circular where the content itself requires it.

## Components

Primary buttons use Forest Ink with warm-white text, a quiet inset highlight, and a subtle one-pixel base edge. Investor primaries add the restrained gold border. Secondary actions use paper-white surfaces and hairline borders. Cards use generous internal padding and clear editorial hierarchy without drop shadows. Inputs are spacious and gain a subtle Emerald focus ring. Hover states change ink, border, or paper tone and may lift by one pixel; active controls settle back down for tactile feedback.

## Do's and Don'ts

Do use Forest Ink for display hierarchy, preserve generous whitespace, and keep repeated dashboard information separated by hairlines. Do use Emerald sparingly for interactive feedback and keep investor gold to thin borders. Do preserve current route names, field order, behavior, and accessibility semantics.

Do not reintroduce orange, lavender, blue, or generic black as competing brand accents. Do not add gradients, glows, glass cards, or heavy drop shadows. Do not use pill shapes for ordinary buttons or navigation, and do not flatten cards back into square boxes. Do not change product functionality to make a layout easier to style.
