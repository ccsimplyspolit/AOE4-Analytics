/**
 * Domain advisor for Ranked Map Pool strategy:
 * Classifies map archetypes, determines top-tier civilizations,
 * identifies counter matchups, and recommends build archetypes.
 *
 * Civilization fields are English slugs / canonical names for `gameName()`.
 * Advice copy is English so the renderer can translate via `tt()`.
 */

import { civDisplayName } from './civ'

export interface MapStrategyAdvice {
  mapName: string
  archetype: 'water_hybrid' | 'open_land' | 'wooded_choke' | 'gold_centric' | 'cliff_hybrid'
  archetypeLabel: string
  description: string
  topCivilizations: Array<{
    civ: string
    civName: string
    tier: 'S' | 'A+' | 'A'
    winRate: number
    keyAdvantage: string
  }>
  counterMatchups: Array<{
    dominantCiv: string
    vulnerableTo: string
    tacticalTip: string
  }>
  recommendedBuildStyles: string[]
}

function civ(slug: string) {
  return { civ: slug, civName: civDisplayName(slug) }
}

const MAP_ADVICE_DATABASE: Record<string, Omit<MapStrategyAdvice, 'mapName'>> = {
  nagari: {
    archetype: 'water_hybrid',
    archetypeLabel: 'Hybrid with a central lake (Hybrid / Water)',
    description:
      'The central water body gives a huge fishing eco boost. Early water control and a dock by minute 3 often decide the match.',
    topCivilizations: [
      {
        ...civ('byzantines'),
        tier: 'S',
        winRate: 54.8,
        keyAdvantage: 'Dromons and cheap mercenary militia',
      },
      {
        ...civ('zhu_xis_legacy'),
        tier: 'S',
        winRate: 53.9,
        keyAdvantage: 'Very fast tempo and cheap junks with supervision',
      },
      {
        ...civ('japanese'),
        tier: 'A+',
        winRate: 52.7,
        keyAdvantage: 'Improved fishing boats and floating gates',
      },
    ],
    counterMatchups: [
      {
        dominantCiv: 'byzantines',
        vulnerableTo: 'rus',
        tacticalTip: 'Rus horse archers and dock snipes with early siege',
      },
      {
        dominantCiv: 'zhu_xis_legacy',
        vulnerableTo: 'mongols',
        tacticalTip: 'Early tower rush on the shoreline and burn the dock',
      },
    ],
    recommendedBuildStyles: ['Dock Opening (1 TC Fish Boom)', 'Fast Feudal Warship Rush', 'Water-to-Castle Transition'],
  },
  'high view': {
    archetype: 'open_land',
    archetypeLabel: 'Open steppe (Open Land / Mobility)',
    description:
      'Large open spaces with hidden high grass. Needs mobile cavalry for constant patrol and early outposts on gold.',
    topCivilizations: [
      {
        ...civ('mongols'),
        tier: 'S',
        winRate: 54.2,
        keyAdvantage: 'Double cavalry production and mobile pastures',
      },
      {
        ...civ('french'),
        tier: 'A+',
        winRate: 53.1,
        keyAdvantage: 'Early knights with healing and cheap economic buildings',
      },
      {
        ...civ('rus'),
        tier: 'A+',
        winRate: 52.8,
        keyAdvantage: 'Hunting gold bonus and horse archers',
      },
    ],
    counterMatchups: [
      {
        dominantCiv: 'french',
        vulnerableTo: 'english',
        tacticalTip: 'Longbows with palisades and spearmen on key resources',
      },
      {
        dominantCiv: 'mongols',
        vulnerableTo: 'holy_roman_empire',
        tacticalTip: 'Garrisoned towers and a fast landsknecht timing',
      },
    ],
    recommendedBuildStyles: ['Feudal Cavalry Harass', '2 TC Fast Wall', 'Knight & Archer Aggression'],
  },
  highwoods: {
    archetype: 'wooded_choke',
    archetypeLabel: 'Dense forest and chokepoints (Dense Forest / Chokepoints)',
    description:
      'Dense trees create narrow approaches. Ideal for palisade walls, a fast second TC, and relic collection.',
    topCivilizations: [
      {
        ...civ('holy_roman_empire'),
        tier: 'S',
        winRate: 55.4,
        keyAdvantage: 'Tight walls and a lightning Fast Castle with Aachen',
      },
      {
        ...civ('order_of_the_dragon'),
        tier: 'A+',
        winRate: 53.6,
        keyAdvantage: 'Elite landsknechts in narrow chokes',
      },
      {
        ...civ('english'),
        tier: 'A',
        winRate: 51.9,
        keyAdvantage: 'Castle defense nets and a farm boom',
      },
    ],
    counterMatchups: [
      {
        dominantCiv: 'holy_roman_empire',
        vulnerableTo: 'delhi_sultanate',
        tacticalTip: 'Early sacred-site takes and ram pressure on the walls',
      },
    ],
    recommendedBuildStyles: ['Fast Castle Relic Rush', '2 TC Greedy Economy', 'Defensive Chokepoint Wall'],
  },
  'golden heights': {
    archetype: 'gold_centric',
    archetypeLabel: 'Hill with a gold center (Gold Centric / King of Hill)',
    description:
      'Key gold veins and sacred sites sit on the central plateau. The fight for the middle starts in early Feudal.',
    topCivilizations: [
      {
        ...civ('malians'),
        tier: 'S',
        winRate: 54.6,
        keyAdvantage: 'Passive gold from pits and donso',
      },
      {
        ...civ('ottomans'),
        tier: 'A+',
        winRate: 53.4,
        keyAdvantage: 'Free siege and sipahi',
      },
      {
        ...civ('delhi_sultanate'),
        tier: 'A+',
        winRate: 53.1,
        keyAdvantage: 'Scholars taking sacred sites in Feudal',
      },
    ],
    counterMatchups: [
      {
        dominantCiv: 'malians',
        vulnerableTo: 'french',
        tacticalTip: 'Delete the gold pits with heavy lancers',
      },
    ],
    recommendedBuildStyles: ['Central Outpost Rush', 'Fast Feudal All-in', 'Sanctity Gold Control'],
  },
  'dry arabia': {
    archetype: 'open_land',
    archetypeLabel: 'Dry Arabia (Standard Open Land)',
    description:
      'The benchmark competitive map with no natural obstacles. Scouting and an adaptive build order decide the game.',
    topCivilizations: [
      {
        ...civ('ayyubids'),
        tier: 'S',
        winRate: 53.8,
        keyAdvantage: 'Economy wing and versatile camels',
      },
      {
        ...civ('french'),
        tier: 'A+',
        winRate: 52.9,
        keyAdvantage: 'Early cavalry pressure',
      },
      {
        ...civ('byzantines'),
        tier: 'A',
        winRate: 52.1,
        keyAdvantage: 'Mercenary flexibility against the opponent’s composition',
      },
    ],
    counterMatchups: [
      {
        dominantCiv: 'french',
        vulnerableTo: 'ayyubids',
        tacticalTip: 'Camels reduce enemy cavalry damage by 20%',
      },
    ],
    recommendedBuildStyles: ['Adaptive Feudal Aggression', '2 TC Economy', 'Fast Castle Lancer Swing'],
  },
  'west lake': {
    archetype: 'open_land',
    archetypeLabel: 'Shoreline without docks (August ranked)',
    description:
      'Looks like a water map but ranked docks are disabled. Play it as land. Do not send villagers to build a dock.',
    topCivilizations: [
      {
        ...civ('macedonian_dynasty'),
        tier: 'S',
        winRate: 55.0,
        keyAdvantage: 'Does not need water; Warcamp tempo still applies',
      },
      {
        ...civ('english'),
        tier: 'A+',
        winRate: 47.1,
        keyAdvantage: 'Turtle and 2TC are rewarded when water is fake',
      },
      {
        ...civ('knights_templar'),
        tier: 'A+',
        winRate: 53.9,
        keyAdvantage: 'Sacred-site gold without a naval race',
      },
    ],
    counterMatchups: [
      {
        dominantCiv: 'english',
        vulnerableTo: 'golden_horde',
        tacticalTip: 'Raid farms and longbow lines; there is no dock to punish instead',
      },
    ],
    recommendedBuildStyles: ['Land-only opening', '2 TC turtle', 'Cavalry raid on the shoreline food'],
  },
  flankwoods: {
    archetype: 'wooded_choke',
    archetypeLabel: 'Flank woods (August 1v1 / team)',
    description:
      'Wood lines create flank routes. Scout both sides before committing to a 2TC. Cavalry civs punish greedy eco.',
    topCivilizations: [
      {
        ...civ('golden_horde'),
        tier: 'S',
        winRate: 53.9,
        keyAdvantage: 'Flank raids through the woods',
      },
      {
        ...civ('macedonian_dynasty'),
        tier: 'S',
        winRate: 55.0,
        keyAdvantage: 'Horsemen from Warcamp take the flanks',
      },
      {
        ...civ('order_of_the_dragon'),
        tier: 'A+',
        winRate: 52.5,
        keyAdvantage: 'Infantry in the trees',
      },
    ],
    counterMatchups: [
      {
        dominantCiv: 'golden_horde',
        vulnerableTo: 'english',
        tacticalTip: 'Spear/longbow on the woodline; do not fight in the open',
      },
    ],
    recommendedBuildStyles: ['Flank horsemen', 'Safe 2TC behind wood', 'Early outpost on the side gold'],
  },
  'hidden valley': {
    archetype: 'wooded_choke',
    archetypeLabel: 'Closed valley (August 1v1)',
    description:
      'Enclosed spawns. Relics and a delayed fight matter more than a 4-minute all-in. Macedonian still posts the map’s high WR on AoE4World.',
    topCivilizations: [
      {
        ...civ('macedonian_dynasty'),
        tier: 'S',
        winRate: 55.0,
        keyAdvantage: 'Silver still scales when the map is closed',
      },
      {
        ...civ('order_of_the_dragon'),
        tier: 'A+',
        winRate: 52.5,
        keyAdvantage: 'Choke infantry',
      },
      {
        ...civ('holy_roman_empire'),
        tier: 'A',
        winRate: 47.8,
        keyAdvantage: 'Prelate eco behind walls — only if you survive Feudal',
      },
    ],
    counterMatchups: [
      {
        dominantCiv: 'macedonian_dynasty',
        vulnerableTo: 'english',
        tacticalTip: 'Deny silver/gold with towers; do not take a field fight vs Riddari',
      },
    ],
    recommendedBuildStyles: ['Warcamp into Castle', 'Relic Fast Castle', 'Defensive 2TC'],
  },
  'ocean gateway': {
    archetype: 'water_hybrid',
    archetypeLabel: 'Hybrid water (August 1v1)',
    description:
      'Real docks. Fish is optional, not mandatory — scout the opponent dock before mirroring.',
    topCivilizations: [
      {
        ...civ('zhu_xis_legacy'),
        tier: 'S',
        winRate: 52.0,
        keyAdvantage: 'Fast junks and supervision tempo',
      },
      {
        ...civ('japanese'),
        tier: 'A+',
        winRate: 51.5,
        keyAdvantage: 'Fishing boats and coastal defense',
      },
      {
        ...civ('knights_templar'),
        winRate: 53.9,
        tier: 'A+',
        keyAdvantage: 'Skip water if they skip water; pilgrims on land',
      },
    ],
    counterMatchups: [
      {
        dominantCiv: 'zhu_xis_legacy',
        vulnerableTo: 'mongols',
        tacticalTip: 'Burn the dock with early cavalry if they overinvest in fish',
      },
    ],
    recommendedBuildStyles: ['Conditional dock', 'Land Hippodrome if they skip water', 'Hybrid Castle'],
  },
  'relic river': {
    archetype: 'gold_centric',
    archetypeLabel: 'Relics on the river (August 1v1)',
    description:
      'Contest relics and the river crossing. Monastery timing is part of the build, not a luxury.',
    topCivilizations: [
      {
        ...civ('holy_roman_empire'),
        tier: 'S',
        winRate: 47.8,
        keyAdvantage: 'Prelates plus relics — only if you reach Castle',
      },
      {
        ...civ('macedonian_dynasty'),
        tier: 'S',
        winRate: 55.0,
        keyAdvantage: 'Riddari escort monks after Golden Horn',
      },
      {
        ...civ('knights_templar'),
        tier: 'A+',
        winRate: 53.9,
        keyAdvantage: 'Sacred-site / pilgrim overlap with relics',
      },
    ],
    counterMatchups: [
      {
        dominantCiv: 'knights_templar',
        vulnerableTo: 'golden_horde',
        tacticalTip: 'Snipe pilgrims on the river before their Castle spike',
      },
    ],
    recommendedBuildStyles: ['Monastery with Castle', 'Pilgrim + relic', 'River cavalry deny'],
  },
  'ancient spires': {
    archetype: 'open_land',
    archetypeLabel: 'Ancient Spires (August 1v1)',
    description:
      'Open-ish with landmark-style sightlines. Standard 1v1 default: Macedonian / Templar / Horde.',
    topCivilizations: [
      {
        ...civ('macedonian_dynasty'),
        tier: 'S',
        winRate: 55.0,
        keyAdvantage: 'Default August 1v1 pick',
      },
      {
        ...civ('knights_templar'),
        tier: 'A+',
        winRate: 53.9,
        keyAdvantage: 'Commanderie power spike',
      },
      {
        ...civ('french'),
        tier: 'A',
        winRate: 50.8,
        keyAdvantage: 'Royal Knights if you refuse the new civs',
      },
    ],
    counterMatchups: [
      {
        dominantCiv: 'macedonian_dynasty',
        vulnerableTo: 'ayyubids',
        tacticalTip: 'Camels vs Riddari; do not let Silver snowball',
      },
    ],
    recommendedBuildStyles: ['Warcamp Hippodrome', 'Templar pilgrims', 'French knights'],
  },
  gorge: {
    archetype: 'cliff_hybrid',
    archetypeLabel: 'Elevation and ramps (August 1v1)',
    description:
      'High ground fights. Keep production below the ramp; take the ridge with outposts.',
    topCivilizations: [
      {
        ...civ('macedonian_dynasty'),
        tier: 'S',
        winRate: 55.0,
        keyAdvantage: 'Ranged Warcamp units on the ridge',
      },
      {
        ...civ('english'),
        tier: 'A',
        winRate: 47.1,
        keyAdvantage: 'Longbows on elevation',
      },
      {
        ...civ('japanese'),
        tier: 'A+',
        winRate: 51.5,
        keyAdvantage: 'Yumi and castle nets on ramps',
      },
    ],
    counterMatchups: [
      {
        dominantCiv: 'english',
        vulnerableTo: 'french',
        tacticalTip: 'Do not charge uphill into longbows; raid the low-ground farms',
      },
    ],
    recommendedBuildStyles: ['Ridge outpost', 'Longbow hold', 'Cavalry around the ramp'],
  },
  'boulder bay': {
    archetype: 'water_hybrid',
    archetypeLabel: 'Team water pocket (August team)',
    description:
      'Real water on the team pool. One player usually takes docks; the rest play land. Do not all four mirror fish.',
    topCivilizations: [
      {
        ...civ('french'),
        tier: 'S',
        winRate: 53.4,
        keyAdvantage: 'Knights hold land while a teammate plays water',
      },
      {
        ...civ('byzantines'),
        tier: 'S',
        winRate: 54.8,
        keyAdvantage: 'Dromons if your team commits to the bay',
      },
      {
        ...civ('macedonian_dynasty'),
        tier: 'A+',
        winRate: 53.3,
        keyAdvantage: 'Land pocket while the flank takes water',
      },
    ],
    counterMatchups: [
      {
        dominantCiv: 'byzantines',
        vulnerableTo: 'french',
        tacticalTip: 'If they skip dock, punish the shoreline with knights instead of mirroring fish',
      },
    ],
    recommendedBuildStyles: ['One-dock team plan', 'Land pocket knights', 'Conditional junks'],
  },
  cliffside: {
    archetype: 'cliff_hybrid',
    archetypeLabel: 'Team cliffs and ramps (August team)',
    description:
      'Elevation and ramps. Frontline holds the ridge; pocket raids the low ground. Do not all fight uphill.',
    topCivilizations: [
      {
        ...civ('english'),
        tier: 'A+',
        winRate: 47.1,
        keyAdvantage: 'Longbows on the cliff',
      },
      {
        ...civ('macedonian_dynasty'),
        tier: 'S',
        winRate: 53.3,
        keyAdvantage: 'Warcamp units on the ridge with an ally below',
      },
      {
        ...civ('order_of_the_dragon'),
        tier: 'A+',
        winRate: 52.5,
        keyAdvantage: 'Infantry holding the choke under the cliff',
      },
    ],
    counterMatchups: [
      {
        dominantCiv: 'english',
        vulnerableTo: 'french',
        tacticalTip: 'Do not charge the cliff; raid the low-ground farms and wait for the wrap',
      },
    ],
    recommendedBuildStyles: ['Ridge longbows', 'Pocket raid', 'Shared siege on the ramp'],
  },
  prairie: {
    archetype: 'open_land',
    archetypeLabel: 'Team RM open prairie (August)',
    description:
      'Team games run long. Trade and shared cavalry timings matter more than a 1v1 Hippodrome all-in.',
    topCivilizations: [
      {
        ...civ('french'),
        tier: 'S',
        winRate: 53.4,
        keyAdvantage: '2v2 WR leader — knights plus trade',
      },
      {
        ...civ('macedonian_dynasty'),
        tier: 'S',
        winRate: 53.3,
        keyAdvantage: 'Still elite as a hybrid pocket',
      },
      {
        ...civ('knights_templar'),
        tier: 'A+',
        winRate: 52.5,
        keyAdvantage: 'Team pilgrim income',
      },
    ],
    counterMatchups: [
      {
        dominantCiv: 'french',
        vulnerableTo: 'ayyubids',
        tacticalTip: 'Camels on the prairie; call the knight raid early',
      },
    ],
    recommendedBuildStyles: ['Team knights', 'Shared Castle', 'Trade after the first fight'],
  },
  'the pit': {
    archetype: 'wooded_choke',
    archetypeLabel: 'The Pit (August team)',
    description:
      'Central pit / choke. Infantry and siege win if cavalry cannot wrap.',
    topCivilizations: [
      {
        ...civ('order_of_the_dragon'),
        tier: 'S',
        winRate: 52.5,
        keyAdvantage: 'Elite infantry in the pit',
      },
      {
        ...civ('holy_roman_empire'),
        tier: 'A+',
        winRate: 47.8,
        keyAdvantage: 'MAA and palisades on the rim',
      },
      {
        ...civ('macedonian_dynasty'),
        tier: 'A+',
        winRate: 53.3,
        keyAdvantage: 'Do not take the pit 1v2 — wait for the ally',
      },
    ],
    counterMatchups: [
      {
        dominantCiv: 'order_of_the_dragon',
        vulnerableTo: 'french',
        tacticalTip: 'Do not fight inside the pit vs knights; wrap the rim',
      },
    ],
    recommendedBuildStyles: ['Infantry frontline', 'Rim palisades', 'Shared mangonel'],
  },
}

/** Exact ranked-pool lookup. Null when the map is not in the advice table. */
export function lookupRankedMapAdvice(mapName: string): MapStrategyAdvice | null {
  const norm = (mapName || '').trim().toLowerCase()
  for (const [key, val] of Object.entries(MAP_ADVICE_DATABASE)) {
    if (norm === key || norm.includes(key)) {
      return { mapName, ...val }
    }
  }
  return null
}

export function getMapStrategyAdvice(mapName: string): MapStrategyAdvice {
  const found = lookupRankedMapAdvice(mapName)
  if (found) return found

  return {
    mapName: mapName || 'Standard Map',
    archetype: 'open_land',
    archetypeLabel: 'Open competitive map',
    description:
      'A balanced map with open resource nodes. An early gold outpost and active scouting are recommended.',
    topCivilizations: [
      {
        ...civ('macedonian_dynasty'),
        tier: 'S',
        winRate: 55.0,
        keyAdvantage: 'Warcamp / Hippodrome into Riddari — current 1v1 WR leader',
      },
      {
        ...civ('knights_templar'),
        tier: 'A+',
        winRate: 53.9,
        keyAdvantage: 'Pilgrim gold and armored Commanderie timings',
      },
      {
        ...civ('golden_horde'),
        tier: 'A+',
        winRate: 53.9,
        keyAdvantage: 'Khan cavalry to punish 2TC and turtle',
      },
    ],
    counterMatchups: [
      {
        dominantCiv: 'Cavalry civilizations',
        vulnerableTo: 'Spearmen and archers',
        tacticalTip: 'Protect the perimeter with palisades',
      },
    ],
    recommendedBuildStyles: ['Standard Feudal Age-Up', '2 TC Defense', 'Fast Castle Tech'],
  }
}
