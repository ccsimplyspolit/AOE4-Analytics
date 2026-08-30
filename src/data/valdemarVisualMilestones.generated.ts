/**
 * Auto-generated visual milestones and frame-by-frame analysis from Valdemar1902 masterclasses.
 * Generated on: 2026-08-22T17:25:00Z
 */

export interface WorkerAllocationSnapshot {
  readonly food: number
  readonly wood: number
  readonly gold: number
  readonly stone: number
  readonly total: number
  readonly idle: number
}

export interface LandmarkTargetSnapshot {
  readonly name: string
  readonly builderCount: number
  readonly completionSec: number
}

export interface BaseLayoutDiagramSnapshot {
  readonly type: 'farm_ring' | 'forward_barracks' | 'tc_expansion' | 'tower_gold' | 'landmark_hub'
  readonly titleEn: string
  readonly titleRu: string
  readonly ascii: string
  readonly tipsEn: readonly string[]
  readonly tipsRu: readonly string[]
}

export interface VisualMilestoneEntry {
  readonly id: string
  readonly civ: string
  readonly videoId: string
  readonly videoTitle: string
  readonly videoUrl: string
  readonly category: 'build_order' | 'match_analysis' | 'civ_guide' | 'fundamentals'
  readonly second: number
  readonly formattedTime: string
  readonly age: 1 | 2 | 3 | 4
  readonly workers: WorkerAllocationSnapshot
  readonly landmark: LandmarkTargetSnapshot | null
  readonly directiveEn: string
  readonly directiveRu: string
  readonly layout: BaseLayoutDiagramSnapshot
  readonly mistakeEn: string
  readonly mistakeRu: string
}

export const VALDEMAR_VISUAL_MILESTONES: readonly VisualMilestoneEntry[] = [
  {
    "id": "byzantines-ydDt3gp56fQ-t210s",
    "civ": "byzantines",
    "videoId": "ydDt3gp56fQ",
    "videoTitle": "How To Fix The 5 Mistakes Keeping You Hardstuck",
    "videoUrl": "https://www.youtube.com/watch?v=ydDt3gp56fQ&t=210s",
    "category": "fundamentals",
    "second": 210,
    "formattedTime": "03:30",
    "age": 1,
    "workers": {
      "food": 7,
      "wood": 3,
      "gold": 3,
      "stone": 0,
      "total": 13,
      "idle": 0
    },
    "landmark": {
      "name": "Grand Winery",
      "builderCount": 3,
      "completionSec": 270
    },
    "directiveEn": "Begin Feudal Age-Up with 3-4 villagers on Landmark while maintaining continuous food gathering from sheep/berries.",
    "directiveRu": "Начните переход в Феодал с 3-4 крестьянами на достопримечательности, сохраняя непрерывную добычу овец/ягод.",
    "layout": {
      "type": "landmark_hub",
      "titleEn": "Cistern & Winery Optimal Layout",
      "titleRu": "Оптимальная схема цистерн и винодельни",
      "ascii": "      [ Cistern Lv1 ]\n     /       |       \\\n[TC] --- [Berries] --- [Grand Winery]\n     \\       |       /\n      [Olive Groves]",
      "tipsEn": [
        "Connect Cistern Level 1 directly touching Town Center and Berry Bush perimeter.",
        "Grand Winery aura must cover all future Olive Grove farm slots."
      ],
      "tipsRu": [
        "Соедините цистерну 1-го уровня так, чтобы она касалась ТЦ и периметра ягодников.",
        "Аура винодельни должна покрывать все будущие слоты оливковых рощ."
      ]
    },
    "mistakeEn": "Idling Town Center while waiting for landmark resources instead of rallying to straggler trees.",
    "mistakeRu": "Простой ТЦ в ожидании ресурсов на переход вместо добычи с ближайших деревьев."
  },
  {
    "id": "byzantines-ydDt3gp56fQ-t330s",
    "civ": "byzantines",
    "videoId": "ydDt3gp56fQ",
    "videoTitle": "How To Fix The 5 Mistakes Keeping You Hardstuck",
    "videoUrl": "https://www.youtube.com/watch?v=ydDt3gp56fQ&t=330s",
    "category": "fundamentals",
    "second": 330,
    "formattedTime": "05:30",
    "age": 2,
    "workers": {
      "food": 10,
      "wood": 6,
      "gold": 3,
      "stone": 0,
      "total": 19,
      "idle": 0
    },
    "landmark": null,
    "directiveEn": "Feudal reached: Immediately drop Barracks + Mercenary Camp and research Wheelbarrow.",
    "directiveRu": "Феодал достигнут: немедленно ставьте Казармы + Лагерь наемников и заказывайте Тачку.",
    "layout": {
      "type": "forward_barracks",
      "titleEn": "Production Screening Layout",
      "titleRu": "Схема прикрытия базы казармами",
      "ascii": "  [Frontier Line]\n[Barracks] [Merc Camp]\n       \\\n       [Tower] -> Covering Gold/Berries\n       /\n     [TC]",
      "tipsEn": [
        "Position production forward between vulnerable gold vein and enemy approach path.",
        "Place an Outpost within Town Center fire support range."
      ],
      "tipsRu": [
        "Размещайте военные здания спереди между золотой жилой и траекторией атаки противника.",
        "Ставьте аванпост в зоне прикрытия выстрелов главного ТЦ."
      ]
    },
    "mistakeEn": "Floating over 250 gold without queueing units or tech upgrades.",
    "mistakeRu": "Избыточное накопление более 250 золота без заказа юнитов или улучшений."
  },
  {
    "id": "byzantines-ydDt3gp56fQ-t480s",
    "civ": "byzantines",
    "videoId": "ydDt3gp56fQ",
    "videoTitle": "How To Fix The 5 Mistakes Keeping You Hardstuck",
    "videoUrl": "https://www.youtube.com/watch?v=ydDt3gp56fQ&t=480s",
    "category": "fundamentals",
    "second": 480,
    "formattedTime": "08:00",
    "age": 2,
    "workers": {
      "food": 14,
      "wood": 10,
      "gold": 4,
      "stone": 0,
      "total": 28,
      "idle": 0
    },
    "landmark": null,
    "directiveEn": "Begin 8-Farm transition ring around Mill. Keep active military presence controlling neutral deer.",
    "directiveRu": "Начните переход на кольцо из 8 ферм вокруг мельницы. Удерживайте армию на нейтральных оленях.",
    "layout": {
      "type": "farm_ring",
      "titleEn": "8-Farm Mill Wheel Alignment",
      "titleRu": "Колесо из 8 ферм вокруг мельницы",
      "ascii": " [Farm] [Farm] [Farm]\n [Farm] [Mill] [Farm]\n [Farm] [Farm] [Farm]",
      "tipsEn": [
        "Place 8 farms directly abutting the Mill to eliminate villager walking travel time.",
        "Add farms progressively (1 every 60-75 wood) without halting unit production."
      ],
      "tipsRu": [
        "Размещайте 8 ферм вплотную к мельнице для исключения лишней ходьбы крестьян.",
        "Добавляйте фермы плавно (по 1 на каждые 60-75 дерева), не останавливая найм войск."
      ]
    },
    "mistakeEn": "Dropping 8 farms simultaneously at 0 wood, halting archer and spearmen production.",
    "mistakeRu": "Одновременная трата всего запаса дерева на 8 ферм, останавливающая производство стрелков и копейщиков."
  },
  {
    "id": "byzantines-0pkvLN16f4o-t43s",
    "civ": "byzantines",
    "videoId": "0pkvLN16f4o",
    "videoTitle": "Easily Achieve Conqueror 3 With These Byz Strats | AoE4 Valdy",
    "videoUrl": "https://www.youtube.com/watch?v=0pkvLN16f4o&t=43s",
    "category": "build_order",
    "second": 43,
    "formattedTime": "00:43",
    "age": 1,
    "workers": { "food": 1, "wood": 0, "gold": 1, "stone": 3, "total": 6, "idle": 0 },
    "landmark": null,
    "directiveEn": "3-stone Winery opener vs China: 3 stone, 1 gold, house+cistern then sheep. Skip this if spears can show.",
    "directiveRu": "3-stone Winery vs China: 3 камня, 1 золото, дом+цистерна, затем овцы. Не так, если возможны копья.",
    "layout": {
      "type": "landmark_hub",
      "titleEn": "Safe back stone / gold, Winery on berries",
      "titleRu": "Камень и золото сзади, винодельня на ягодах",
      "ascii": "[Stone] [Gold] (behind TC)\n   \\      /\n    [TC] -- [Cistern] -- [House]\n      |\n [Sheep]     [Berries] -> Winery later",
      "tipsEn": [
        "Flankwoods with rear stone/gold is why 3-stone is comfortable here.",
        "Winery drops on home berries after Feudal, not in Dark Age."
      ],
      "tipsRu": [
        "На Flankwoods камень и золото сзади — поэтому 3-stone комфортен.",
        "Винодельню ставят на свои ягоды после феодала, не в тёмной."
      ]
    },
    "mistakeEn": "Opening 3-stone into a spear civ and dying before Feudal production.",
    "mistakeRu": "3-stone в копейный цив и смерть до феодального продакшена."
  },
  {
    "id": "byzantines-0pkvLN16f4o-t128s",
    "civ": "byzantines",
    "videoId": "0pkvLN16f4o",
    "videoTitle": "Easily Achieve Conqueror 3 With These Byz Strats | AoE4 Valdy",
    "videoUrl": "https://www.youtube.com/watch?v=0pkvLN16f4o&t=128s",
    "category": "build_order",
    "second": 128,
    "formattedTime": "02:08",
    "age": 1,
    "workers": { "food": 9, "wood": 0, "gold": 1, "stone": 3, "total": 14, "idle": 0 },
    "landmark": { "name": "Grand Winery", "builderCount": 4, "completionSec": 278 },
    "directiveEn": "Age up with 4 vs China (3 default, 2 if spears vs French/JD). One gold villager covers the whole Dark Age.",
    "directiveRu": "Ап с 4 vs China (обычно 3, 2 если копья vs French/JD). Один золото всю тёмную эпоху.",
    "layout": {
      "type": "landmark_hub",
      "titleEn": "Winery click + four cisterns of stone",
      "titleRu": "Клик винодельни и камень на 4 цистерны",
      "ascii": "[Grand Winery] (4 vills)\n      |\n[Cistern]--[Aqueduct]--[Cistern]\n      |\n     [TC]  (1 gold stays)",
      "tipsEn": [
        "Pull stone at 100 and place the fourth cistern, then stragglers to 8 wood.",
        "Do not keep gathering stone after four cisterns — it just floats."
      ],
      "tipsRu": [
        "На 100 камня — 4-я цистерна, затем страглеры до 8 дерева.",
        "Не копать камень после четырёх цистерн — он флоутит."
      ]
    },
    "mistakeEn": "Aging with too few vills vs China, or floating stone by mining a fifth cistern you will not place in Dark Age.",
    "mistakeRu": "Ап слишком малым числом vs China или флот камня на пятую цистерну, которую не ставят в тёмной."
  },
  {
    "id": "byzantines-0pkvLN16f4o-t278s",
    "civ": "byzantines",
    "videoId": "0pkvLN16f4o",
    "videoTitle": "Easily Achieve Conqueror 3 With These Byz Strats | AoE4 Valdy",
    "videoUrl": "https://www.youtube.com/watch?v=0pkvLN16f4o&t=278s",
    "category": "build_order",
    "second": 278,
    "formattedTime": "04:38",
    "age": 2,
    "workers": { "food": 9, "wood": 8, "gold": 0, "stone": 0, "total": 17, "idle": 0 },
    "landmark": { "name": "Grand Winery", "builderCount": 0, "completionSec": 278 },
    "directiveEn": "Feudal 4:38. Food onto Winery berries. Merc house: javelins vs knights, longbows default. 4 cheaper longbows.",
    "directiveRu": "Feudal 4:38. Еда на ягоды винодельни. Контракт: джавелины vs рыцари, иначе longbow. Пачка 4.",
    "layout": {
      "type": "forward_barracks",
      "titleEn": "Barracks + merc house, cistern research/prod split",
      "titleRu": "Казармы + наёмники, цистерны research/production",
      "ascii": "[Winery berries]\n[Barracks] [Merc House]\n     \\\n    [Cistern research]  [Cistern prod] [Cistern prod]\n     /\n   [TC]  8 wood stragglers",
      "tipsEn": [
        "Middle cistern on research, others on production speed before military queues.",
        "Do not dive a Chinese barbican — harass wood like English."
      ],
      "tipsRu": [
        "Центральная цистерна research, остальные production до очередей.",
        "Не нырять в barbican — харрастить дерево как English."
      ]
    },
    "mistakeEn": "Queueing a fifth longbow instead of the cheaper 4, or crashing the barbican.",
    "mistakeRu": "Пятый longbow вместо дешёвой пачки 4 или удар в barbican."
  },
  {
    "id": "byzantines-0pkvLN16f4o-t619s",
    "civ": "byzantines",
    "videoId": "0pkvLN16f4o",
    "videoTitle": "Easily Achieve Conqueror 3 With These Byz Strats | AoE4 Valdy",
    "videoUrl": "https://www.youtube.com/watch?v=0pkvLN16f4o&t=619s",
    "category": "build_order",
    "second": 619,
    "formattedTime": "10:19",
    "age": 1,
    "workers": { "food": 6, "wood": 0, "gold": 0, "stone": 0, "total": 6, "idle": 0 },
    "landmark": null,
    "directiveEn": "Mill opener when spears/Sipahi-spear can happen. Outer berries, mill+house+cistern. Not vs French/Horde/JD/Malians/Rus/Sengoku/Delhi.",
    "directiveRu": "Mill opener если возможны копья/Sipahi-spear. Внешние ягоды, mill+дом+цистерна. Не vs French/Horde/Jeanne/Malians/Rus/Sengoku/Delhi.",
    "layout": {
      "type": "farm_ring",
      "titleEn": "Outer mill, inner berries as spear shelter",
      "titleRu": "Внешняя мельница, внутренние ягоды как укрытие",
      "ascii": "  [Outer berries + Mill]\n           |\n [Cistern] [House] [TC]\n           |\n    [Inner berries] <- fall back if spears",
      "tipsEn": [
        "2 gold default; 3 gold immediately if the spear rush is already on the way.",
        "Outer gather first so a rush can hide on inner bushes and still hit longbow oil."
      ],
      "tipsRu": [
        "2 золота по умолчанию; 3 сразу, если копья уже идут.",
        "Сначала внешние ягоды — при раше уйти внутрь и всё равно успеть масло на longbow."
      ]
    },
    "mistakeEn": "Mill-opening vs French/Jeanne knights or keeping vills on the outer ring into spears.",
    "mistakeRu": "Mill vs French/Jeanne или оставлять жителей на внешнем кольце под копья."
  },
  {
    "id": "byzantines-0pkvLN16f4o-t784s",
    "civ": "byzantines",
    "videoId": "0pkvLN16f4o",
    "videoTitle": "Easily Achieve Conqueror 3 With These Byz Strats | AoE4 Valdy",
    "videoUrl": "https://www.youtube.com/watch?v=0pkvLN16f4o&t=784s",
    "category": "build_order",
    "second": 784,
    "formattedTime": "13:04",
    "age": 1,
    "workers": { "food": 6, "wood": 3, "gold": 0, "stone": 0, "total": 14, "idle": 0 },
    "landmark": { "name": "Imperial Hippodrome", "builderCount": 5, "completionSec": 858 },
    "directiveEn": "Hippodrome two tiles from TC with 5–6 vills. Rally stragglers to 8 wood. Leave 6 on berries; oil for longbows at 3:40 game time.",
    "directiveRu": "Ипподром в 2 тайлах от ТЦ 5–6 жителями. Страглеры до 8 дерева. 6 на ягодах; масло на longbow к 3:40 игрового времени.",
    "layout": {
      "type": "landmark_hub",
      "titleEn": "Hippodrome two tiles off the TC",
      "titleRu": "Ипподром в двух тайлах от ТЦ",
      "ascii": " [Hippodrome] ==2 tiles== [TC]\n       |                    |\n [6 berries/oil]      [stragglers -> 8 wood]",
      "tipsEn": [
        "Written BO ages with 5; the VOD uses 6 because longbows come out so fast.",
        "Bank 35 extra gold for spear upgrade, then gold vills to wood."
      ],
      "tipsRu": [
        "В гайде ап с 5, в VOD 6 — longbows выходят очень быстро.",
        "35 лишнего золота на ап копий, затем золото на дерево."
      ]
    },
    "mistakeEn": "Parking the Hippodrome far from the TC or draining berries so oil misses the 3:40 longbow window.",
    "mistakeRu": "Ипподром далеко от ТЦ или снять ягоды так, что масло не успевает к 3:40."
  },
  {
    "id": "byzantines-0pkvLN16f4o-t1279s",
    "civ": "byzantines",
    "videoId": "0pkvLN16f4o",
    "videoTitle": "Easily Achieve Conqueror 3 With These Byz Strats | AoE4 Valdy",
    "videoUrl": "https://www.youtube.com/watch?v=0pkvLN16f4o&t=1279s",
    "category": "build_order",
    "second": 1279,
    "formattedTime": "21:19",
    "age": 3,
    "workers": { "food": 23, "wood": 3, "gold": 15, "stone": 0, "total": 41, "idle": 0 },
    "landmark": { "name": "Golden Horn Tower", "builderCount": 10, "completionSec": 1320 },
    "directiveEn": "Castle ~12 min is mandatory. Two stables, cataphracts, monastery (Hippodrome has none). Hit ~1 min before their upgrades.",
    "directiveRu": "Castle ~12 мин обязателен. Два конюшни, катафракты, монастырь (на ипподроме его нет). Удар за ~минуту до их апов.",
    "layout": {
      "type": "forward_barracks",
      "titleEn": "Double stable Castle timing",
      "titleRu": "Двойная конюшня и тайминг Castle",
      "ascii": "[Golden Horn]\n[Stable] [Stable] -> Cataphracts\n[Monastery] relics\n[Longbow + spear] screen",
      "tipsEn": [
        "Stop unit production at 11:00 and dump into food/gold with 2–3 wood.",
        "Skip horseman upgrade if you only have a few; plus-one and veteran longbows matter more."
      ],
      "tipsRu": [
        "Стоп юнитов в 11:00, еда/золото, 2–3 дерева.",
        "Ап коней не нужен при штучном числе; +1 и veteran longbow важнее."
      ]
    },
    "mistakeEn": "Staying Feudal past 12 minutes, or looking for a monastery in Feudal on Hippodrome.",
    "mistakeRu": "Сидеть в феодале после 12 минут или искать монастырь в феодале на ипподроме."
  },
  {
    "id": "english-33YwM_i-x5g-t180s",
    "civ": "english",
    "videoId": "33YwM_i-x5g",
    "videoTitle": "How To Counter Turtling in AoE4",
    "videoUrl": "https://www.youtube.com/watch?v=33YwM_i-x5g&t=180s",
    "category": "fundamentals",
    "second": 180,
    "formattedTime": "03:00",
    "age": 1,
    "workers": {
      "food": 7,
      "wood": 2,
      "gold": 4,
      "stone": 0,
      "total": 13,
      "idle": 0
    },
    "landmark": {
      "name": "Council Hall",
      "builderCount": 3,
      "completionSec": 255
    },
    "directiveEn": "Fast Council Hall drop with 3 villagers; scout opponent base to identify resource vulnerabilities.",
    "directiveRu": "Быстрая постройка Ратуши совета 3 крестьянами; разведка базы оппонента для поиска уязвимых ресурсов.",
    "layout": {
      "type": "landmark_hub",
      "titleEn": "English Landmark & Farm Defense Grid",
      "titleRu": "Защитная сетка ферм и ратуши англичан",
      "ascii": "   [Council Hall]\n        |\n[Farm] [TC] [Farm]\n        |\n   [Farm] [Farm]",
      "tipsEn": [
        "Keep Council Hall inside Town Center Network of Castles aura.",
        "Cluster early farms on the back/safe quadrant of the Town Center."
      ],
      "tipsRu": [
        "Размещайте Ратушу совета в радиусе ауры замковой сети главного ТЦ.",
        "Группируйте первые фермы в защищенной тыловой зоне за ТЦ."
      ]
    },
    "mistakeEn": "Building Council Hall on the unprotected forward hill where enemy early horsemen can dive builders.",
    "mistakeRu": "Постройка Ратуши совета на открытом холме спереди, где строителей могут атаковать всадники."
  },
  {
    "id": "english-33YwM_i-x5g-t360s",
    "civ": "english",
    "videoId": "33YwM_i-x5g",
    "videoTitle": "How To Counter Turtling in AoE4",
    "videoUrl": "https://www.youtube.com/watch?v=33YwM_i-x5g&t=360s",
    "category": "fundamentals",
    "second": 360,
    "formattedTime": "06:00",
    "age": 2,
    "workers": {
      "food": 12,
      "wood": 8,
      "gold": 3,
      "stone": 0,
      "total": 23,
      "idle": 0
    },
    "landmark": null,
    "directiveEn": "Longbowman mass + 2-3 Spearmen. Deny opponent secondary gold and food camps without diving TC.",
    "directiveRu": "Масс длинных лучников + 2-3 копейщика. Перекрывайте второе золото и нейтральную еду, не дайвя под ТЦ.",
    "layout": {
      "type": "tower_gold",
      "titleEn": "Forward Outpost Pressure",
      "titleRu": "Давление передовым аванпостом",
      "ascii": "   [Enemy Neutral Gold]\n          |\n  [Outpost (Arrowslits)]\n     /           \\\n[Longbows]     [Spearmen]",
      "tipsEn": [
        "Place an arrowslits Outpost covering the edge of the opponent's outer gold vein.",
        "Screen longbows with spearmen to deter cavalry charges."
      ],
      "tipsRu": [
        "Поставьте аванпост с бойницами на краю внешней золотой жилы противника.",
        "Прикрывайте лучников копейщиками для отражения чарджей кавалерии."
      ]
    },
    "mistakeEn": "Diving units directly under enemy Town Center fire instead of starving neutral resources.",
    "mistakeRu": "Самоубийственная атака под огонь ТЦ вместо удушения добычи внешних ресурсов."
  },
  {
    "id": "english-33YwM_i-x5g-t600s",
    "civ": "english",
    "videoId": "33YwM_i-x5g",
    "videoTitle": "How To Counter Turtling in AoE4",
    "videoUrl": "https://www.youtube.com/watch?v=33YwM_i-x5g&t=600s",
    "category": "fundamentals",
    "second": 600,
    "formattedTime": "10:00",
    "age": 2,
    "workers": {
      "food": 18,
      "wood": 14,
      "gold": 6,
      "stone": 0,
      "total": 38,
      "idle": 0
    },
    "landmark": null,
    "directiveEn": "Add Blacksmith + Siege Engineering. Build 2-3 Rams to break defensive outposts and houses.",
    "directiveRu": "Добавьте Кузницу + Осадную инженерию. Постройте 2-3 Тарана для пробития аванпостов и домов.",
    "layout": {
      "type": "forward_barracks",
      "titleEn": "Siege Strike Assembly",
      "titleRu": "Сборка осадного кулака",
      "ascii": "      [Enemy Outer Wall]\n             |\n       [Ram]   [Ram]\n     /       |       \\\n[Spears] [Longbows] [Blacksmith]",
      "tipsEn": [
        "Construct rams in the field using infantry immediately outside enemy vision.",
        "Target resource drop-offs and outlying production buildings first."
      ],
      "tipsRu": [
        "Собирайте тараны пехотой в поле прямо за границей видимости оппонента.",
        "Первоочередно уничтожайте точки сдачи ресурсов и вынесенные бараки."
      ]
    },
    "mistakeEn": "Sending lone rams without infantry escort to be burned down by villagers.",
    "mistakeRu": "Отправка одиночных таранов без сопровождения пехоты на сожжение крестьянами."
  },
  {
    "id": "french-B5-tWqB3770-t195s",
    "civ": "french",
    "videoId": "B5-tWqB3770",
    "videoTitle": "French Royal Knight Feudal Aggression Masterclass",
    "videoUrl": "https://www.youtube.com/watch?v=B5-tWqB3770&t=195s",
    "category": "build_order",
    "second": 195,
    "formattedTime": "03:15",
    "age": 1,
    "workers": {
      "food": 8,
      "wood": 2,
      "gold": 4,
      "stone": 0,
      "total": 14,
      "idle": 0
    },
    "landmark": {
      "name": "School of Cavalry",
      "builderCount": 3,
      "completionSec": 255
    },
    "directiveEn": "Fast School of Cavalry. Start researching Economic upgrades with French discount.",
    "directiveRu": "Быстрая Школа кавалерии. Закажите экономические улучшения с французской скидкой.",
    "layout": {
      "type": "landmark_hub",
      "titleEn": "School of Cavalry Staging",
      "titleRu": "Размещение Школы кавалерии",
      "ascii": "    [School of Cavalry]\n            |\n[Mill] --- [TC] --- [Gold Camp]",
      "tipsEn": [
        "Position School of Cavalry for direct pathing to opponent base.",
        "Take advantage of French faster villager production rate."
      ],
      "tipsRu": [
        "Ставьте Школу кавалерии на прямой линии движения к базе соперника.",
        "Используйте ускоренное производство французских крестьян без пауз."
      ]
    },
    "mistakeEn": "Queuing non-stop knights without wood for houses, causing population blocks.",
    "mistakeRu": "Непрерывный заказ рыцарей без учета дерева на дома, приводящий к блоку лимита."
  },
  {
    "id": "french-B5-tWqB3770-t300s",
    "civ": "french",
    "videoId": "B5-tWqB3770",
    "videoTitle": "French Royal Knight Feudal Aggression Masterclass",
    "videoUrl": "https://www.youtube.com/watch?v=B5-tWqB3770&t=300s",
    "category": "build_order",
    "second": 300,
    "formattedTime": "05:00",
    "age": 2,
    "workers": {
      "food": 10,
      "wood": 6,
      "gold": 4,
      "stone": 0,
      "total": 20,
      "idle": 0
    },
    "landmark": null,
    "directiveEn": "First Royal Knight on the field. Patrol enemy gold and wood lines for villager picks and charge resets.",
    "directiveRu": "Первый рыцарь на поле. Патрулируйте золото и лес оппонента, сбивая добычу и сбрасывая кулдаун чарджа.",
    "layout": {
      "type": "forward_barracks",
      "titleEn": "Archery Range Reinforcement",
      "titleRu": "Поддержка лучниками против копейщиков",
      "ascii": "[Enemy Base] <--- [Knight Harass]\n      ^\n[Archery Range] -> (Trains Archers to counter enemy spears)",
      "tipsEn": [
        "Never suicide knights into spearmen or under Town Center arrows.",
        "Cycle wounded knights back to base for Chivalry passive healing."
      ],
      "tipsRu": [
        "Никогда не теряйте рыцарей под ТЦ или в гуще копейщиков.",
        "Отводите раненых рыцарей в тыл для пассивного исцеления рыцарством (*Chivalry*)."
      ]
    },
    "mistakeEn": "Losing the initial 2 Royal Knights to Spearman ambush, losing map tempo.",
    "mistakeRu": "Потеря первых двух рыцарей в засаде копейщиков и потеря темпа на карте."
  },
  {
    "id": "french-B5-tWqB3770-t480s",
    "civ": "french",
    "videoId": "B5-tWqB3770",
    "videoTitle": "French Royal Knight Feudal Aggression Masterclass",
    "videoUrl": "https://www.youtube.com/watch?v=B5-tWqB3770&t=480s",
    "category": "build_order",
    "second": 480,
    "formattedTime": "08:00",
    "age": 2,
    "workers": {
      "food": 13,
      "wood": 9,
      "gold": 5,
      "stone": 3,
      "total": 30,
      "idle": 0
    },
    "landmark": null,
    "directiveEn": "Rally 3-4 villagers to Stone to drop 2nd Town Center while knight map presence keeps opponent contained.",
    "directiveRu": "Направьте 3-4 крестьян на камень для постройки 2-го ТЦ, пока рыцари сковывают противника.",
    "layout": {
      "type": "tc_expansion",
      "titleEn": "2nd Town Center Positioning",
      "titleRu": "Размещение 2-й Ратуши",
      "ascii": "    [Main TC]\n        |\n[Secondary Deer / Gold]\n        |\n    [2nd TC]",
      "tipsEn": [
        "Place 2nd TC directly locking down a contested deer patch or secondary gold vein.",
        "French 2TC scales villager production exponentially faster than other civs."
      ],
      "tipsRu": [
        "Ставьте 2-й ТЦ вплотную к спорному оленьему пастбищу или золотой жиле.",
        "2 ТЦ Франции наращивают рабочую силу экспоненциально быстрее других наций."
      ]
    },
    "mistakeEn": "Building 2nd TC in naked forward position without cavalry escort.",
    "mistakeRu": "Постройка 2-го ТЦ на открытой позиции спереди без сопровождения кавалерии."
  },
  {
    "id": "rus-G0R0kXv8Xo4-t120s",
    "civ": "rus",
    "videoId": "G0R0kXv8Xo4",
    "videoTitle": "Rus Bounty Hunting & Fast Castle Masterclass",
    "videoUrl": "https://www.youtube.com/watch?v=G0R0kXv8Xo4&t=120s",
    "category": "build_order",
    "second": 120,
    "formattedTime": "02:00",
    "age": 1,
    "workers": {
      "food": 7,
      "wood": 3,
      "gold": 0,
      "stone": 0,
      "total": 10,
      "idle": 0
    },
    "landmark": null,
    "directiveEn": "Double scout opening: Kill deer/wolves across map to hit Tier 2/3 Bounty (+100/+250 gold bonus).",
    "directiveRu": "Старт в 2 скаута: убивайте оленей и волков по всей карте для взятия 2/3 тира баунти (+100/+250 золота).",
    "layout": {
      "type": "landmark_hub",
      "titleEn": "Hunting Cabin & Wood Aura Grid",
      "titleRu": "Сетка охотничьих изб в лесных массивах",
      "ascii": " [Dense Forest]\n       |\n[Hunting Cabin] -> Passive Gold Gen\n       |\n     [TC]",
      "tipsEn": [
        "Drop Hunting Cabin surrounded by dense tree line for maximum passive gold ticks.",
        "Rus does not need early gold mining camp due to bounty gold."
      ],
      "tipsRu": [
        "Ставьте охотничью избу в окружении густого леса для максимального притока золота.",
        "Руси не нужен ранний лагерь золотодобычи благодаря золоту за баунти."
      ]
    },
    "mistakeEn": "Missing enemy deer camps with scouts, failing to reach 250 Bounty before Feudal.",
    "mistakeRu": "Пропуск чужих оленей скаутами и недобор 250 баунти до выхода в Феодал."
  },
  {
    "id": "rus-G0R0kXv8Xo4-t210s",
    "civ": "rus",
    "videoId": "G0R0kXv8Xo4",
    "videoTitle": "Rus Bounty Hunting & Fast Castle Masterclass",
    "videoUrl": "https://www.youtube.com/watch?v=G0R0kXv8Xo4&t=210s",
    "category": "build_order",
    "second": 210,
    "formattedTime": "03:30",
    "age": 1,
    "workers": {
      "food": 9,
      "wood": 4,
      "gold": 2,
      "stone": 0,
      "total": 15,
      "idle": 0
    },
    "landmark": {
      "name": "Golden Gate",
      "builderCount": 3,
      "completionSec": 270
    },
    "directiveEn": "Golden Gate Landmark drop. Collect tickets every minute to rebalance economy for Fast Castle.",
    "directiveRu": "Постройка Золотых ворот. Каждую минуту меняйте билеты для балансировки экономики в Быстрый Замок.",
    "layout": {
      "type": "landmark_hub",
      "titleEn": "Golden Gate & Wooden Fortress Grid",
      "titleRu": "Сетка Золотых ворот и Деревянных крепостей",
      "ascii": "   [Golden Gate]\n         |\n[Wooden Fortress] -> (+20% Wood Harvest Aura)\n         |\n    [Lumber Camp]",
      "tipsEn": [
        "Surround main lumber camp with Wooden Fortress for +20% wood drop-off bonus.",
        "Use Golden Gate tickets to trade surplus wood into gold for Castle Age."
      ],
      "tipsRu": [
        "Прикрывайте лесопилку Деревянной крепостью для бонуса +20% к сдаче древесины.",
        "Используйте билеты Золотых ворот для обмена излишков дерева на золото для Замковой эпохи."
      ]
    },
    "mistakeEn": "Forgetting to redeem Golden Gate tickets, floating unused trade capacity.",
    "mistakeRu": "Забывание обмена билетов Золотых ворот и потеря торгового преимущества."
  },
  {
    "id": "rus-G0R0kXv8Xo4-t420s",
    "civ": "rus",
    "videoId": "G0R0kXv8Xo4",
    "videoTitle": "Rus Bounty Hunting & Fast Castle Masterclass",
    "videoUrl": "https://www.youtube.com/watch?v=G0R0kXv8Xo4&t=420s",
    "category": "build_order",
    "second": 420,
    "formattedTime": "07:00",
    "age": 3,
    "workers": {
      "food": 14,
      "wood": 8,
      "gold": 6,
      "stone": 0,
      "total": 28,
      "idle": 0
    },
    "landmark": {
      "name": "High Abbey",
      "builderCount": 4,
      "completionSec": 480
    },
    "directiveEn": "Castle Age hit: Train Warrior Monks immediately to secure all 5 Holy Relics and Sacred Sites.",
    "directiveRu": "Замковая эпоха достигнута: немедленно нанимайте монахов-воинов для сбора всех 5 реликвий и святынь.",
    "layout": {
      "type": "landmark_hub",
      "titleEn": "Relic Capture & Knight Screen",
      "titleRu": "Сбор реликвий и рыцарский скрининг",
      "ascii": "[Holy Relic] <--- [Warrior Monk]\n      |\n[Rus Knights] -> (Screening monks from enemy cavalry)",
      "tipsEn": [
        "Warrior Monks move swiftly on horseback; queue 2-3 simultaneously to grab multiple relics.",
        "Relics in Rus Wooden Fortresses or Abbey generate gold and attack aura."
      ],
      "tipsRu": [
        "Монахи-воины передвигаются верхом; заказывайте 2-3 сразу для одновременного сбора реликвий.",
        "Реликвии в деревянных крепостях или аббатстве дают стабильное золото и боевую ауру."
      ]
    },
    "mistakeEn": "Leaving Warrior Monks unprotected without escort when contesting contested relics.",
    "mistakeRu": "Отправка монахов-воинов за спорными реликвиями без боевого сопровождения."
  },
  {
    "id": "holy_roman_empire-9sYg_J3K1aA-t180s",
    "civ": "holy_roman_empire",
    "videoId": "9sYg_J3K1aA",
    "videoTitle": "HRE Fast Castle & Regnitz Cathedral Mastery",
    "videoUrl": "https://www.youtube.com/watch?v=9sYg_J3K1aA&t=180s",
    "category": "build_order",
    "second": 180,
    "formattedTime": "03:00",
    "age": 1,
    "workers": {
      "food": 8,
      "wood": 0,
      "gold": 4,
      "stone": 0,
      "total": 12,
      "idle": 0
    },
    "landmark": {
      "name": "Aachen Chapel",
      "builderCount": 3,
      "completionSec": 240
    },
    "directiveEn": "Place Aachen Chapel to inspire both Gold and Food gatherers simultaneously with Prelate.",
    "directiveRu": "Поставьте Ахенскую капеллу так, чтобы прелат вдохновлял сборщиков золота и пищи одновременно.",
    "layout": {
      "type": "landmark_hub",
      "titleEn": "Aachen Chapel Dual-Resource Sweet Spot",
      "titleRu": "Точка Ахенской капеллы на 2 ресурса",
      "ascii": "   [Gold Vein]\n        |\n [Aachen Chapel] (Covers both inside 6-tile aura)\n        |\n [Sheep / Berries] --- [TC]",
      "tipsEn": [
        "Aachen aura reaches 6 tiles: ensure it envelopes gold vein and sheep under TC.",
        "Inspire bonus gives +40% gather speed across all affected villagers."
      ],
      "tipsRu": [
        "Аура капеллы действует на 6 клеток: убедитесь, что она охватывает жилу золота и овец под ТЦ.",
        "Эффект вдохновения дает +40% к скорости сбора всем находящимся в зоне крестьянам."
      ]
    },
    "mistakeEn": "Placing Aachen Chapel covering only sheep, missing the crucial gold vein.",
    "mistakeRu": "Постройка Ахенской капеллы только на овец с упущением золотой жилы."
  },
  {
    "id": "holy_roman_empire-9sYg_J3K1aA-t420s",
    "civ": "holy_roman_empire",
    "videoId": "9sYg_J3K1aA",
    "videoTitle": "HRE Fast Castle & Regnitz Cathedral Mastery",
    "videoUrl": "https://www.youtube.com/watch?v=9sYg_J3K1aA&t=420s",
    "category": "build_order",
    "second": 420,
    "formattedTime": "07:00",
    "age": 3,
    "workers": {
      "food": 14,
      "wood": 6,
      "gold": 8,
      "stone": 0,
      "total": 28,
      "idle": 0
    },
    "landmark": {
      "name": "Regnitz Cathedral",
      "builderCount": 5,
      "completionSec": 480
    },
    "directiveEn": "Fast Castle with Regnitz Cathedral. Dispatch 3 Prelates to collect all 3-5 Relics (+100% gold each).",
    "directiveRu": "Быстрый Замок через Регницкий собор. Отправьте 3 прелатов для сбора 3-5 реликвий (+100% золота за каждую).",
    "layout": {
      "type": "landmark_hub",
      "titleEn": "Regnitz Cathedral Relic Bank",
      "titleRu": "Банк реликвий Регницкого собора",
      "ascii": "   [Regnitz Cathedral]\n         |\n[Relic 1] [Relic 2] [Relic 3]\n (Generates +160 Gold/min each)",
      "tipsEn": [
        "3 relics in Regnitz yield +480 gold/min, funding non-stop Men-at-Arms and Knights.",
        "Protect prelate paths with early Horsemen or Spearmen."
      ],
      "tipsRu": [
        "3 реликвии в Регнице дают +480 золота/мин, финансируя непрерывный найм ландскнехтов и рыцарей.",
        "Прикрывайте маршруты движения прелатов ранними всадниками или копейщиками."
      ]
    },
    "mistakeEn": "Letting enemy scout kill unescorted Prelate carrying a relic.",
    "mistakeRu": "Потеря прелата с реликвией от вражеского скаута из-за отсутствия эскорта."
  }
] as const

export const VALDEMAR_MILESTONES_BY_CIV: Readonly<Record<string, readonly VisualMilestoneEntry[]>> = {
  "byzantines": [
    {
      "id": "byzantines-ydDt3gp56fQ-t210s",
      "civ": "byzantines",
      "videoId": "ydDt3gp56fQ",
      "videoTitle": "How To Fix The 5 Mistakes Keeping You Hardstuck",
      "videoUrl": "https://www.youtube.com/watch?v=ydDt3gp56fQ&t=210s",
      "category": "fundamentals",
      "second": 210,
      "formattedTime": "03:30",
      "age": 1,
      "workers": {
        "food": 7,
        "wood": 3,
        "gold": 3,
        "stone": 0,
        "total": 13,
        "idle": 0
      },
      "landmark": {
        "name": "Grand Winery",
        "builderCount": 3,
        "completionSec": 270
      },
      "directiveEn": "Begin Feudal Age-Up with 3-4 villagers on Landmark while maintaining continuous food gathering from sheep/berries.",
      "directiveRu": "Начните переход в Феодал с 3-4 крестьянами на достопримечательности, сохраняя непрерывную добычу овец/ягод.",
      "layout": {
        "type": "landmark_hub",
        "titleEn": "Cistern & Winery Optimal Layout",
        "titleRu": "Оптимальная схема цистерн и винодельни",
        "ascii": "      [ Cistern Lv1 ]\n     /       |       \\\n[TC] --- [Berries] --- [Grand Winery]\n     \\       |       /\n      [Olive Groves]",
        "tipsEn": [
          "Connect Cistern Level 1 directly touching Town Center and Berry Bush perimeter.",
          "Grand Winery aura must cover all future Olive Grove farm slots."
        ],
        "tipsRu": [
          "Соедините цистерну 1-го уровня так, чтобы она касалась ТЦ и периметра ягодников.",
          "Аура винодельни должна покрывать все будущие слоты оливковых рощ."
        ]
      },
      "mistakeEn": "Idling Town Center while waiting for landmark resources instead of rallying to straggler trees.",
      "mistakeRu": "Простой ТЦ в ожидании ресурсов на переход вместо добычи с ближайших деревьев."
    },
    {
      "id": "byzantines-ydDt3gp56fQ-t330s",
      "civ": "byzantines",
      "videoId": "ydDt3gp56fQ",
      "videoTitle": "How To Fix The 5 Mistakes Keeping You Hardstuck",
      "videoUrl": "https://www.youtube.com/watch?v=ydDt3gp56fQ&t=330s",
      "category": "fundamentals",
      "second": 330,
      "formattedTime": "05:30",
      "age": 2,
      "workers": {
        "food": 10,
        "wood": 6,
        "gold": 3,
        "stone": 0,
        "total": 19,
        "idle": 0
      },
      "landmark": null,
      "directiveEn": "Feudal reached: Immediately drop Barracks + Mercenary Camp and research Wheelbarrow.",
      "directiveRu": "Феодал достигнут: немедленно ставьте Казармы + Лагерь наемников и заказывайте Тачку.",
      "layout": {
        "type": "forward_barracks",
        "titleEn": "Production Screening Layout",
        "titleRu": "Схема прикрытия базы казармами",
        "ascii": "  [Frontier Line]\n[Barracks] [Merc Camp]\n       \\\n       [Tower] -> Covering Gold/Berries\n       /\n     [TC]",
        "tipsEn": [
          "Position production forward between vulnerable gold vein and enemy approach path.",
          "Place an Outpost within Town Center fire support range."
        ],
        "tipsRu": [
          "Размещайте военные здания спереди между золотой жилой и траекторией атаки противника.",
          "Ставьте аванпост в зоне прикрытия выстрелов главного ТЦ."
        ]
      },
      "mistakeEn": "Floating over 250 gold without queueing units or tech upgrades.",
      "mistakeRu": "Избыточное накопление более 250 золота без заказа юнитов или улучшений."
    },
    {
      "id": "byzantines-ydDt3gp56fQ-t480s",
      "civ": "byzantines",
      "videoId": "ydDt3gp56fQ",
      "videoTitle": "How To Fix The 5 Mistakes Keeping You Hardstuck",
      "videoUrl": "https://www.youtube.com/watch?v=ydDt3gp56fQ&t=480s",
      "category": "fundamentals",
      "second": 480,
      "formattedTime": "08:00",
      "age": 2,
      "workers": {
        "food": 14,
        "wood": 10,
        "gold": 4,
        "stone": 0,
        "total": 28,
        "idle": 0
      },
      "landmark": null,
      "directiveEn": "Begin 8-Farm transition ring around Mill. Keep active military presence controlling neutral deer.",
      "directiveRu": "Начните переход на кольцо из 8 ферм вокруг мельницы. Удерживайте армию на нейтральных оленях.",
      "layout": {
        "type": "farm_ring",
        "titleEn": "8-Farm Mill Wheel Alignment",
        "titleRu": "Колесо из 8 ферм вокруг мельницы",
        "ascii": " [Farm] [Farm] [Farm]\n [Farm] [Mill] [Farm]\n [Farm] [Farm] [Farm]",
        "tipsEn": [
          "Place 8 farms directly abutting the Mill to eliminate villager walking travel time.",
          "Add farms progressively (1 every 60-75 wood) without halting unit production."
        ],
        "tipsRu": [
          "Размещайте 8 ферм вплотную к мельнице для исключения лишней ходьбы крестьян.",
          "Добавляйте фермы плавно (по 1 на каждые 60-75 дерева), не останавливая найм войск."
        ]
      },
      "mistakeEn": "Dropping 8 farms simultaneously at 0 wood, halting archer and spearmen production.",
      "mistakeRu": "Одновременная трата всего запаса дерева на 8 ферм, останавливающая производство стрелков и копейщиков."
    },
    {
      "id": "byzantines-0pkvLN16f4o-t43s",
      "civ": "byzantines",
      "videoId": "0pkvLN16f4o",
      "videoTitle": "Easily Achieve Conqueror 3 With These Byz Strats | AoE4 Valdy",
      "videoUrl": "https://www.youtube.com/watch?v=0pkvLN16f4o&t=43s",
      "category": "build_order",
      "second": 43,
      "formattedTime": "00:43",
      "age": 1,
      "workers": { "food": 1, "wood": 0, "gold": 1, "stone": 3, "total": 6, "idle": 0 },
      "landmark": null,
      "directiveEn": "3-stone Winery opener vs China: 3 stone, 1 gold, house+cistern then sheep. Skip this if spears can show.",
      "directiveRu": "3-stone Winery vs China: 3 камня, 1 золото, дом+цистерна, затем овцы. Не так, если возможны копья.",
      "layout": {
        "type": "landmark_hub",
        "titleEn": "Safe back stone / gold, Winery on berries",
        "titleRu": "Камень и золото сзади, винодельня на ягодах",
        "ascii": "[Stone] [Gold] (behind TC)\n   \\      /\n    [TC] -- [Cistern] -- [House]\n      |\n [Sheep]     [Berries] -> Winery later",
        "tipsEn": [
          "Flankwoods with rear stone/gold is why 3-stone is comfortable here.",
          "Winery drops on home berries after Feudal, not in Dark Age."
        ],
        "tipsRu": [
          "На Flankwoods камень и золото сзади — поэтому 3-stone комфортен.",
          "Винодельню ставят на свои ягоды после феодала, не в тёмной."
        ]
      },
      "mistakeEn": "Opening 3-stone into a spear civ and dying before Feudal production.",
      "mistakeRu": "3-stone в копейный цив и смерть до феодального продакшена."
    },
    {
      "id": "byzantines-0pkvLN16f4o-t128s",
      "civ": "byzantines",
      "videoId": "0pkvLN16f4o",
      "videoTitle": "Easily Achieve Conqueror 3 With These Byz Strats | AoE4 Valdy",
      "videoUrl": "https://www.youtube.com/watch?v=0pkvLN16f4o&t=128s",
      "category": "build_order",
      "second": 128,
      "formattedTime": "02:08",
      "age": 1,
      "workers": { "food": 9, "wood": 0, "gold": 1, "stone": 3, "total": 14, "idle": 0 },
      "landmark": { "name": "Grand Winery", "builderCount": 4, "completionSec": 278 },
      "directiveEn": "Age up with 4 vs China (3 default, 2 if spears vs French/JD). One gold villager covers the whole Dark Age.",
      "directiveRu": "Ап с 4 vs China (обычно 3, 2 если копья vs French/JD). Один золото всю тёмную эпоху.",
      "layout": {
        "type": "landmark_hub",
        "titleEn": "Winery click + four cisterns of stone",
        "titleRu": "Клик винодельни и камень на 4 цистерны",
        "ascii": "[Grand Winery] (4 vills)\n      |\n[Cistern]--[Aqueduct]--[Cistern]\n      |\n     [TC]  (1 gold stays)",
        "tipsEn": [
          "Pull stone at 100 and place the fourth cistern, then stragglers to 8 wood.",
          "Do not keep gathering stone after four cisterns — it just floats."
        ],
        "tipsRu": [
          "На 100 камня — 4-я цистерна, затем страглеры до 8 дерева.",
          "Не копать камень после четырёх цистерн — он флоутит."
        ]
      },
      "mistakeEn": "Aging with too few vills vs China, or floating stone by mining a fifth cistern you will not place in Dark Age.",
      "mistakeRu": "Ап слишком малым числом vs China или флот камня на пятую цистерну, которую не ставят в тёмной."
    },
    {
      "id": "byzantines-0pkvLN16f4o-t278s",
      "civ": "byzantines",
      "videoId": "0pkvLN16f4o",
      "videoTitle": "Easily Achieve Conqueror 3 With These Byz Strats | AoE4 Valdy",
      "videoUrl": "https://www.youtube.com/watch?v=0pkvLN16f4o&t=278s",
      "category": "build_order",
      "second": 278,
      "formattedTime": "04:38",
      "age": 2,
      "workers": { "food": 9, "wood": 8, "gold": 0, "stone": 0, "total": 17, "idle": 0 },
      "landmark": { "name": "Grand Winery", "builderCount": 0, "completionSec": 278 },
      "directiveEn": "Feudal 4:38. Food onto Winery berries. Merc house: javelins vs knights, longbows default. 4 cheaper longbows.",
      "directiveRu": "Feudal 4:38. Еда на ягоды винодельни. Контракт: джавелины vs рыцари, иначе longbow. Пачка 4.",
      "layout": {
        "type": "forward_barracks",
        "titleEn": "Barracks + merc house, cistern research/prod split",
        "titleRu": "Казармы + наёмники, цистерны research/production",
        "ascii": "[Winery berries]\n[Barracks] [Merc House]\n     \\\n    [Cistern research]  [Cistern prod] [Cistern prod]\n     /\n   [TC]  8 wood stragglers",
        "tipsEn": [
          "Middle cistern on research, others on production speed before military queues.",
          "Do not dive a Chinese barbican — harass wood like English."
        ],
        "tipsRu": [
          "Центральная цистерна research, остальные production до очередей.",
          "Не нырять в barbican — харрастить дерево как English."
        ]
      },
      "mistakeEn": "Queueing a fifth longbow instead of the cheaper 4, or crashing the barbican.",
      "mistakeRu": "Пятый longbow вместо дешёвой пачки 4 или удар в barbican."
    },
    {
      "id": "byzantines-0pkvLN16f4o-t619s",
      "civ": "byzantines",
      "videoId": "0pkvLN16f4o",
      "videoTitle": "Easily Achieve Conqueror 3 With These Byz Strats | AoE4 Valdy",
      "videoUrl": "https://www.youtube.com/watch?v=0pkvLN16f4o&t=619s",
      "category": "build_order",
      "second": 619,
      "formattedTime": "10:19",
      "age": 1,
      "workers": { "food": 6, "wood": 0, "gold": 0, "stone": 0, "total": 6, "idle": 0 },
      "landmark": null,
      "directiveEn": "Mill opener when spears/Sipahi-spear can happen. Outer berries, mill+house+cistern. Not vs French/Horde/JD/Malians/Rus/Sengoku/Delhi.",
      "directiveRu": "Mill opener если возможны копья/Sipahi-spear. Внешние ягоды, mill+дом+цистерна. Не vs French/Horde/Jeanne/Malians/Rus/Sengoku/Delhi.",
      "layout": {
        "type": "farm_ring",
        "titleEn": "Outer mill, inner berries as spear shelter",
        "titleRu": "Внешняя мельница, внутренние ягоды как укрытие",
        "ascii": "  [Outer berries + Mill]\n           |\n [Cistern] [House] [TC]\n           |\n    [Inner berries] <- fall back if spears",
        "tipsEn": [
          "2 gold default; 3 gold immediately if the spear rush is already on the way.",
          "Outer gather first so a rush can hide on inner bushes and still hit longbow oil."
        ],
        "tipsRu": [
          "2 золота по умолчанию; 3 сразу, если копья уже идут.",
          "Сначала внешние ягоды — при раше уйти внутрь и всё равно успеть масло на longbow."
        ]
      },
      "mistakeEn": "Mill-opening vs French/Jeanne knights or keeping vills on the outer ring into spears.",
      "mistakeRu": "Mill vs French/Jeanne или оставлять жителей на внешнем кольце под копья."
    },
    {
      "id": "byzantines-0pkvLN16f4o-t784s",
      "civ": "byzantines",
      "videoId": "0pkvLN16f4o",
      "videoTitle": "Easily Achieve Conqueror 3 With These Byz Strats | AoE4 Valdy",
      "videoUrl": "https://www.youtube.com/watch?v=0pkvLN16f4o&t=784s",
      "category": "build_order",
      "second": 784,
      "formattedTime": "13:04",
      "age": 1,
      "workers": { "food": 6, "wood": 3, "gold": 0, "stone": 0, "total": 14, "idle": 0 },
      "landmark": { "name": "Imperial Hippodrome", "builderCount": 5, "completionSec": 858 },
      "directiveEn": "Hippodrome two tiles from TC with 5–6 vills. Rally stragglers to 8 wood. Leave 6 on berries; oil for longbows at 3:40 game time.",
      "directiveRu": "Ипподром в 2 тайлах от ТЦ 5–6 жителями. Страглеры до 8 дерева. 6 на ягодах; масло на longbow к 3:40 игрового времени.",
      "layout": {
        "type": "landmark_hub",
        "titleEn": "Hippodrome two tiles off the TC",
        "titleRu": "Ипподром в двух тайлах от ТЦ",
        "ascii": " [Hippodrome] ==2 tiles== [TC]\n       |                    |\n [6 berries/oil]      [stragglers -> 8 wood]",
        "tipsEn": [
          "Written BO ages with 5; the VOD uses 6 because longbows come out so fast.",
          "Bank 35 extra gold for spear upgrade, then gold vills to wood."
        ],
        "tipsRu": [
          "В гайде ап с 5, в VOD 6 — longbows выходят очень быстро.",
          "35 лишнего золота на ап копий, затем золото на дерево."
        ]
      },
      "mistakeEn": "Parking the Hippodrome far from the TC or draining berries so oil misses the 3:40 longbow window.",
      "mistakeRu": "Ипподром далеко от ТЦ или снять ягоды так, что масло не успевает к 3:40."
    },
    {
      "id": "byzantines-0pkvLN16f4o-t1279s",
      "civ": "byzantines",
      "videoId": "0pkvLN16f4o",
      "videoTitle": "Easily Achieve Conqueror 3 With These Byz Strats | AoE4 Valdy",
      "videoUrl": "https://www.youtube.com/watch?v=0pkvLN16f4o&t=1279s",
      "category": "build_order",
      "second": 1279,
      "formattedTime": "21:19",
      "age": 3,
      "workers": { "food": 23, "wood": 3, "gold": 15, "stone": 0, "total": 41, "idle": 0 },
      "landmark": { "name": "Golden Horn Tower", "builderCount": 10, "completionSec": 1320 },
      "directiveEn": "Castle ~12 min is mandatory. Two stables, cataphracts, monastery (Hippodrome has none). Hit ~1 min before their upgrades.",
      "directiveRu": "Castle ~12 мин обязателен. Два конюшни, катафракты, монастырь (на ипподроме его нет). Удар за ~минуту до их апов.",
      "layout": {
        "type": "forward_barracks",
        "titleEn": "Double stable Castle timing",
        "titleRu": "Двойная конюшня и тайминг Castle",
        "ascii": "[Golden Horn]\n[Stable] [Stable] -> Cataphracts\n[Monastery] relics\n[Longbow + spear] screen",
        "tipsEn": [
          "Stop unit production at 11:00 and dump into food/gold with 2–3 wood.",
          "Skip horseman upgrade if you only have a few; plus-one and veteran longbows matter more."
        ],
        "tipsRu": [
          "Стоп юнитов в 11:00, еда/золото, 2–3 дерева.",
          "Ап коней не нужен при штучном числе; +1 и veteran longbow важнее."
        ]
      },
      "mistakeEn": "Staying Feudal past 12 minutes, or looking for a monastery in Feudal on Hippodrome.",
      "mistakeRu": "Сидеть в феодале после 12 минут или искать монастырь в феодале на ипподроме."
    }
  ],
  "english": [
    {
      "id": "english-33YwM_i-x5g-t180s",
      "civ": "english",
      "videoId": "33YwM_i-x5g",
      "videoTitle": "How To Counter Turtling in AoE4",
      "videoUrl": "https://www.youtube.com/watch?v=33YwM_i-x5g&t=180s",
      "category": "fundamentals",
      "second": 180,
      "formattedTime": "03:00",
      "age": 1,
      "workers": {
        "food": 7,
        "wood": 2,
        "gold": 4,
        "stone": 0,
        "total": 13,
        "idle": 0
      },
      "landmark": {
        "name": "Council Hall",
        "builderCount": 3,
        "completionSec": 255
      },
      "directiveEn": "Fast Council Hall drop with 3 villagers; scout opponent base to identify resource vulnerabilities.",
      "directiveRu": "Быстрая постройка Ратуши совета 3 крестьянами; разведка базы оппонента для поиска уязвимых ресурсов.",
      "layout": {
        "type": "landmark_hub",
        "titleEn": "English Landmark & Farm Defense Grid",
        "titleRu": "Защитная сетка ферм и ратуши англичан",
        "ascii": "   [Council Hall]\n        |\n[Farm] [TC] [Farm]\n        |\n   [Farm] [Farm]",
        "tipsEn": [
          "Keep Council Hall inside Town Center Network of Castles aura.",
          "Cluster early farms on the back/safe quadrant of the Town Center."
        ],
        "tipsRu": [
          "Размещайте Ратушу совета в радиусе ауры замковой сети главного ТЦ.",
          "Группируйте первые фермы в защищенной тыловой зоне за ТЦ."
        ]
      },
      "mistakeEn": "Building Council Hall on the unprotected forward hill where enemy early horsemen can dive builders.",
      "mistakeRu": "Постройка Ратуши совета на открытом холме спереди, где строителей могут атаковать всадники."
    },
    {
      "id": "english-33YwM_i-x5g-t360s",
      "civ": "english",
      "videoId": "33YwM_i-x5g",
      "videoTitle": "How To Counter Turtling in AoE4",
      "videoUrl": "https://www.youtube.com/watch?v=33YwM_i-x5g&t=360s",
      "category": "fundamentals",
      "second": 360,
      "formattedTime": "06:00",
      "age": 2,
      "workers": {
        "food": 12,
        "wood": 8,
        "gold": 3,
        "stone": 0,
        "total": 23,
        "idle": 0
      },
      "landmark": null,
      "directiveEn": "Longbowman mass + 2-3 Spearmen. Deny opponent secondary gold and food camps without diving TC.",
      "directiveRu": "Масс длинных лучников + 2-3 копейщика. Перекрывайте второе золото и нейтральную еду, не дайвя под ТЦ.",
      "layout": {
        "type": "tower_gold",
        "titleEn": "Forward Outpost Pressure",
        "titleRu": "Давление передовым аванпостом",
        "ascii": "   [Enemy Neutral Gold]\n          |\n  [Outpost (Arrowslits)]\n     /           \\\n[Longbows]     [Spearmen]",
        "tipsEn": [
          "Place an arrowslits Outpost covering the edge of the opponent's outer gold vein.",
          "Screen longbows with spearmen to deter cavalry charges."
        ],
        "tipsRu": [
          "Поставьте аванпост с бойницами на краю внешней золотой жилы противника.",
          "Прикрывайте лучников копейщиками для отражения чарджей кавалерии."
        ]
      },
      "mistakeEn": "Diving units directly under enemy Town Center fire instead of starving neutral resources.",
      "mistakeRu": "Самоубийственная атака под огонь ТЦ вместо удушения добычи внешних ресурсов."
    },
    {
      "id": "english-33YwM_i-x5g-t600s",
      "civ": "english",
      "videoId": "33YwM_i-x5g",
      "videoTitle": "How To Counter Turtling in AoE4",
      "videoUrl": "https://www.youtube.com/watch?v=33YwM_i-x5g&t=600s",
      "category": "fundamentals",
      "second": 600,
      "formattedTime": "10:00",
      "age": 2,
      "workers": {
        "food": 18,
        "wood": 14,
        "gold": 6,
        "stone": 0,
        "total": 38,
        "idle": 0
      },
      "landmark": null,
      "directiveEn": "Add Blacksmith + Siege Engineering. Build 2-3 Rams to break defensive outposts and houses.",
      "directiveRu": "Добавьте Кузницу + Осадную инженерию. Постройте 2-3 Тарана для пробития аванпостов и домов.",
      "layout": {
        "type": "forward_barracks",
        "titleEn": "Siege Strike Assembly",
        "titleRu": "Сборка осадного кулака",
        "ascii": "      [Enemy Outer Wall]\n             |\n       [Ram]   [Ram]\n     /       |       \\\n[Spears] [Longbows] [Blacksmith]",
        "tipsEn": [
          "Construct rams in the field using infantry immediately outside enemy vision.",
          "Target resource drop-offs and outlying production buildings first."
        ],
        "tipsRu": [
          "Собирайте тараны пехотой в поле прямо за границей видимости оппонента.",
          "Первоочередно уничтожайте точки сдачи ресурсов и вынесенные бараки."
        ]
      },
      "mistakeEn": "Sending lone rams without infantry escort to be burned down by villagers.",
      "mistakeRu": "Отправка одиночных таранов без сопровождения пехоты на сожжение крестьянами."
    }
  ],
  "french": [
    {
      "id": "french-B5-tWqB3770-t195s",
      "civ": "french",
      "videoId": "B5-tWqB3770",
      "videoTitle": "French Royal Knight Feudal Aggression Masterclass",
      "videoUrl": "https://www.youtube.com/watch?v=B5-tWqB3770&t=195s",
      "category": "build_order",
      "second": 195,
      "formattedTime": "03:15",
      "age": 1,
      "workers": {
        "food": 8,
        "wood": 2,
        "gold": 4,
        "stone": 0,
        "total": 14,
        "idle": 0
      },
      "landmark": {
        "name": "School of Cavalry",
        "builderCount": 3,
        "completionSec": 255
      },
      "directiveEn": "Fast School of Cavalry. Start researching Economic upgrades with French discount.",
      "directiveRu": "Быстрая Школа кавалерии. Закажите экономические улучшения с французской скидкой.",
      "layout": {
        "type": "landmark_hub",
        "titleEn": "School of Cavalry Staging",
        "titleRu": "Размещение Школы кавалерии",
        "ascii": "    [School of Cavalry]\n            |\n[Mill] --- [TC] --- [Gold Camp]",
        "tipsEn": [
          "Position School of Cavalry for direct pathing to opponent base.",
          "Take advantage of French faster villager production rate."
        ],
        "tipsRu": [
          "Ставьте Школу кавалерии на прямой линии движения к базе соперника.",
          "Используйте ускоренное производство французских крестьян без пауз."
        ]
      },
      "mistakeEn": "Queuing non-stop knights without wood for houses, causing population blocks.",
      "mistakeRu": "Непрерывный заказ рыцарей без учета дерева на дома, приводящий к блоку лимита."
    },
    {
      "id": "french-B5-tWqB3770-t300s",
      "civ": "french",
      "videoId": "B5-tWqB3770",
      "videoTitle": "French Royal Knight Feudal Aggression Masterclass",
      "videoUrl": "https://www.youtube.com/watch?v=B5-tWqB3770&t=300s",
      "category": "build_order",
      "second": 300,
      "formattedTime": "05:00",
      "age": 2,
      "workers": {
        "food": 10,
        "wood": 6,
        "gold": 4,
        "stone": 0,
        "total": 20,
        "idle": 0
      },
      "landmark": null,
      "directiveEn": "First Royal Knight on the field. Patrol enemy gold and wood lines for villager picks and charge resets.",
      "directiveRu": "Первый рыцарь на поле. Патрулируйте золото и лес оппонента, сбивая добычу и сбрасывая кулдаун чарджа.",
      "layout": {
        "type": "forward_barracks",
        "titleEn": "Archery Range Reinforcement",
        "titleRu": "Поддержка лучниками против копейщиков",
        "ascii": "[Enemy Base] <--- [Knight Harass]\n      ^\n[Archery Range] -> (Trains Archers to counter enemy spears)",
        "tipsEn": [
          "Never suicide knights into spearmen or under Town Center arrows.",
          "Cycle wounded knights back to base for Chivalry passive healing."
        ],
        "tipsRu": [
          "Никогда не теряйте рыцарей под ТЦ или в гуще копейщиков.",
          "Отводите раненых рыцарей в тыл для пассивного исцеления рыцарством (*Chivalry*)."
        ]
      },
      "mistakeEn": "Losing the initial 2 Royal Knights to Spearman ambush, losing map tempo.",
      "mistakeRu": "Потеря первых двух рыцарей в засаде копейщиков и потеря темпа на карте."
    },
    {
      "id": "french-B5-tWqB3770-t480s",
      "civ": "french",
      "videoId": "B5-tWqB3770",
      "videoTitle": "French Royal Knight Feudal Aggression Masterclass",
      "videoUrl": "https://www.youtube.com/watch?v=B5-tWqB3770&t=480s",
      "category": "build_order",
      "second": 480,
      "formattedTime": "08:00",
      "age": 2,
      "workers": {
        "food": 13,
        "wood": 9,
        "gold": 5,
        "stone": 3,
        "total": 30,
        "idle": 0
      },
      "landmark": null,
      "directiveEn": "Rally 3-4 villagers to Stone to drop 2nd Town Center while knight map presence keeps opponent contained.",
      "directiveRu": "Направьте 3-4 крестьян на камень для постройки 2-го ТЦ, пока рыцари сковывают противника.",
      "layout": {
        "type": "tc_expansion",
        "titleEn": "2nd Town Center Positioning",
        "titleRu": "Размещение 2-й Ратуши",
        "ascii": "    [Main TC]\n        |\n[Secondary Deer / Gold]\n        |\n    [2nd TC]",
        "tipsEn": [
          "Place 2nd TC directly locking down a contested deer patch or secondary gold vein.",
          "French 2TC scales villager production exponentially faster than other civs."
        ],
        "tipsRu": [
          "Ставьте 2-й ТЦ вплотную к спорному оленьему пастбищу или золотой жиле.",
          "2 ТЦ Франции наращивают рабочую силу экспоненциально быстрее других наций."
        ]
      },
      "mistakeEn": "Building 2nd TC in naked forward position without cavalry escort.",
      "mistakeRu": "Постройка 2-го ТЦ на открытой позиции спереди без сопровождения кавалерии."
    }
  ],
  "rus": [
    {
      "id": "rus-G0R0kXv8Xo4-t120s",
      "civ": "rus",
      "videoId": "G0R0kXv8Xo4",
      "videoTitle": "Rus Bounty Hunting & Fast Castle Masterclass",
      "videoUrl": "https://www.youtube.com/watch?v=G0R0kXv8Xo4&t=120s",
      "category": "build_order",
      "second": 120,
      "formattedTime": "02:00",
      "age": 1,
      "workers": {
        "food": 7,
        "wood": 3,
        "gold": 0,
        "stone": 0,
        "total": 10,
        "idle": 0
      },
      "landmark": null,
      "directiveEn": "Double scout opening: Kill deer/wolves across map to hit Tier 2/3 Bounty (+100/+250 gold bonus).",
      "directiveRu": "Старт в 2 скаута: убивайте оленей и волков по всей карте для взятия 2/3 тира баунти (+100/+250 золота).",
      "layout": {
        "type": "landmark_hub",
        "titleEn": "Hunting Cabin & Wood Aura Grid",
        "titleRu": "Сетка охотничьих изб в лесных массивах",
        "ascii": " [Dense Forest]\n       |\n[Hunting Cabin] -> Passive Gold Gen\n       |\n     [TC]",
        "tipsEn": [
          "Drop Hunting Cabin surrounded by dense tree line for maximum passive gold ticks.",
          "Rus does not need early gold mining camp due to bounty gold."
        ],
        "tipsRu": [
          "Ставьте охотничью избу в окружении густого леса для максимального притока золота.",
          "Руси не нужен ранний лагерь золотодобычи благодаря золоту за баунти."
        ]
      },
      "mistakeEn": "Missing enemy deer camps with scouts, failing to reach 250 Bounty before Feudal.",
      "mistakeRu": "Пропуск чужих оленей скаутами и недобор 250 баунти до выхода в Феодал."
    },
    {
      "id": "rus-G0R0kXv8Xo4-t210s",
      "civ": "rus",
      "videoId": "G0R0kXv8Xo4",
      "videoTitle": "Rus Bounty Hunting & Fast Castle Masterclass",
      "videoUrl": "https://www.youtube.com/watch?v=G0R0kXv8Xo4&t=210s",
      "category": "build_order",
      "second": 210,
      "formattedTime": "03:30",
      "age": 1,
      "workers": {
        "food": 9,
        "wood": 4,
        "gold": 2,
        "stone": 0,
        "total": 15,
        "idle": 0
      },
      "landmark": {
        "name": "Golden Gate",
        "builderCount": 3,
        "completionSec": 270
      },
      "directiveEn": "Golden Gate Landmark drop. Collect tickets every minute to rebalance economy for Fast Castle.",
      "directiveRu": "Постройка Золотых ворот. Каждую минуту меняйте билеты для балансировки экономики в Быстрый Замок.",
      "layout": {
        "type": "landmark_hub",
        "titleEn": "Golden Gate & Wooden Fortress Grid",
        "titleRu": "Сетка Золотых ворот и Деревянных крепостей",
        "ascii": "   [Golden Gate]\n         |\n[Wooden Fortress] -> (+20% Wood Harvest Aura)\n         |\n    [Lumber Camp]",
        "tipsEn": [
          "Surround main lumber camp with Wooden Fortress for +20% wood drop-off bonus.",
          "Use Golden Gate tickets to trade surplus wood into gold for Castle Age."
        ],
        "tipsRu": [
          "Прикрывайте лесопилку Деревянной крепостью для бонуса +20% к сдаче древесины.",
          "Используйте билеты Золотых ворот для обмена излишков дерева на золото для Замковой эпохи."
        ]
      },
      "mistakeEn": "Forgetting to redeem Golden Gate tickets, floating unused trade capacity.",
      "mistakeRu": "Забывание обмена билетов Золотых ворот и потеря торгового преимущества."
    },
    {
      "id": "rus-G0R0kXv8Xo4-t420s",
      "civ": "rus",
      "videoId": "G0R0kXv8Xo4",
      "videoTitle": "Rus Bounty Hunting & Fast Castle Masterclass",
      "videoUrl": "https://www.youtube.com/watch?v=G0R0kXv8Xo4&t=420s",
      "category": "build_order",
      "second": 420,
      "formattedTime": "07:00",
      "age": 3,
      "workers": {
        "food": 14,
        "wood": 8,
        "gold": 6,
        "stone": 0,
        "total": 28,
        "idle": 0
      },
      "landmark": {
        "name": "High Abbey",
        "builderCount": 4,
        "completionSec": 480
      },
      "directiveEn": "Castle Age hit: Train Warrior Monks immediately to secure all 5 Holy Relics and Sacred Sites.",
      "directiveRu": "Замковая эпоха достигнута: немедленно нанимайте монахов-воинов для сбора всех 5 реликвий и святынь.",
      "layout": {
        "type": "landmark_hub",
        "titleEn": "Relic Capture & Knight Screen",
        "titleRu": "Сбор реликвий и рыцарский скрининг",
        "ascii": "[Holy Relic] <--- [Warrior Monk]\n      |\n[Rus Knights] -> (Screening monks from enemy cavalry)",
        "tipsEn": [
          "Warrior Monks move swiftly on horseback; queue 2-3 simultaneously to grab multiple relics.",
          "Relics in Rus Wooden Fortresses or Abbey generate gold and attack aura."
        ],
        "tipsRu": [
          "Монахи-воины передвигаются верхом; заказывайте 2-3 сразу для одновременного сбора реликвий.",
          "Реликвии в деревянных крепостях или аббатстве дают стабильное золото и боевую ауру."
        ]
      },
      "mistakeEn": "Leaving Warrior Monks unprotected without escort when contesting contested relics.",
      "mistakeRu": "Отправка монахов-воинов за спорными реликвиями без боевого сопровождения."
    }
  ],
  "holy_roman_empire": [
    {
      "id": "holy_roman_empire-9sYg_J3K1aA-t180s",
      "civ": "holy_roman_empire",
      "videoId": "9sYg_J3K1aA",
      "videoTitle": "HRE Fast Castle & Regnitz Cathedral Mastery",
      "videoUrl": "https://www.youtube.com/watch?v=9sYg_J3K1aA&t=180s",
      "category": "build_order",
      "second": 180,
      "formattedTime": "03:00",
      "age": 1,
      "workers": {
        "food": 8,
        "wood": 0,
        "gold": 4,
        "stone": 0,
        "total": 12,
        "idle": 0
      },
      "landmark": {
        "name": "Aachen Chapel",
        "builderCount": 3,
        "completionSec": 240
      },
      "directiveEn": "Place Aachen Chapel to inspire both Gold and Food gatherers simultaneously with Prelate.",
      "directiveRu": "Поставьте Ахенскую капеллу так, чтобы прелат вдохновлял сборщиков золота и пищи одновременно.",
      "layout": {
        "type": "landmark_hub",
        "titleEn": "Aachen Chapel Dual-Resource Sweet Spot",
        "titleRu": "Точка Ахенской капеллы на 2 ресурса",
        "ascii": "   [Gold Vein]\n        |\n [Aachen Chapel] (Covers both inside 6-tile aura)\n        |\n [Sheep / Berries] --- [TC]",
        "tipsEn": [
          "Aachen aura reaches 6 tiles: ensure it envelopes gold vein and sheep under TC.",
          "Inspire bonus gives +40% gather speed across all affected villagers."
        ],
        "tipsRu": [
          "Аура капеллы действует на 6 клеток: убедитесь, что она охватывает жилу золота и овец под ТЦ.",
          "Эффект вдохновения дает +40% к скорости сбора всем находящимся в зоне крестьянам."
        ]
      },
      "mistakeEn": "Placing Aachen Chapel covering only sheep, missing the crucial gold vein.",
      "mistakeRu": "Постройка Ахенской капеллы только на овец с упущением золотой жилы."
    },
    {
      "id": "holy_roman_empire-9sYg_J3K1aA-t420s",
      "civ": "holy_roman_empire",
      "videoId": "9sYg_J3K1aA",
      "videoTitle": "HRE Fast Castle & Regnitz Cathedral Mastery",
      "videoUrl": "https://www.youtube.com/watch?v=9sYg_J3K1aA&t=420s",
      "category": "build_order",
      "second": 420,
      "formattedTime": "07:00",
      "age": 3,
      "workers": {
        "food": 14,
        "wood": 6,
        "gold": 8,
        "stone": 0,
        "total": 28,
        "idle": 0
      },
      "landmark": {
        "name": "Regnitz Cathedral",
        "builderCount": 5,
        "completionSec": 480
      },
      "directiveEn": "Fast Castle with Regnitz Cathedral. Dispatch 3 Prelates to collect all 3-5 Relics (+100% gold each).",
      "directiveRu": "Быстрый Замок через Регницкий собор. Отправьте 3 прелатов для сбора 3-5 реликвий (+100% золота за каждую).",
      "layout": {
        "type": "landmark_hub",
        "titleEn": "Regnitz Cathedral Relic Bank",
        "titleRu": "Банк реликвий Регницкого собора",
        "ascii": "   [Regnitz Cathedral]\n         |\n[Relic 1] [Relic 2] [Relic 3]\n (Generates +160 Gold/min each)",
        "tipsEn": [
          "3 relics in Regnitz yield +480 gold/min, funding non-stop Men-at-Arms and Knights.",
          "Protect prelate paths with early Horsemen or Spearmen."
        ],
        "tipsRu": [
          "3 реликвии в Регнице дают +480 золота/мин, финансируя непрерывный найм ландскнехтов и рыцарей.",
          "Прикрывайте маршруты движения прелатов ранними всадниками или копейщиками."
        ]
      },
      "mistakeEn": "Letting enemy scout kill unescorted Prelate carrying a relic.",
      "mistakeRu": "Потеря прелата с реликвией от вражеского скаута из-за отсутствия эскорта."
    }
  ]
} as const

/** Lookup milestone closest to a given match second for a civilization. */
export function getClosestMilestoneForCiv(
  civ: string,
  second: number,
): VisualMilestoneEntry | null {
  const list = VALDEMAR_MILESTONES_BY_CIV[civ] ?? []
  if (list.length === 0) return null
  let best = list[0]!
  let minDiff = Math.abs(best.second - second)
  for (const item of list) {
    const diff = Math.abs(item.second - second)
    if (diff < minDiff) {
      minDiff = diff
      best = item
    }
  }
  return best
}

/** Helper to retrieve the baseline benchmark for standard timing gates (3:30, 5:30, 8:00, 12:00). */
export function getTimingGateMilestone(civ: string, gate: 'feudal' | 'harass' | 'farms' | 'castle'): VisualMilestoneEntry | null {
  const targetSec = gate === 'feudal' ? 210 : gate === 'harass' ? 330 : gate === 'farms' ? 480 : 720
  return getClosestMilestoneForCiv(civ, targetSec)
}
