# Hero label choreography

Reference: owner-provided Pe3JAwk_mVIWyggd.mp4, 29.2s / 60fps.
Inspected entire 6fps contact sequence and first scene change at 20fps, including
a cropped label sequence under /tmp/dumplinglab-label-motion-hPkAMo/.
Approximate observed first change: labels gather inward and disappear before
the horizontal scene change; incoming food establishes first, text capsules
unfold sequentially, followed by ingredient photographs. Not an opacity-only
simultaneous reveal. Timing below is our adaptation, not claimed source code.

- Keep real controls, food identity, pointer/touch behavior and live catalogue.
- Five decorative parts: three taste labels followed by two food-image badges.
- Retract toward the food: 170ms each, stagger 28ms; complete before scene swap.
- Food transition remains 900ms. Labels begin at 400ms, stagger 85ms.
- Each reveal grows from 0.42 scale with a short, restrained 1.035 settle.
- Reduced motion / pause: stable labels, no retraction delay or animated light.
- Rapid selections cancel stale work; failure keeps the current scene usable.
- Background atmosphere uses non-representational blurred color light only;
  glass blur is local to badges/navigation, never applied to text or food.
- English Hero-only recording is the requested deliverable; no lower sections.

These are decorative callouts, not Home icons or a new navigation component.
The motion skill's unsupported-semantic planning path is used with the site's
existing Web Animations lifecycle, not the unrelated House generator.
