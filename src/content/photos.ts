/**
 * Photo manifest. Stage 1 hotlinks free Unsplash photos (Unsplash License:
 * free for commercial use, no attribution required — we credit anyway).
 * Swap any entry for a licensed/local file later without touching sections:
 * set `src` to a local path (e.g. "/photos/concha.jpg") and `width`/`height`.
 *
 * Unsplash ids resolve via the loader in src/components/Photo.tsx:
 *   https://images.unsplash.com/<id>?w=<width>&q=<quality>&auto=format&fit=crop
 */

export type Photo = {
  /** Unsplash photo id ("photo-…") or a local path starting with "/". */
  src: string
  alt: string
  /** Intrinsic ratio used for layout; Unsplash serves any crop. */
  width: number
  height: number
  credit?: { name: string; url: string }
  /** CSS object-position for the crop focal point, e.g. "50% 40%". */
  position?: string
}

const u = (handle: string) => ({ name: `@${handle}`, url: `https://unsplash.com/@${handle}?utm_source=avelune&utm_medium=referral` })

export const photos = {
  // ——— San Sebastián ———
  conchaFromIgueldo: {
    src: "photo-1636218684783-fb80d7ef7a8e",
    alt: "The curve of La Concha bay seen from Monte Igueldo, San Sebastián, with Isla Santa Clara and Monte Urgull beyond",
    width: 3000, height: 1995, credit: u("davidvives"), position: "50% 55%",
  },
  conchaBayWide: {
    src: "photo-1764116700086-3c2603bb15bf",
    alt: "San Sebastián's bay and old town beneath Monte Urgull on a clear day",
    width: 3000, height: 1575, credit: u("alexcaza"),
  },
  conchaBlueHour: {
    src: "photo-1553455010-bdb488ac12e5",
    alt: "La Concha at blue hour, the promenade lights tracing the bay",
    width: 3000, height: 2251, credit: u("raulcachophoto"), position: "50% 60%",
  },
  conchaAerial: {
    src: "photo-1663845074983-9a1a04604470",
    alt: "Aerial view of La Concha beach and the bay, small boats at anchor",
    width: 3000, height: 1995, credit: u("hansjuergen"),
  },
  oldPort: {
    src: "photo-1682312807239-d7a5afc6f0a9",
    alt: "Fishing boats in San Sebastián's old port below the Parte Vieja",
    width: 3000, height: 1995, credit: u("andreahuls"),
  },
  parteVieja: {
    src: "photo-1663845183777-136ef563e46b",
    alt: "A narrow street in the Parte Vieja, San Sebastián's old town",
    width: 1778, height: 2000, credit: u("hansjuergen"),
  },
  promenadeDusk: {
    src: "photo-1675529734661-ef763f1a51be",
    alt: "People strolling the La Concha promenade at dusk",
    width: 3000, height: 1995, credit: u("mikhail_volkov"),
  },
  pintxosBar: {
    src: "photo-1781115650834-92048869f536",
    alt: "A pintxos bar counter in the Basque Country, plates stacked end to end",
    width: 3000, height: 1995, credit: u("paul_colorado"), position: "50% 60%",
  },
  pintxosClose: {
    src: "photo-1781115650865-6e29104a7edd",
    alt: "Basque pintxos displayed on a bar counter",
    width: 3000, height: 1995, credit: u("paul_colorado"),
  },
  gaztelugatxe: {
    src: "photo-1791236508550-5fe7e8312bb2",
    alt: "People walking the winding stone path to San Juan de Gaztelugatxe on the Basque coast",
    width: 3000, height: 1995, credit: u("merio09"),
  },
  surfersAerial: {
    src: "photo-1722573021678-78922ef03faa",
    alt: "Surfers paddling out over clear green water, seen from above",
    width: 3000, height: 2251, credit: u("stbuddyp"),
  },
  surfboards: {
    src: "photo-1722515261499-6f5c955a99d6",
    alt: "A row of surfboards lined up on the sand",
    width: 3000, height: 1680, credit: u("winniepix"),
  },
  surfersWalkingIn: {
    src: "photo-1730564725670-11ce15658ac8",
    alt: "A group carrying surfboards into the sea, seen from behind",
    width: 1126, height: 2000, credit: u("neextpics"),
  },

  // ——— Antigua, Guatemala ———
  arcoVolcan: {
    src: "photo-1762870714919-ec8362c26dfb",
    alt: "The yellow Arco de Santa Catalina in Antigua, Guatemala, with Volcán de Agua rising behind it",
    width: 1334, height: 2000, credit: u("denisaguilar_"), position: "50% 45%",
  },
  arcoCobblestone: {
    src: "photo-1763451346186-2b5b6b5455e7",
    alt: "Antigua's Arco de Santa Catalina over a cobblestone street",
    width: 1334, height: 2000, credit: u("mariomezahn"),
  },
  arcoBright: {
    src: "photo-1589783500222-4529ddfd87d1",
    alt: "The Arco de Santa Catalina in bright afternoon light",
    width: 1366, height: 2000, credit: u("angello_pro"),
  },
  antiguaStreetVolcano: {
    src: "photo-1709505815627-b4123347cc89",
    alt: "A cobbled Antigua street running straight toward Volcán de Agua",
    width: 3000, height: 1995, credit: u("husha"),
  },
  antiguaYellowWall: {
    src: "photo-1638069829192-4eb5bf7a9e09",
    alt: "A yellow colonial façade in Antigua with the volcano behind",
    width: 3000, height: 2099, credit: u("mana5280"),
  },
  antiguaRuins: {
    src: "photo-1638069790489-b5b7dbeef2b0",
    alt: "Ruined colonial arches in Antigua, the clock tower beyond",
    width: 3000, height: 1995, credit: u("mana5280"),
  },
  fuegoNight: {
    src: "photo-1580250642511-1660fe42ad58",
    alt: "Volcán de Fuego erupting at night, lava tracing the slope",
    width: 3000, height: 2400, credit: u("bonnarda"), position: "50% 40%",
  },
  fuegoSilhouette: {
    src: "photo-1663640171543-9eef40a4b320",
    alt: "A figure silhouetted against an erupting volcano at night",
    width: 1334, height: 2000, credit: u("srjefers"),
  },
  atitlanDock: {
    src: "photo-1669025467316-a1bff8696c36",
    alt: "A wooden dock reaching into Lake Atitlán, volcanoes across the water",
    width: 3000, height: 1995, credit: u("pawelwieladek"), position: "50% 60%",
  },
  atitlanDusk: {
    src: "photo-1528543010705-e7e75169b717",
    alt: "A dock on Lake Atitlán at dusk, the cone of San Pedro volcano across the lake",
    width: 3000, height: 2251, credit: u("mathijsbeks"),
  },
  atitlanGreen: {
    src: "photo-1593196061235-cf1b70e0309d",
    alt: "Green volcano slopes meeting the blue of Lake Atitlán",
    width: 1498, height: 2000, credit: u("jenrikeofficial"),
  },
  weaving: {
    src: "photo-1745510697761-6b0a091b78a6",
    alt: "A weaver working a backstrap loom outdoors in sunlight",
    width: 1124, height: 2000, credit: u("daniwithaniphotovideo"),
  },
  textile: {
    src: "photo-1592421497326-79e20eea7224",
    alt: "A hand-woven Guatemalan textile in blue, red and yellow",
    width: 3000, height: 1995, credit: u("md_barriosjose"),
  },

  // ——— Families, kept unidentifiable (from behind / silhouette) ———
  familyPier: {
    src: "photo-1783781849434-c87e79dba385",
    alt: "A family silhouetted on a pier at sunset",
    width: 3000, height: 1995, credit: u("puchu25pik"),
  },
  familiesBeach: {
    src: "photo-1641849460719-b36172b45b35",
    alt: "Several families walking together along a beach at golden hour",
    width: 3000, height: 1995, credit: u("tydowns"),
  },
  childThrown: {
    src: "photo-1528256507509-cc4facea43f6",
    alt: "A silhouette of a parent throwing a laughing child into the air at sunset",
    width: 3000, height: 3000, credit: u("laurenlulutaylor"),
  },
  childrenCobblestone: {
    src: "photo-1780695157875-4e4e40b06851",
    alt: "Two children walking ahead down a cobblestone street between old buildings",
    width: 3000, height: 1995, credit: u("justmejuliee"),
  },
  shoulders: {
    src: "photo-1766939366555-69aa2f829b56",
    alt: "A father carrying a child on his shoulders down a street, seen from behind",
    width: 1334, height: 2000, credit: u("yosuke_ota"),
  },
  tallGrass: {
    src: "photo-1665634468733-d2c6dd5f8668",
    alt: "A boy and girl walking away through tall golden grass",
    width: 1428, height: 2000, credit: u("deborah_camelo"),
  },
  boyBeach: {
    src: "photo-1593031653822-02f9345a9f40",
    alt: "A boy in a red shirt running toward the sea",
    width: 3000, height: 1995, credit: u("rocinante_11"),
  },
  girlBeach: {
    src: "photo-1582235457188-4cb9afccc848",
    alt: "A girl in a red dress running along the shoreline",
    width: 1600, height: 2000, credit: u("regialx"),
  },

  // ——— Evenings together ———
  longTableOcean: {
    src: "photo-1760533536461-714a23877e2d",
    alt: "A long wooden table set with candles beside the sea",
    width: 1126, height: 2000, credit: u("udatommo"),
  },
  stringLights: {
    src: "photo-1574482211311-45a2169db57c",
    alt: "A dinner under trees strung with lights",
    width: 3000, height: 1995, credit: u("mthwbchn"),
  },
  longTableGarden: {
    src: "photo-1738034950582-271276c5af7d",
    alt: "A group gathered at a long table in a garden",
    width: 3000, height: 1995, credit: u("pattyzc"),
  },
  longTableFood: {
    src: "photo-1672984174312-bd153327150c",
    alt: "A long table covered in shared plates and wine",
    width: 1334, height: 2000, credit: u("birkenwald"),
  },
} as const satisfies Record<string, Photo>

export type PhotoKey = keyof typeof photos

/** Every credited photographer, deduplicated, for the footer credits line. */
export function photoCredits(): { name: string; url: string }[] {
  const seen = new Map<string, { name: string; url: string }>()
  for (const p of Object.values(photos)) if (p.credit) seen.set(p.credit.name, p.credit)
  return [...seen.values()]
}
