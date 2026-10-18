# PixelPal

A pixel creature that grows with the things you do. Static site, no backend, no build step. Data lives in the phone's browser.

## Put it on Vercel (about 5 minutes)

1. Create a free GitHub repo (for example `pixelpal`) and upload everything in this folder to its root.
2. On vercel.com, sign in with GitHub, choose **Add New > Project**, import the repo.
3. Leave every setting as it is (Framework Preset: Other, no build command, no output directory). Click **Deploy**.
4. Open the `.vercel.app` address on your phone.
   - iPhone (Safari): Share, then **Add to Home Screen**.
   - Android (Chrome): menu, then **Install app**.

Always open it from the same address and the same browser or home-screen icon, because the data is stored per address.

## Back up your data

Stats > Settings > **Export backup** (on a phone it opens the share sheet, so you can save it to Files or Drive). **Import backup** restores it. The home screen reminds you after 30 days.

## How it works

- Each stat levels with no ceiling. Reaching level L takes L*L + 5*L points in total, so each level costs a bit more.
- Radar chart is scaled to your strongest stat. Switch to "Last 30 days" to see where effort went recently.
- Momentum compares the last 30 days with the 30 before.
- Stats you have not touched for 14 days fade on the creature and recover when you log again.
- Evolution stages (Egg, Blobling, Sprite, Guardian, Legend) depend on total levels. The two strongest stats pick the look.

## Changing things

- Stat names, colours, default points, guides: `js/data.js`
- Level curve: `PP.cumFor` in `js/data.js`
- Evolution thresholds: `stageFor` in `js/data.js`
- Creature drawing: `js/creature.js`
- After editing files, bump `VERSION` in `sw.js` so phones fetch the update.
