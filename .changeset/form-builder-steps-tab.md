---
'@mission-platform/components': minor
---

add a wizard-only Steps tab to BaseFormBuilder for configuring steps

- in `wizard` mode the centre tab strip now shows a **Steps** tab right next to **Editor** for adding / removing steps and editing each step's title, description, and conditional visibility
- the step configuration moved out of the end inspector into this dedicated tab; the inspector's no-selection panel is now just the form title / description ("Form settings")
- the Steps tab is only present in wizard mode, and the active tab falls back to **Editor** when wizard mode is turned off
