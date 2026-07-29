---
'@mission-platform/map': patch
---

fix map context provider type error in the map-libre Vue build

The map instance passed to the context provider is asserted as `Map`, so the Vue build no longer fails type-checking after `ref` unwrapping drops the maplibre `Map`'s private members.
