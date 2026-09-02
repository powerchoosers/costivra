# Costivra dark mark reference QA

## Comparison target

- Source visual truth: `C:\Users\lewis\Documents\costivra\public\brand\costivra-circuit-mark-cropped.png`
- Normalized source asset: `C:\Users\lewis\Documents\costivra\public\brand\costivra-circuit-mark-dark.png`
- Implementation screenshot: `C:\Users\lewis\Documents\costivra\design-qa-assets\costivra-dark-settings-implementation.png`
- Focused implementation region: `C:\Users\lewis\Documents\costivra\design-qa-assets\costivra-dark-mark-implementation.png`
- Combined comparison: `C:\Users\lewis\Documents\costivra\design-qa-assets\costivra-dark-mark-comparison.png`
- Viewport: 1260 × 838 CSS pixels at 1× screenshot density
- Source and dark counterpart pixels: 757 × 671 with identical transparent bounds
- Rendered mark: 34 × 34 CSS pixels inside the shared sidebar brand control
- State: Manage Settings, expanded sidebar, dark theme

## Full-view comparison evidence

The replacement changes only the shared dark-theme Costivra mark. The existing sidebar geometry, wordmark, Owner Operations label, navigation, typography, and Settings layout remain unchanged. Both Manage and App served `/brand/costivra-circuit-mark-dark.png?v=20260901-e` at 34 × 34 CSS pixels with no browser warning/error logs or framework overlay.

## Focused region comparison evidence

The combined light/dark comparison confirms identical geometry and layer order. Only the near-black C and center segments are recolored to white; the blue-green-blue rails, transparent bounds, and antialiased edges are unchanged.

## Required fidelity surfaces

- Fonts and typography: unchanged; the existing Costivra wordmark and Owner Operations label retain their current family, weight, tracking, and hierarchy.
- Spacing and layout rhythm: unchanged; the mark remains in the 34 × 34 slot and the shared brand-control alignment is preserved.
- Colors and visual tokens: the C becomes clean white for the low-light surface while the source blue and mint rail pixels remain unchanged.
- Image quality and asset fidelity: the approved light artwork is used as the direct source rather than a handcrafted or generated approximation; transparency, geometry, stacking, and antialiasing remain intact.
- Copy and content: unchanged.

## Findings

No actionable P0, P1, or P2 differences remain in the focused logo comparison.

## Comparison history

- Earlier P1: the handcrafted and generated dark alternatives changed the approved light mark's proportions or edge treatment.
- Fix: produced the dark counterpart by recoloring only the light asset's near-black C pixels to white, preserving all source geometry and colored rail pixels.
- Post-fix evidence: refreshed Manage and App checks serve the white-C asset at the real 34-pixel slot; the focused combined comparison shows the intended exact light/dark inversion.

## Follow-up polish

None required for the selected inverse. The deterministic counterpart is approximately 77 KB and preserves the approved source dimensions.

## Final result: passed
