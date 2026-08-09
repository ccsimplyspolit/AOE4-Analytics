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

export interface GuideResource {
  id: string
  kind: 'article' | 'video' | 'patch' | 'catalogue'
  title: string
  titleRu: string
  description: string
  descriptionRu: string
  source: string
  url: string
  publishedAt?: string
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
    summaryRu: 'Примерные тайминги для оценки прогресса. Это ориентиры, а не жёсткие правила.',
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
  {
    slug: 'build-order-reading',
    title: 'How to Read a Build Order',
    titleRu: 'Как читать билд-ордер',
    category: 'fundamentals',
    summary:
      'Turn a build order into checkpoints and decisions instead of memorizing a rigid sequence.',
    summaryRu:
      'Превратите билд-ордер в набор контрольных точек и решений, а не в бездумное заучивание последовательности.',
    readMinutes: 5,
    body: `## A build order is a decision map

A build order is a tested route to a goal: a fast landmark, an early army, a second Town Center, or a timing attack. It is not a promise that every game will look identical. Read every step as **action + reason + condition**.

## Read checkpoints, not a script

Before playing, mark five checkpoints:

- the first house and the first production building;
- the age-up resource and the number of builders;
- the first military unit and the first pressure window;
- the transition resource split after aging up;
- the point where the build becomes a composition and a win condition.

If a checkpoint is late, do not blindly rush the next line. Identify the cause: idle Town Center, walking time, a lost villager, an unscouted threat, or a resource that was spent on defense.

## Convert a line into a test

For each line ask: **What should I see? What can stop it? What do I do if it fails?** For example, “stable at 4:30” means you need the wood before 4:30, a safe location, and a plan if the opponent opens spearmen. This turns a copied build into a reusable opening.

## Branches are part of the build

Keep a small response table beside the build:

- early cavalry seen → add spears, protect exposed gold, delay greedy tech;
- two Town Centers seen → pressure production or take your own economy step;
- no military building by the first scout pass → check for a fast Castle or trade plan;
- forward outpost or tower → stop the next greedy investment and secure the approach.

## Practice loop

Play the opening three times without changing the civilization. After each game record only the first missed checkpoint, the reason, and the recovery. Keep the build when it teaches a repeatable decision; replace it when its assumptions no longer match the current patch or map.
`,
    bodyRu: `## Билд-ордер — это карта решений

Билд-ордер — проверенный маршрут к цели: быстрому landmark, ранней армии, второму Городскому центру или тайминговой атаке. Он не обещает, что каждая игра будет одинаковой. Читайте каждый шаг как **действие + причина + условие**.

## Запоминайте контрольные точки, а не сценарий

Перед игрой отметьте пять контрольных точек:

- первый дом и первое военное здание;
- ресурс для перехода и число строителей;
- первый боевой юнит и окно давления;
- распределение ресурсов после перехода в эпоху;
- момент, когда билд превращается в состав армии и условие победы.

Если точка запоздала, не бегите вслепую к следующей строке. Найдите причину: простой Городского центра, долгий путь, потерянный крестьянин, неразведанная угроза или ресурс, потраченный на защиту.

## Превращайте строку в проверку

Для каждого шага спросите: **Что я должен увидеть? Что может это остановить? Что делать, если не получилось?** Например, «конюшня в 4:30» требует дерева к 4:30, безопасного места и плана на случай ранних копейщиков. Так скопированный билд становится универсальным открытием.

## Ветки — часть билда

Держите рядом небольшую таблицу ответов:

- заметили раннюю кавалерию → добавьте копейщиков, защитите открытое золото, отложите жадные улучшения;
- увидели два Городских центра → давите производством или сами переходите к развитию;
- после первой разведки нет военного здания → проверьте быстрый Castle или торговый план;
- передовая башня или outpost → отмените следующую жадную инвестицию и обезопасьте подход.

## Цикл тренировки

Сыграйте открытие три раза одной цивилизацией. После каждой игры запишите только первую пропущенную точку, причину и восстановление. Сохраняйте билд, если он учит повторяемому решению; заменяйте его, если его предположения больше не соответствуют патчу или карте.
`,
  },
  {
    slug: 'adaptive-scouting',
    title: 'Adaptive Scouting: From Information to Action',
    titleRu: 'Адаптивная разведка: от информации к действию',
    category: 'strategy',
    summary:
      'A practical scouting loop: observe, classify the threat, choose the smallest response, and verify it.',
    summaryRu:
      'Практический цикл разведки: увидеть, классифицировать угрозу, выбрать минимальный ответ и проверить результат.',
    readMinutes: 5,
    body: `## Scout for decisions

Do not scout because the guide says “scout.” Scout to answer a question: Is this player attacking, booming, teching, trading, or hiding a transition? A useful scout report ends with one action you can take.

## Three passes

1. **Opening pass (0:00–3:00):** find sheep, the opponent's gold, the first production clue, and any forward foundation.
2. **Age-up pass:** identify the landmark, builder count, new resource commitment, and whether the opponent can support units immediately.
3. **Composition pass:** check production buildings, upgrades, reinforcements, and the resource the opponent must protect next.

## Classify before you counter

Use four threat classes:

- **Tempo:** early units or forward buildings. Add the cheapest defense that buys time.
- **Economy:** extra Town Center, trade, farms, or a protected gold. Pressure the investment or match the economy.
- **Technology:** fast Castle, relics, sacred sites, or unique upgrades. Deny the timing or force the opponent to spend on defense.
- **Information denial:** walls, keeps, stealth, or a missing army. Search the edges and protect your own vulnerable resource.

## Verify your read

One scout pass is a hypothesis. Revisit after 30–60 seconds or after the first fight. If the expected army is not there, do not keep producing the same counter. Change the plan and write down what disproved your read.

## What to record in a review

For every missed read, record the timestamp, visible evidence, the conclusion you made, and the smallest action that would have changed the game. This is more useful than writing “I did not scout enough.”
`,
    bodyRu: `## Разведывайте ради решений

Не разведуйте только потому, что так написано в гайде. Разведывайте, чтобы ответить на вопрос: противник атакует, развивается, исследует технологии, торгует или скрывает переход? Хороший отчёт разведки заканчивается действием.

## Три прохода

1. **Стартовый проход (0:00–3:00):** найдите овец, золото противника, первое военное здание и передовую постройку.
2. **Проход во время перехода:** определите landmark, число строителей, новый ресурс и способен ли противник сразу поддержать войска.
3. **Проход по составу:** проверьте здания производства, улучшения, подкрепления и следующий ресурс, который противник обязан защищать.

## Сначала классифицируйте, потом контрьте

Используйте четыре класса угроз:

- **Темп:** ранние войска или передовые здания. Добавьте минимальную защиту, которая покупает время.
- **Экономика:** второй Городской центр, торговля, фермы или защищённое золото. Давите на инвестицию или отвечайте развитием.
- **Технологии:** быстрый Castle, реликвии, святые места или уникальные улучшения. Сорвите тайминг или заставьте тратить ресурсы на защиту.
- **Отказ в информации:** стены, keep, скрытность или пропавшая армия. Ищите края карты и защищайте уязвимый ресурс.

## Проверяйте свою гипотезу

Один проход — только гипотеза. Вернитесь через 30–60 секунд или после первой драки. Если ожидаемой армии нет, не продолжайте делать тот же контр. Измените план и запишите, что опровергло вашу догадку.

## Что записывать в разборе

Для каждого пропущенного чтения запишите таймстамп, видимое доказательство, свой вывод и минимальное действие, которое изменило бы игру. Это полезнее, чем фраза «мало разведовал».
`,
  },
  {
    slug: 'replay-review-checklist',
    title: 'Replay Review Checklist',
    titleRu: 'Чек-лист разбора реплея',
    category: 'fundamentals',
    summary: 'A repeatable 15-minute review that separates confirmed evidence from assumptions.',
    summaryRu:
      'Повторяемый 15-минутный разбор, который отделяет подтверждённые данные от предположений.',
    readMinutes: 6,
    body: `## Pass one: identify the loss condition

Watch the final two minutes first. Ask what actually ended the game: lost army, exposed economy, failed timing, tech disadvantage, or a teammate collapse. Do not start by counting every mistake.

## Pass two: check the five controllable lanes

- **Production:** Town Center and military buildings working; queues spent before the next fight.
- **Economy:** villagers on the right resources; no large bank that cannot become units, upgrades, or infrastructure.
- **Information:** scouting before transitions and before committing the army.
- **Position:** reinforcements, vision, retreat path, and whether the fight happened on your terms.
- **Conversion:** after winning a fight, did you take a base, resource, landmark, relic, sacred site, or extra Town Center?

## Confirm before you blame

Use the replay timeline and stats as evidence, not as a complete explanation. A production gap confirms that no unit was queued; it does not prove the cause. A lower score confirms a gap in the recorded score, not who made a strategic mistake. Label every conclusion as **confirmed**, **likely**, or **unknown**.

## Finish with one experiment

Turn the largest repeatable problem into a measurable next-game goal: “zero Town Center gaps over 10 seconds before 8:00,” “scout the opponent twice before Feudal,” or “retreat when the counter appears.” One experiment is easier to verify than ten vague promises.
`,
    bodyRu: `## Первый проход: найдите условие поражения

Сначала посмотрите последние две минуты. Что реально закончило игру: проигранная армия, открытая экономика, сорванный тайминг, технологическое отставание или падение тиммейта? Не начинайте с подсчёта каждой ошибки.

## Второй проход: проверьте пять управляемых направлений

- **Производство:** Городской центр и военные здания работают; очереди заполнены до следующей драки.
- **Экономика:** крестьяне стоят на нужных ресурсах; большой запас превращается в войска, улучшения или инфраструктуру.
- **Информация:** разведка перед переходами и перед вводом армии.
- **Позиция:** подкрепления, обзор, путь отхода и драка на выгодных условиях.
- **Конверсия:** после выигранной драки вы взяли базу, ресурс, landmark, реликвию, святое место или второй Городской центр?

## Сначала подтвердите, потом обвиняйте

Используйте таймлайн реплея и статистику как доказательства, а не как полное объяснение. Простой производства подтверждает, что юнит не был поставлен в очередь, но не объясняет почему. Отставание счёта подтверждает разрыв, но не доказывает стратегическую ошибку. Помечайте вывод как **подтверждённый**, **вероятный** или **неизвестный**.

## Завершайте одним экспериментом

Превратите главную повторяемую проблему в цель на следующую игру: «ни одного простоя Городского центра дольше 10 секунд до 8:00», «разведать противника дважды до Feudal» или «отступить при появлении контра». Один эксперимент проще проверить, чем десять общих обещаний.
`,
  },
  {
    slug: 'team-game-roles',
    title: 'Team Game Roles and Timing',
    titleRu: 'Роли и тайминги в командной игре',
    category: 'strategy',
    summary: 'Coordinate pressure, defense, and economy so that four players act as one plan.',
    summaryRu:
      'Согласуйте давление, защиту и экономику, чтобы четыре игрока действовали как единый план.',
    readMinutes: 5,
    body: `## Pick a job before a build

Team games are not four separate 1v1s. Decide who creates the first pressure, who protects the exposed flank, who scales the economy, and who controls the map or water. The civilization lineup should inform the jobs, not dictate them blindly.

## Share timing windows

Call out three times: when the first army moves, when reinforcements arrive, and when the team changes age or composition. A small army arriving together is stronger than four larger armies arriving one at a time.

## Protect the weakest link

If one teammate is being rushed, do not all abandon your plans. Send the smallest useful help: a few units, a wall segment, vision, or a counter building. Keep your own production alive so the rescue does not become a second loss.

## Convert team advantages

After a successful fight, choose one shared objective: destroy production, deny a resource, take a sacred site, secure a trade route, or push a landmark. Ping the objective and rally to it; damage without conversion gives the opponent time to recover.
`,
    bodyRu: `## Выберите задачу до начала билда

Командная игра — не четыре отдельных 1v1. Заранее решите, кто создаёт первое давление, кто защищает открытый фланг, кто развивает экономику, а кто контролирует карту или воду. Состав цивилизаций должен подсказывать роли, но не диктовать их вслепую.

## Согласуйте окна тайминга

Назовите три момента: выход первой армии, приход подкреплений и смену эпохи или состава. Небольшая армия, пришедшая вместе, сильнее четырёх больших армий, пришедших по одной.

## Защищайте слабое звено

Если одного тиммейта рашат, не бросайте все свои планы. Отправьте минимальную полезную помощь: несколько юнитов, кусок стены, обзор или здание-контр. Не останавливайте собственное производство, чтобы спасение не превратилось во второе поражение.

## Превращайте преимущество команды в результат

После выигранной драки выберите одну общую цель: снести производство, закрыть ресурс, взять святое место, обезопасить торговый маршрут или надавить на landmark. Отметьте цель и соберите армию к ней; урон без конверсии даёт противнику время восстановиться.
`,
  },
  {
    slug: 'patch-aware-guides',
    title: 'Patch-Aware Guide Reading',
    titleRu: 'Как читать гайды с учётом патча',
    category: 'economy',
    summary:
      'Avoid stale advice: check the patch, map pool, assumptions, and whether the build still matches the game data.',
    summaryRu:
      'Избегайте устаревших советов: проверяйте патч, пул карт, предположения и соответствие билда данным игры.',
    readMinutes: 4,
    body: `## Version comes first

Before copying a build, record its patch or season. Balance changes can alter a unit cost, production time, landmark bonus, or map pool without changing the title of a video. Treat an unversioned build as a hypothesis until you test it.

## Check the assumptions

Look for the map type, starting resources, game mode, civilization variant, opponent matchup, and intended rank. A build designed for an open 1v1 map is not automatically safe on a closed team map.

## Prefer evidence-linked builds

The strongest reference combines a readable step list with a video, replay, or current game-data link. Compare the build's costs and timings with the current explorer before investing a whole session in it.

## Keep a local verdict

After three games, mark the guide as **works**, **needs adaptation**, or **stale**. Record the patch, map, matchup, and first failed checkpoint. This keeps your personal library more useful than a global popularity score.
`,
    bodyRu: `## Сначала смотрите версию

Перед копированием билда запишите его патч или сезон. Баланс может изменить стоимость юнита, время производства, бонус landmark или пул карт, а название видео останется прежним. Билд без версии считайте гипотезой, пока не проверите его.

## Проверьте предположения

Посмотрите тип карты, стартовые ресурсы, режим, вариант цивилизации, матчап и целевой рейтинг. Билд для открытой 1v1-карты не обязан работать на закрытой командной карте.

## Выбирайте билды с доказательствами

Лучший референс сочетает понятный список шагов с видео, реплеем или актуальной ссылкой на данные игры. Перед целой сессией сравните стоимость и тайминги с текущим Explorer.

## Храните свой вердикт

После трёх игр пометьте гайд как **работает**, **требует адаптации** или **устарел**. Запишите патч, карту, матчап и первую сломанную контрольную точку. Так личная библиотека становится полезнее глобального рейтинга популярности.
`,
  },
]

/** Fresh external references selected from current official and curated sources. */
export const GUIDE_RESOURCES: readonly GuideResource[] = [
  {
    id: 'official-patch-16-2-10884',
    kind: 'patch',
    title: 'Age of Empires IV — Patch 16.2.10884',
    titleRu: 'Age of Empires IV — патч 16.2.10884',
    description:
      'Official release notes: balance, bug fixes, UI changes, and replay-version caveats.',
    descriptionRu:
      'Официальные заметки: баланс, исправления, UI и важное предупреждение о версиях реплеев.',
    source: 'Age of Empires Official',
    url: 'https://www.ageofempires.com/news/age-of-empires-iv-patch-16-2-10884/',
    publishedAt: '2026-06-18',
  },
  {
    id: 'aoe4world-patch-history',
    kind: 'catalogue',
    title: 'AoE4World Patch History & Explorer',
    titleRu: 'История патчей и Explorer AoE4World',
    description:
      'Civilization-by-civilization changes, units, technologies, landmarks, and patch context.',
    descriptionRu: 'Изменения по цивилизациям, юнитам, технологиям, landmark и контекст патча.',
    source: 'AoE4World',
    url: 'https://aoe4world.com/explorer/patches',
  },
  {
    id: 'aoe4world-curated-content',
    kind: 'catalogue',
    title: 'AoE4World Curated Content',
    titleRu: 'Кураторский каталог AoE4World',
    description:
      'A maintained catalogue of guides, build orders, breakdowns, and educational videos.',
    descriptionRu: 'Обновляемый каталог гайдов, билдов, разборов и обучающих видео.',
    source: 'AoE4World',
    url: 'https://aoe4world.com/explorer/content',
  },
  {
    id: 'beasty-what-civ-2026',
    kind: 'video',
    title: 'What Civilisation to play in 2026?',
    titleRu: 'Какую цивилизацию играть в 2026 году?',
    description: 'Beastyqt compares civilization identities and helps narrow a learning path.',
    descriptionRu: 'Beastyqt сравнивает особенности цивилизаций и помогает выбрать путь обучения.',
    source: 'BeastyqtSC2',
    url: 'https://www.youtube.com/watch?v=RSUYg3jQ3gg',
    publishedAt: '2026-02-01',
  },
  {
    id: 'yellowish-macedonian-guide',
    kind: 'video',
    title: 'Macedonian Dynasty in its Completeness',
    titleRu: 'Македонская династия: полный разбор',
    description: 'A complete civilization overview with tactics and practical examples.',
    descriptionRu: 'Полный обзор цивилизации с тактиками и практическими примерами.',
    source: 'Yellowish',
    url: 'https://www.youtube.com/watch?v=xmFeEe5-XJE',
    publishedAt: '2025-11-05',
  },
  {
    id: 'vortix-four-ages',
    kind: 'video',
    title: 'How to play Age of Empires 4: the four ages',
    titleRu: 'Как играть в Age of Empires 4: четыре эпохи',
    description: 'A concept-first explanation of the goals and transitions in every age.',
    descriptionRu: 'Объяснение целей и переходов каждой эпохи через игровые концепции.',
    source: 'VortiX',
    url: 'https://www.youtube.com/watch?v=jSfoInAglI8',
    publishedAt: '2025-04-01',
  },
  {
    id: 'jin-dynasty-beginner-guide',
    kind: 'article',
    title: 'Jin Dynasty: beginner guide, build orders, and unique units',
    titleRu: 'Династия Цзинь: гайд для новичка, билды и уникальные юниты',
    description: 'A written introduction to the new civilization added with Yue Fei’s Legacy.',
    descriptionRu: 'Письменный разбор новой цивилизации из Yue Fei’s Legacy.',
    source: 'Game Truth',
    url: 'https://www.gametruth.com/guides/age-of-empires-4-jin-dynasty-beginner-guide-build-orders-unique-units/',
    publishedAt: '2026-05-01',
  },
]
