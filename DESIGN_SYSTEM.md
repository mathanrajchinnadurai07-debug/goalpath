# GoalPath Design System & Usability Audit (DESIGN_SYSTEM.md)

---

## 1. Design Tokens & Visual Hierarchy

GoalPath employs a calm, premium, motivating aesthetic engineered to minimize cognitive fatigue during deep work while elevating key achievements.

### 1.1 Color Tokens

| Token Name | Light Mode (CSS) | Dark Mode (CSS) | Semantic Usage |
|---|---|---|---|
| `--background` | `#f8fafc` (Slate 50) | `#090d16` (Deep Navy) | App canvas background |
| `--foreground` | `#0f172a` (Slate 900) | `#f8fafc` (Slate 50) | Primary typography |
| `--card` | `#ffffff` (Pure White) | `#111827` (Rich Gray) | Elevated surfaces and containers |
| `--primary` | `#4f46e5` (Indigo 600) | `#6366f1` (Indigo 500) | Brand North Star, active states, key CTAs |
| `--primary-hover`| `#4338ca` (Indigo 700) | `#818cf8` (Indigo 400) | Hover interactions |
| `--secondary` | `#f1f5f9` (Slate 100) | `#1e293b` (Slate 800) | Secondary buttons, subtle pills |
| `--muted-foreground` | `#64748b` (Slate 500) | `#94a3b8` (Slate 400) | Supporting descriptions, timestamps |
| `--destructive` | `#ef4444` (Red 500) | `#dc2626` (Red 600) | Account shredding, deletions |
| `--ring` | `#4f46e5` | `#818cf8` | High-contrast WCAG 2.2 focus ring |

### 1.2 Typography Scale
- **Display 1**: `text-4xl` / `text-5xl` (36px–48px), `font-extrabold`, tracking tight (Landing hero, milestone celebration)
- **Title 1**: `text-2xl` (24px), `font-black`, tracking tight (Page headers)
- **Title 2**: `text-lg` (18px), `font-bold` (Card headers, modal titles)
- **Body Large**: `text-sm` (14px), `font-medium` (Goal titles, task descriptions)
- **Body Regular**: `text-xs` (12px), `font-normal` (Metadata, helper instructions)
- **Caption / Pill**: `text-[10px]` / `text-[11px]`, `font-bold`, uppercase (Categories, priority tags)

### 1.3 Spacing & Border Radius
- `--radius`: `0.75rem` (12px) standard cards, `1.5rem` (24px) for major dashboard containers.
- Generous whitespace: Cards utilize `p-5` to `p-8` interior padding to avoid visual clutter.

---

## 2. Accessibility (WCAG 2.2 AA Compliance)

1. **Color Contrast**: All normal text maintains at least 4.5:1 contrast against its background; large text ($\ge 18\text{pt}$) exceeds 3:1.
2. **Keyboard Navigation & Focus Rings**: Every button, link, and interactive input implements `:focus-visible` with a distinct 2px ring offset by 2px (`outline: 2px solid var(--ring); outline-offset: 2px;`).
3. **Screen Reader Semantic Structure**: Semantic `<main>`, `<aside>`, `<nav>`, `<header>`, and explicit ARIA labels (`aria-label="Main Navigation"`, `aria-label="Mobile Bottom Navigation"`) are embedded.
4. **Reduced Motion**: Respects `@media (prefers-reduced-motion: reduce)` by clamping transition and animation durations to 0.01ms.

---

## 3. Nielsen's 10 Usability Heuristics Review

| # | Nielsen Heuristic | Implementation in GoalPath |
|---|---|---|
| **1** | **Visibility of system status** | Real-time progress bars, Pomodoro countdown timer, live badge notifications, and optimistic UI updates. |
| **2** | **Match between system and real world** | Mental models aligned with classic executive planning: SMART wizard, Eisenhower matrix quadrants, Pomodoro intervals. |
| **3** | **User control and freedom** | Modals have clear "Cancel" and "X" buttons. Task rollover is opt-in with a dedicated prompt. |
| **4** | **Consistency and standards** | Uniform card rounding, consistent category color tokens across all tabs, standard icon vocabulary (Lucide). |
| **5** | **Error prevention** | Dangerous destructive actions (account deletion) require typing explicit confirmation phrase `"DELETE MY ACCOUNT"` and password. |
| **6** | **Recognition rather than recall** | Category pills, pre-formatted thank-you templates with pre-filled contributions, and auto-populated retrospective stats. |
| **7** | **Flexibility and efficiency of use** | Natural language quick-add bar ("Study algorithms tomorrow 2pm"), keyboard shortcuts, and one-click demo user switcher. |
| **8** | **Aesthetic and minimalist design** | Clutter-free surfaces, focused typography, calm indigo/slate palette, soft shadows. |
| **9** | **Help users recognize, diagnose, and recover from errors** | Specific validation error callouts under form inputs instead of cryptic status codes. |
| **10**| **Help and documentation** | Guided SMART wizard with explanatory sub-prompts, template preview tooltips, and in-depth runbooks. |
