# CITIZENESIA

A country whose citizens are born from its viewers. This is the playable world of the CITIZENESIA video series: the same island, plaza, president, People's House and 19,000,000-job office, now one you can walk around and build in, right in the browser.

## Play

```bash
npm install
npm run dev
```

Open the address Vite prints (it also listens on your network, so a phone on the same Wi-Fi can join). The game needs WebGL.

## How it works (v0.1)

1. **Get born.** Pick a citizen name and a LOOK (cap, headband, glasses, mustache, astronaut helmet). You start as a cell. Swim through the door of The People's House to be born as a baby.
2. **Find a job.** At the Job Office you are rejected first (5 years of experience needed, you are 0 days old), then hired as an eternal intern. Each shift pays 10 coins.
3. **Build.** Press BUILD and place blocks around the island. One block costs one coin; removing a block gives the coin back. Free mode makes every block free.
4. **Talk to the president.** He reads you the population and today's law.

| | Laptop | Phone |
| --- | --- | --- |
| Move | WASD / arrows | joystick |
| Look around | drag | drag |
| Zoom | mouse wheel | |
| Jump | Space | JUMP |
| Action (work, talk) | E / Enter | button |
| Build mode | B | BUILD |
| Place / remove | click / right-click, X switches tool | tap, PLACE / REMOVE |
| Pick a block | 1–0 | tap a colour |

Progress is saved in the browser (localStorage). The language follows the device (Indonesian or English); the EN/ID button switches it.

## World data

`public/data/world.json` connects the game to the series. The census script that reads the episode comments writes it:

```json
{
  "day": 1,
  "population": 1204,
  "decree": { "text": "free snacks for everyone", "author": "first_citizen", "likes": 4812 },
  "citizens": ["@yourname", "@your_bestie"]
}
```

- `population` is the follower count: it fills the PENDUDUK / POPULATION board and lights the house windows.
- `decree` is the top comment of the latest episode: it is shown on the decree board and quoted by the president.
- `citizens` swim over the plaza.

The file in the repo still holds the sample data from the EP 001 video.

## Code

- `src/kit.js`: shared materials and sign painting, the same as the video world.
- `src/actors.js`: the cell citizen, the president and the baby, with LOOK options.
- `src/world.js`: the island, plaza, boards, The People's House and the job office.
- `src/build.js`: blocks, aiming and saving.
- `src/i18n.js`: every visible word in Indonesian and English.
- `src/main.js`: player, camera, input, HUD and the game rules.

Add `?debug` to the address to get `window.__cz` for tests.

## Next

- A national flag and app icon designed by viewers in the comments, chosen by vote, with the designer credited.
- Buildings that unlock at follower milestones (Census Office, People's Stadium, Airport).
- Ready-made buildings to buy, jobs beyond the eternal internship, and a shared world for several players.
