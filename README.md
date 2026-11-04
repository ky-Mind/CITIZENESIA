# CITIZENESIA

A country whose citizens are born from its viewers. This is the playable world of the CITIZENESIA video series: the same island, plaza, president, People's House and 19,000,000-job office, now one you can walk around and build in, right in the browser.

## Play

Online: https://citizenesia.hilmykia.workers.dev (admin: https://citizenesia.hilmykia.workers.dev/kymind)

On your computer:

```bash
npm install
npm run dev
```

Open the address Vite prints. `npm run deploy` publishes the game to Cloudflare with the `cf` CLI (`cloudflare.config.ts`) (it also listens on your network, so a phone on the same Wi-Fi can join). The game needs WebGL.

## How it works (v0.2)

1. **Start in the womb.** Pick your account name and a LOOK (drag to turn around your character and walk while you edit). You start as a cell inside The People's House (Gedung DPR), whose inside is the pink womb from the video. Cells live only in here.
2. **Explore the building.** Lobby (reception, aspiration box, metal detector, exit), the plenary hall (about 80 seats with microphones and vote buttons, the podium, the gavel, the president, three big screens, a light switch), the womb (the egg, sleeping fetuses) and the lounge (free snacks, water, TV, vending machine, nap bench, census board).
3. **Grow through comments.** Levels come from the census, not from playing: each episode with a comment is one more stage: CELL, FETUS, BABY, CHILD, TEEN, ADULT (a full citizen with a job title). The body grows with the age: longer legs, a taller trunk, a smaller head, and clothes instead of a diaper. The aspiration box shows your game code (CZ-XXXX): put it in one comment and the census links your account to your game. It also copies your comment and opens Instagram, TikTok or YouTube.
4. **Be born.** At BABY, enter the egg. You are born and may leave through the lobby door.
5. **The world outside never ends.** Land and sea are built in chunks around you and dropped behind you, with villages on the neighbouring land. Deep water drowns you and you wake up at The People's House. You can always walk back in.
6. **Walk into any house.** Every house has a door: the island houses, the village houses on the neighbouring land and the houses players buy. Inside, everything can be used: bed, fridge, stove, table, sofa and TV, light switch, and in bigger houses a computer (it opens the comment box) and a bookshelf. The roof is open to the camera and the wall facing it hides, like a doll's house.
7. **Buy a ready-made house.** In build mode pick a small (50), medium (120) or big (250) house and tap the ground; the door faces you. Remove mode sells your own house back.
8. **Work and build.** The job office pays 10 coins a shift; blocks cost a coin each and can go anywhere on land.

| | Laptop | Phone |
| --- | --- | --- |
| Move | WASD / arrows (Shift runs) | joystick |
| Look around 360° | drag | drag |
| Zoom | mouse wheel | pinch |
| Jump / swim up | Space | JUMP / UP |
| Use things | E, R, F, G (shown on the buttons) | the yellow buttons |
| Build mode (outside) | B | BUILD |
| Place / remove | click / right-click, X switches tool | tap, PLACE / REMOVE |
| Pick a block | 1–0 | tap a colour |

Progress is saved in the browser (localStorage). The language follows the device (Indonesian or English); the EN/ID button switches it. Phones get no shadows, fewer bubbles and a shorter view distance so they stay smooth.

## Admin (the presenter)

One device can be the admin's: you play as the president from the videos, at full level (as a person you pick any age from 0 to 80, 16 to start), with endless coins and blocks, any form (president, cell, fetus, baby), any size and body colour, no drowning, and teleports to every room and place. "View as a player" switches the powers off and lets you try each census level, or start over as a new player, to see how players grow.

Open the game once at `/kymind` (for example `http://localhost:5173/kymind`, or the same path on the online address) on any device you want to be the admin's. The ADMIN button then shows at the top, and the address switches back to the main page. Since the game runs on each player's own device, admin powers change only that device's game; shared data (chat, multiplayer) will need a real login on a server.

## World data

`public/data/world.json` connects the game to the series. `census.py export-world` writes it after each census:

```json
{
  "day": 1,
  "population": 1204,
  "decree": { "text": "free snacks for everyone", "author": "first_citizen", "likes": 4812 },
  "links": { "instagram": "https://www.instagram.com/…", "tiktok": null, "youtube": null },
  "inbox": null,
  "citizens": [{ "name": "first_citizen", "no": 1, "level": 4, "likes": 4812, "role": "Minister of Snacks", "look": null, "v": ["4597d600"] }]
}
```

- `population` is the follower count: the population board, the hall screen and the lit house windows.
- `decree` is the top comment of the latest episode: the decree board, the hall screen and the president's lines.
- `links` fill the platform buttons in the aspiration box (empty ones show "soon").
- `inbox` is a URL that takes comments straight from the app (POST `{name, code, text}`); empty until the game is online.
- `citizens` sets each player's level. `v` holds FNV-1a hashes of the game codes the citizen wrote in a comment; a player gets their census level only when their own code matches. Cells and fetuses appear inside The People's House, babies and citizens walk the plaza.

The file in the repo still holds sample data from the EP 001 video. For testing, `?debug&level=3` pretends the census says BABY.

## Code

- `src/kit.js`: shared materials and sign painting, the same as the video world.
- `src/actors.js`: the cell citizen, the president, the fetus and the baby, with LOOK options.
- `src/dpr.js`: inside The People's House: the lobby, the plenary hall, the womb and the lounge, and everything you can use there.
- `src/island.js`: the home island: plaza, boards, The People's House outside, the flag pole and the job office.
- `src/homes.js`: bought houses, every house door, and the inside of a house.
- `src/terrain.js`: the endless land and sea, built in chunks around the player.
- `src/sfx.js`: small sound effects made in the browser.
- `src/build.js`: blocks, aiming and saving.
- `src/i18n.js`: every visible word in Indonesian and English.
- `src/main.js`: player, camera, input, HUD and the game rules.

Add `?debug` to the address to get `window.__cz` for tests.

## Next

- A national flag and app icon designed by viewers in the comments, chosen by vote, with the designer credited.
- Buildings that unlock at follower milestones (Census Office, People's Stadium, Airport, which also opens travel to the neighbouring land).
- The in-app comment box online (a small server that stores comments for the census).
- Players chatting with each other (needs the same server), with admin checks done on the server.
- Ready-made buildings to buy, jobs beyond the eternal internship, and a shared world for several players.
