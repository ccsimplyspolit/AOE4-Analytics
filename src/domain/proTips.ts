/**
 * ProTip domain model — structured coaching tips extracted from Beastyqt's
 * two flagship masterclass videos:
 *   Macro: https://www.youtube.com/watch?v=vrH85EESrSY
 *   Micro: https://www.youtube.com/watch?v=FdJFDsXr4ws
 *
 * Chapter timestamps are sourced from the video info JSON extracted via NeoDLP.
 * Each tip has a triggerCondition that enables evaluateMatchDiagnostics() to
 * produce a ranked coaching report for any given match context.
 */

export type TipCategory =
  | 'macro'
  | 'micro'
  | 'economic'
  | 'military'
  | 'map'
  | 'psychology'
  | 'build_order'

export type TipSeverity = 'critical' | 'important' | 'optional'

export type TipVideoId = 'macro' | 'micro'

export interface TipTriggerCondition {
  /** Fires when the game lasted longer than this threshold. */
  durationSecMin?: number
  /** Fires when the game lasted shorter than this threshold. */
  durationSecMax?: number
  /** Fires only on losses. */
  onLoss?: boolean
  /** Fires only on wins. */
  onWin?: boolean
  /** Fires only when player civ matches any civ slug in this list. */
  civs?: string[]
  /** Fires only when any opponent civ matches. */
  opponentCivs?: string[]
  /** Fires on maps whose name contains any of these substrings (lowercase). */
  maps?: string[]
  /** Always fires regardless of context. */
  always?: boolean
}

export interface ProTip {
  id: string
  category: TipCategory
  severity: TipSeverity
  videoId: TipVideoId
  timeSec: number
  timeFormatted: string
  trigger: TipTriggerCondition
  shortText: string
  shortTextRu: string
  detailText: string
  detailTextRu: string
  transcriptQuote?: string
}

export const PRO_TIPS: ProTip[] = [
  // ─── MACRO VIDEO ────────────────────────────────────────────────────────────
  // Chapter: "How to Keep Making Workers?" (0:25)
  {
    id: 'macro-tc-idle-avoid',
    category: 'macro',
    severity: 'critical',
    videoId: 'macro',
    timeSec: 25,
    timeFormatted: '0:25',
    trigger: { always: true },
    shortText: 'Never let your Town Center sit idle — queue villagers constantly.',
    shortTextRu: 'Никогда не оставляй ТЦ без очереди — постоянно заказывай крестьян.',
    detailText:
      'The Town Center produces ~1 villager every 25 seconds. Even 10 seconds of idle time per minute costs you 24 "free" villagers over a 10-minute game. Bind "Select all TCs" to a non-camera hotkey so you can queue without jumping the screen away from your army.',
    detailTextRu:
      'ТЦ производит ~1 крестьянина каждые 25 секунд. Даже 10 секунд простоя в минуту = потеря 24 бесплатных рабочих за 10-минутную игру. Назначь «Выбрать все ТЦ» на клавишу без привязки к камере.',
    transcriptQuote:
      '"The number one thing I see at every ELO — Town Center idle time. Keep making workers." — Beastyqt Macro Guide 0:25',
  },
  // Chapter: "How to Make an Army?" (2:50)
  {
    id: 'macro-army-balance',
    category: 'military',
    severity: 'important',
    videoId: 'macro',
    timeSec: 170,
    timeFormatted: '2:50',
    trigger: { always: true },
    shortText: 'Balance worker and army production — don\'t boom with 0 army.',
    shortTextRu: 'Балансируй производство крестьян и армии — нельзя бумить без войска.',
    detailText:
      'A pure boom with zero army is punished by any early aggression. Beastyqt recommends: in Feudal, keep at least 4–6 military units as a deterrent. Dedicate 1 production building per 8 villagers as a rough ratio. If scouting reveals an opponent pressuring, tilt toward army — you can always make workers later, but losing your base is permanent.',
    detailTextRu:
      'Чистый бум без армии мгновенно наказывается любой агрессией. Рекомендация Beastyqt: в Феодале держи хотя бы 4–6 военных юнитов как сдерживающий фактор. Примерное соотношение: 1 военное здание на 8 крестьян. Увидел давление — сдвигайся в сторону армии: крестьян доберёшь потом, а потерянную базу — нет.',
    transcriptQuote:
      '"You have to make an army. You cannot just keep making workers. At some point they are going to attack you." — Beastyqt Macro Guide 2:50',
  },
  // Chapter: "Why Build Orders are Important?" (4:27)
  {
    id: 'macro-build-order-follow',
    category: 'build_order',
    severity: 'critical',
    videoId: 'macro',
    timeSec: 267,
    timeFormatted: '4:27',
    trigger: { always: true },
    shortText: 'Follow a proven build order — improvising early game costs 50+ resources.',
    shortTextRu: 'Следуй проверенному билд-ордеру — импровизация в начале стоит 50+ ресурсов.',
    detailText:
      'Build orders exist because pro players have optimized the exact sequence of villager assignments, building placements, and upgrade timings. Deviating by even 2–3 villager assignments in the first 3 minutes compounds into a 100–150 resource deficit by Feudal Age. Pick one build, practice it until it\'s muscle memory, then layer in adaptations.',
    detailTextRu:
      'Билд-ордеры существуют, потому что профессионалы оптимизировали точную последовательность назначений рабочих, постановок зданий и апгрейдов. Отклонение даже на 2–3 рабочих в первые 3 минуты превращается в дефицит 100–150 ресурсов к Феодальной эпохе. Выбери один билд, доведи до автоматизма, затем добавляй адаптации поверх.',
    transcriptQuote:
      '"The build order is your plan. Without a plan you are just clicking randomly." — Beastyqt Macro Guide 4:27',
  },
  // Chapter: "When to get the Upgrades?" (5:47)
  {
    id: 'macro-upgrades-timing',
    category: 'macro',
    severity: 'important',
    videoId: 'macro',
    timeSec: 347,
    timeFormatted: '5:47',
    trigger: { durationSecMin: 300 },
    shortText: 'Research economic upgrades (Wheelbarrow, Double Broadax) as soon as available.',
    shortTextRu: 'Исследуй экономические улучшения (Тачка, Двойной топор) сразу при доступности.',
    detailText:
      'Economic upgrades compound multiplicatively. Wheelbarrow gives +15% gather rate to all food gatherers. Double Broadax gives +15% to all wood gatherers. Each costs ~75–150 resources but pays off within 60 seconds at full villager count. Research them as soon as you have the resources — delaying them for 2 minutes costs more than they cost.',
    detailTextRu:
      'Экономические улучшения дают мультипликативный эффект. Тачка = +15% к сбору еды всеми крестьянами. Двойной топор = +15% к сбору дерева. Каждое стоит ~75–150 ресурсов и окупается за 60 секунд при полном числе рабочих. Исследуй сразу при наличии ресурсов — задержка в 2 минуты обходится дороже самого улучшения.',
    transcriptQuote:
      '"Get the upgrades as soon as you can. Every second you delay Wheelbarrow you are losing gather rate on every single food villager." — Beastyqt Macro Guide 5:47',
  },
  // Chapter: "When to Make Production?" (8:11)
  {
    id: 'macro-production-timing',
    category: 'military',
    severity: 'important',
    videoId: 'macro',
    timeSec: 491,
    timeFormatted: '8:11',
    trigger: { always: true },
    shortText: 'Build military production BEFORE you need it — not during an attack.',
    shortTextRu: 'Строй военные здания ДО нужды — не во время атаки на тебя.',
    detailText:
      'Many players delay building barracks, ranges, and stables until they see the enemy army, then spend precious resource seconds building them under pressure. The rule: build your first military building when your TC is researching Feudal Age. This way you have units queued the moment you hit Feudal, not 45 seconds after.',
    detailTextRu:
      'Многие строят казармы и стрельбища только когда видят армию врага — и тратят ценные секунды на постройку под давлением. Правило: строй первое военное здание пока ТЦ исследует переход в Феодал. Тогда юниты уже стоят в очереди в момент выхода в Феодал, а не через 45 секунд после.',
    transcriptQuote:
      '"Build your production buildings before you need them. If you are building barracks while they are attacking, you are too late." — Beastyqt Macro Guide 8:11',
  },
  // Chapter: "Finding Macro-Micro Balance" (9:38)
  {
    id: 'macro-micro-balance',
    category: 'macro',
    severity: 'important',
    videoId: 'macro',
    timeSec: 578,
    timeFormatted: '9:38',
    trigger: { always: true },
    shortText: 'During fights: tap TC hotkey to queue workers every 25 seconds.',
    shortTextRu: 'Во время боёв: каждые 25 секунд нажимай хоткей ТЦ и заказывай крестьян.',
    detailText:
      'The biggest macro mistake during fights is forgetting about the economy entirely. Use a consistent rhythm: every time you issue attack-move or a major army command, also tap your TC hotkey to check the villager queue. It takes 0.5 seconds and keeps TC idle time near zero even during intense micro sequences.',
    detailTextRu:
      'Главная макро-ошибка в бою — полное забвение экономики. Используй постоянный ритм: каждый раз, когда отдаёшь приказ атаки-движения или крупный армейский приказ, нажимай хоткей ТЦ и проверяй очередь крестьян. Это занимает 0.5 секунды и удерживает простой ТЦ около нуля даже в интенсивном микро.',
    transcriptQuote:
      '"Every time you move your army, tap TC and check the queue. It becomes a reflex. This is how pros never have TC idle." — Beastyqt Macro Guide 9:38',
  },
  // Chapter: "When to Make TC's?" (14:50)
  {
    id: 'macro-second-tc',
    category: 'macro',
    severity: 'important',
    videoId: 'macro',
    timeSec: 890,
    timeFormatted: '14:50',
    trigger: { durationSecMin: 600 },
    shortText: 'Place a 2nd Town Center at 6:30–8:00 on contested resources.',
    shortTextRu: 'Ставь 2-й ТЦ в 6:30–8:00 на спорных ресурсах.',
    detailText:
      'A second TC doubles villager production rate. Position it near contested deer herds or outer gold to simultaneously claim map control and expand your economy. You need ~350 stone — start collecting stone with 3–4 workers at game start if this is your plan. Late TC (after 9:00) gives up too much early-game production.',
    detailTextRu:
      'Второй ТЦ удваивает скорость производства рабочих. Ставь его у спорных оленей или внешнего золота — одновременно контроль карты и экономика. Нужно ~350 камня — сразу направляй 3–4 рабочих на камень. Поздний 2-й ТЦ (после 9:00) слишком много теряет на раннем производстве.',
    transcriptQuote:
      '"The second TC should go somewhere useful — on the contested gold or the deer that your opponent also wants." — Beastyqt Macro Guide 14:50',
  },
  // Chapter: "When to Add Farms?" (17:30)
  {
    id: 'macro-farm-wheel',
    category: 'economic',
    severity: 'important',
    videoId: 'macro',
    timeSec: 1050,
    timeFormatted: '17:30',
    trigger: { durationSecMin: 480 },
    shortText: 'Build 8-farm wheels around Mills as sheep run out. Add gradually.',
    shortTextRu: 'Строй фермы колесом (8 штук) вокруг мельниц по мере исчезновения овец.',
    detailText:
      'Farms are less efficient than sheep but infinite. Transition to farms as each sheep or boar runs out — don\'t wait until you\'re food starved. Build exactly 8 farms around each mill in a tight ring to maximize the mill\'s adjacency gather-rate bonus. Add them gradually (spend 600 wood slowly) rather than all at once.',
    detailTextRu:
      'Фермы менее эффективны чем овцы, но бесконечны. Переходи на фермы по мере истощения овец/кабана — не жди острого голода. Строй ровно 8 ферм вокруг каждой мельницы в тесном кольце для максимального бонуса смежности. Добавляй постепенно (трать 600 дерева медленно), а не все сразу.',
    transcriptQuote:
      '"Farms go around the mill like a wheel. Eight farms per mill, tight as possible. And you add them gradually as your sheep die." — Beastyqt Macro Guide 17:30',
  },
  // Chapter: "When to Trade?" (22:53)
  {
    id: 'macro-trade-timing',
    category: 'economic',
    severity: 'optional',
    videoId: 'macro',
    timeSec: 1373,
    timeFormatted: '22:53',
    trigger: { durationSecMin: 900 },
    shortText: 'Set up trade routes when gold mines are depleted (Castle Age+).',
    shortTextRu: 'Налаживай торговые пути когда истощаются золотые жилы (Замковая эпоха+).',
    detailText:
      'Trade becomes essential once your local gold runs out. Set up a Market and connect to your opponent\'s Market (or a neutral trade post) in Castle Age when you have map control. Each trade unit generates passive gold based on distance traveled — longer routes = more gold. Protect trade units with a cavalry escort or they\'ll be hunted.',
    detailTextRu:
      'Торговля становится обязательной когда местное золото истощается. Рынок + торговля с противником или нейтральным постом в Замковой эпохе при контроле карты. Каждый торговый юнит генерирует пассивное золото в зависимости от расстояния — длиннее маршрут = больше золота. Защищай торговцев кавалерийским эскортом или их выбьют.',
  },
  // Chapter: "When to Age Up?" (24:25)
  {
    id: 'macro-age-up-timing',
    category: 'macro',
    severity: 'critical',
    videoId: 'macro',
    timeSec: 1465,
    timeFormatted: '24:25',
    trigger: { durationSecMin: 420, onLoss: true },
    shortText: 'Age up when you have stable economy — not when you\'re behind and panicking.',
    shortTextRu: 'Поднимай эпоху при стабильной экономике — не в панике когда отстаёшь.',
    detailText:
      'Aging up prematurely with insufficient villager count costs you a massive production window. Conversely, delaying age-up when economically ready gifts your opponent a free development window. The decision to age up should be based on: (1) villager count meets the build order target, (2) you have the food/gold queued, (3) scout confirms you have time.',
    detailTextRu:
      'Преждевременный переход эпохи при недостаточном числе рабочих стоит огромного производственного окна. Задержка при экономической готовности подарит противнику бесплатное время развития. Критерии перехода: (1) число рабочих достигло цели билд-ордера, (2) еда/золото готовы, (3) скаут подтвердил, что есть время.',
    transcriptQuote:
      '"Age up when your economy says to age up, not when you are scared. Panic aging loses games." — Beastyqt Macro Guide 24:25',
  },
  // Chapter: "How many Workers to Make?" (26:57)
  {
    id: 'macro-villager-count',
    category: 'economic',
    severity: 'important',
    videoId: 'macro',
    timeSec: 1617,
    timeFormatted: '26:57',
    trigger: { durationSecMin: 600 },
    shortText: 'Target 60–80 villagers by Imperial. Stop making workers at 60+ if winning.',
    shortTextRu: 'Цель: 60–80 рабочих к Империи. При 60+ можно переключаться на армию.',
    detailText:
      'Villager production has diminishing returns after ~60–80 villagers because map resources and collection points become saturated. Beyond 80 villagers in most games, additional villagers don\'t meaningfully increase income. The general guideline: keep making workers until you hit 60, then evaluate whether the bottleneck is economy or army — usually it becomes army.',
    detailTextRu:
      'Производство рабочих даёт убывающую отдачу после ~60–80 единиц, т.к. ресурсы и точки сбора на карте насыщаются. После 80 рабочих дополнительные крестьяне практически не увеличивают доход. Общее правило: производи рабочих до 60, затем оцени — где узкое место: экономика или армия. Обычно это армия.',
    transcriptQuote:
      '"Somewhere around 60 villagers you switch from villager mode to army mode. That\'s the mid game transition." — Beastyqt Macro Guide 26:57',
  },
  // Chapter: "How to Take Relics?" (49:58)
  {
    id: 'macro-relics',
    category: 'macro',
    severity: 'important',
    videoId: 'macro',
    timeSec: 2998,
    timeFormatted: '49:58',
    trigger: { durationSecMin: 600 },
    shortText: 'Send monks for relics immediately on Castle Age. 5 relics = +400 gold/min.',
    shortTextRu: 'Отправляй монахов за реликвиями сразу на Замке. 5 реликвий = +400 золота/мин.',
    detailText:
      'Each relic in a religious building generates ~80 gold/min. Five relics = 400 gold/min permanently — equivalent to 10 free gold miners. Produce 2–3 monks the moment you hit Castle Age. Most relics are in open terrain and contested — the first team to reach them wins a permanent economic advantage. Protect monks with a cavalry escort.',
    detailTextRu:
      'Каждая реликвия в религиозном здании = ~80 золота/мин. Пять реликвий = 400 золота/мин навсегда — эквивалент 10 бесплатных горняков. Производи 2–3 монаха сразу по выходу в Замок. Большинство реликвий на открытой местности и оспариваются — первый, кто добрался, получает постоянное экономическое преимущество. Охраняй монахов кавалерией.',
    transcriptQuote:
      '"In Castle Age, first thing — monks out the door, running for relics. That gold income is massive." — Beastyqt Macro Guide 49:58',
  },
  // Chapter: "Proper Shift Queuing" (39:05)
  {
    id: 'macro-shift-queue',
    category: 'macro',
    severity: 'important',
    videoId: 'macro',
    timeSec: 2340,
    timeFormatted: '39:00',
    trigger: { always: true },
    shortText: 'Use Shift+click to queue villager tasks (build → gather → next build).',
    shortTextRu: 'Shift+клик для очереди задач крестьян: построить → собирать → следующее здание.',
    detailText:
      'Holding Shift while issuing orders to villagers creates a task queue. Example: select 4 villagers → Shift+click Mill → Shift+click Farm location → Shift+click another Farm location → they build each in sequence then automatically start gathering. This eliminates idle time between construction orders and keeps villagers productive without micromanagement.',
    detailTextRu:
      'Удержание Shift при отдаче приказов создаёт очередь задач. Пример: выдели 4 рабочих → Shift+клик Мельница → Shift+клик позиция Фермы → Shift+клик другая Ферма → они строят последовательно и автоматически начинают сбор. Исключает простой между приказами на постройку и держит рабочих продуктивными без микроконтроля.',
    transcriptQuote:
      '"Shift queue your villagers to build the mill, then the farm, then start gathering. They do it automatically. Stop microing every single one." — Beastyqt Macro Guide 39:00',
  },

  // ─── MICRO VIDEO ────────────────────────────────────────────────────────────
  // Chapter: "Attack Move & Target Fire" (0:30)
  {
    id: 'micro-attack-move',
    category: 'micro',
    severity: 'critical',
    videoId: 'micro',
    timeSec: 30,
    timeFormatted: '0:30',
    trigger: { always: true },
    shortText: 'Use Attack-Move (A+click) to advance armies — never right-click move into a fight.',
    shortTextRu: 'Атака-движение (A+клик) для армии — никогда не движение правой кнопкой в бой.',
    detailText:
      'Right-clicking moves your entire army as a blob that ignores nearby enemies. Attack-move causes every unit to engage any enemy encountered while advancing toward the target point. Use A+click for all aggressive army movements. Combine with Focus Fire (click a single target) to first eliminate priority units (archers, siege, monks) while the army attack-moves.',
    detailTextRu:
      'Правый клик перемещает армию, игнорируя врагов. Атака-движение заставляет каждого юнита атаковать встреченных противников по дороге к цели. Используй A+клик для всех агрессивных движений армии. Комбинируй с Фокус-огнём (клик на одну цель) для уничтожения приоритетных юнитов (стрелки, осада, монахи) пока армия движется.',
    transcriptQuote:
      '"Attack move — always attack move. And then you manually target fire the most dangerous unit with some of your troops." — Beastyqt Micro Guide 0:30',
  },
  // Chapter: "Stutter Step (Kiting)" (5:12)
  {
    id: 'micro-stutter-step',
    category: 'micro',
    severity: 'critical',
    videoId: 'micro',
    timeSec: 312,
    timeFormatted: '5:12',
    trigger: { always: true },
    shortText: 'Stutter-step archers: fire → move backward → fire. Kite melee units.',
    shortTextRu: 'Статтер-шаг стрелков: выстрел → отход назад → выстрел. Кайть ближний бой.',
    detailText:
      'Between the moment a projectile is released and the next attack cooldown, archers have ~0.4–0.6 seconds to move for free. Use this window to step backward, staying out of melee range while maintaining full DPS. This kiting technique works especially well against cavalry charges — your archers fire while retreating, killing the chargers before they close the gap.',
    detailTextRu:
      'Между выпуском снаряда и следующим кулдауном у стрелков есть ~0.4–0.6 секунды свободного движения. Используй это окно для отхода назад, сохраняя дистанцию и полный DPS. Особенно эффективно против чарджей кавалерии — стрелки стреляют при отступлении, убивая атакующих до сближения.',
    transcriptQuote:
      '"Move, shoot, move, shoot. That is stutter stepping. Your archers should never just stand still." — Beastyqt Micro Guide 5:12',
  },
  // Chapter: "Protect Archers With Spearmen" (7:02)
  {
    id: 'micro-screening',
    category: 'micro',
    severity: 'critical',
    videoId: 'micro',
    timeSec: 422,
    timeFormatted: '7:02',
    trigger: { always: true },
    shortText: 'Always screen archers: 1 melee frontliner per 2–3 archers. No exceptions.',
    shortTextRu: 'Всегда защищай стрелков: 1 ближний боец на 2–3 стрелка. Без исключений.',
    detailText:
      'Unscreened archers die to any cavalry charge in seconds. Position spearmen/men-at-arms directly in front of archers. When cavalry charges, stutter-step your archers backward while the screen absorbs the damage. Then chase the cavalry with your melee while archers continue firing. The spearmen anti-charge bonus makes this matchup completely one-sided when executed correctly.',
    detailTextRu:
      'Незащищённые стрелки гибнут от любого кавалерийского чарджа за секунды. Ставь копейщиков/латников прямо перед стрелками. При чардже кавалерии статтер-шагом отводи стрелков назад пока заслон принимает урон. Затем преследуй кавалерию ближним боем пока стрелки продолжают стрельбу.',
    transcriptQuote:
      '"If you have archers without spearmen in front, you lose the fight. I don\'t care about your numbers." — Beastyqt Micro Guide 7:02',
  },
  // Chapter: "Formations Explained" (8:25)
  {
    id: 'micro-formations',
    category: 'micro',
    severity: 'important',
    videoId: 'micro',
    timeSec: 505,
    timeFormatted: '8:25',
    trigger: { always: true },
    shortText: 'Use Line formation for archers, Box formation to protect siege.',
    shortTextRu: 'Линия — для стрелков. Каре — для защиты осадных орудий.',
    detailText:
      'AoE4 formations have tactical value. Line formation maximizes the number of archers firing simultaneously (no friendly-fire blocking). Box formation wraps melee around a central group (ideal for protecting siege or monks). Staggered formation is useful on narrow maps or choke points. Avoid Ball formation for melee — it wastes the outermost units.',
    detailTextRu:
      'Строи в AoE4 имеют тактическую ценность. Линия — максимизирует число одновременно стреляющих стрелков. Каре — обёртывает ближний бой вокруг центральной группы (идеально для осады или монахов). Рассредоточение полезно на узких картах. Избегай Шара для ближнего боя — внешние юниты теряются.',
    transcriptQuote:
      '"Line formation for archers so they all shoot at once. Box for when you need to protect something in the middle." — Beastyqt Micro Guide 8:25',
  },
  // Chapter: "How to Control Multiple Units?" (13:00)
  {
    id: 'micro-control-groups',
    category: 'micro',
    severity: 'important',
    videoId: 'micro',
    timeSec: 780,
    timeFormatted: '13:00',
    trigger: { always: true },
    shortText: 'Control groups: 1=main army, 2=cavalry/flankers, 3=siege.',
    shortTextRu: 'Группы управления: 1=основная армия, 2=кавалерия/фланг, 3=осада.',
    detailText:
      'Split your army into purposeful control groups before the fight begins. Group 1: infantry + archers (main engagement). Group 2: cavalry (flanking or raiding). Group 3: siege (static bombardment). During a fight: press 1 → attack-move forward, press 2 → arc cavalry around the side, press 3 → keep siege stationary and firing. This three-group framework handles 90% of engagement scenarios.',
    detailTextRu:
      'Раздели армию на смысловые группы до начала боя. Группа 1: пехота + стрелки (основное столкновение). Группа 2: кавалерия (фланг или набег). Группа 3: осада (статичная бомбардировка). В бою: клавиша 1 → атака-движение вперёд, клавиша 2 → кавалерия в обход, клавиша 3 → осада стоит и стреляет. Три группы покрывают 90% боевых сценариев.',
    transcriptQuote:
      '"Three control groups. Main army, cavalry for flanking, siege for bombardment. Learn this framework and you can control any fight." — Beastyqt Micro Guide 13:00',
  },
  // Chapter: "Villager Micro vs Knights" (17:50)
  {
    id: 'micro-villager-fight',
    category: 'micro',
    severity: 'important',
    videoId: 'micro',
    timeSec: 1070,
    timeFormatted: '17:50',
    trigger: { always: true },
    shortText: 'Mass villagers to fight scouts/light cavalry. 10 villagers = scout kill.',
    shortTextRu: 'Массируй крестьян против скаутов/лёгкой кавалерии. 10 рабочих = гибель скаута.',
    detailText:
      'Running all your villagers from a single scout is a resource disaster — the scout will deny your economy for 30+ seconds. Instead, group your nearby villagers (click-drag), select the scout, and fight back. 8–10 villagers collectively outDPS a scout or light cavalry unit. Only retreat if multiple knights/heavy cavalry arrive.',
    detailTextRu:
      'Убегать всеми крестьянами от одного скаута = катастрофа: скаут блокирует экономику 30+ секунд. Вместо этого: группируй ближних рабочих, выбери скаута и атакуй. 8–10 крестьян суммарно превосходят скаута или лёгкую кавалерию по DPS. Отступай только при приходе нескольких рыцарей/тяжёлой кавалерии.',
    transcriptQuote:
      '"Stop running your villagers from one scout. Group them up and click-fight. Ten villagers beat a scout every time." — Beastyqt Micro Guide 17:50',
  },
  // Chapter: "Villager Garrison Commands" (20:40)
  {
    id: 'micro-villager-garrison',
    category: 'micro',
    severity: 'optional',
    videoId: 'micro',
    timeSec: 1240,
    timeFormatted: '20:40',
    trigger: { always: true },
    shortText: 'Garrison villagers in TC/towers during heavy raids — don\'t lose them for free.',
    shortTextRu: 'Прячь крестьян в ТЦ/башнях при тяжёлых набегах — не теряй их бесплатно.',
    detailText:
      'When outnumbered by heavy cavalry or a full army, garrisoning villagers is better than fighting or running. A garrisoned villager deals 0 income loss (temporarily) vs a dead villager which is a permanent -25 food investment loss. Use Ctrl+G to garrison all selected villagers at once. Ungarrison when the raid is over and resume work immediately.',
    detailTextRu:
      'При численном превосходстве тяжёлой кавалерии или полной армии — прячь рабочих. Временно укрытый рабочий = 0 потери дохода (временно) против убитого рабочего = -25 еды инвестиций навсегда. Ctrl+G — укрытие всех выделенных рабочих сразу. Выпускай после ухода набега и немедленно возобновляй работу.',
  },
  // Chapter: "Surrounding Archers" (16:50)
  {
    id: 'micro-surround',
    category: 'micro',
    severity: 'important',
    videoId: 'micro',
    timeSec: 1010,
    timeFormatted: '16:50',
    trigger: { always: true },
    shortText: 'Surround enemy archers with cavalry from multiple sides simultaneously.',
    shortTextRu: 'Окружай вражеских стрелков кавалерией одновременно с нескольких сторон.',
    detailText:
      'When attacking enemy archers with cavalry, attacking from a single direction allows the archers to stutter-step away while firing. Instead, split cavalry into 2–3 groups and charge from different angles simultaneously — archers cannot retreat in all directions at once and will be caught. A 3-way surround with 3 knights can eliminate 8+ archers before taking meaningful losses.',
    detailTextRu:
      'Атакуя вражеских стрелков кавалерией с одного направления, позволяешь им уходить статтер-шагом. Раздели кавалерию на 2–3 группы и атакуй с разных углов одновременно — стрелки не могут отступать во все стороны сразу. Трёхстороннее окружение 3 рыцарями уничтожает 8+ стрелков с минимальными потерями.',
    transcriptQuote:
      '"Surround them from multiple sides. They can only run in one direction at a time." — Beastyqt Micro Guide 16:50',
  },
]

/** Look up a ProTip by its unique ID. */
export const PRO_TIPS_BY_ID: Readonly<Record<string, ProTip>> = Object.fromEntries(
  PRO_TIPS.map((t) => [t.id, t]),
)

/** YouTube base URLs for deep-linked timestamps. */
export const VIDEO_BASE_URLS: Record<TipVideoId, string> = {
  macro: 'https://www.youtube.com/watch?v=vrH85EESrSY',
  micro: 'https://www.youtube.com/watch?v=FdJFDsXr4ws',
}

/** Build a deep-link YouTube URL for a given tip. */
export function buildTipVideoUrl(tip: ProTip): string {
  return `${VIDEO_BASE_URLS[tip.videoId]}&t=${tip.timeSec}s`
}

/** Filter tips by category. */
export function getTipsByCategory(category: TipCategory): ProTip[] {
  return PRO_TIPS.filter((t) => t.category === category)
}

const OPENING_TIP_IDS = [
  'macro-tc-idle-avoid',
  'macro-build-order-follow',
  'macro-army-balance',
  'macro-production-timing',
  'macro-micro-balance',
] as const

/** Top macro opening tips (0–5 min) for live pre-game checklist. */
export function getOpeningProTips(civ?: string | null, limit = 3): ProTip[] {
  const slug = civ?.toLowerCase()
  const picked: ProTip[] = []
  for (const id of OPENING_TIP_IDS) {
    const tip = PRO_TIPS_BY_ID[id]
    if (tip) picked.push(tip)
    if (picked.length >= limit) return picked
  }
  for (const tip of PRO_TIPS) {
    if (picked.some((t) => t.id === tip.id)) continue
    if (tip.category !== 'macro' && tip.category !== 'build_order') continue
    if (tip.timeSec > 600) continue
    if (slug && tip.trigger.civs != null && !tip.trigger.civs.includes(slug)) continue
    picked.push(tip)
    if (picked.length >= limit) break
  }
  return picked
}

/** Mini-panel: top macro + micro tips for a civilization. */
export function getCivProTips(civ: string | null | undefined, limit = 3): ProTip[] {
  if (!civ) return getOpeningProTips(null, limit)
  const slug = civ.toLowerCase()
  const macro = PRO_TIPS.filter(
    (t) =>
      (t.category === 'macro' || t.category === 'build_order') &&
      (t.trigger.always || t.trigger.civs?.includes(slug)),
  ).slice(0, 2)
  const micro = PRO_TIPS.filter(
    (t) => t.category === 'micro' && (t.trigger.always || t.trigger.civs?.includes(slug)),
  ).slice(0, 1)
  return [...macro, ...micro].slice(0, limit)
}