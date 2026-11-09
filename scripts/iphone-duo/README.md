# iPhone Duo assets

The homepage's Sessions slot shows Apple's iPhone Duo (Star White) from
[chuspeeism/iphone-duo](https://github.com/chuspeeism/iphone-duo), with the affectUI usage meter as live
DOM on its inner display. Only the model, its textures and the status glyph are used — no wallpaper,
clock or launcher imagery.

```sh
python -m pip install usd-core==26.8
python scripts/iphone-duo/prepare.py temp/iphone-duo   # download + flatten the Landscape (unfolded) pose
node scripts/iphone-duo/convert.mjs temp/iphone-duo    # -> public/sites/iphone-duo/{iphone-duo.glb,status-ring.png}
```

`convert.mjs` loads the USDC with three r186's `USDLoader` (the release the reference bundles), bakes
world transforms (scale 100, y − 5.8974: 1 unit = 1 cm, centred), swaps both screen materials for black
glass, re-encodes textures as WebP, then runs gltf-transform `dedup` + `meshopt`. Mesh names survive, so
the renderer finds the displays by name (`UXtsBZYlaUvHoEh` inner, `hhgAIoCGsHXeDPY` outer).

It also prints the measurements `src/components/stripe/Sessions/iphoneDuo/geometry.ts` uses: the inner
display is 15.7987 × 11.1035 units with a 0.897 corner radius; the status ring sits at 94.9 % / 7.1 % of
the lock-screen overlay (2048 px wide). The time-over-ring arrangement is measured from Apple's HIG
inner-screen launcher image.

The Apple model and imagery belong to Apple and are not covered by this repository's licence.
