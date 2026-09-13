# Dumpling Lab — contextual motion v1

Preserve the accepted original logo, menu images, checkout actions and server-driven
progress. Plain JavaScript/CSS; no new dependency, no camera moves or fake progress.
The skill's generic brand-mark output is a geometry/packaging baseline only. Actual
motion is custom semantic choreography on the existing visual layers.

| Trigger | Verb and parts | Sequence / duration | Rest |
| --- | --- | --- | --- |
| Add-ons opened | Unpack: card, box illustration, product rows | Card reveals 260ms; illustration settles 540ms; rows arrive 60ms apart | All still |
| Pointer/focus on a product | Inspect: photo only | Image moves closer 240ms; withdraws 180ms | Original crop |
| Select add-on | Confirm: plus, check | Plus resolves to check; check draws 180ms | Checked, real checkbox owns state |
| Apply selection succeeds | Existing cart update | No artificial delay or extra confirmation | Dialog closes only when callback resolves |
| Received order shown | Print: existing slip and lines | Slip reveals from top 520ms | Original slip |
| Preparing order shown | Heat: existing steam and dumplings | Steam rises in staggered wisps; 2 cycles / 3.6s | Original illustration |
| Ready order shown | Lift: existing bag and handle | Lift 3px, settle around handle; 1 cycle / 900ms | Original -5deg bag |
| Collected order shown | Stamp: existing seal | Seal presses once 440ms | Original seal |
| Banner enters | Reveal: scene and original vector lockup | Scene wipes in 500ms, logo resolves 220ms later | Original static banner |

Only the current progress stage moves; later stages never become active locally.
Order polling must not replay an unchanged stage. Motion is finite, transforms
affect only artwork, not button dimensions, text, payment dock or page layout.
Reduced motion removes all entrance/hover/keyframe movement and keeps selection,
errors, prices and status readable. No indefinite decorative loops.

Verification: existing local VM/service tests, syntax/build, motion contracts.
Browser visual QA is not claimed. No video export requested.

## Physical interaction reference

https://github.com/jal-co/boarding-pass at b3a6895b70714667fe2fb61f61bb4fddeff93b2e:
the useful idea is physical material responding to a gesture, not a generic bounce.
Our independent, dependency-free pickup slip reveals a perforation while pulled,
then rests flat so the real QR remains scan-readable. QR and number are never gated
behind a required gesture. Click, Enter/Space and arrow keys also work. Opening the
slip never calls the collection API or changes the order's server status.

## Food depth

All existing menu and detail photo containers get a bounded 5°/7° tilt for fine
pointers, with a small shadow offset. Touch devices keep native page scrolling;
opening a dish gives a single 620ms plate-arrival animation. This is 2.5D image
presentation, not a reconstructed mesh or 360-degree food model.
