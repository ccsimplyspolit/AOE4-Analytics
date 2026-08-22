/**
 * Domain advisor for Ranked Map Pool strategy:
 * Classifies map archetypes, determines top-tier civilizations,
 * identifies counter matchups, and recommends build archetypes.
 */

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

const MAP_ADVICE_DATABASE: Record<string, Omit<MapStrategyAdvice, 'mapName'>> = {
  nagari: {
    archetype: 'water_hybrid',
    archetypeLabel: 'Гибридная с центральным озером (Hybrid / Water)',
    description: 'Центральный водоем дает огромный экономический буст от рыболовства. Ранний контроль воды и защита дока на 3-й минуте решают исход матча.',
    topCivilizations: [
      { civ: 'byzantines', civName: 'Византийцы', tier: 'S', winRate: 54.8, keyAdvantage: 'Дромоны и дешевое наемное ополчение' },
      { civ: 'zhu_xi_legacy', civName: 'Наследие Чжу Си', tier: 'S', winRate: 53.9, keyAdvantage: 'Сверхбыстрый темп и дешевые джонки с супервайзером' },
      { civ: 'japanese', civName: 'Японцы', tier: 'A+', winRate: 52.7, keyAdvantage: 'Улучшенные рыбацкие лодки и плавучие ворота' },
    ],
    counterMatchups: [
      { dominantCiv: 'Византийцы', vulnerableTo: 'Русь', tacticalTip: 'Конные лучники Руси и снос доков через быстрое осадное оружие' },
      { dominantCiv: 'Наследие Чжу Си', vulnerableTo: 'Монголы', tacticalTip: 'Ранний тауэр-раш на берег с поджогом дока' },
    ],
    recommendedBuildStyles: ['Dock Opening (1 TC Fish Boom)', 'Fast Feudal Warship Rush', 'Water-to-Castle Transition'],
  },
  'high view': {
    archetype: 'open_land',
    archetypeLabel: 'Открытая степная (Open Land / Mobility)',
    description: 'Большие открытые пространства со скрытными высокими зарослями. Требует мобильной кавалерии для постоянного патруля и ранних аванпостов на золоте.',
    topCivilizations: [
      { civ: 'mongols', civName: 'Монголы', tier: 'S', winRate: 54.2, keyAdvantage: 'Двойное производство конницы и мобильные пастбища' },
      { civ: 'french', civName: 'Французы', tier: 'A+', winRate: 53.1, keyAdvantage: 'Ранние рыцари с лечением и дешевые экономические здания' },
      { civ: 'rus', civName: 'Русь', tier: 'A+', winRate: 52.8, keyAdvantage: 'Золотой бонус за охоту и конные лучники' },
    ],
    counterMatchups: [
      { dominantCiv: 'Французы', vulnerableTo: 'Англичане', tacticalTip: 'Длинные луки с частоколом и копейщики на ключевых ресурсах' },
      { dominantCiv: 'Монголы', vulnerableTo: 'Священная Римская Империя', tacticalTip: 'Гарнизонные вышки и быстрый выход в ландскнехтов' },
    ],
    recommendedBuildStyles: ['Feudal Cavalry Harass', '2 TC Fast Wall', 'Knight & Archer Aggression'],
  },
  highwoods: {
    archetype: 'wooded_choke',
    archetypeLabel: 'Густые леса и узкие проходы (Dense Forest / Chokepoints)',
    description: 'Плотный массив деревьев создает узкие проходы. Идеальна для огораживания палисадами, быстрого выхода во 2-й ТС и сбора реликвий.',
    topCivilizations: [
      { civ: 'holy_roman_empire', civName: 'Священная Римская Империя', tier: 'S', winRate: 55.4, keyAdvantage: 'Узкие стены и молниеносный Fast Castle с Регницем' },
      { civ: 'order_of_the_dragon', civName: 'Орден Дракона', tier: 'A+', winRate: 53.6, keyAdvantage: 'Элитные ландскнехты в узких проходах' },
      { civ: 'english', civName: 'Англичане', tier: 'A', winRate: 51.9, keyAdvantage: 'Защитные сети замков и фермерский бум' },
    ],
    counterMatchups: [
      { dominantCiv: 'Священная Римская Империя', vulnerableTo: 'Делийский султанат', tacticalTip: 'Ранний захват святынь и осада стенобитными орудиями' },
    ],
    recommendedBuildStyles: ['Fast Castle Relic Rush', '2 TC Greedy Economy', 'Defensive Chokepoint Wall'],
  },
  'golden heights': {
    archetype: 'gold_centric',
    archetypeLabel: 'Холм с золотым центром (Gold Centric / King of Hill)',
    description: 'Ключевые золотые жилы и святыни сосредоточены на центральном плато. Борьба за центр начинается с первых минут 2-й эпохи.',
    topCivilizations: [
      { civ: 'malians', civName: 'Малийцы', tier: 'S', winRate: 54.6, keyAdvantage: 'Пассивный золотой доход из карьеров и донсо' },
      { civ: 'ottomans', civName: 'Османы', tier: 'A+', winRate: 53.4, keyAdvantage: 'Бесплатные осадные орудия и сипахи' },
      { civ: 'delhi_sultanate', civName: 'Делийский султанат', tier: 'A+', winRate: 53.1, keyAdvantage: 'Захват святынь учеными во 2-й эпохе' },
    ],
    counterMatchups: [
      { dominantCiv: 'Малийцы', vulnerableTo: 'Французы', tacticalTip: 'Уничтожение золотых ям тяжелыми лансерами' },
    ],
    recommendedBuildStyles: ['Central Outpost Rush', 'Fast Feudal All-in', 'Sanctity Gold Control'],
  },
  'dry arabia': {
    archetype: 'open_land',
    archetypeLabel: 'Сухая Аравия (Standard Open Land)',
    description: 'Эталонная соревновательная карта без естественных препятствий. Решает правильное скаутирование и адаптивный билд-ордер.',
    topCivilizations: [
      { civ: 'ayyubids', civName: 'Айюбиды', tier: 'S', winRate: 53.8, keyAdvantage: 'Крыло экономики и универсальные верблюды' },
      { civ: 'french', civName: 'Французы', tier: 'A+', winRate: 52.9, keyAdvantage: 'Раннее кавалерийское давление' },
      { civ: 'byzantines', civName: 'Византийцы', tier: 'A', winRate: 52.1, keyAdvantage: 'Гибкость наемников под композицию врага' },
    ],
    counterMatchups: [
      { dominantCiv: 'Французы', vulnerableTo: 'Айюбиды', tacticalTip: 'Верблюды снижают урон вражеской конницы на 20%' },
    ],
    recommendedBuildStyles: ['Adaptive Feudal Aggression', '2 TC Economy', 'Fast Castle Lancer Swing'],
  },
}

export function getMapStrategyAdvice(mapName: string): MapStrategyAdvice {
  const norm = (mapName || '').trim().toLowerCase()
  for (const [key, val] of Object.entries(MAP_ADVICE_DATABASE)) {
    if (norm.includes(key)) {
      return { mapName, ...val }
    }
  }

  // Fallback for custom or newly added maps
  return {
    mapName: mapName || 'Standard Map',
    archetype: 'open_land',
    archetypeLabel: 'Открытая соревновательная карта',
    description: 'Сбалансированная карта с открытыми ресурсными точками. Рекомендуется ранний аванпост на золоте и активный скаутинг.',
    topCivilizations: [
      { civ: 'ayyubids', civName: 'Айюбиды', tier: 'S', winRate: 53.0, keyAdvantage: 'Универсальный темп Дома Мудрости' },
      { civ: 'english', civName: 'Англичане', tier: 'A+', winRate: 52.2, keyAdvantage: 'Надежная оборона и ранние лучники' },
      { civ: 'byzantines', civName: 'Византийцы', tier: 'A', winRate: 51.8, keyAdvantage: 'Экономика оливкового масла' },
    ],
    counterMatchups: [
      { dominantCiv: 'Конные цивилизации', vulnerableTo: 'Копейщики и стрелки', tacticalTip: 'Защищайте периметр частоколом' },
    ],
    recommendedBuildStyles: ['Standard Feudal Age-Up', '2 TC Defense', 'Fast Castle Tech'],
  }
}
