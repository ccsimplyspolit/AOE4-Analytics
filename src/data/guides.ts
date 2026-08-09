export interface Guide {
  slug: string
  title: string
  titleRu?: string
  category: 'fundamentals' | 'economy' | 'military' | 'strategy'
  summary: string
  summaryRu?: string
  readMinutes: number
  body: string // markdown
  bodyRu?: string // Russian markdown copy, kept beside the canonical English source.
}

export const GUIDES: Guide[] = [
  {
    slug: 'scouting-basics',
    title: 'Scouting Basics',
    titleRu: 'Основы разведки',
    category: 'fundamentals',
    summary:
      'Why scouting wins games: find the enemy, read their plan, and react before it hits you.',
    summaryRu:
      'Почему разведка выигрывает игры: найдите противника, прочитайте его план и реагируйте до того, как он сработает.',
    readMinutes: 2,
    body: `## Why scout?

Information is the cheapest advantage in Age of Empires IV. Knowing what your opponent is doing lets you build the right army and avoid nasty surprises.

## When to scout

- Send your starting scout out the moment the game begins.
- Keep scouting throughout the Dark and Feudal Ages, not just once.
- Re-scout after big moments, like when you suspect they aged up.

## How to scout

- Use your scout's vision to circle the map, not just the enemy base.
- Put the scout on patrol or move it manually to dodge enemy units.
- Pick up sheep and deer with your scout to feed your economy.

## What to look for

- **Military buildings** such as Barracks, Archery Ranges, and Stables tell you what army to expect.
- **Gold mines and sacred sites** reveal where they are committing resources.
- **Aggression signs** like forward buildings, walls, or units near your base mean an attack is coming.
- A heavily walled base usually means they are booming, so you have time to grow too.

Scout early, scout often, and let what you see shape every decision you make.`,
    bodyRu: `## Зачем нужна разведка?

Информация — самое дешёвое преимущество в Age of Empires IV. Если вы знаете, что делает противник, вы сможете создать правильную армию и избежать неприятных сюрпризов.

## Когда разведовать

- Отправьте стартового разведчика сразу после начала игры.
- Разведуйте всю Тёмную и Феодальную эпоху, а не только один раз.
- Повторяйте разведку после важных событий — например, когда ожидаете переход противника в новую эпоху.

## Как разведовать

- Используйте обзор разведчика, чтобы обходить карту, а не только базу противника.
- Поставьте разведчика на патруль или двигайте его вручную, чтобы уклоняться от вражеских войск.
- Собирайте овец и оленей разведчиком, чтобы поддерживать экономику.

## На что смотреть

- **Военные здания** — казармы, стрельбища и конюшни — показывают, какую армию ждать.
- **Золотые рудники и святые места** показывают, куда противник вкладывает ресурсы.
- **Признаки давления** — передовые здания, стены или войска рядом с вашей базой — предупреждают о скорой атаке.
- Хорошо укреплённая база обычно означает развитие экономики: у вас есть время развиваться в ответ.

Разведуйте рано и постоянно — пусть увиденное определяет каждое ваше решение.`,
  },
  {
    slug: 'economy-fundamentals',
    title: 'Economy Fundamentals',
    titleRu: 'Основы экономики',
    category: 'economy',
    summary:
      'A strong economy funds everything else. Keep villagers flowing and resources working.',
    summaryRu:
      'Сильная экономика обеспечивает всё остальное. Не останавливайте производство крестьян и постоянно используйте ресурсы.',
    readMinutes: 2,
    body: `## Never stop villager production

The single biggest habit for beginners: keep your Town Center making villagers nonstop. Every second your TC sits idle is lost economy you can never get back.

## Balance your resources

- **Food** powers villagers, most age-ups, and many units.
- **Wood** builds structures, walls, and supports archers.
- **Gold** funds stronger units, upgrades, and ranged troops.
- **Stone** is for defenses, extra Town Centers, and some landmarks.

Match what you gather to what you plan to build. Hoarding one resource while starving another slows you down.

## Add a second Town Center

Once your economy is stable, usually in the Feudal or Castle Age, a second Town Center doubles your villager production and helps you boom safely. Build it near a fresh resource cluster.

## Avoid floating and idle time

- **Floating resources** are piles you are not spending. If you have 800 unused food, queue villagers or units.
- **Idle TC time** means no villager is training. Set a rally point and keep the queue full.
- Idle villagers should be put back to work immediately.

A clean economy quietly wins games long before the fighting decides them.`,
    bodyRu: `## Не останавливайте производство крестьян

Главная привычка новичка — держать Городской центр в непрерывной работе. Каждая секунда простоя — потерянная экономика, которую уже не вернуть.

## Балансируйте ресурсы

- **Еда** нужна для крестьян, большинства переходов в эпоху и многих войск.
- **Дерево** используется для зданий, стен и лучников.
- **Золото** оплачивает сильные войска, улучшения и стрелковые отряды.
- **Камень** нужен для укреплений, дополнительных Городских центров и некоторых достопримечательностей.

Подстраивайте сбор под то, что собираетесь строить. Запас одного ресурса при нехватке другого замедляет развитие.

## Добавьте второй Городской центр

Когда экономика стабилизировалась — обычно в Феодальную или Замковую эпоху — второй Городской центр удваивает производство крестьян и помогает безопасно разгоняться. Ставьте его рядом с новым кластером ресурсов.

## Не копите ресурсы без цели и не допускайте простоя

- **Излишек ресурсов** — это накопленные ресурсы, которые вы не тратите. Если у вас 800 еды, поставьте крестьян или войска в очередь.
- **Простой Городского центра** означает, что крестьянин не производится. Установите точку сбора и держите очередь заполненной.
- Сразу возвращайте простаивающих крестьян к работе.

Чистая экономика выигрывает игры задолго до того, как решается сражение.`,
  },
  {
    slug: 'army-composition',
    title: 'Army Composition',
    titleRu: 'Состав армии',
    category: 'military',
    summary:
      'Age of Empires IV is rock-paper-scissors. Counter what you see and keep your army mixed.',
    summaryRu:
      'Age of Empires IV работает по принципу «камень–ножницы–бумага». Контрите увиденное и сохраняйте смешанный состав армии.',
    readMinutes: 2,
    body: `## The counter triangle

Most units have a job and a weakness. Learn the core relationships:

- **Spearmen** beat cavalry and horsemen with their anti-cavalry bonus.
- **Horsemen and cavalry** beat ranged units by closing the gap fast and running them down.
- **Archers** beat infantry, melting spearmen and other foot soldiers.
- **Crossbows and handcannoneers** beat heavy units like knights and men-at-arms.
- **Siege** beats buildings and tightly clumped armies.

## Read and react

Scout the enemy army, then build the counter:

- Facing knights? Add spearmen and crossbows.
- Facing archers? Send horsemen to chase them down.
- Facing massed infantry? Lean on archers.

## Keep your army mixed

No single unit wins every fight. A pure army is easy to hard-counter, so blend types:

- A frontline of infantry or cavalry to absorb damage.
- Ranged units behind to deal damage safely.
- A little siege to break clumps and defenses.

## Don't forget positioning

- Keep ranged units protected behind your melee.
- Focus-fire key targets like enemy siege.

A balanced army that answers what your opponent brings beats a bigger army that doesn't.`,
    bodyRu: `## Треугольник контров

У каждого войска есть задача и уязвимость. Изучите основные связи:

- **Копейщики** побеждают кавалерию благодаря бонусу против конницы.
- **Всадники и кавалерия** побеждают стрелков, быстро сокращая дистанцию и преследуя их.
- **Лучники** побеждают пехоту, быстро уничтожая копейщиков и другие пешие войска.
- **Арбалетчики и ручные кулевринеры** эффективны против тяжёлых войск — рыцарей и тяжёлой пехоты.
- **Осадные орудия** уничтожают здания и плотные скопления войск.

## Смотрите и реагируйте

Разведайте армию противника и создайте контр:

- Видите рыцарей? Добавьте копейщиков и арбалетчиков.
- Видите лучников? Отправьте всадников в обход и преследование.
- Видите массу пехоты? Сделайте упор на лучников.

## Сохраняйте смешанный состав

Один тип войск не выигрывает каждое сражение. Чистую армию легко законтрить, поэтому смешивайте типы:

- Передняя линия из пехоты или кавалерии принимает урон.
- Стрелки позади наносят безопасный урон.
- Небольшая группа осадных орудий ломает плотные построения и оборону.

## Не забывайте о позиционировании

- Держите стрелков за спиной у бойцов ближнего боя.
- Фокусируйте важные цели, например вражескую осадную технику.

Сбалансированная армия, отвечающая на состав противника, сильнее многочисленной армии без контров.`,
  },
  {
    slug: 'when-to-attack',
    title: 'When to Attack',
    titleRu: 'Когда атаковать',
    category: 'strategy',
    summary: 'Timing is everything. Hit when you have an edge, and never charge into a counter.',
    summaryRu:
      'Тайминг решает всё. Атакуйте, когда у вас есть преимущество, и не бросайтесь под контр.',
    readMinutes: 3,
    body: `## Find your timing window

Attacks work best when you have a temporary advantage:

- Just after an age-up, when your units outclass theirs.
- When you have more army than the enemy can field right now.
- When the enemy is greedy and under-defended.

## Always scout before committing

Never march in blind. Before you attack:

- Check the enemy army size and composition.
- Look for walls, towers, and defensive buildings.
- Confirm you are not walking into a hard counter.

## All-in vs boom

- **All-in** means pouring resources into army for a knockout blow. It wins fast but leaves you behind if it fails.
- **Booming** means investing in economy to overwhelm later. Safer, but vulnerable to early aggression.

Most games sit between these. Apply pressure to keep the enemy honest without bankrupting your economy.

## Punish greed

If scouting shows an opponent skipping defenses to boom, attack. Even light pressure forces them to spend on army and falls behind their plan.

## Don't attack into counters

- Avoid sending cavalry into a wall of spearmen.
- Don't push ranged armies into faster cavalry.
- If the math looks bad, back off and out-economy them instead.

Patience plus the right timing beats reckless aggression nearly every time.`,
    bodyRu: `## Найдите окно для атаки

Атаки лучше всего работают, когда у вас есть временное преимущество:

- Сразу после перехода в эпоху, когда ваши войска сильнее.
- Когда ваша армия превосходит то, что противник может выставить прямо сейчас.
- Когда противник жадничает и оставляет базу без защиты.

## Всегда разведуйте перед атакой

Не идите вслепую. Перед атакой:

- Проверьте размер и состав армии противника.
- Найдите стены, башни и оборонительные здания.
- Убедитесь, что не заходите под жёсткий контр.

## Олл-ин или развитие

- **Олл-ин** — вложить ресурсы в армию для решающего удара. Если атака провалится, вы сильно отстанете.
- **Развитие** — инвестировать в экономику, чтобы превзойти противника позже. Это безопаснее, но уязвимо для раннего давления.

Большинство игр находится между этими крайностями. Давите на противника, но не разоряйте свою экономику.

## Наказывайте жадность

Если разведка показывает, что противник пропустил защиту ради развития, атакуйте. Даже лёгкое давление заставит его тратить ресурсы на армию и нарушит его план.

## Не атакуйте под контры

- Не отправляйте кавалерию в стену копейщиков.
- Не ведите стрелковую армию навстречу быстрой кавалерии.
- Если размен плохой, отступите и переиграйте противника экономикой.

Терпение и правильный тайминг почти всегда сильнее безрассудной агрессии.`,
  },
  {
    slug: 'age-up-benchmarks',
    title: 'Age-Up Benchmarks',
    titleRu: 'Ориентиры перехода в эпоху',
    category: 'economy',
    summary: 'Rough timing targets to measure your progress. Heuristics, not hard rules.',
    summaryRu:
      'Примерные тайминги для оценки прогресса. Это ориентиры, а не жёсткие правила.',
    readMinutes: 2,
    body: `## These are heuristics, not laws

The numbers below are loose targets for low-to-mid level players to check their pace. They are **not strict rules**. Real timings depend heavily on your civilization, your build order, and your strategy. A fast aggressive build and a greedy boom will hit very different numbers, and that is fine.

## Age-up timing targets

- **Feudal Age:** roughly 5:00 to 6:30.
- **Castle Age:** roughly 10:00 to 14:00.

Slower than this isn't a failure, but if you are far behind these ranges, look for idle Town Center time or stalled villager production.

## Villager count targets

- About **20 villagers by 5:00**.
- About **40 or more villagers by 10:00**.

These assume a fairly economic build. Aggressive openings trade villagers for early army, so expect lower counts.

## How to use these

- Treat them as a rough mirror, not a scoreboard.
- If you are consistently behind, check for idle TC time and floating resources first.
- As you improve, your own benchmarks matter more than generic ones.

The goal isn't to hit exact numbers. It's to keep producing, keep spending, and keep getting a little faster each game.`,
    bodyRu: `## Это ориентиры, а не законы

Ниже приведены примерные цели для игроков начального и среднего уровня. Это **не строгие правила**. Реальные тайминги сильно зависят от цивилизации, билда и стратегии. Быстрая агрессия и жадное развитие выйдут в разные тайминги — и это нормально.

## Цели перехода в эпохи

- **Феодальная эпоха:** примерно 5:00–6:30.
- **Замковая эпоха:** примерно 10:00–14:00.

Более поздний переход не означает провал, но при сильном отставании проверьте простой Городского центра и остановки производства крестьян.

## Цели по числу крестьян

- Около **20 крестьян к 5:00**.
- Около **40 или больше крестьян к 10:00**.

Это ориентиры для относительно экономичного билда. Агрессивные открытия обменивают часть крестьян на раннюю армию, поэтому их число будет ниже.

## Как этим пользоваться

- Считайте это зеркалом для проверки, а не табло с оценкой.
- Если вы постоянно отстаёте, сначала проверьте простой Городского центра и излишки ресурсов.
- По мере роста собственные показатели станут полезнее общих ориентиров.

Цель — не попасть в точные цифры, а продолжать производить, тратить и становиться немного быстрее с каждой игрой.`,
  },
]
