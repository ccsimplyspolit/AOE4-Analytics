export type LearningResourceKind = 'article' | 'video'

export interface LearningResource {
  id: string
  kind: LearningResourceKind
  title: string
  titleRu: string
  description: string
  descriptionRu: string
  source: string
  url: string
  publishedAt: string
  /** Date on which the link and its relevance to the current game were checked. */
  checkedAt: string
}

/**
 * Hand-picked reading and viewing for the guide library. Time-sensitive build
 * advice is intentionally linked instead of copied: a patch can invalidate a
 * build overnight, whereas the player can always open its original context.
 */
export const LEARNING_RESOURCES: readonly LearningResource[] = [
  {
    id: 'official-patch-14681',
    kind: 'article',
    title: 'Age of Empires IV – Patch 14681',
    titleRu: 'Age of Empires IV — патч 14681',
    description:
      'Official notes for the current balance and map changes. Read this before relying on any time-sensitive build or matchup advice.',
    descriptionRu:
      'Официальные изменения баланса и карт. Откройте их перед тем, как применять билд или совет по матчапу, завязанный на текущий патч.',
    source: 'Age of Empires',
    url: 'https://www.ageofempires.com/news/age-of-empires-iv-patch-14681/',
    publishedAt: '2026-07-24',
    checkedAt: '2026-08-09',
  },
  {
    id: 'season-13-build-catalogue',
    kind: 'article',
    title: 'AoE4Guides: Season 13 build-order catalogue',
    titleRu: 'AoE4Guides: каталог билдов Season 13',
    description:
      'Live, civilization-filtered build orders. Prefer entries with a recent update and adapt the opening to the map and the scout report.',
    descriptionRu:
      'Живой каталог билдов с фильтром по цивилизации. Выбирайте недавно обновлённые варианты и адаптируйте открытие к карте и данным разведки.',
    source: 'AoE4Guides',
    url: 'https://aoe4guides.com/',
    publishedAt: '2026-05-07',
    checkedAt: '2026-08-09',
  },
  {
    id: 'aoe4world-curated-content',
    kind: 'article',
    title: 'AoE4World Curated Content',
    titleRu: 'AoE4World: проверенная подборка материалов',
    description:
      'Community-reviewed guides, breakdowns, and videos. Use its tags to find a topic or civilization, then confirm patch context in the source.',
    descriptionRu:
      'Проверенные сообществом гайды, разборы и видео. Ищите по теме или цивилизации, затем сверяйте патч в первоисточнике.',
    source: 'AoE4World',
    url: 'https://aoe4world.com/explorer/content',
    publishedAt: '2026-08-02',
    checkedAt: '2026-08-09',
  },
  {
    id: 'first-ten-minutes-article',
    kind: 'article',
    title: 'Build order for beginners: win your first 10 minutes',
    titleRu: 'Билд для новичка: первые 10 минут',
    description:
      'A short 2026 walkthrough of the first minutes: villagers, Feudal plan, first production building, and a practice routine.',
    descriptionRu:
      'Короткий гайд 2026 года: крестьяне, план на Феодал, первое военное здание и тренировка перед рейтингом.',
    source: 'JEU.VIDEO',
    url: 'https://jeu.video/en/guide/age-empires-iv-build-order-en',
    publishedAt: '2026-06-02',
    checkedAt: '2026-08-09',
  },
  {
    id: 'ru-beginner-guide-2026',
    kind: 'video',
    title: 'Руководство для начинающих в Age of Empires 4!',
    titleRu: 'Руководство для начинающих в Age of Empires 4!',
    description:
      'Russian-language 2026 primer covering interface, resources, hotkeys, unit types, relics, trade, and beginner civilization choice.',
    descriptionRu:
      'Русскоязычный обзор 2026 года: интерфейс, ресурсы, хоткеи, типы войск, реликвии, торговля и выбор первой цивилизации.',
    source: 'ShtoprrrrTV · YouTube',
    url: 'https://www.youtube.com/watch?v=JXtAj-6iC4I',
    publishedAt: '2026-03-06',
    checkedAt: '2026-08-09',
  },
  {
    id: 'choose-civ-2026',
    kind: 'video',
    title: 'What Civilisation to play in 2026? — Age of Empires 4',
    titleRu: 'Какую цивилизацию выбрать в 2026?',
    description:
      'A current overview for narrowing a first civilization choice before committing to a build order and practice block.',
    descriptionRu:
      'Актуальный обзор, который помогает сузить выбор первой цивилизации до того, как учить билд и выделять время на практику.',
    source: 'BeastyqtSC2 · YouTube',
    url: 'https://www.youtube.com/watch?v=RSUYg3jQ3gg',
    publishedAt: '2026-02-01',
    checkedAt: '2026-08-09',
  },
  {
    id: 'english-masterclass-2026',
    kind: 'video',
    title: 'How to Play English Like a Pro — AOE4 Masterclass',
    titleRu: 'Как играть за Англичан: мастер-класс',
    description:
      'A recent civilization masterclass. Watch it after the fundamentals, then reproduce one opening against AI before ranked.',
    descriptionRu:
      'Свежий мастер-класс по цивилизации. После основ повторите одно открытие против ИИ, и только затем несите его в рейтинг.',
    source: 'BeastyqtSC2 · YouTube',
    url: 'https://www.youtube.com/watch?v=FSqzyFg17Ug',
    publishedAt: '2026-07-12',
    checkedAt: '2026-08-09',
  },
  {
    id: 'mongols-masterclass-2026',
    kind: 'video',
    title: 'How to Play Mongols Like a Pro — AOE4 Masterclass',
    titleRu: 'Как играть за Монголов: мастер-класс',
    description:
      'A current Mongol masterclass for players ready to move beyond a generic opening and learn civilization-specific decisions.',
    descriptionRu:
      'Свежий разбор Монголов для тех, кто уже освоил общую базу и хочет перейти к решениям, уникальным для цивилизации.',
    source: 'BeastyqtSC2 · YouTube',
    url: 'https://www.youtube.com/watch?v=dbqW6d5PsX4',
    publishedAt: '2026-07-19',
    checkedAt: '2026-08-09',
  },
  {
    id: 'hre-masterclass-2026',
    kind: 'video',
    title: 'How to Play HRE Like a Pro — AOE4 Masterclass',
    titleRu: 'Как играть за Священную Римскую империю: мастер-класс',
    description:
      'A very recent HRE masterclass. Treat exact unit and landmark recommendations as patch-sensitive and check the official notes first.',
    descriptionRu:
      'Очень свежий мастер-класс по СРИ. Точные советы по войскам и достопримечательностям зависят от патча — сначала сверяйтесь с официальными нотами.',
    source: 'BeastyqtSC2 · YouTube',
    url: 'https://www.youtube.com/watch?v=d_FEca71_Xo',
    publishedAt: '2026-08-06',
    checkedAt: '2026-08-09',
  },
]
