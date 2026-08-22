/**
 * timingMatrix.ts - Authoritative competitive timing benchmarks and frame-by-frame evaluation.
 * Derived from Valdemar1902 transcripts, pro match reviews, and visual milestones.
 */

export interface PhaseTimingBenchmark {
  readonly phaseId: 'dark_opening' | 'feudal_age' | 'first_military' | 'farm_transition' | 'castle_age' | 'imperial_age'
  readonly nameEn: string
  readonly nameRu: string
  readonly targetSec: number
  readonly targetFormatted: string
  readonly windowSec: [number, number] // [Ideal, Acceptable]
  readonly idealWorkers: {
    readonly food: number
    readonly wood: number
    readonly gold: number
    readonly stone: number
    readonly total: number
  }
  readonly transcriptQuoteEn: string
  readonly transcriptQuoteRu: string
  readonly quoteVideoUrl: string
  readonly quoteTimestamp: string
  readonly layoutAscii: string
  readonly keyObjectiveEn: string
  readonly keyObjectiveRu: string
}

export interface CivTimingProfile {
  readonly civSlug: string
  readonly civName: string
  readonly feudalTargetSec: number // Target completion second
  readonly castleTargetSec: number
  readonly firstMilitaryTargetSec: number
  readonly standardLandmark: string
  readonly builderCount: number
  readonly phases: readonly PhaseTimingBenchmark[]
}

export const CIV_TIMING_PROFILES: Readonly<Record<string, CivTimingProfile>> = {
  byzantines: {
    civSlug: 'byzantines',
    civName: 'Byzantines',
    feudalTargetSec: 210, // 03:30
    castleTargetSec: 480, // 08:00 (Fast Castle) or 600 (10:00)
    firstMilitaryTargetSec: 330, // 05:30 (Limitanei/Mercs)
    standardLandmark: 'Grand Winery',
    builderCount: 3,
    phases: [
      {
        phaseId: 'dark_opening',
        nameEn: 'Cistern & Sheep Gathering (0:00 - 2:30)',
        nameRu: 'Постановка цистерны и сбор овец (0:00 - 2:30)',
        targetSec: 120,
        targetFormatted: '02:00',
        windowSec: [110, 140],
        idealWorkers: { food: 7, wood: 2, gold: 3, stone: 0, total: 12 },
        transcriptQuoteEn:
          'Connect Cistern Level 1 directly touching the Town Center and berry perimeter for immediate 20% gather and research speed buff.',
        transcriptQuoteRu:
          'Соединяйте цистерну 1-го уровня вплотную с ТЦ и периметром ягодников для мгновенного бонуса +20% к сбору и скорости исследований.',
        quoteVideoUrl: 'https://www.youtube.com/watch?v=ydDt3gp56fQ&t=120s',
        quoteTimestamp: '02:00',
        layoutAscii: '[TC] --- [Cistern Lv1] --- [Berries]',
        keyObjectiveEn: 'Rally 7 to sheep, 3 to gold mining camp, zero TC idle.',
        keyObjectiveRu: '7 рабочих на овец, 3 на золото, нулевой простой ТЦ.',
      },
      {
        phaseId: 'feudal_age',
        nameEn: 'Grand Winery Feudal Transition (2:30 - 3:45)',
        nameRu: 'Переход в Феодал через Винодельню (2:30 - 3:45)',
        targetSec: 210,
        targetFormatted: '03:30',
        windowSec: [200, 240],
        idealWorkers: { food: 8, wood: 4, gold: 3, stone: 0, total: 15 },
        transcriptQuoteEn:
          'Build Grand Winery with exactly 3 villagers. Never pull more than 4, or your food income stalls before you can produce mercs.',
        transcriptQuoteRu:
          'Стройте Великую винодельню ровно 3 крестьянами. Не снимайте больше 4, иначе приток пищи упадет до найма наемников.',
        quoteVideoUrl: 'https://www.youtube.com/watch?v=ydDt3gp56fQ&t=210s',
        quoteTimestamp: '03:30',
        layoutAscii: '[Grand Winery] (Aura covers future Olive Groves) -> [Berries]',
        keyObjectiveEn: 'Start Landmark at 2:30, finish by 3:30. Queue Wheelbarrow immediately.',
        keyObjectiveRu: 'Начало постройки в 2:30, завершение к 3:30. Заказ Тачки сразу по выходу.',
      },
      {
        phaseId: 'first_military',
        nameEn: 'Mercenary Camp & Frontier Screen (3:45 - 5:30)',
        nameRu: 'Лагерь наемников и прикрытие рубежей (3:45 - 5:30)',
        targetSec: 330,
        targetFormatted: '05:30',
        windowSec: [315, 360],
        idealWorkers: { food: 10, wood: 6, gold: 3, stone: 0, total: 19 },
        transcriptQuoteEn:
          'Place the Mercenary Camp and Barracks on the forward axis to shield your outer gold from early cavalry harass.',
        transcriptQuoteRu:
          'Ставьте лагерь наемников и казарму на передовой линии, чтобы прикрыть внешнее золото от ранних набегов конницы.',
        quoteVideoUrl: 'https://www.youtube.com/watch?v=ydDt3gp56fQ&t=330s',
        quoteTimestamp: '05:30',
        layoutAscii: '[Frontier] -> [Barracks] [Merc Camp] -> [Tower on Gold]',
        keyObjectiveEn: 'First 4 Limitanei + Mercenary squad on the field.',
        keyObjectiveRu: 'Первые 4 лимитанея + отряд наемников на поле.',
      },
      {
        phaseId: 'farm_transition',
        nameEn: 'Olive Grove 8-Farm Transition (6:00 - 8:30)',
        nameRu: 'Переход на 8 оливковых рощ (6:00 - 8:30)',
        targetSec: 480,
        targetFormatted: '08:00',
        windowSec: [450, 520],
        idealWorkers: { food: 14, wood: 10, gold: 4, stone: 0, total: 28 },
        transcriptQuoteEn:
          'Add Olive Groves one by one as wood accumulates. Never dump 500 wood at once, which halts your army replenishment.',
        transcriptQuoteRu:
          'Добавляйте оливковые рощи по одной по мере накопления дерева. Не сливайте 500 дерева разом, это остановит пополнение армии.',
        quoteVideoUrl: 'https://www.youtube.com/watch?v=ydDt3gp56fQ&t=480s',
        quoteTimestamp: '08:00',
        layoutAscii: '[Winery] surrounded by 8 [Olive Groves] generating Oil + Food',
        keyObjectiveEn: 'Establish steady olive grove ring around Winery aura for passive oil income.',
        keyObjectiveRu: 'Сформировать кольцо оливковых рощ в ауре винодельни для пассивного сбора масла.',
      },
      {
        phaseId: 'castle_age',
        nameEn: 'Castle Age & Relic Capture (8:30 - 12:00)',
        nameRu: 'Замковая эпоха и сбор реликвий (8:30 - 12:00)',
        targetSec: 600,
        targetFormatted: '10:00',
        windowSec: [540, 660],
        idealWorkers: { food: 18, wood: 12, gold: 8, stone: 0, total: 38 },
        transcriptQuoteEn:
          'Hit Castle Age and immediately dispatch Monks for the 5 Relics. Cataphracts + Crossbows give total map dominance.',
        transcriptQuoteRu:
          'Выходите в Замок и немедленно отправляйте монахов за 5 реликвиями. Катафракты + арбалетчики дают полный контроль карты.',
        quoteVideoUrl: 'https://www.youtube.com/watch?v=ydDt3gp56fQ&t=600s',
        quoteTimestamp: '10:00',
        layoutAscii: '[Fortress] + [Monastery] -> Capturing 3+ Relics',
        keyObjectiveEn: 'Secure at least 3 Holy Relics and construct Siege Workshop.',
        keyObjectiveRu: 'Забрать минимум 3 реликвии и построить осадную мастерскую.',
      },
    ],
  },
  english: {
    civSlug: 'english',
    civName: 'English',
    feudalTargetSec: 180, // 03:00
    castleTargetSec: 540, // 09:00
    firstMilitaryTargetSec: 270, // 04:30
    standardLandmark: 'Council Hall',
    builderCount: 3,
    phases: [
      {
        phaseId: 'dark_opening',
        nameEn: 'Dark Opening & Gold Camp (0:00 - 2:15)',
        nameRu: 'Старт в Тёмной эпохе и лагерь на золоте (0:00 - 2:15)',
        targetSec: 120,
        targetFormatted: '02:00',
        windowSec: [100, 135],
        idealWorkers: { food: 7, wood: 2, gold: 4, stone: 0, total: 13 },
        transcriptQuoteEn:
          'Rally 7 to sheep under Town Center, then 4 to gold. The English cheap farm bonus means you transition earlier than any civ.',
        transcriptQuoteRu:
          '7 на овец под ТЦ, затем 4 на золото. Английская скидка на фермы позволяет начать плавный переход раньше других цивилизаций.',
        quoteVideoUrl: 'https://www.youtube.com/watch?v=33YwM_i-x5g&t=120s',
        quoteTimestamp: '02:00',
        layoutAscii: '[TC] --- [Gold Camp] (Back / Safe side)',
        keyObjectiveEn: 'Gather 200 Gold, 400 Food with zero idle time.',
        keyObjectiveRu: 'Набрать 200 золота и 400 еды без простоя рабочих.',
      },
      {
        phaseId: 'feudal_age',
        nameEn: 'Council Hall Rapid Age-Up (2:15 - 3:15)',
        nameRu: 'Быстрый выход через Ратушу совета (2:15 - 3:15)',
        targetSec: 180,
        targetFormatted: '03:00',
        windowSec: [170, 210],
        idealWorkers: { food: 7, wood: 4, gold: 3, stone: 0, total: 14 },
        transcriptQuoteEn:
          'Drop Council Hall inside your Town Center Network of Castles aura. Never place it forward unprotected.',
        transcriptQuoteRu:
          'Ставьте Ратушу совета в радиусе ауры замковой сети ТЦ. Никогда не стройте её на открытом холме спереди.',
        quoteVideoUrl: 'https://www.youtube.com/watch?v=33YwM_i-x5g&t=180s',
        quoteTimestamp: '03:00',
        layoutAscii: '[TC Network Aura] ===> [Council Hall]',
        keyObjectiveEn: 'Complete Council Hall by 3:00–3:15 and begin non-stop double Longbow production.',
        keyObjectiveRu: 'Завершить Ратушу совета к 3:00–3:15 и запустить двойное производство длинных лучников.',
      },
      {
        phaseId: 'first_military',
        nameEn: 'Longbowman Perimeter Pressure (3:30 - 5:00)',
        nameRu: 'Давление длинными лучниками по периметру (3:30 - 5:00)',
        targetSec: 270,
        targetFormatted: '04:30',
        windowSec: [250, 300],
        idealWorkers: { food: 10, wood: 8, gold: 2, stone: 0, total: 20 },
        transcriptQuoteEn:
          'Your first 4 Longbowmen should harass enemy neutral gold and wood lines. Build a forward Outpost with Arrowslits.',
        transcriptQuoteRu:
          'Первые 4 длинных лучника должны перекрывать чужое нейтральное золото и лес. Поставьте аванпост с бойницами.',
        quoteVideoUrl: 'https://www.youtube.com/watch?v=33YwM_i-x5g&t=270s',
        quoteTimestamp: '04:30',
        layoutAscii: '[Enemy Gold] <--- [Outpost] <--- [Longbows + 2 Spears]',
        keyObjectiveEn: 'Zone opponent off outer resources without taking Town Center arrows.',
        keyObjectiveRu: 'Отрезать оппонента от внешних ресурсов, не заходя под выстрелы ТЦ.',
      },
      {
        phaseId: 'farm_transition',
        nameEn: 'English Cheap Farm Network (5:30 - 8:00)',
        nameRu: 'Сетка дешевых ферм англичан (5:30 - 8:00)',
        targetSec: 420,
        targetFormatted: '07:00',
        windowSec: [390, 480],
        idealWorkers: { food: 14, wood: 10, gold: 4, stone: 0, total: 28 },
        transcriptQuoteEn:
          'English farms cost only 37 wood and gather faster in mill aura. Wrap 8 farms around your first mill behind the Town Center.',
        transcriptQuoteRu:
          'Английские фермы стоят всего 37 дерева и собирают быстрее в ауре мельницы. Разместите 8 ферм вокруг мельницы за ТЦ.',
        quoteVideoUrl: 'https://www.youtube.com/watch?v=33YwM_i-x5g&t=420s',
        quoteTimestamp: '07:00',
        layoutAscii: '[Farm] [Farm] [Farm]\n[Farm] [Mill] [Farm] (Protected behind TC)\n[Farm] [Farm] [Farm]',
        keyObjectiveEn: 'Build 8-12 farms smoothly while maintaining military pressure.',
        keyObjectiveRu: 'Плавно построить 8-12 ферм, удерживая постоянное военное давление.',
      },
      {
        phaseId: 'castle_age',
        nameEn: 'White Tower or King’s Palace Transition (8:30 - 11:00)',
        nameRu: 'Выход в Замок через Белую башню или Дворец короля (8:30 - 11:00)',
        targetSec: 540,
        targetFormatted: '09:00',
        windowSec: [500, 600],
        idealWorkers: { food: 16, wood: 12, gold: 8, stone: 0, total: 36 },
        transcriptQuoteEn:
          'White Tower acts as a full Keep and produces siege at 100% speed. Drop it covering contested forward gold or relics.',
        transcriptQuoteRu:
          'Белая башня работает как полноценный донжон и производит осаду на 100% быстрее. Ставьте её на спорное золото или реликвии.',
        quoteVideoUrl: 'https://www.youtube.com/watch?v=33YwM_i-x5g&t=540s',
        quoteTimestamp: '09:00',
        layoutAscii: '[Contested Zone] ===> [The White Tower] (Defends + Trains Trebuchets)',
        keyObjectiveEn: 'Secure Castle Age, upgrade Veteran Longbows, and push with Trebuchets.',
        keyObjectiveRu: 'Взять Замок, улучшить лучников до ветеранов и начать осаду требушетами.',
      },
    ],
  },
  french: {
    civSlug: 'french',
    civName: 'French',
    feudalTargetSec: 195, // 03:15
    castleTargetSec: 510, // 08:30
    firstMilitaryTargetSec: 285, // 04:45
    standardLandmark: 'School of Cavalry',
    builderCount: 3,
    phases: [
      {
        phaseId: 'dark_opening',
        nameEn: 'French Economic Opening (0:00 - 2:15)',
        nameRu: 'Французский экономический старт (0:00 - 2:15)',
        targetSec: 120,
        targetFormatted: '02:00',
        windowSec: [100, 135],
        idealWorkers: { food: 8, wood: 2, gold: 4, stone: 0, total: 14 },
        transcriptQuoteEn:
          'French Town Centers produce villagers faster each age. Maintain uninterrupted queue from second 0.',
        transcriptQuoteRu:
          'Французский ТЦ производит рабочих быстрее в каждой эпохе. Держите непрерывную очередь с 0-й секунды.',
        quoteVideoUrl: 'https://www.youtube.com/watch?v=B5-tWqB3770&t=120s',
        quoteTimestamp: '02:00',
        layoutAscii: '[Mill] --- [TC] --- [Gold Camp]',
        keyObjectiveEn: '8 food, 4 gold. Start Feudal Landmark by 2:15.',
        keyObjectiveRu: '8 на еду, 4 на золото. Начать постройку ратуши к 2:15.',
      },
      {
        phaseId: 'feudal_age',
        nameEn: 'School of Cavalry Drop (2:15 - 3:20)',
        nameRu: 'Постановка Школы кавалерии (2:15 - 3:20)',
        targetSec: 195,
        targetFormatted: '03:15',
        windowSec: [180, 220],
        idealWorkers: { food: 9, wood: 4, gold: 4, stone: 0, total: 17 },
        transcriptQuoteEn:
          'School of Cavalry produces Royal Knights 20% faster. Start producing your first knight the split second it completes.',
        transcriptQuoteRu:
          'Школа кавалерии производит королевских рыцарей на 20% быстрее. Заказывайте первого рыцаря в ту же секунду, как здание готово.',
        quoteVideoUrl: 'https://www.youtube.com/watch?v=B5-tWqB3770&t=195s',
        quoteTimestamp: '03:15',
        layoutAscii: '[TC] ===> [School of Cavalry] (Facing enemy path)',
        keyObjectiveEn: 'Complete landmark at 3:15, queue Knight #1, buy discounted Wheelbarrow.',
        keyObjectiveRu: 'Завершить здание к 3:15, заказать 1-го рыцаря, купить Тачку со скидкой.',
      },
      {
        phaseId: 'first_military',
        nameEn: 'Royal Knight Charge & Harass (3:30 - 5:00)',
        nameRu: 'Чардж и набеги королевских рыцарей (3:30 - 5:00)',
        targetSec: 285,
        targetFormatted: '04:45',
        windowSec: [270, 315],
        idealWorkers: { food: 11, wood: 6, gold: 4, stone: 0, total: 21 },
        transcriptQuoteEn:
          'Cycle your injured knights back to base to heal with Chivalry. Never let a knight die unnecessarily.',
        transcriptQuoteRu:
          'Отводите раненых рыцарей в тыл для пассивного лечения рыцарством. Никогда не отдавайте рыцаря впустую.',
        quoteVideoUrl: 'https://www.youtube.com/watch?v=B5-tWqB3770&t=285s',
        quoteTimestamp: '04:45',
        layoutAscii: '[Enemy Woodline] <=== [Knight 1 & 2] (Hit & Run with Chivalry)',
        keyObjectiveEn: 'Force enemy villagers into garrison, idle enemy economy, build Archery Range.',
        keyObjectiveRu: 'Загнать крестьян врага в укрытия, сбить экономику, поставить стрельбище.',
      },
      {
        phaseId: 'farm_transition',
        nameEn: '2nd Town Center Expansion (5:30 - 8:00)',
        nameRu: 'Экспансия во 2-й Городской центр (5:30 - 8:00)',
        targetSec: 420,
        targetFormatted: '07:00',
        windowSec: [390, 480],
        idealWorkers: { food: 13, wood: 9, gold: 4, stone: 3, total: 29 },
        transcriptQuoteEn:
          'Send 3-4 villagers to stone while your knights dominate the map. Drop 2nd TC on contested deer or secondary gold.',
        transcriptQuoteRu:
          'Отправьте 3-4 рабочих на камень, пока рыцари контролируют карту. Ставьте 2-й ТЦ на спорных оленей или второе золото.',
        quoteVideoUrl: 'https://www.youtube.com/watch?v=B5-tWqB3770&t=420s',
        quoteTimestamp: '07:00',
        layoutAscii: '[Main TC] <----------------> [2nd TC on Contested Deer/Gold]',
        keyObjectiveEn: 'Establish 2nd TC by 6:30–7:00 and scale double villager production.',
        keyObjectiveRu: 'Поставить 2-й ТЦ к 6:30–7:00 и включить двойное производство рабочих.',
      },
    ],
  },
  rus: {
    civSlug: 'rus',
    civName: 'Rus',
    feudalTargetSec: 210, // 03:30
    castleTargetSec: 450, // 07:30 (Fast Castle)
    firstMilitaryTargetSec: 330, // 05:30
    standardLandmark: 'Golden Gate',
    builderCount: 3,
    phases: [
      {
        phaseId: 'dark_opening',
        nameEn: '2-Scout Hunting & Bounty Race (0:00 - 2:15)',
        nameRu: 'Охота в 2 скаута и гонка за баунти (0:00 - 2:15)',
        targetSec: 120,
        targetFormatted: '02:00',
        windowSec: [100, 135],
        idealWorkers: { food: 7, wood: 3, gold: 0, stone: 0, total: 10 },
        transcriptQuoteEn:
          'Kill all deer and wolves with 2 scouts. Hit 250 Bounty for +10% food gather rate and gold rewards.',
        transcriptQuoteRu:
          'Убивайте всех оленей и волков 2 скаутами. Наберите 250 баунти для бонуса +10% к сбору пищи и золота.',
        quoteVideoUrl: 'https://www.youtube.com/watch?v=G0R0kXv8Xo4&t=120s',
        quoteTimestamp: '02:00',
        layoutAscii: '[Forest] ===> [Hunting Cabin] (Passive gold ticks)',
        keyObjectiveEn: 'Drop Hunting Cabin, reach 250+ Bounty before Feudal.',
        keyObjectiveRu: 'Поставить охотничью избу, взять 250+ баунти до выхода в Феодал.',
      },
      {
        phaseId: 'feudal_age',
        nameEn: 'Golden Gate Rebalance (2:15 - 3:30)',
        nameRu: 'Балансировка через Золотые ворота (2:15 - 3:30)',
        targetSec: 210,
        targetFormatted: '03:30',
        windowSec: [195, 235],
        idealWorkers: { food: 9, wood: 4, gold: 2, stone: 0, total: 15 },
        transcriptQuoteEn:
          'Golden Gate gives free trade tickets. Exchange surplus wood for gold to hit Fast Castle at record speed.',
        transcriptQuoteRu:
          'Золотые ворота дают бесплатные билеты обмена. Меняйте излишки дерева на золото для рекордного выхода в Замок.',
        quoteVideoUrl: 'https://www.youtube.com/watch?v=G0R0kXv8Xo4&t=210s',
        quoteTimestamp: '03:30',
        layoutAscii: '[Wooden Fortress] -> (+20% Wood Harvest) -> [Lumber Camp]',
        keyObjectiveEn: 'Build Golden Gate by 3:30, protect woodline with Wooden Fortress.',
        keyObjectiveRu: 'Построить Золотые ворота к 3:30, прикрыть лес Деревянной крепостью.',
      },
      {
        phaseId: 'castle_age',
        nameEn: 'High Abbey & Fast Warrior Monks (6:30 - 8:00)',
        nameRu: 'Высокое аббатство и конные монахи (6:30 - 8:00)',
        targetSec: 450,
        targetFormatted: '07:30',
        windowSec: [420, 500],
        idealWorkers: { food: 14, wood: 8, gold: 6, stone: 0, total: 28 },
        transcriptQuoteEn:
          'Train 2-3 Warrior Monks on horseback immediately. Secure all 5 relics across the map with knight escort.',
        transcriptQuoteRu:
          'Немедленно нанимайте 2-3 конных монаха-воина. Соберите все 5 реликвий по карте под прикрытием рыцарей.',
        quoteVideoUrl: 'https://www.youtube.com/watch?v=G0R0kXv8Xo4&t=450s',
        quoteTimestamp: '07:30',
        layoutAscii: '[Relic Spot] <=== [Warrior Monk on Horseback] + [Rus Knights]',
        keyObjectiveEn: 'Fast Castle hit at 7:00–7:30, collect 3–5 Relics into Wooden Fortresses.',
        keyObjectiveRu: 'Выход в Замок на 7:00–7:30, сбор 3–5 реликвий в деревянные крепости.',
      },
    ],
  },
  holy_roman_empire: {
    civSlug: 'holy_roman_empire',
    civName: 'Holy Roman Empire',
    feudalTargetSec: 180, // 03:00
    castleTargetSec: 420, // 07:00 (Fast Castle)
    firstMilitaryTargetSec: 360, // 06:00
    standardLandmark: 'Aachen Chapel',
    builderCount: 3,
    phases: [
      {
        phaseId: 'dark_opening',
        nameEn: 'Prelate Inspire & Double Resource Spot (0:00 - 2:00)',
        nameRu: 'Вдохновение прелатом точки с 2 ресурсами (0:00 - 2:00)',
        targetSec: 105,
        targetFormatted: '01:45',
        windowSec: [95, 120],
        idealWorkers: { food: 8, wood: 0, gold: 4, stone: 0, total: 12 },
        transcriptQuoteEn:
          'Prelate inspire gives +40% gather speed. Ensure the Aachen Chapel aura covers both your main gold and food source.',
        transcriptQuoteRu:
          'Вдохновение прелата дает +40% к скорости сбора. Убедитесь, что аура Ахенской капеллы накрывает и золото, и пищу.',
        quoteVideoUrl: 'https://www.youtube.com/watch?v=9sYg_J3K1aA&t=105s',
        quoteTimestamp: '01:45',
        layoutAscii: '[Aachen Chapel Sweet Spot] ===> Covers [Gold Vein] + [Sheep under TC]',
        keyObjectiveEn: 'Inspire sheep and gold gatherers, accumulate 200 gold with zero mining camp.',
        keyObjectiveRu: 'Вдохновлять сборщиков золота и овец, собрать 200 золота без задержек.',
      },
      {
        phaseId: 'feudal_age',
        nameEn: 'Aachen Chapel Fast Castle Staging (2:00 - 3:00)',
        nameRu: 'Ахенская капелла и подготовка к Быстрому Замку (2:00 - 3:00)',
        targetSec: 180,
        targetFormatted: '03:00',
        windowSec: [170, 205],
        idealWorkers: { food: 10, wood: 0, gold: 5, stone: 0, total: 15 },
        transcriptQuoteEn:
          'Finish Aachen at 3:00. Keep 100% of villagers inside Aachen aura. Do not chop wood until Castle Age resources are banked.',
        transcriptQuoteRu:
          'Завершите Капеллу к 3:00. Держите 100% рабочих в ауре. Не рубите дерево, пока не накоплены ресурсы на Замок.',
        quoteVideoUrl: 'https://www.youtube.com/watch?v=9sYg_J3K1aA&t=180s',
        quoteTimestamp: '03:00',
        layoutAscii: '[Aachen Chapel Aura] === 6 Tile Radius ===> (+40% to all 15 vills)',
        keyObjectiveEn: 'Bank 1200 Food, 600 Gold by 6:00.',
        keyObjectiveRu: 'Накопить 1200 еды и 600 золота к 6:00.',
      },
      {
        phaseId: 'castle_age',
        nameEn: 'Regnitz Cathedral & Relic Sweep (6:30 - 7:30)',
        nameRu: 'Регницкий собор и сбор всех реликвий (6:30 - 7:30)',
        targetSec: 420,
        targetFormatted: '07:00',
        windowSec: [390, 460],
        idealWorkers: { food: 14, wood: 6, gold: 8, stone: 0, total: 28 },
        transcriptQuoteEn:
          'Drop Regnitz Cathedral with 5 villagers. 3 Relics inside Regnitz generate +480 Gold/min, funding endless Men-at-Arms.',
        transcriptQuoteRu:
          'Стройте Регницкий собор 5 рабочими. 3 реликвии внутри дают +480 золота/мин, финансируя бесконечных ландскнехтов и латников.',
        quoteVideoUrl: 'https://www.youtube.com/watch?v=9sYg_J3K1aA&t=420s',
        quoteTimestamp: '07:00',
        layoutAscii: '[Regnitz Cathedral] (Holds 3 Relics for +480 Gold/min) <=== [3 Prelates]',
        keyObjectiveEn: 'Hit Castle Age at 7:00, deposit 3+ Relics into Regnitz.',
        keyObjectiveRu: 'Взять Замок к 7:00, вложить 3+ реликвии в Регницкий собор.',
      },
    ],
  },
}

export type TimingGrade = 'S' | 'A' | 'B' | 'C' | 'D'

export interface TimingEvaluationResult {
  readonly grade: TimingGrade
  readonly diffSec: number
  readonly targetSec: number
  readonly actualSec: number
  readonly status: 'ahead' | 'on_target' | 'slight_delay' | 'significant_delay' | 'critical_delay'
  readonly feedbackEn: string
  readonly feedbackRu: string
  readonly actionableTipEn: string
  readonly actionableTipRu: string
}

/**
 * Evaluates an actual match milestone timing against the frame-accurate Valdemar benchmark.
 */
export function evaluateTimingBenchmark(
  civ: string,
  milestone: 'feudal' | 'castle' | 'military',
  actualSec: number,
): TimingEvaluationResult {
  const profile = CIV_TIMING_PROFILES[civ.toLowerCase()] ?? CIV_TIMING_PROFILES['english']!
  const targetSec =
    milestone === 'feudal'
      ? profile.feudalTargetSec
      : milestone === 'castle'
        ? profile.castleTargetSec
        : profile.firstMilitaryTargetSec

  const diffSec = actualSec - targetSec

  if (diffSec <= 10) {
    return {
      grade: 'S',
      diffSec,
      targetSec,
      actualSec,
      status: diffSec < 0 ? 'ahead' : 'on_target',
      feedbackEn: 'Flawless Conqueror-level timing! Zero economic stalling.',
      feedbackRu: 'Безупречный тайминг уровня Conqueror! Нулевой простой экономики.',
      actionableTipEn: 'Maintain this pace and focus on active map scouting.',
      actionableTipRu: 'Удерживайте этот темп и сосредоточьтесь на разведке карты.',
    }
  }

  if (diffSec <= 35) {
    return {
      grade: 'A',
      diffSec,
      targetSec,
      actualSec,
      status: 'on_target',
      feedbackEn: 'Solid Diamond-level execution. Minor optimization possible.',
      feedbackRu: 'Отличное исполнение уровня Diamond. Возможна небольшая оптимизация.',
      actionableTipEn: 'Check villager pathing to eliminate slight walking delays.',
      actionableTipRu: 'Проверьте пути движения крестьян, чтобы убрать лишнюю ходьбу.',
    }
  }

  if (diffSec <= 65) {
    return {
      grade: 'B',
      diffSec,
      targetSec,
      actualSec,
      status: 'slight_delay',
      feedbackEn: 'Noticeable delay (~1 min behind pro benchmarks).',
      feedbackRu: 'Заметная задержка (~1 мин отставания от про-эталонов).',
      actionableTipEn: 'Verify Town Center queue was never idle during the Dark Age.',
      actionableTipRu: 'Убедитесь, что очередь производства в ТЦ не простаивала в Тёмную эпоху.',
    }
  }

  if (diffSec <= 105) {
    return {
      grade: 'C',
      diffSec,
      targetSec,
      actualSec,
      status: 'significant_delay',
      feedbackEn: 'Significant macro leak detected. Opponent has tempo advantage.',
      feedbackRu: 'Обнаружена существенная утечка макро. У противника преимущество по темпу.',
      actionableTipEn: 'Check for floating unspent resources or panicked villager idling.',
      actionableTipRu: 'Проверьте избыток ресурсов или простой рабочих при атаке.',
    }
  }

  return {
    grade: 'D',
    diffSec,
    targetSec,
    actualSec,
    status: 'critical_delay',
    feedbackEn: 'Critical delay (>2 mins). Major disruption or severe TC idle occurred.',
    feedbackRu: 'Критическая задержка (>2 мин). Сильный простой ТЦ или срыв билда.',
    actionableTipEn: 'Review the First Cause in ReplayLab at minute 2:30–3:30.',
    actionableTipRu: 'Разберите первопричину срыва в ReplayLab на 2:30–3:30 минутах.',
  }
}
