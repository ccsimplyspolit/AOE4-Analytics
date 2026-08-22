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

/**
 * These are decision guides, not fixed build orders. Exact landmark, unit and
 * timing advice changes with patches and civilizations; the linked resource
 * shelf is the place for current patch notes and build-specific material.
 */
export const GUIDES: Guide[] = [
  {
    slug: 'scouting-basics',
    title: 'Scouting Basics',
    titleRu: 'Основы разведки',
    category: 'fundamentals',
    summary:
      'Turn each scouting pass into one useful decision instead of simply revealing the map.',
    summaryRu:
      'Превращайте каждый заход разведчика в одно полезное решение, а не просто открывайте карту.',
    readMinutes: 5,
    body: `## The purpose is a decision

Scouting is not a tour of the enemy base. It answers one question: **what do I need to do next?** The scout pays for itself when information changes your production, your walling, your resource placement, or the moment you move out.

Use this rule: **one observation, one response**. Do not wait until you have perfect information.

## A simple scouting route

1. **Opening:** collect nearby sheep, reveal your close food, gold, woodline, and the first safe route out of your base.
2. **Before Feudal:** find the opponent's Town Center, gold, and the side from which units can reach you fastest.
3. **During the age-up:** return to see their landmark, builders, and first military building. This is a high-value pass because builders are temporarily absent from gathering.
4. **Every 45–60 seconds after that:** check the production buildings, exposed resources, and whether the army left home. Re-scout after any long period of fighting or when the opponent disappears behind walls.

The route changes on water, nomad, and unusual maps. The question does not: find the resource or building that would make the next enemy move dangerous.

## What the signs usually mean

- **Early Stable:** prepare spearmen, protect the outer food or gold, and do not send archers out without a screen.
- **Early Barracks with units walking forward:** expect spearmen, a tower, or a forward building. Keep villagers near protection and scout the route.
- **Two or more Feudal production buildings:** expect sustained pressure. Add the appropriate counter and enough production to replace losses.
- **Villagers on stone or a forward stone camp:** a second Town Center, keep, or defensive plan may be coming. Confirm the spend before overreacting.
- **Few military buildings, fast landmark, or a closed base:** the opponent may be ageing, booming, or hiding a tech choice. Take safe map resources, apply light pressure, and scout again rather than guessing.
- **Walls and a passive army:** they are buying time. Secure your own economy, take space, and plan the next age or a siege transition.

Civilization bonuses can make these signals look different. Treat them as prompts to check again, not as a guaranteed build order.

## Keep the scout alive when it still has a job

Do not donate a scout just to see a single building. Circle at the edge of vision, use elevation and forests, and leave before slow melee units can trap it. If it can no longer enter the base, watch army exits, outer gold, deer, relic routes, and sacred sites instead.

Sheep are valuable early, but information is often more valuable once food is secure. Do not send the scout across the map for one last sheep while a stable or army could be on the way.

## The 10-second response loop

When you see something, pause only long enough to answer these four points:

- What can reach my villagers first?
- Which unit or position answers it efficiently?
- Which resource will fund that answer?
- When will I look again to verify the read?

Examples: see a Stable → make spearmen, move the vulnerable gold-side villagers closer to safety, rally food and wood, then check whether horsemen actually leave the base. See a second Town Center → keep your own villager production running, produce a small force to deny outer resources, then decide whether to pressure or match the boom.

## Common mistakes

- Scouting only once and playing the rest of the match from an old read.
- Seeing a building but not changing production or positioning.
- Sacrificing the scout without learning the army size or direction.
- Looking only at the enemy base and missing the army crossing the map.

Good scouting makes the opponent's plan expensive. It gives you time to prepare the right answer before their investment arrives.`,
    bodyRu: `## Цель разведки — решение

Разведка — не экскурсия по вражеской базе. Она отвечает на один вопрос: **что мне делать следующим?** Разведчик окупается, когда информация меняет производство, расположение стен, работу на ресурсах или время выхода армии.

Правило простое: **одно наблюдение — одно действие**. Не ждите идеальной информации.

## Простой маршрут разведчика

1. **Старт:** соберите ближайших овец, откройте безопасную еду, золото, лес и первый безопасный выход с базы.
2. **До Феодала:** найдите Городской центр противника, золото и сторону, с которой войска быстрее всего придут к вам.
3. **Во время перехода в эпоху:** вернитесь, чтобы увидеть достопримечательность, строителей и первое военное здание. Это ценный момент: строители временно не добывают ресурсы.
4. **Далее каждые 45–60 секунд:** проверяйте военные здания, открытые ресурсы и то, ушла ли армия с базы. Разведывайте заново после долгой драки или если враг исчез за стенами.

На водных, кочевых и необычных картах маршрут меняется. Вопрос остаётся: найдите ресурс или здание, из-за которого следующий ход противника станет опасным.

## Что обычно означают признаки

- **Ранняя конюшня:** готовьте копейщиков, прикройте внешнюю еду или золото и не выводите лучников без прикрытия.
- **Ранняя казарма и войска идут вперёд:** ждите копейщиков, башню или передовое здание. Держите крестьян рядом с защитой и проверьте маршрут атаки.
- **Два и более военных здания в Феодале:** ожидайте постоянное давление. Добавьте нужный контр и столько производства, чтобы восполнять потери.
- **Крестьяне на камне или лагеря на камне впереди:** вероятны второй ГЦ, крепость или оборонительный план. Подтвердите, на что потратят ресурс, прежде чем слишком остро реагировать.
- **Мало военных зданий, быстрый переход или закрытая база:** противник может выходить в эпоху, разгонять экономику или скрывать технологию. Берите безопасные ресурсы карты, слегка давите и разведайте ещё раз, а не гадайте.
- **Стены и пассивная армия:** враг покупает время. Укрепите свою экономику, займите пространство и планируйте следующую эпоху или осаду.

Бонусы цивилизаций могут менять картину. Считайте эти признаки поводом проверить ещё раз, а не гарантией конкретного билда.

## Сохраняйте разведчика, пока он полезен

Не отдавайте разведчика ради одного здания. Ходите по краю обзора, используйте возвышенности и лес, уходите до того, как медленные войска ближнего боя перекроют путь. Если в базу уже не войти, смотрите выходы армии, дальнее золото, оленей, маршруты к реликвиям и святыням.

Овцы важны в начале, но после обеспечения едой информация часто ценнее. Не посылайте разведчика через всю карту за последней овцой, когда вражеская конюшня или армия уже могут идти к вам.

## Реакция за десять секунд

После наблюдения остановитесь лишь настолько, чтобы ответить на четыре вопроса:

- Что первым доберётся до моих крестьян?
- Каким войском или позицией это выгодно остановить?
- Какой ресурс оплатит этот ответ?
- Когда я проверю, что вывод был верным?

Примеры: увидели конюшню → делаете копейщиков, уводите уязвимых работников ближе к защите, ставите сбор на еду и дерево, затем проверяете, действительно ли всадники выходят. Увидели второй ГЦ → не останавливаете производство крестьян, делаете небольшую армию для запрета внешних ресурсов и только потом решаете: давить или отвечать развитием.

## Частые ошибки

- Разведать один раз и всю игру опираться на старую информацию.
- Увидеть здание, но не изменить производство или позицию.
- Отдать разведчика, не узнав размер и направление армии.
- Смотреть только на базу и не заметить войска, идущие через карту.

Хорошая разведка делает план противника дорогим: она даёт время приготовить правильный ответ до того, как его вложения придут к вам.`,
  },
  {
    slug: 'economy-fundamentals',
    title: 'Economy Fundamentals',
    titleRu: 'Основы экономики',
    category: 'economy',
    summary:
      'Run a short macro loop that turns resources into the army, technology, or expansion you actually need.',
    summaryRu:
      'Используйте короткий макроцикл, который превращает ресурсы в нужную армию, технологии или расширение.',
    readMinutes: 6,
    body: `## Economy is spending with a purpose

An economy is not a large bank. It is the ability to continuously pay for the plan you chose: villagers, army, production buildings, upgrades, or an age-up. A thousand unspent resources often means that a production building, a house, a rally point, or a decision is missing.

## The macro loop

Repeat this loop whenever you return to your base and after every fight:

1. **Queue villagers** in every Town Center unless you deliberately reached your population plan.
2. **Spend the bank** on the next thing that changes the game: units, production, an age-up, a Town Center, or a defensive structure.
3. **Check population room** before the queue reaches the cap.
4. **Match gatherers to the next 60–90 seconds of spending.** Move villagers before you are short, not after production stops.
5. **Check exposed workers.** A safe income is better than a perfect ratio on a resource the enemy can idle for free.

This loop matters more than memorizing a universal villager split. Every civilization, map, and unit composition changes the right numbers.

## Read the bank, then change the economy

- **Food is high, wood is low:** you may be unable to add production, farms, houses, or ranged units. Move new villagers to wood before the bottleneck stops you.
- **Wood is high, food is low:** do not blindly add buildings. Secure food, add farms only when the transition is affordable, or choose a unit mix that fits the map.
- **Gold is high while units are not producing:** the army may need more food/wood, another production building, or a different composition.
- **Stone is high with no expansion or keep plan:** stop mining it and fund the army or age-up. Stone is an investment, not a trophy.
- **All resources are high:** your spending capacity is late. Add production only if you can keep it working; otherwise spend toward a decisive age-up, expansion, or attack.

## Town Centers and greedy investments

A second Town Center is strong only when three conditions are true:

- You can afford its civilization-specific cost without stopping basic production.
- You can defend its builders, its location, and the resource cluster around it.
- You have a plan for the next minute while it is being built — usually a small defensive army and continued scouting.

If the enemy has more Feudal production or units on your side of the map, a delayed Town Center is often better than a dead one. The same logic applies to expensive technologies and a fast age-up: buy them when they do not remove your ability to survive.

## Production capacity is part of the economy

More resources do not become more army by themselves. If two buildings are permanently queued and resources still climb, add production. If buildings are idle because resources are short, fix the gatherer split instead of adding empty structures.

Keep rally points deliberate. A rally point on an unsafe gold vein can lose more than a small timing gain. Re-route new villagers when sheep finish, a woodline is threatened, or the army changes composition.

## Upgrades and farms

Take an economic upgrade when its payback will arrive before the game changes and when it does not cause villager or military idle time. A cheap upgrade is still wrong if it delays defense. Farms are a planned food transition: save wood, place them safely, and do not let the entire food economy become exposed at once.

## A practical post-fight reset

After a battle, do not only queue replacement units. Check: did you lose workers, did the opponent switch unit types, did a resource become unsafe, and does the next fight require more production or a different resource? The player who rebalances first usually reaches the next useful army first.`,
    bodyRu: `## Экономика — это траты с целью

Экономика — не большой запас в банке. Это способность непрерывно оплачивать выбранный план: крестьян, армию, военные здания, улучшения или переход в эпоху. Тысяча неиспользованных ресурсов часто означает, что не хватает здания, дома, точки сбора или решения.

## Макроцикл

Повторяйте этот цикл, когда возвращаетесь к базе и после каждой драки:

1. **Ставьте крестьян в очередь** во всех Городских центрах, пока осознанно не достигли плана по населению.
2. **Тратьте запас** на следующее действие, меняющее игру: войска, производство, эпоху, ГЦ или оборону.
3. **Проверяйте лимит населения** до того, как очередь упрётся в него.
4. **Подстраивайте сбор под траты следующих 60–90 секунд.** Переводите работников до дефицита, а не после остановки производства.
5. **Проверяйте уязвимых работников.** Безопасный доход лучше идеального соотношения на ресурсе, который враг бесплатно выключит налётом.

Этот цикл важнее заученного «универсального» распределения крестьян. Для каждой цивилизации, карты и состава войск правильные числа свои.

## Смотрите на запас и меняйте экономику

- **Много еды, мало дерева:** вам может не хватить зданий, ферм, домов или лучников. Переведите новых крестьян на дерево до остановки производства.
- **Много дерева, мало еды:** не ставьте здания автоматически. Защитите еду, стройте фермы лишь когда переход оплачен или выберите состав, подходящий карте.
- **Много золота, но войска не производятся:** армии может не хватать еды/дерева, ещё одного производственного здания или другого состава.
- **Много камня без плана на расширение или крепость:** перестаньте его добывать и оплатите армию или эпоху. Камень — вложение, не трофей.
- **Много всего:** производство не поспевает за экономикой. Добавляйте здания, только если сможете держать их занятыми; иначе вложитесь в решающую эпоху, расширение или атаку.

## Городские центры и жадные вложения

Второй ГЦ силён только при трёх условиях:

- Вы оплачиваете его специфичную для цивилизации цену, не останавливая базовое производство.
- Можете защитить строителей, место установки и ближайший кластер ресурсов.
- У вас есть план на следующую минуту, пока ГЦ строится: обычно небольшая оборонительная армия и продолжающаяся разведка.

Если у противника больше феодального производства или его войска уже на вашей половине карты, лучше отложить ГЦ, чем потерять его. То же относится к дорогим технологиям и быстрому переходу: покупайте их, если после этого способны выжить.

## Производственные мощности — тоже экономика

Ресурсы сами не превращаются в армию. Если два здания постоянно заняты и запас растёт, добавляйте производство. Если здания простаивают из-за нехватки ресурсов, исправьте распределение, а не стройте пустые постройки.

Точки сбора должны быть осознанными. Точка на незащищённом золоте способна стоить больше, чем даёт ускорение. Меняйте её, когда заканчиваются овцы, лес под угрозой или меняется состав армии.

## Улучшения и фермы

Берите экономическое улучшение, когда оно успеет окупиться до смены ситуации и не вызовет простой крестьян или армии. Даже дешёвое улучшение ошибочно, если оно задерживает оборону. Фермы — запланированный переход: сохраните дерево, ставьте их безопасно и не делайте всю еду уязвимой одновременно.

## Сброс после боя

После драки не ограничивайтесь очередью замены. Проверьте: погибли ли работники, сменил ли враг войска, стал ли ресурс опасным, нужны ли для следующей драки новые здания или другой ресурс. Тот, кто первым перестраивает экономику, обычно первым приводит следующую полезную армию.`,
  },
  {
    slug: 'army-composition',
    title: 'Army Composition',
    titleRu: 'Состав армии',
    category: 'military',
    summary:
      'Build by battlefield role and the enemy’s actual composition, not by a memorized single-unit counter.',
    summaryRu:
      'Собирайте армию по боевым ролям и реальному составу врага, а не по заученному контру одним юнитом.',
    readMinutes: 6,
    body: `## Counters are a starting point

AoE IV has counter relationships, but no unit wins every fight in every situation. Terrain, upgrades, numbers, reinforcement distance, and civilization-specific bonuses all matter. First identify the enemy's **main damage unit**, its **screen**, and its **most expensive vulnerable unit**.

The common relationships are:

- **Spearmen** punish cavalry and protect ranged units from charges.
- **Horsemen and other mobile cavalry** threaten exposed ranged units, siege, villagers, and reinforcements.
- **Archers** are efficient into light infantry, especially spearmen.
- **Crossbowmen** answer heavy units such as knights and men-at-arms.
- **Mangonels and other area damage** punish tightly packed ranged or light armies; the exact siege role is patch-sensitive.
- **Siege and torch damage** are tools for buildings and defensive positions, not a substitute for an army screen.

Always check the unit card or in-app counter tool when a unique unit is involved.

## Give every group a job

A reliable mixed army usually contains some of these jobs:

- **Frontline:** holds space and absorbs the first contact.
- **Screen:** protects your vulnerable damage dealers from the unit that counters them, often spearmen protecting ranged units from cavalry.
- **Damage core:** the unit type that efficiently removes the enemy's current investment.
- **Mobile threat:** raids, catches reinforcements, surrounds ranged units, and controls open space.
- **Siege support:** breaks a fortified position or punishes clumping once you can protect it.

You do not need every role in every fight. You do need to know which role is missing before you add another expensive unit.

## Build from what you see

- Against **knights or other heavy cavalry**, add spearmen first. Crossbows become important once heavy numbers grow. Keep the spears between cavalry and your ranged units.
- Against **archer masses**, create mobile cavalry, attack from multiple angles, and do not feed isolated spearmen into them.
- Against **spears protecting ranged units**, add your own ranged damage or use mobility to force the spears to turn. Do not charge cavalry through a prepared spear line.
- Against **heavy infantry**, use crossbows and enough frontline to stop them reaching the crossbows. Consider armour and positioning before assuming a single counter is enough.
- Against **siege**, identify whether you can dive it with mobility, answer it with your own appropriate siege, or force it to move by attacking somewhere else.

## Positioning makes the composition work

Fight where the enemy cannot use their whole army at once: behind a choke, near your reinforcement path, around a Town Center, or on high ground. Put ranged units behind a front line, spread when area damage is present, and do not chase through a narrow route without vision.

Focus fire only when it removes a high-value unit or a key threat. Otherwise, let the formation attack while you preserve the front line and watch for flanks.

## Before adding a new unit type

Ask four questions:

- Can I build it from existing production, or will it delay the answer?
- Can my current food/wood/gold income sustain it and its upgrades?
- Does it solve the next fight, not only a hypothetical late-game fight?
- What now counters the army I am creating?

An army is not balanced because it has many icons. It is balanced when its jobs cover each other and it can be reinforced at the pace of the fight.`,
    bodyRu: `## Контры — это начало, а не весь ответ

В AoE IV есть контр-связи, но ни один юнит не выигрывает любой бой в любой ситуации. Важны рельеф, улучшения, число войск, расстояние подкреплений и бонусы цивилизации. Сначала определите **главный источник урона** врага, его **прикрытие** и самый дорогой уязвимый юнит.

Основные связи обычно такие:

- **Копейщики** наказывают кавалерию и защищают стрелков от атаки в лоб.
- **Всадники и другая мобильная кавалерия** угрожают открытым стрелкам, осаде, крестьянам и подкреплениям.
- **Лучники** эффективны против лёгкой пехоты, особенно копейщиков.
- **Арбалетчики** отвечают тяжёлым войскам: рыцарям и тяжёлой пехоте.
- **Мангонели и другой урон по площади** наказывают плотные массы стрелков и лёгких войск; точная роль осады зависит от патча.
- **Осадные орудия и факелы** нужны против зданий и оборонительных позиций, но не заменяют прикрытие армии.

При уникальном юните всегда сверяйтесь с его карточкой или помощником по контрам в приложении.

## Дайте каждой группе работу

Надёжная смешанная армия обычно содержит несколько таких ролей:

- **Фронтлайн:** держит пространство и принимает первый удар.
- **Прикрытие:** защищает уязвимый урон от контра — например, копейщики прикрывают стрелков от конницы.
- **Ядро урона:** войска, выгодно уничтожающие текущие вложения противника.
- **Мобильная угроза:** рейды, ловля подкреплений, обход стрелков и контроль открытого пространства.
- **Поддержка осадой:** ломает укреплённую позицию или плотный строй, когда вы можете её защитить.

Не каждая роль нужна в каждом бою. Но перед покупкой ещё одного дорогого юнита нужно понимать, какой роли не хватает.

## Собирайте армию по увиденному

- Против **рыцарей и другой тяжёлой кавалерии** сначала добавьте копейщиков. Когда тяжёлых войск много, важны арбалетчики. Держите копья между конницей и стрелками.
- Против **массы лучников** сделайте мобильную кавалерию, атакуйте с нескольких сторон и не отдавайте одиночных копейщиков.
- Против **копейщиков, прикрывающих стрелков**, добавьте свой стрелковый урон или используйте мобильность, чтобы заставить копья разворачиваться. Не врезайтесь кавалерией в готовую стену копий.
- Против **тяжёлой пехоты** используйте арбалетчиков и достаточно фронтлайна, чтобы она не дошла до арбалетов. Улучшения брони и позиция иногда важнее одного контра.
- Против **осады** решите, можете ли ворваться мобильными войсками, ответить подходящей осадой или заставить её сдвинуться угрозой в другом месте.

## Позиция включает состав армии

Сражайтесь там, где враг не сможет использовать всю армию разом: за узким проходом, рядом с путём подкреплений, около ГЦ или на высоте. Держите стрелков за фронтлайном, рассредотачивайтесь против урона по площади и не гонитесь по узкому маршруту без обзора.

Фокусируйте цель, когда это снимает дорогой юнит или ключевую угрозу. В остальных случаях дайте строю атаковать, сохраняйте фронт и следите за обходами.

## Перед добавлением нового типа войск

Спросите себя:

- Я могу производить его из существующих зданий или ответ запоздает?
- Хватит ли текущей еды, дерева и золота на него и его улучшения?
- Решает ли он следующий бой, а не только воображаемую позднюю игру?
- Что теперь контрит армию, которую я создаю?

Армия сбалансирована не потому, что в ней много разных значков. Она сбалансирована, когда её роли прикрывают друг друга и её можно пополнять в темпе боя.`,
  },
  {
    slug: 'when-to-attack',
    title: 'When to Attack',
    titleRu: 'Когда атаковать',
    category: 'strategy',
    summary:
      'Attack for a concrete objective when your composition, reinforcement, and economy can support it.',
    summaryRu:
      'Атакуйте с конкретной целью, когда состав, подкрепления и экономика поддерживают выход.',
    readMinutes: 5,
    body: `## A timing is an advantage with an objective

Do not attack just because units exist. A good timing combines a temporary advantage with something worth taking: deny gold, idle villagers, force a cancelled expansion, take a sacred site, break a wall, or destroy a landmark. Killing a few units while losing your whole army is not a timing.

## The three checks before moving out

- **Composition:** you know what you are likely to face and are not walking into its hard counter.
- **Reinforcement:** production is running, the rally route is safe enough, and you can replace the important part of the army.
- **Home safety:** your own gold, food, and Town Centers are not open to an immediate counter-raid.

If one check fails, you may still harass or take map control, but do not commit to a base dive.

## Common windows to use

- **Enemy builders are ageing:** they have fewer gatherers and often weaker immediate production. Pressure a resource, but expect their new-age units when the landmark finishes.
- **You completed a useful upgrade or age-up first:** move before the opponent reaches the equivalent answer, not several minutes later.
- **You scouted a greedy investment:** a second Town Center, distant resource, or fast tech can be punished if your army reaches it before defenses do.
- **Their army is on the other side of the map:** raid an exposed resource, take a relic, wall a route, or damage reinforcements instead of racing them to your base.
- **You won a clean fight:** convert the surviving army into map control, a resource denial, or a building kill. Do not automatically dive under Town Center fire.

## Pressure, commit, or leave

**Pressure** means showing an army, forcing units, denying a resource, and backing away before the trade turns bad. It is the default way to test a greedy opponent.

**Commit** means spending heavily on forward production, rams, or a one-base army to end the game. Do it only when you have a clear reason the opponent cannot survive: a composition lead, an undefended expansion, a broken wall, or a massive production lead.

**Leave** when the objective is no longer available. If the enemy has the counter, reinforcements, or defensive position, save the army. Retreating with units is not failure; it preserves the next timing.

## Set a retreat line first

Before attacking, decide where the army retreats: your nearest outpost, a choke, the rally path, or your Town Center. Keep the scout ahead, watch for reinforcements, and do not chase through fog after the original objective is achieved.

## Convert the advantage

After every attack, ask what changed. If you idled food workers, take map food or age up. If you forced a tower, their wood is spent — consider a different angle. If you killed the second Town Center, continue villager production and avoid throwing the lead into a fortified base. The best attack creates the next easy decision.`,
    bodyRu: `## Тайминг — это преимущество с целью

Не атакуйте лишь потому, что у вас появились войска. Хороший тайминг соединяет временное преимущество с конкретной добычей: запретить золото, остановить крестьян, сорвать расширение, взять святыню, сломать стену или уничтожить достопримечательность. Убить несколько юнитов и потерять всю армию — не тайминг.

## Три проверки перед выходом

- **Состав:** вы знаете, что вероятно встретите, и не идёте в жёсткий контр.
- **Подкрепления:** производство работает, путь от точек сбора достаточно безопасен, а важную часть армии можно восполнять.
- **Безопасность дома:** ваше золото, еда и ГЦ не открыты для мгновенного рейда в ответ.

Если хотя бы один пункт не готов, можно харассить или брать карту, но не ныряйте в базу.

## Частые окна

- **Враг строит переход в эпоху:** у него меньше добытчиков и часто слабее немедленное производство. Давите ресурс, но ждите его новых юнитов, когда достопримечательность достроится.
- **Вы раньше получили полезное улучшение или эпоху:** двигайтесь, пока противник не сделал равный ответ, а не через несколько минут.
- **Разведка показала жадное вложение:** второй ГЦ, дальний ресурс или быстрая технология наказуемы, если армия придёт раньше обороны.
- **Армия врага на другой стороне карты:** налетайте на открытый ресурс, берите реликвию, закрывайте маршрут стеной или бейте подкрепления вместо гонки к своей базе.
- **Вы чисто выиграли бой:** превратите выжившую армию в контроль карты, запрет ресурса или снос здания. Не ныряйте автоматически под огонь ГЦ.

## Давить, вкладываться или уйти

**Давление** — показать армию, вынудить войска, перекрыть ресурс и отойти до плохого размена. Это стандартный способ проверить жадного противника.

**Полная ставка** — много вложиться в передовое производство, тараны или армию с одной базы для завершения игры. Делайте это, когда ясно, почему враг не переживёт: перевес по составу, незащищённое расширение, проломленная стена или огромное преимущество производства.

**Уходите**, когда цели больше нет. Если появились контр, подкрепления или оборонительная позиция, сохраните армию. Отход с войсками — не провал, а сохранение следующего тайминга.

## Сначала определите линию отхода

До атаки решите, куда отступит армия: к ближайшей башне, в узкий проход, по пути подкреплений или к ГЦ. Держите разведчика впереди, следите за подкреплениями и не гонитесь в туман после выполнения цели.

## Превратите преимущество в следующее

После каждой атаки спросите, что изменилось. Остановили работников на еде — займите еду карты или переходите в эпоху. Вынудили башню — враг потратил дерево, попробуйте другой угол. Уничтожили второй ГЦ — продолжайте производство крестьян и не отдавайте преимущество в укреплённую базу. Лучшая атака создаёт следующее простое решение.`,
  },
  {
    slug: 'age-up-benchmarks',
    title: 'Age-Up Benchmarks',
    titleRu: 'Ориентиры перехода в эпоху',
    category: 'economy',
    summary:
      'Use build-specific gates and correct villager baselines instead of chasing a misleading universal clock.',
    summaryRu:
      'Сверяйтесь с этапами своего билда и реалистичной базой крестьян, а не гонитесь за обманчивым общим таймером.',
    readMinutes: 5,
    body: `## Benchmarks are diagnostics, not targets to worship

The old habit of judging every match by one Feudal or Castle timestamp is misleading. Civilizations age differently; an open map, water, early fight, trade, or a second Town Center changes the clock. A benchmark is useful only if it tells you what to repair.

## Start with a build-specific reference

For the build you practice, write down four checkpoints from a recent, patch-relevant source:

- when you start the Feudal landmark;
- when Feudal completes and the first relevant production starts;
- when the first pressure, expansion, or Castle transition should be ready;
- what resources and villagers should be safe at each point.

Replay the opening against AI until you can reach those checkpoints without a fight. In a real match, compare **why** you differ: lost sheep, unsafe resource, idle Town Center, a defensive unit, or a deliberate response are all different causes.

## Useful generic ranges for standard 1v1 openings

These are deliberately broad health checks, not build orders:

- A conventional Feudal transition often begins or completes somewhere around the mid-fourth to mid-fifth minute. Dark-Age pressure, civilization mechanics, map type, and greedy openings can be earlier or later.
- A one-Town-Center opening with uninterrupted standard villager production is roughly **20–21 villagers at 5:00** and **34–36 at 10:00**, before deaths and civilization-specific modifiers.
- A second Town Center changes the ten-minute count dramatically; compare it with the exact 2TC build, not a one-Town-Center baseline.
- A fast Castle timing is only healthy if it leaves enough defense for what scouting shows. The fastest possible Castle is not automatically the best Castle.

If your own build source states different numbers, trust its updated, civilization-specific checkpoints.

## Diagnose the gap

- **Behind before the first age-up:** inspect Town Center idle time, sheep under the Town Center, walking distances, missed drop-offs, housing, and whether the landmark had too many or too few builders.
- **Age-up is on time but the first unit is late:** wood, a house, or production placement was probably late. Check the resource bank at the moment Feudal finishes.
- **Economy is strong but army is absent:** the spend or production capacity is late, not the gathering rate.
- **Everything is late after an early attack:** compare the damage to the response. A few defensive units may be correct; an unnecessary all-in defense can create the delay.

## Measure one improvement at a time

In the next practice game, choose one measurable goal: zero intentional Town Center idle time until Feudal, a house before population cap, scout confirmation before the first military building, or no unspent resources above a chosen threshold. A short, repeatable target improves faster than trying to play like a tournament final all at once.`,
    bodyRu: `## Ориентиры — диагностика, а не культ таймера

Старая привычка оценивать каждую игру по одному времени Феодала или Замка обманчива. Цивилизации переходят по-разному; открытая карта, вода, ранняя драка, торговля или второй ГЦ меняют часы. Ориентир полезен только тогда, когда показывает, что исправить.

## Начните с этапов конкретного билда

Для тренируемого билда выпишите из свежего источника четыре контрольные точки:

- когда начинается строительство феодальной достопримечательности;
- когда завершается Феодал и запускается нужное производство;
- когда должны быть готовы первое давление, расширение или переход в Замок;
- какие ресурсы и крестьяне должны быть в безопасности на каждом этапе.

Повторяйте открытие против ИИ, пока не можете достигать этих точек без боя. В реальной игре сравнивайте **почему** есть разница: потерянные овцы, опасный ресурс, простой ГЦ, оборонительный юнит или осознанная реакция — это разные причины.

## Полезные общие рамки для стандартного 1v1

Это намеренно широкая проверка здоровья, а не билд:

- Обычный переход в Феодал часто начинается или завершается примерно между серединой четвёртой и серединой пятой минуты. Давление в Тёмной эпохе, механика цивилизации, тип карты и жадное открытие могут быть раньше или позже.
- Открытие с одним ГЦ и непрерывным стандартным производством крестьян даёт примерно **20–21 крестьянина к 5:00** и **34–36 к 10:00**, без учёта смертей и модификаторов цивилизации.
- Второй ГЦ сильно меняет число крестьян к десятой минуте; сравнивайте его с конкретным 2TC-билдом, а не с базой одного ГЦ.
- Быстрый Замок хорош только тогда, когда после него остаётся защита от увиденного разведкой. Самый быстрый возможный Замок не всегда лучший.

Если свежий источник вашего билда даёт другие числа, доверяйте его актуальным контрольным точкам для конкретной цивилизации.

## Найдите причину отставания

- **Отстаёте до первой эпохи:** проверьте простой ГЦ, овец под ГЦ, дальность ходьбы, точки сдачи ресурсов, дома и число строителей достопримечательности.
- **Переход вовремя, но первый юнит поздно:** вероятно, запоздали дерево, дом или место производства. Посмотрите запас в момент завершения Феодала.
- **Экономика сильная, а армии нет:** поздно принято решение о тратах или не хватает производства, а не добычи.
- **Всё поздно после ранней атаки:** сравните ущерб с ответом. Несколько оборонительных юнитов могут быть правильны; лишняя защита олл-ином создаёт задержку.

## Улучшайте по одному параметру

В следующей тренировочной игре выберите одну измеримую цель: без намеренного простоя ГЦ до Феодала, дом до лимита, подтверждение разведкой до первого военного здания или отсутствие запаса выше выбранного порога. Короткая повторяемая цель улучшает быстрее, чем попытка сразу сыграть как в финале турнира.`,
  },
  {
    slug: 'first-ten-minutes',
    title: 'Your First Ten Minutes in 1v1',
    titleRu: 'Первые десять минут в 1v1',
    category: 'fundamentals',
    summary:
      'A repeatable opening routine: establish income, read the opponent, choose one plan, and keep it flexible.',
    summaryRu:
      'Повторяемая рутина старта: наладьте доход, прочитайте соперника, выберите один план и сохраняйте гибкость.',
    readMinutes: 6,
    body: `## The goal is a stable first plan

The first ten minutes do not require a perfect professional build. They require a plan you can repeat: villagers working, scout moving, a clear Feudal purpose, and enough defense to avoid losing the game before learning from it.

## 0:00–2:30 — establish the base

- Queue a villager immediately and keep the Town Center working.
- Bring sheep under the Town Center or secure the safest available food. Do not send early workers on a long walk without a reason.
- Use the scout for sheep first, then learn the opponent's starting side and gold.
- Build a house before the population cap interrupts production.
- Start moving toward the food and gold your civilization needs for its age-up; follow a current build for exact numbers.

Your success check: workers have short walking distances, food is safe, the scout is alive, and the Town Center did not idle unnecessarily.

## 2:30–5:30 — age with a purpose

Before the landmark starts, answer: **what does Feudal unlock for me next?** Choose one primary plan:

- a small army to protect resources or pressure;
- a safe expansion;
- a faster Castle transition with enough defense;
- map control on water, deer, relic routes, or sacred sites.

During the age-up, prepare the resource and building required by that plan. For an early army, do not finish Feudal with no wood, no house, and nowhere to produce it. For an expansion, do not send builders into an unscouted area.

## 5:30–8:00 — make the first read pay

Scout the opponent's first military building and move. A simple response is better than a complex one:

- cavalry sign → make a safe spear screen;
- ranged mass sign → create a mobile threat and protect vulnerable workers;
- greedy expansion sign → pressure outer resources or safely match the economy;
- fast tech or walls sign → take safe space, deny key resources, and avoid donating units into defenses.

Put the army where it protects something valuable or threatens something valuable. It does not have to end the game in its first trip.

## 8:00–10:00 — choose the next investment

Look at the game state, not your original script:

- If the enemy keeps producing Feudal units, keep enough defense and production before investing in Castle or a second Town Center.
- If you won the map or forced a retreat, convert it into food, gold, relic access, sacred-site position, or a safer age-up.
- If your attack did little, retreat with survivors, rebalance resources, and prepare the next composition rather than repeating the same bad fight.

## Three drills before ranked

Play three short practice games with one criterion each:

1. No intentional Town Center idle time until Feudal.
2. A live scout report immediately before the first military building.
3. A first army that protects or threatens a real resource — not a march across the map with no purpose.

After that, take the same opening to ranked. The goal is to learn which decision breaks first, then improve that one in the next game.`,
    bodyRu: `## Цель — устойчивый первый план

Первые десять минут не требуют идеального профессионального билда. Нужен повторяемый план: крестьяне работают, разведчик движется, у Феодала есть цель, а защиты достаточно, чтобы не проиграть до того, как вы чему-то научитесь.

## 0:00–2:30 — создайте основу

- Сразу поставьте крестьянина в очередь и держите ГЦ работающим.
- Подведите овец под ГЦ или закрепите самую безопасную еду. Не отправляйте ранних работников далеко без причины.
- Сначала ищите разведчиком овец, затем сторону старта противника и его золото.
- Постройте дом до того, как лимит остановит производство.
- Начните переходить к еде и золоту, нужным вашей цивилизации для эпохи; точные числа берите из свежего билда.

Проверка успеха: работники мало ходят, еда безопасна, разведчик жив, а ГЦ не простаивал без необходимости.

## 2:30–5:30 — переходите с целью

До начала строительства достопримечательности ответьте: **что Феодал даст мне следующим?** Выберите один главный план:

- небольшая армия для защиты ресурсов или давления;
- безопасное расширение;
- более быстрый переход в Замок с достаточной обороной;
- контроль карты на воде, оленях, маршрутах реликвий или святынях.

Во время перехода подготовьте ресурс и здание для этого плана. Для ранней армии нельзя заканчивать Феодал без дерева, дома и места производства. Для расширения нельзя посылать строителей в неразведанную область.

## 5:30–8:00 — используйте первую информацию

Разведайте первое военное здание врага и действуйте. Простой ответ лучше сложного:

- признак конницы → сделайте безопасный экран из копейщиков;
- признак массы стрелков → создайте мобильную угрозу и прикройте уязвимых работников;
- признак жадного расширения → давите внешние ресурсы или безопасно отвечайте экономикой;
- признак быстрой технологии или стен → займите безопасное пространство, запретите ключевые ресурсы и не отдавайте войска в оборону.

Ставьте армию туда, где она защищает или угрожает чему-то ценному. Первый выход не обязан заканчивать игру.

## 8:00–10:00 — выберите следующее вложение

Смотрите на состояние игры, а не на исходный сценарий:

- Если враг продолжает делать феодальные войска, сначала обеспечьте защиту и производство, потом вкладывайтесь в Замок или второй ГЦ.
- Если вы взяли карту или вынудили отход, превратите это в еду, золото, доступ к реликвиям, позицию у святыни или более безопасный переход в эпоху.
- Если атака ничего не дала, отойдите выжившими, перестройте ресурсы и подготовьте следующий состав вместо повторения плохой драки.

## Три упражнения перед рейтингом

Сыграйте три короткие тренировочные игры, в каждой с одним критерием:

1. Без намеренного простоя ГЦ до Феодала.
2. Живая информация разведчика прямо перед первым военным зданием.
3. Первая армия защищает или угрожает реальному ресурсу, а не просто идёт через карту без цели.

После этого возьмите то же открытие в рейтинг. Цель — понять, какое решение ломается первым, и улучшить именно его в следующей игре.`,
  },
  {
    slug: 'defending-early-pressure',
    title: 'Defending Early Pressure',
    titleRu: 'Защита от раннего давления',
    category: 'military',
    summary:
      'Stabilize without panic: protect the resource under attack, produce the right answer, and keep your economy alive.',
    summaryRu:
      'Стабилизируйтесь без паники: защитите атакованный ресурс, производите правильный ответ и сохраняйте экономику.',
    readMinutes: 6,
    body: `## Defense starts before the enemy arrives

The cheapest defense is scouting. If you see a stable, barracks, range, forward villagers, or missing enemy army early, begin preparing before the attack reaches your workers. An outpost, short wall, production building, or a few counter units is much cheaper before the resource is surrounded.

## First identify the real threat

Ask three questions:

- Which resource or building can the enemy hit first?
- What is their first damage unit and what protects it?
- Are they trying to kill you now, deny one resource, or distract you while they boom?

Do not defend every part of the map at once. Protect the resource that keeps your current plan alive, then relocate or surrender a distant one if the trade is bad.

## The stabilization sequence

1. **Save workers first.** Pull them under the Town Center, behind a wall, to a nearby resource, or to a safer drop-off. Lost gathering time is usually better than lost villagers.
2. **Make the direct counter.** Spearmen for the immediate cavalry threat, mobile units into exposed ranged units, and a front line before fragile damage dealers. Match the actual army, not only its first building.
3. **Use position.** Fight near Town Center fire, an outpost, a choke, or reinforcements. Do not chase into the open just because the enemy turned around.
4. **Restore production.** Queue villagers, replace the right units, and move new villagers to the resource that pays for the answer.
5. **Scout the follow-up.** The first raid may hide a ram push, a second Town Center, an age-up, or a switch in unit type.

## Walls, outposts, and buildings

Small walls are strongest when they buy seconds for the army to arrive or force cavalry into a bad path. Outposts are strongest when they protect a specific exposed resource and you can react nearby. Neither replaces units against a committed push.

Place production and houses so they do not create a free path into the resource line. If you are forced to defend one side of the base, move the rally point away from the raid route.

## Do not over-defend

Panic can lose more than the raid. Avoid pulling every villager off work for a small force, adding five towers to a safe base, or making only one counter unit after the opponent switched. Defend enough to stop losses, then recover the economy and look for the moment the attacker is far from home.

## When to counterattack

Counterattack when the enemy army is retreating, their reinforcement route is exposed, or you have confirmed that their investment left them weak at home. Your first objective is usually their forward resource or production, not their Town Center. If your economy just stabilized, a small safe raid can be better than an all-in chase.`,
    bodyRu: `## Оборона начинается до прихода армии

Самая дешёвая защита — разведка. Если рано увидели конюшню, казарму, стрельбище, передовых крестьян или исчезнувшую армию, готовьтесь до того, как атака дошла до работников. Башня, короткая стена, военное здание или несколько контр-юнитов гораздо дешевле, пока ресурс ещё не окружён.

## Сначала определите настоящую угрозу

Задайте три вопроса:

- Какой ресурс или здание враг может ударить первым?
- Какой его основной юнит наносит урон и кто его прикрывает?
- Он пытается убить вас сейчас, закрыть один ресурс или отвлечь, пока развивает экономику?

Не защищайте всю карту одновременно. Сначала защитите ресурс, на котором держится текущий план, а дальний ресурс уступите или переведите работников, если размен невыгоден.

## Последовательность стабилизации

1. **Сначала спасите работников.** Уведите под ГЦ, за стену, на ближайший ресурс или к безопасной точке сдачи. Потерянное время добычи обычно лучше потерянных крестьян.
2. **Сделайте прямой контр.** Копейщики против немедленной конницы, мобильные войска против открытых стрелков, фронтлайн перед хрупким уроном. Отвечайте на реальную армию, а не только на её первое здание.
3. **Используйте позицию.** Деритесь под огнём ГЦ, у башни, в узком проходе или рядом с подкреплениями. Не гонитесь в чистое поле только потому, что враг развернулся.
4. **Верните производство.** Ставьте крестьян в очередь, восполняйте нужные войска и направляйте новых работников на ресурс, который оплачивает ответ.
5. **Разведайте продолжение.** Первый рейд может скрывать тараны, второй ГЦ, переход в эпоху или смену войск.

## Стены, башни и здания

Короткие стены сильнее всего, когда покупают секунды до подхода армии или заводят конницу по плохому маршруту. Башни сильны, когда защищают конкретный открытый ресурс и вы можете быстро подойти к нему. Ни то ни другое не заменяет армию против серьёзного пуша.

Ставьте производство и дома так, чтобы не открыть бесплатный путь к линии ресурсов. Если приходится защищать одну сторону базы, перенесите точку сбора от маршрута налёта.

## Не переобороняйтесь

Паника может стоить дороже налёта. Не снимайте с работы всех крестьян против небольшой группы, не ставьте пять башен на безопасной базе и не делайте только один контр-юнит после смены врагом состава. Защититесь достаточно, чтобы прекратить потери, затем восстановите экономику и ищите момент, когда атакующий далеко от дома.

## Когда бить в ответ

Контратакуйте, когда армия врага отступает, его путь подкреплений открыт или разведка подтвердила, что вложения оставили базу слабой. Первой целью обычно будут его передовой ресурс или производство, а не ГЦ. Если экономика только стабилизировалась, маленький безопасный рейд лучше погони олл-ином.`,
  },
  {
    slug: 'map-control-resource-safety',
    title: 'Map Control and Safe Resources',
    titleRu: 'Контроль карты и безопасные ресурсы',
    category: 'strategy',
    summary:
      'Take space that pays for your next plan, while making the opponent’s economy harder and riskier to use.',
    summaryRu:
      'Занимайте пространство, которое оплачивает ваш следующий план, и делайте экономику врага более дорогой и рискованной.',
    readMinutes: 5,
    body: `## Map control is useful access, not painted territory

You control an area when you can gather from it, move through it, reinforce through it, or make the opponent pay to use it. A lone unit in the middle of the map is not control. A small force that protects your deer, sees an enemy gold vein, and can retreat to an outpost often is.

## Prioritize the resource that changes the next minute

- **Food outside the base** supports sustained unit production and can be worth a small escort.
- **Gold** often decides upgrades, age-ups, heavy units, and religious play; deny it only if you can avoid a bad fight.
- **Stone** matters when a Town Center, keep, or wall plan is visible. Scouting turns it from a generic resource into a strategic target.
- **Relics and sacred sites** are not side quests: they create income and force the opponent to leave their base.

Do not take an outer resource because it exists. Take it when it funds a concrete next step and you can either hold it or profit before leaving.

## Make the resource safe enough

Safety is layered:

1. Scout the route and nearby enemy production.
2. Move a small army, not only villagers, when the resource is exposed.
3. Use a short wall, outpost, building placement, or natural choke to buy reaction time.
4. Keep a retreat path and a second resource ready; do not trap workers between the enemy and a wall.
5. Re-scout when the opponent's army disappears.

The aim is not invulnerability. It is to make every raid cost the opponent more time or units than it costs you gathering time.

## Deny without throwing your army away

You can deny a resource by showing up, forcing an outpost, killing a mining camp, walling a path, or simply making workers walk away. You do not need to kill the Town Center. If the enemy has the better position, keep vision and attack another point rather than trading into their defense.

## Spend map control before it expires

After winning a fight or forcing an army home, choose a conversion immediately:

- take deer, gold, relics, or a sacred-site position;
- establish a safer expansion;
- add production forward enough to shorten reinforcements but not so far that it is free to lose;
- age up while the opponent is forced to defend.

Map control disappears when the army is idle or when the opponent takes the next resource unseen. Keep the scout moving and make the advantage pay for something.`,
    bodyRu: `## Контроль карты — это доступ, а не закрашенная территория

Вы контролируете область, когда можете добывать там, проходить через неё, вести подкрепления или заставлять противника дорого платить за использование. Один юнит в центре карты — не контроль. Небольшая армия, которая защищает ваших оленей, видит вражеское золото и может отойти к башне, — часто уже контроль.

## Сначала берите ресурс, меняющий следующую минуту

- **Еда вне базы** поддерживает постоянное производство войск и заслуживает небольшого эскорта.
- **Золото** часто решает улучшения, эпохи, тяжёлые войска и религиозную игру; запрещайте его, только если не идёте в плохой бой.
- **Камень** важен, когда видны планы на ГЦ, крепость или стены. Разведка превращает его из обычного ресурса в стратегическую цель.
- **Реликвии и святыни** — не побочная задача: они создают доход и вынуждают противника выйти из базы.

Не берите дальний ресурс только потому, что он есть. Берите его, когда он оплачивает конкретный следующий шаг и вы способны удержать его или получить выгоду до отхода.

## Сделайте ресурс достаточно безопасным

Безопасность складывается из нескольких слоёв:

1. Разведайте маршрут и ближайшее производство врага.
2. Ведите к открытому ресурсу небольшую армию, а не только крестьян.
3. Используйте короткую стену, башню, размещение зданий или естественный проход, чтобы выиграть время на реакцию.
4. Оставьте путь отхода и второй ресурс; не запирайте работников между врагом и стеной.
5. Разведывайте заново, когда армия противника исчезает.

Цель не в неуязвимости. Цель — сделать каждый налёт дороже для врага по времени или войскам, чем для вас по времени добычи.

## Запрещайте ресурс, не отдавая армию

Ресурс можно закрыть присутствием, вынужденной башней, уничтожением лагеря, стеной на пути или просто тем, что рабочим приходится уйти. Не обязательно ломать ГЦ. Если позиция врага лучше, сохраните обзор и ударьте в другом месте вместо размена в его оборону.

## Тратьте контроль карты, пока он не исчез

После выигранной драки или ухода армии врага сразу выберите конвертацию:

- возьмите оленей, золото, реликвии или позицию у святыни;
- поставьте более безопасное расширение;
- добавьте производство достаточно впереди, чтобы укоротить подкрепления, но не настолько, чтобы его было бесплатно потерять;
- переходите в эпоху, пока враг вынужден обороняться.

Контроль карты исчезает, когда армия простаивает или противник незаметно занимает следующий ресурс. Держите разведчика в движении и заставляйте преимущество оплачивать что-то конкретное.`,
  },
  {
    slug: 'replay-review-loop',
    title: 'Replay Review: Turn Losses into a Plan',
    titleRu: 'Разбор реплея: превращаем поражения в план',
    category: 'strategy',
    summary:
      'Find the first costly decision, name its cause, and practice one correction in the next match.',
    summaryRu:
      'Найдите первое дорогое решение, назовите его причину и потренируйте одно исправление в следующей игре.',
    readMinutes: 6,
    body: `## Review for the first cause, not the last disaster

The final fight is dramatic, but it is often not why the game was lost. Start from the end, then move backward until you find the first moment where a different, realistic decision would have changed the next several minutes. That is the moment worth training.

## A five-minute review order

1. **Opening health:** did the Town Center idle, did housing block you, did workers walk too far, or did the first age-up miss its build checkpoint?
2. **Information:** what did you scout before the first important military or economic choice? What did you fail to scout?
3. **Response:** when the enemy's plan became visible, did you make the counter, position workers safely, and adjust resources?
4. **Spending:** where did resources float while production was missing or idle? Did you build things that were never used?
5. **Conversion:** after winning or surviving a fight, did you take a resource, age up, expand, or simply let the advantage disappear?

Write one sentence for each answer. Vague conclusions such as “macro was bad” are hard to fix; “I had 700 wood while the first range was idle from 6:20 to 7:10” is actionable.

## Classify the mistake correctly

- **Mechanical:** late house, idle Town Center, missed queue, poor unit control. Fix with a focused drill.
- **Information:** did not see the stable, second Town Center, forward villagers, or army leaving. Fix the scout route and check cadence.
- **Decision:** saw the information but chose the wrong unit, investment, or fight. Write the alternative action you will test.
- **Execution under pressure:** knew the answer but could not do it while defending. Simplify the plan or add control groups and a defensive rally.

One event can include several categories, but choose the earliest controllable one first.

## Use a single next-game goal

Examples of good goals:

- “Scout enemy gold and first production before I start my own first military building.”
- “When cavalry appears, make spearmen before moving my ranged units across the map.”
- “If wood reaches 400 while units are queued, add the next production building.”
- “After a won fight, take one safe outer food source before chasing.”

Avoid “win more” or “use fewer resources.” The goal needs an observable trigger and action.

## Compare a small set of replays

After three to five games with the same civilization and opening, look for a repeated failure. If the same gold raid appears every match, solve the gold position before changing the entire build. If early pressure always succeeds but you lose later, practice the post-pressure transition. Improvement comes from a controlled loop: play, identify one cause, drill one answer, then test it again.`,
    bodyRu: `## Ищите первую причину, а не последнюю катастрофу

Последняя драка выглядит драматично, но часто не она проиграла матч. Начните с конца и двигайтесь назад, пока не найдёте первый момент, когда другое реалистичное решение изменило бы следующие несколько минут. Именно этот момент стоит тренировать.

## Порядок разбора на пять минут

1. **Здоровье открытия:** простаивал ли ГЦ, был ли блок по домам, далеко ли ходили работники, совпал ли первый переход в эпоху с этапом билда?
2. **Информация:** что вы разведали перед первым важным военным или экономическим выбором? Чего не разведали?
3. **Реакция:** когда план врага стал виден, сделали ли контр, безопасно ли расположили работников, перестроили ли ресурсы?
4. **Траты:** где копились ресурсы, пока не хватало или простаивало производство? Не были ли построены вещи, которыми не воспользовались?
5. **Конвертация:** после выигранной или пережитой драки взяли ли вы ресурс, эпоху, расширение или просто дали преимуществу исчезнуть?

Запишите по одному предложению на каждый ответ. Расплывчатое «плохое макро» трудно исправить; «к 6:20 было 700 дерева, а первое стрельбище простаивало до 7:10» — уже действие.

## Правильно назовите ошибку

- **Механика:** поздний дом, простой ГЦ, пропущенная очередь, плохой контроль войск. Исправляйте целевым упражнением.
- **Информация:** не увидели конюшню, второй ГЦ, передовых крестьян или выход армии. Исправьте маршрут и частоту разведки.
- **Решение:** информацию увидели, но выбрали неправильный юнит, вложение или драку. Запишите альтернативное действие, которое проверите.
- **Исполнение под давлением:** знали ответ, но не смогли сделать его во время обороны. Упростите план или добавьте контрольные группы и оборонительную точку сбора.

В одном эпизоде могут быть разные категории, но сначала выберите самую раннюю управляемую.

## Одна цель на следующую игру

Примеры хороших целей:

- «Разведать вражеское золото и первое производство до начала собственного первого военного здания».
- «При появлении конницы сделать копейщиков до выхода стрелков через карту».
- «Если дерево достигает 400, а войска стоят в очереди, добавить следующее производство».
- «После выигранной драки занять один безопасный источник внешней еды до погони».

Не выбирайте «больше побеждать» или «меньше тратить». У цели должен быть наблюдаемый триггер и действие.

## Сравнивайте небольшую серию реплеев

После трёх–пяти игр за одну цивилизацию с одним открытием ищите повторяющуюся поломку. Если в каждом матче закрывают золото, сначала решите позицию золота, а не меняйте весь билд. Если раннее давление всегда удаётся, а позже вы проигрываете, тренируйте переход после давления. Прогресс строится на контролируемом цикле: сыграть, найти одну причину, отработать один ответ и снова проверить его.`,
  },
  {
    slug: 'build-order-reading',
    title: 'How to Read a Build Order',
    titleRu: 'Как читать билд-ордер',
    category: 'fundamentals',
    summary:
      'Turn a build order into checkpoints and decisions instead of memorizing a rigid sequence.',
    summaryRu:
      'Превратите билд в контрольные точки и решения, а не в жёсткую последовательность наизусть.',
    readMinutes: 5,
    body: `## A build is a decision map

A build order is a tested route to a goal: an early army, a second Town Center, a Castle timing, or map control. It is not a promise that every match will follow the same script. Read every line as **action + reason + condition**.

## Mark five checkpoints

Before playing, identify:

- the first house and first production building;
- the age-up resource and builder count;
- the first military unit and pressure window;
- the resource split after Feudal completes;
- the moment the opening becomes a composition and win condition.

If a checkpoint is late, do not rush blindly to the next line. Find the cause: Town Center idle time, worker walking, a lost villager, an unsafe resource, or a defensive spend.

## Turn every line into a test

Ask: **What should I see? What can stop it? What is my smallest response?** “Stable at 4:30” means you need the wood beforehand, a safe placement, and a plan if the enemy has spearmen. This turns a copied build into a reusable opening.

## Keep branches beside the build

- Early cavalry seen → add spearmen, protect exposed gold, delay greedy technology.
- Two Town Centers seen → pressure production or take your own economic step.
- No military building by the first pass → verify fast Castle or trade before assuming safety.
- Forward tower or villagers → secure the approach and stop the next greedy investment.

## Practice loop

Play the opening three times with the same civilization. After each game write the first missed checkpoint, its cause, and how you recovered. Keep a build when it teaches a repeatable decision; replace it when its patch or map assumptions are no longer true.`,
    bodyRu: `## Билд — это карта решений

Билд-ордер — проверенный маршрут к цели: ранней армии, второму ГЦ, таймингу в Замок или контролю карты. Он не обещает, что каждая игра пойдёт по одному сценарию. Читайте каждую строку как **действие + причина + условие**.

## Отметьте пять контрольных точек

Перед игрой определите:

- первый дом и первое военное здание;
- ресурс для перехода и число строителей;
- первый боевой юнит и окно давления;
- распределение ресурсов после завершения Феодала;
- момент, когда открытие превращается в состав армии и условие победы.

Если точка запоздала, не спешите вслепую к следующей строке. Найдите причину: простой ГЦ, долгий путь работника, потерянный крестьянин, опасный ресурс или траты на оборону.

## Превращайте каждую строку в проверку

Спросите: **Что я должен увидеть? Что может это остановить? Какой мой минимальный ответ?** «Конюшня в 4:30» означает дерево заранее, безопасное размещение и план на случай вражеских копейщиков. Так скопированный билд становится повторяемым открытием.

## Держите ветки рядом с билдом

- Увидели раннюю конницу → добавьте копейщиков, прикройте открытое золото, отложите жадные технологии.
- Увидели два ГЦ → давите производство или делайте собственный экономический шаг.
- После первого прохода нет военного здания → подтвердите быстрый Замок или торговлю, прежде чем считать себя в безопасности.
- Передовая башня или крестьяне → обезопасьте подход и отмените следующее жадное вложение.

## Цикл тренировки

Сыграйте открытие три раза за одну цивилизацию. После каждой игры запишите первую пропущенную точку, её причину и восстановление. Сохраняйте билд, если он учит повторяемому решению; заменяйте его, если патч или карта изменили его предположения.`,
  },
  {
    slug: 'adaptive-scouting',
    title: 'Adaptive Scouting: From Information to Action',
    titleRu: 'Адаптивная разведка: от информации к действию',
    category: 'strategy',
    summary: 'Observe, classify the threat, choose the smallest response, then verify your read.',
    summaryRu:
      'Увидьте, классифицируйте угрозу, выберите минимальный ответ и затем проверьте вывод.',
    readMinutes: 5,
    body: `## Scout for a question

Do not scout because a guide says “scout.” Ask whether the opponent is attacking, booming, teching, trading, or hiding a transition. A useful report ends with an action.

## Three passes

1. **Opening (0:00–3:00):** sheep, enemy gold, first production clue, and forward foundations.
2. **Age-up:** landmark, builder count, new resource commitment, and whether immediate unit production is possible.
3. **Composition:** production, upgrades, reinforcements, and the next resource the enemy must protect.

## Classify before countering

- **Tempo:** early units or forward buildings. Buy time with the cheapest reliable defense.
- **Economy:** second Town Center, trade, farms, or secured gold. Pressure the investment or match safely.
- **Technology:** fast Castle, relics, sacred sites, or unique upgrades. Deny the timing or make them pay for defense.
- **Information denial:** walls, stealth, keeps, or a missing army. Search map edges and protect your own vulnerable resource.

## Verify the hypothesis

One pass is only a hypothesis. Return after 30–60 seconds or after the first fight. If the expected army is not there, stop producing an irrelevant counter and revise the plan. In a replay, record the timestamp, evidence, conclusion, and smallest action that would have changed the game.`,
    bodyRu: `## Разведывайте ради вопроса

Не разведуйте только потому, что это написано в гайде. Спросите: противник атакует, развивается, исследует технологии, торгует или скрывает переход? Полезный отчёт заканчивается действием.

## Три прохода

1. **Старт (0:00–3:00):** овцы, золото противника, первое производственное доказательство и передовые фундаменты.
2. **Переход в эпоху:** достопримечательность, число строителей, новый ресурс и возможность немедленно делать войска.
3. **Состав:** производство, улучшения, подкрепления и следующий ресурс, который враг обязан защищать.

## Сначала классифицируйте, потом контрите

- **Темп:** ранние войска или передовые здания. Купите время самой дешёвой надёжной защитой.
- **Экономика:** второй ГЦ, торговля, фермы или безопасное золото. Давите вложение или безопасно отвечайте экономикой.
- **Технологии:** быстрый Замок, реликвии, святыни или уникальные улучшения. Сорвите тайминг или заставьте платить за защиту.
- **Сокрытие информации:** стены, скрытность, крепости или пропавшая армия. Ищите края карты и защищайте свой уязвимый ресурс.

## Проверяйте гипотезу

Один проход — только гипотеза. Вернитесь через 30–60 секунд или после первой драки. Если ожидаемой армии нет, прекратите делать ненужный контр и измените план. В реплее запишите время, доказательство, вывод и минимальное действие, которое изменило бы игру.`,
  },
  {
    slug: 'team-game-roles',
    title: 'Team Game Roles and Timing',
    titleRu: 'Роли и тайминги в командной игре',
    category: 'strategy',
    summary:
      'Coordinate pressure, defense, and economy so allies execute one plan instead of separate 1v1s.',
    summaryRu:
      'Согласуйте давление, защиту и экономику, чтобы союзники исполняли один план, а не отдельные 1v1.',
    readMinutes: 5,
    body: `## Pick jobs before builds

Team games are not several isolated 1v1s. Decide who creates first pressure, who protects the exposed flank, who scales economy, and who owns water or map control. Civilization strengths inform jobs; they do not dictate them blindly.

## Share three timings

Call when the first army moves, when reinforcements arrive, and when the team changes age or composition. A smaller force arriving together is stronger than several larger forces arriving one at a time.

## Protect the weakest link efficiently

If an ally is rushed, send the smallest useful help: counter units, a wall segment, vision, or a production building. Keep your own economy and production alive so the rescue does not become a second collapse.

## Convert a team fight

After a successful fight, choose one shared objective: production, a resource, sacred site, trade route, landmark, or water control. Ping it and rally together. Damage without conversion gives the other team time to recover.`,
    bodyRu: `## Выберите задачи до билдов

Командная игра — не несколько изолированных 1v1. Решите, кто создаёт первое давление, кто защищает открытый фланг, кто развивает экономику, а кто отвечает за воду или контроль карты. Сильные стороны цивилизаций подсказывают роли, но не диктуют их вслепую.

## Назовите три тайминга

Сообщайте, когда выходит первая армия, приходят подкрепления и команда меняет эпоху или состав. Меньшая армия, пришедшая вместе, сильнее нескольких больших, пришедших по очереди.

## Экономно защищайте слабое звено

Если союзника рашат, отправьте минимальную полезную помощь: контр-юнитов, кусок стены, обзор или производственное здание. Сохраняйте собственную экономику и производство, чтобы спасение не превратилось во второй обвал.

## Конвертируйте командную драку

После успеха выберите одну общую цель: производство, ресурс, святыню, торговый маршрут, достопримечательность или воду. Отметьте её и соберитесь вместе. Урон без конвертации даёт другой команде время восстановиться.`,
  },
  {
    slug: 'patch-aware-guides',
    title: 'Patch-Aware Guide Reading',
    titleRu: 'Как читать гайды с учётом патча',
    category: 'economy',
    summary:
      'Avoid stale advice by checking patch, map pool, assumptions, and current game data before practicing a build.',
    summaryRu:
      'Избегайте устаревших советов: сверяйте патч, пул карт, предположения и данные игры до тренировки билда.',
    readMinutes: 4,
    body: `## Version comes first

Before copying a build, record its patch or season. Balance changes can alter unit cost, production time, landmark value, or the map pool while leaving a video title unchanged. Treat an unversioned build as a hypothesis until you test it.

## Check its assumptions

Look for map type, starting resources, game mode, civilization variant, matchup, and intended rank. A build designed for an open 1v1 map is not automatically safe on a closed team map.

## Prefer evidence-linked builds

The best reference combines a readable step list with a video, replay, or current data link. Compare costs and timings with the current Explorer before spending a whole session practicing it.

## Keep a local verdict

After three games, mark the guide **works**, **needs adaptation**, or **stale**. Record patch, map, matchup, and the first failed checkpoint. Your own evidence becomes more useful than an old global popularity score.`,
    bodyRu: `## Сначала смотрите версию

Перед копированием билда запишите его патч или сезон. Баланс может изменить стоимость юнита, время производства, ценность достопримечательности или пул карт, а название видео останется прежним. Билд без версии считайте гипотезой, пока не проверите его.

## Проверьте предположения

Посмотрите тип карты, стартовые ресурсы, режим, вариант цивилизации, матчап и целевой рейтинг. Билд для открытой 1v1-карты не обязан быть безопасным на закрытой командной карте.

## Выбирайте билды с доказательствами

Лучший источник сочетает понятный список шагов с видео, реплеем или актуальной ссылкой на данные. Сравните стоимость и тайминги с текущим Explorer до целой сессии тренировки.

## Храните свой вердикт

После трёх игр пометьте гайд: **работает**, **требует адаптации** или **устарел**. Запишите патч, карту, матчап и первую сломанную точку. Собственные данные полезнее старого глобального рейтинга популярности.`,
  },
  {
    slug: 'replay-review-checklist',
    title: 'Replay Review Checklist',
    titleRu: 'Чек-лист разбора реплея',
    category: 'fundamentals',
    summary: 'Separate confirmed evidence from assumptions in a repeatable 15-minute review.',
    summaryRu:
      'Отделяйте подтверждённые данные от предположений в повторяемом 15-минутном разборе.',
    readMinutes: 6,
    body: '## Start at the end\n\nWatch the final two minutes and name the loss condition: lost army, exposed economy, failed timing, tech gap, or teammate collapse. Then inspect production, economy, information, position, and conversion after a won fight. A production gap confirms no unit was queued, not why; a lower score confirms a gap, not the strategic mistake. Label conclusions confirmed, likely, or unknown, then choose one measurable next-game experiment.',
    bodyRu:
      '## Начните с конца\n\nПосмотрите последние две минуты и назовите условие поражения: армия, экономика, тайминг, технология или падение тиммейта. Затем проверьте производство, экономику, информацию, позицию и конверсию победной драки. Простой подтверждает отсутствие юнита в очереди, но не причину; отставание счёта подтверждает разрыв, но не ошибку. Помечайте выводы как подтверждённые, вероятные или неизвестные и выберите одну измеримую цель.',
  },
  {
    slug: 'mechanics-placement-and-micro',
    title: 'Game Mechanics: Farms, Deer, Hotkeys & Kiting',
    titleRu: 'Механики игры: фермы, олени, хоткеи и кайт',
    category: 'fundamentals',
    summary:
      'Use legal execution mechanics to shorten walking, control fights, and run production without losing the camera.',
    summaryRu:
      'Используйте честные механики исполнения: меньше ходьбы, лучше контроль боя и производство без потери камеры.',
    readMinutes: 8,
    body: `## Learn the principle, not a one-patch trick

The useful mechanics in AoE IV improve **information, unit control, or worker travel time**. They are repeatable with normal controls and still need a decision behind them. A technique that only works through a bug, a broken interaction, or an old patch is not a reliable build-order step.

Use the loop **observe → execute → return to the plan**. A fast command is only good if your villagers, production, and army are still doing the right thing afterward.

## Farms: compact, safe, and planned

Move to farms because the food plan requires it, not because a particular minute arrived. Before placing a large farm block, make sure you have the wood income, a safe drop-off point, and enough room for production and defenses.

- Put farms around the food drop-off that benefits your civilization, keeping the walking routes short and easy to protect.
- Leave clear exits from the Town Center and production. Do not make workers walk around a decorative wall of farms or houses.
- Build the next group before the current food source is exhausted; replace it in batches so villagers do not stand idle.
- Keep the block inside the area your army or Town Center can reasonably protect. A cheap exposed farm is often more expensive than a slightly later safe one.

Farm bonuses, available food sources, and the best landmark differ by civilization. Check the current Explorer and patch notes before copying a civilization-specific layout.

## Deer: reduce walking, but do not lose the hunt

Deer are a fast food source and a map-control test. If the hunt is safe enough to hold, a mill beside it can be a good temporary drop-off. A scout can also **push deer** toward that mill: approach from the far side and guide the deer closer in small, controlled moves. The value is reduced villager travel, not a magical increase in food.

Stop if the scout is needed for information, the enemy can punish the exposed villagers, or the deer are being driven into an awkward route. Scouting an enemy move is often worth more than saving a few seconds of walking.

## Building placement is a tactical resource

Place buildings for a purpose: protect a resource, create a small choke, shorten a rally route, or preserve space for the next age.

- Keep houses and short wall segments tight enough that enemy units cannot slip through, but leave villagers an exit before completing the segment.
- Put production close enough to reinforce a fight quickly, yet not so far forward that one raid removes it for free.
- Use an outpost where it buys reaction time on exposed gold, wood, deer, trade, or a crossing. Vision is part of the value.
- Set rally points deliberately after each move-out. A perfect fight is wasted if reinforcements walk through danger one by one.

Pathing and collision can change after patches. Treat unusual wall gaps or building collisions as a situation to test, not as a guaranteed trick.

## The F-key myth: selection and camera focus are separate

In the standard keyboard-grid layout, **F itself is a construction-grid key**. It is not a universal "teleport between buildings" command. The fast workflow comes from the configurable *Find and cycle units and buildings* controls.

- Default profiles commonly use **F1** for military buildings, **F2** for economic buildings, **F3** for research, and **F4** for landmarks, wonders, or the capital Town Center.
- After selecting a building group, **Tab** cycles the selected building type so you can queue units or upgrades efficiently.
- In Settings → Controls, choose whether a find/cycle command should **Select only** or **Select and center**. Select only lets you queue production without dragging the camera away from a fight; centering is useful when you need to inspect a threatened building.
- Bind camera focus and control groups to keys you can reach consistently. Custom profiles change all of these defaults, so check the displayed binding rather than memorising someone else's setup.

Practice one drill: while watching your army, select production, queue two rounds, press Tab to check the next building, then return to the fight. The goal is no idle production and no lost army.

## Kiting and small-scale micro

Kiting (stutter-stepping) means giving a ranged attack, moving while the unit reloads, then attacking again. It creates distance and makes slow melee units spend more time walking.

1. Focus a valuable or vulnerable target.
2. Move the ranged group back or sideways during its attack cooldown.
3. Re-engage before the next shot, using a screen of melee units when possible.
4. Stop kiting if the enemy is faster, reinforcements are arriving, or your movement exposes the army to a surround.

Add formations, control groups, and a front-line screen before chasing fancy micro. A retreat path, a rally point, and an army that stays together usually matter more than one extra shot.

## "Abuse" checklist

Call it a **mechanic** when it works through normal commands, has a clear counterplay, and remains consistent after a patch. Deer pushing, shift-queued worker tasks, production cycling, target fire, and kiting pass that test.

Do not build your plan around an exploit, UI failure, desync, or a pathing bug. If a clip calls something an "abuse," verify it in a custom game on the current patch and keep a normal fallback. The linked videos are a practice library; patch notes remain the final authority for balance-sensitive details.`,
    bodyRu: `## Учите принцип, а не трюк одного патча

Полезные механики AoE IV улучшают **информацию, контроль армии или путь крестьян**. Их можно повторить обычными командами, но за ними всё равно должно стоять решение. Приём, который держится только на баге, сломанном взаимодействии или старом патче, нельзя считать надёжным шагом билда.

Рабочий цикл: **увидели → исполнили → вернулись к плану**. Быстрая команда ценна, только если после неё крестьяне, производство и армия продолжают делать нужное.

## Фермы: компактно, безопасно, заранее

Переходите на фермы, когда этого требует план по еде, а не потому что наступила «правильная» минута. Перед большим блоком ферм обеспечьте доход дерева, безопасную точку сдачи и место под производство с защитой.

- Ставьте фермы вокруг точки сдачи еды, выгодной вашей цивилизации: путь короче, защищать проще.
- Оставляйте свободные выходы из ТЦ и производства. Не заставляйте крестьян обходить декоративную стену из ферм и домов.
- Закладывайте следующую группу до исчерпания текущего источника еды; заменяйте пачками, чтобы не было простоя.
- Держите блок в зоне, которую реально прикрывают ТЦ или армия. Дешёвая, но открытая ферма часто обходится дороже чуть более поздней безопасной.

Бонусы ферм, доступные источники еды и лучший landmark различаются по цивилизациям. Перед копированием раскладки проверьте текущий Explorer и патчноут.

## Олени: сокращаем путь, но не теряем охоту

Олени — быстрый источник еды и проверка контроля карты. Если охоту можно удержать, мельница рядом с ней даёт удобную временную точку сдачи. Разведчик также может **подгонять оленей** к мельнице: подойдите с дальней стороны и небольшими, контролируемыми движениями направляйте их ближе. Ценность в меньшем пути крестьян, а не в «создании» новой еды.

Остановитесь, если разведчик нужен для информации, соперник может наказать открытых крестьян или олени уходят по неудобному маршруту. Обнаружить выход вражеской армии часто ценнее, чем сэкономить несколько секунд ходьбы.

## Расстановка зданий — это тактический ресурс

У каждого здания должна быть цель: прикрыть ресурс, создать узкое место, сократить путь подкреплений или сохранить место под следующую эпоху.

- Ставьте дома и короткие сегменты стен плотно, чтобы враг не прошёл в щель, но до завершения оставляйте крестьянам выход.
- Производство держите достаточно близко для быстрых подкреплений, но не настолько впереди, чтобы один рейд забрал его бесплатно.
- Ставьте заставу там, где она даёт время на реакцию: открытое золото, лес, олени, торговля, переход. Обзор — часть её ценности.
- После каждого выхода армии осознанно меняйте точку сбора. Идеальный бой не поможет, если подкрепления по одному идут через опасную зону.

Патч может изменить путь и коллизии. Необычные щели в стенах и столкновения зданий сначала проверяйте в кастомной игре, а не делайте основой плана.

## Миф про кнопку F: выбор и фокус камеры — разные вещи

В стандартной keyboard-grid раскладке **сама F — это клавиша сетки строительства**. Это не универсальная «телепортация между зданиями». Быстрый цикл строится на настраиваемых командах *Find and cycle units and buildings*.

- В типовых профилях **F1** выбирает военные здания, **F2** — экономические, **F3** — исследования, **F4** — landmark, wonder или столичный ТЦ.
- После выбора группы зданий **Tab** перебирает выбранный тип: так удобно быстро ставить юнитов и улучшения в очередь.
- В Settings → Controls задайте режим **Select only** или **Select and center**. Первый позволяет ставить производство в очередь, не уводя камеру с боя; второй нужен, когда требуется осмотреть атакуемое здание.
- Назначьте фокус камеры и контрольные группы на удобные клавиши. В кастомном профиле все эти значения меняются, поэтому сверяйтесь с показанной привязкой, а не с чужой раскладкой.

Тренировка: наблюдая за армией, выберите производство, поставьте две очереди, нажмите Tab для следующего здания и вернитесь к бою. Цель — не терять ни производство, ни армию.

## Кайт и микро малых боёв

Кайт (stutter-step) — это выстрел дальней группой, движение во время перезарядки и новый выстрел. Так медленные мили-юниты дольше идут пешком и не наносят урон.

1. Выберите ценную или уязвимую цель.
2. Во время перезарядки отведите дальнюю группу назад или в сторону.
3. Вернитесь к атаке к следующему выстрелу; по возможности прикрывайте дальних мили-линией.
4. Прекратите кайт, если враг быстрее, подходят подкрепления или движение открывает армию для окружения.

Сначала добавьте формации, контрольные группы и переднюю линию, а уже потом усложняйте микро. Путь отхода, точка сбора и армия, которая остаётся вместе, обычно важнее одного лишнего выстрела.

## Чек-лист для «абуза»

Называйте приём **механикой**, если он работает обычными командами, имеет понятный контрплей и остаётся стабильным после патча. Подгон оленей, очереди задач через Shift, перебор производства, фокусный огонь и кайт этому соответствуют.

Не стройте план на эксплойте, ошибке интерфейса, рассинхроне или баге пути. Если в ролике приём называют «абузом», проверьте его в кастомной игре на текущем патче и держите обычный запасной план. Видео ниже — библиотека для тренировки; последнее слово за патчноутами.`,
  },
  {
    slug: 'video-research-findings',
    title: 'What 1,000 AoE4 Guides Repeat',
    titleRu: 'Что повторяют 1000 гайдов по AoE4',
    category: 'strategy',
    summary:
      'A cross-video synthesis: repeated habits, false shortcuts, and a practice loop that turns advice into measurable improvement.',
    summaryRu:
      'Сводка повторяющихся советов, ложных shortcuts и цикла тренировки по массиву из 1000 видео.',
    readMinutes: 7,
    body: `## What was actually analysed

The catalogue contains 1,000 unique AoE4 videos collected from 24 focused YouTube searches and grouped by topic and difficulty. The synthesis below uses titles, channel metadata, descriptions where available, and the existing recent video-signal report; it does **not** reproduce full copyrighted transcripts. Treat each conclusion as a strong practice hypothesis and verify patch-sensitive details in the linked source and current Explorer.

## Six findings that survive across topics

### 1. Macro is the common denominator

Beginner, civilization, and professional-analysis videos keep returning to the same failure: an idle Town Center, a missing house, or resources floating without a production plan. A clean opening is not a memorized timestamp; it is continuous villager production plus a resource split that pays for the next decision.

**Practice test:** after each game, count Town Center idle time, supply blocks, and unspent resources at the first fight. Fix the largest number first.

### 2. Scouting is a trigger for a branch

The useful scout information is not a screenshot of the enemy base. It is a branch: early stable → spears and protected food; stone mining → confirm a second Town Center or defensive structure; missing army → scout the exits and outer resources. The same build can be correct or terrible depending on that branch.

**Practice test:** write one response beside each scout observation before you queue the next building.

### 3. The strongest "farm/deer tips" save walking without sacrificing information

Farm blocks near the right drop-off and a safe deer hunt reduce worker travel. Pushing deer with a scout is useful when the hunt is safe, but it is never worth losing the scout before the opponent's transition is known. Videos that show a trick without its safety condition are incomplete.

### 4. Micro has a priority order

The recurring order is target selection → formation/front line → attack-move or focus fire → movement during cooldown → retreat before the surround. Kiting is one tool inside that sequence, not a replacement for a screen, reinforcements, or a safe path.

**Practice test:** review one fight and mark the first preventable loss: wrong target, broken formation, idle reinforcement, or late retreat.

### 5. Hotkeys are about camera discipline

The best workflow keeps the army on screen while production is queued. Use control groups, select-only building commands, Tab cycling, rally points, and Shift queues. A key that moves the camera to a building is only useful when you actually need to inspect that building.

### 6. Professional play is a loop, not a trick list

High-level analysis repeatedly follows **information → resource allocation → production → position → conversion**. After a won fight, take a resource, production building, landmark, sacred site, trade route, or map space. Damage with no conversion gives the opponent time to reset.

## A 20-minute practice block

1. Watch one beginner or economy source and choose one measurable habit.
2. Play one AI or unranked game with that habit written beside the minimap.
3. Watch the replay at 4× speed until the first divergence from the plan.
4. Check the current patch and Explorer before changing a cost, timing, or civilization recommendation.
5. Repeat the same experiment three times; only then promote it into your default build.

## Direct reading to pair with the videos

- The official shortcut reference explains remapping, control groups, Shift commands, and F1/F2/F3 + Tab cycling.
- The official starter guide covers rally-point resources, age-up decisions, scouting, counters, multiple production buildings, and camera-safe groups.
- The current Academix and Seven Swords beginner articles are useful reading passes; AoE4World's curated catalogue is the place to find civilization-specific follow-ups.

The catalogue is a discovery map, not a promise that every old video survives the current patch. Prefer evidence that names its season, map, civilization, and first adaptation point.`,
    bodyRu: `## Что именно анализировалось

В каталоге 1000 уникальных видео AoE4 из 24 точечных поисковых запросов YouTube. Материалы разбиты по темам и сложности. Сводка ниже использует заголовки, метаданные каналов, доступные описания и существующий отчёт по свежим видеосигналам; **полные защищённые авторским правом расшифровки не копируются**. Каждый вывод — сильная гипотеза для тренировки; точные значения и патчевые советы проверяйте по источнику и текущему Explorer.

## Шесть выводов, которые повторяются в разных темах

### 1. Макро — общий знаменатель

В гайдах для новичков, по цивилизациям и в профессиональных разборах постоянно повторяется одна ошибка: простой ТЦ, пропущенный дом или накопленные ресурсы без плана производства. Чистое открытие — не заученная секунда, а непрерывное производство крестьян и расклад ресурсов под следующее решение.

**Проверка:** после игры посчитайте простой ТЦ, блоки снабжения и неистраченные ресурсы к первой драке. Сначала исправьте самое большое число.

### 2. Разведка включает ветку плана

Полезный результат разведки — не скриншот базы. Это ветка: ранняя конюшня → копейщики и защищённая еда; добыча камня → подтвердить второй ТЦ или оборонительное здание; армия исчезла → проверить выходы и внешние ресурсы. Один и тот же билд может быть правильным или плохим в зависимости от ветки.

**Проверка:** рядом с каждым наблюдением разведчика запишите ответ до постановки следующего здания.

### 3. Лучшие советы про фермы и оленей сокращают путь, но не информацию

Блок ферм у правильной точки сдачи и безопасная охота на оленей сокращают путь работников. Подгон оленей разведчиком полезен, когда охота удерживается, но не стоит потери разведчика до того, как вы увидели переход соперника. Ролик, где показан только трюк без условия безопасности, неполон.

### 4. У микро есть порядок приоритетов

Повторяющийся порядок: выбор цели → формация и передняя линия → attack-move или фокусный огонь → движение во время перезарядки → отход до окружения. Кайт — один инструмент в этой цепочке, а не замена прикрытию, подкреплениям и пути отхода.

**Проверка:** в одном бою отметьте первую предотвратимую потерю: неверная цель, сломанная формация, простоявшее подкрепление или поздний отход.

### 5. Хоткеи нужны для дисциплины камеры

Лучший рабочий процесс оставляет армию на экране, пока вы ставите производство в очередь. Используйте контрольные группы, Select only для зданий, цикл Tab, точки сбора и очереди Shift. Клавиша, уводящая камеру к зданию, полезна только когда здание действительно нужно осмотреть.

### 6. Профессиональная игра — это цикл, а не список трюков

В сильных разборах повторяется цепочка **информация → распределение ресурсов → производство → позиция → конвертация**. После выигранного боя забирайте ресурс, производство, landmark, святыню, торговый маршрут или пространство карты. Урон без конвертации даёт сопернику время восстановиться.

## 20 минут практики

1. Посмотрите один материал для новичка или по экономике и выберите одну измеримую привычку.
2. Сыграйте одну игру против ИИ или без рейтинга, записав привычку рядом с миникартой.
3. Просмотрите реплей на скорости 4× до первого отклонения от плана.
4. Перед изменением стоимости, тайминга или совета по цивилизации проверьте текущий патч и Explorer.
5. Повторите один эксперимент три раза; только после этого делайте его стандартным билдом.

## Статьи в пару к видео

- Официальная памятка хоткеев объясняет переназначение, контрольные группы, Shift и цикл F1/F2/F3 + Tab.
- Официальный стартовый гайд разбирает rally points ресурсов, переход эпох, разведку, контры, несколько производственных зданий и группы без прыжка камеры.
- Свежие статьи Academix и Seven Swords подходят для первого чтения, а кураторский каталог AoE4World — для продолжения по цивилизации.

Каталог — карта для поиска, а не гарантия, что каждый старый ролик пережил текущий патч. Предпочитайте материалы, где указаны сезон, карта, цивилизация и точка первой адаптации.`,
  },
  {
    slug: 'valdemar-replay-analysis',
    title: 'Pro Replay Analysis: How to Review Your Matches',
    titleRu: 'Профессиональный анализ реплеев: как разбирать свои матчи',
    category: 'strategy',
    summary:
      "Valdemar's structured methodology for reviewing replays: finding the First Cause of defeat, tracking TC uptime, timing checks, and resource floating.",
    summaryRu:
      'Структурированная методология разбора реплеев от Valdemar: поиск первопричины поражения (First Cause), проверка аптайма ТЦ, таймингов и утечек ресурсов.',
    readMinutes: 6,
    body: `## The First Cause Principle

When watching a loss, most players jump to the final big battle where their army died and blame their micro. **Valdemar's golden rule: the match was usually decided 5 to 10 minutes earlier.**

To find the true reason you lost, ask this diagnostic sequence:

1. **Town Center Uptime (Minutes 0–8):** Did you stop making villagers during your Feudal transition or when harassed? A 30-second TC idle costs 1.5 villagers, which compounds into hundreds of lost resources by minute 12.
2. **The Scouting Decision Point:** What did your scout see between 2:30 and 4:00? Did you see a forward stable, a second TC, or gold mining, and did your production immediately answer it?
3. **Floating Resources:** If you had 800 excess wood and 600 gold while your army was overwhelmed, the issue was not unit counters—it was missing production buildings (barracks, stables, ranges).

## The Replay Scrubbing Method

When reviewing in the in-game replay viewer or RTSLytics ReplayLab, follow this systematic timeline:

- **Minute 3:30 (Opening Check):** Verify your age-up landmark start time and villager allocations. Ensure zero queued idle time.
- **Minute 5:30 (First Military Timing):** Check who produced the first military units. If the opponent was aggressive, where were your defensive units and scout positioned?
- **Minute 8:00 (Macro Branch):** Look at total villager counts and resource gather rates. If the enemy expanded to a 2nd TC, did you either punish outer resources, match the expansion, or advance to Castle Age with relics?
- **Minute 12:00 (Tech & Farm Transition):** Did you get +1 ranged/melee armor? Did you transition to farms before sheep/deer ran out, or were your villagers forced to idle under the Town Center?

## Actionable Takeaway Rule

Never close a replay without writing down **one specific mechanical rule** for your next match:
- *Example:* "Next game vs French: place barracks at 3:15 and build 4 spearmen before attempting deer gathering."
- *Example:* "Next game vs 2TC boom: build a ram and 8 archers by 6:30 instead of idling in base."`,
    bodyRu: `## Принцип первопричины (First Cause)

Разбирая поражение, большинство игроков смотрят на финальное сражение, где пала их армия, и винят свой микроконтроль. **Главное правило Valdemar: исход матча почти всегда решается за 5–10 минут до решающего боя.**

Чтобы найти истинную причину поражения, проверьте следующие контрольные точки:

1. **Аптайм ТЦ (0–8 минуты):** Останавливалось ли производство крестьян во время перехода в Феодал или при раннем харассе? Простой ТЦ даже на 30 секунд стоит 1.5 крестьян, что к 12-й минуте превращается в сотни потерянных ресурсов.
2. **Точка решения по разведке:** Что увидел ваш разведчик между 2:30 и 4:00? Увидели ли вы раннюю конюшню, второй ТЦ или сбор камня, и перестроилось ли ваше производство мгновенно под этот сигнал?
3. **Излишки ресурсов (Floating Resources):** Если у вас скопилось 800 дерева и 600 золота в момент, когда вас задавили, проблема не в контр-юнитах, а в нехватке производственных зданий (казарм, стрельбищ, конюшен).

## Метод разбора по таймлайну

В реплеере игры или ReplayLab RTSLytics двигайтесь по следующим ключевым отсечкам:

- **3:30 (Старт и переход):** Проверьте время закладки landmark и распределение рабочих. Убедитесь в отсутствии простоя очереди.
- **5:30 (Первый военный тайминг):** Кто первым вышел в армию? Если оппонент пошёл в агрессию, где стояло ваше прикрытие и разведчик?
- **8:00 (Макро-развилка):** Сравните число рабочих. Если противник поставил 2-й ТЦ, наказали ли вы его внешние ресурсы, поставили свой ТЦ или вышли в Замок за реликвиями?
- **12:00 (Грейды и переход на фермы):** Сделали ли вы +1 броню? Перешли ли на фермы до исчерпания овец/оленей, или крестьяне встали под ратушей?

## Правило одного вывода

Никогда не закрывайте реплей без **одного конкретного правила** на следующую игру:
- *Пример:* «В игре против Франции: ставить казарму в 3:15 и делать 4 копейщиков до выхода на дальних оленей».
- *Пример:* «Против 2 ТЦ бума: делать таран и 8 лучников к 6:30, а не пассивно стоять на базе».`,
  },
  {
    slug: 'valdemar-countering-turtles',
    title: 'Countering Turtles: Map Dominance Without Dives',
    titleRu: 'Контр-игра против закрытых баз: доминирование на карте без дайвов',
    category: 'strategy',
    summary:
      'How to punish passive turtling players (Golden Horde, HRE, English) by starving neutral resources, booming with 2TC, and bringing timely siege instead of throwing units under Town Centers.',
    summaryRu:
      'Как наказывать пассивных оппонентов без самоубийственных штурмов: контроль нейтральных ресурсов, безопасный бум и своевременная осадная подготовка.',
    readMinutes: 5,
    body: `## The Turtle Trap

When an opponent builds early walls, outposts, and gathers exclusively under their Town Center or defensive landmarks, beginner and intermediate players often make the fatal mistake: **diving the base too early and losing their entire army to defensive fire.**

A turtle player spends hundreds of resources on walls, towers, and defensive structures that cannot move or gather resources. If you do not dive them, those investments generate zero return.

## The 3-Pillar Anti-Turtle Strategy

### 1. Total Neutral Resource Denial
- Take all contested deer packs, boar, and outer berry patches with total safety.
- Your food gathering rate on hunt is significantly faster (~0.83 vs ~0.66 food/sec) than their safe farm gathering under the Town Center.
- Place small outposts or palisade walls near contested gold veins and neutral resources to ensure they cannot step out.

### 2. Economic Scaling (2nd Town Center or Fast Castle)
- Because the turtle has zero map presence and cannot threaten your base, you are 100% safe to add a second Town Center or safely advance to Castle Age.
- Secure all 5 relics on the map without contest. Five relics generate 400 gold/min permanently—equivalent to 10 free gold villagers.
- Capture Sacred Sites for steady gold generation and victory pressure timer.

### 3. Assembled Siege Strike (Minute 12–15)
- Do not attack with pure infantry or cavalry.
- Wait until you have 2–3 Trebuchets or Mangonels/Springalds and a solid screen of counter-units.
- Slowly breach the outer walls from outside Town Center and Keep range, forcing the turtle to walk out into your prepared army.`,
    bodyRu: `## Ловушка черепашьей игры

Когда соперник ставит глухие стены, башни и сидит исключительно под защитой ратуши или оборонительных landmark, начинающие игроки часто совершают фатальную ошибку: **идут на штурм базы и теряют всю армию под огнём стрел.**

Игрок в обороне тратит сотни ресурсов на стены и башни, которые не двигаются и не приносят ресурсов. Если вы не штурмуете их в лоб, эти затраты противника не окупаются.

## Стратегия победы из 3 шагов

### 1. Полный контроль нейтральных ресурсов
- Забирайте все нейтральные стада оленей, кабанов и внешние ягоды в полной безопасности.
- Скорость сбора с охоты (~0.83 ед/сек) существенно выше сбора с ферм (~0.66 ед/сек), что даёт вам колоссальное преимущество по темпу.
- Ставьте передовые аванпосты у нейтральных залежей золота, чтобы противник не мог выйти с базы.

### 2. Экономическое масштабирование (2 ТЦ или Быстрый Замок)
- Пока оппонент заперт и не имеет армии на карте, вы можете абсолютно безопасно поставить второй ТЦ или выйти в Замковую эпоху.
- Соберите все 5 реликвий на карте. Пять реликвий дают 400 золота/мин бессрочно — это эквивалентно 10 бесплатным крестьянам на золоте.
- Захватывайте Священные места (Sacred Sites), запуская таймер победы.

### 3. Подготовленный осадный удар (12–15 минута)
- Не атакуйте одной пехотой или кавалерией.
- Дождитесь готовности 2–3 требушетов или мангонелей и постройте плотный скрининг из контр-юнитов.
- Разрушайте ключевые укрепления с безопасной дистанции вне радиуса огня ратуши, вынуждая соперника выходить в открытое поле на ваших условиях.`,
  },
  {
    slug: 'valdemar-mistakes-hardstuck',
    title: 'Fixing the 5 Mistakes That Keep Players Hardstuck',
    titleRu: 'Исправление 5 ошибок, удерживающих игроков в Платине и Даймонде',
    category: 'fundamentals',
    summary:
      "Valdemar's coaching checklist for breaking into Conqueror: army screen discipline, floating resources, delayed farm transitions, idle TC in fights, and blindly matching the enemy.",
    summaryRu:
      'Коучинговый чеклист Valdemar для выхода в Conqueror: дисциплина прикрытия армии, излишки ресурсов, своевременный переход на фермы и постоянное производство крестьян.',
    readMinutes: 6,
    body: `## The 5 Breakthrough Adjustments

From analyzing hundreds of coaching games between Gold and Conqueror, Valdemar highlights five recurring habits that prevent players from climbing:

### 1. Attacking Without an Army Screen
Archers without spearmen or men-at-arms in front will be wiped in seconds by horsemen or knight flanks. Always maintain a 1:2 or 1:3 frontline-to-backline unit ratio before leaving your base.

### 2. Floating Unspent Resources
Having 1,500 unspent food and wood is the same as playing with 20 fewer military units. Rule of thumb: add 1 production building for every 3–4 excess workers beyond basic maintenance, or queue Blacksmith upgrades immediately.

### 3. Neglecting the Farm Transition Window
When your starting sheep and nearby berries run dry around minute 7–9, scrambling to place 10 farms all at once costs 750 wood and stalls your military production. **Solution:** Transition 1–2 villagers to farms every minute starting from minute 6.

### 4. Panicking During Defense and Idling 20 Villagers
When 2 enemy horsemen raid your woodline, ringing the Town Bell pulls your entire economy off work. Instead, select only the 3 attacked villagers, send them to garrison or move behind the TC, while the rest of your economy continues gathering.

### 5. Blindly Copying the Opponent's Strategy
If your civ has strong early Feudal tempo (e.g. English, French, Delhi) and you see an opponent booming on 2TC, do not panic and build a slow 2TC yourself. Exploit your civilization's asymmetric advantage by applying immediate pressure on their exposed gold or stone!`,
    bodyRu: `## 5 ключевых исправлений для роста ранга

На основе сотен коучинг-сессий от уровня Gold до Conqueror Valdemar выделяет 5 главных привычек, мешающих росту:

### 1. Атака без защитного скрининга
Лучницы без прикрытия копейщиков или латников уничтожаются за секунды любым фланговым чарджем кавалерии. Всегда держите соотношение передней линии к стрелкам как минимум 1:2 или 1:3 перед выходом с базы.

### 2. Накопление нереализованных ресурсов (Floating)
1500 непотраченной еды и дерева равносильны игре с отставанием в 20 боевых единиц. Правило: добавляйте по 1 производственному зданию на каждые 3–4 свободных крестьянина или мгновенно заказывайте улучшения в кузнице.

### 3. Пропуск окна перехода на фермы
Когда стартовые овцы и ближние ягоды заканчиваются на 7–9 минутах, резкая закладка 10 ферм разом требует 750 дерева и полностью парализует производство армии. **Решение:** переводите по 1–2 крестьянина на фермы каждую минуту, начиная с 6-й минуты.

### 4. Панический гарнизон и простой экономики
При набеге двух вражеских всадников колокол ратуши останавливает работу всей базы. Выделяйте только тех 2–3 рабочих, которых атакуют, пока остальная экономика продолжает непрерывно приносить ресурсы.

### 5. Слепое копирование чужой стратегии
Если ваша цивилизация имеет мощный феодальный темп (Англия, Франция, Дели), а соперник ставит 2-й ТЦ, не нужно паниковать и ставить медленный 2-й ТЦ в ответ. Реализуйте асимметричное преимущество своей цивилизации через жесткое давление на открытые ресурсы врага!`,
  },
  {
    slug: 'valdemar-frame-timings-complete',
    title: 'Master Guide to Frame-Accurate Timings & Visual Milestones',
    titleRu: 'Полный справочник по покадровым таймингам и макро-контрольным точкам',
    category: 'strategy',
    summary:
      'The definitive guide to competitive AoE4 match timings: frame-accurate second-by-second benchmarks, worker HUD distributions, ASCII base layout blueprints, and transcript excerpts from Valdemar.',
    summaryRu:
      'Исчерпывающий справочник по соревновательным таймингам AoE4: посекундные эталоны выхода в эпохи, распределение крестьян в HUD, схемы расстановки баз и проверенные цитаты из транскрипций Valdemar.',
    readMinutes: 8,
    body: `## The Anatomy of Competitive Match Timings

In professional Age of Empires IV play, games are won and lost by razor-thin timing margins. A player reaching the Feudal Age 30 seconds faster commands immediate military initiative, denies neutral resources, and dictates the macro pace.

Based on detailed frame analysis and transcripts across 370 videos from Valdemar, this guide outlines the **6 universal timing phases** and the exact worker allocations required to play at Conqueror level.

---

## Phase 1: Dark Age Opening & Zero TC Idle (0:00 – 2:30)

- **Target:** 7 villagers on sheep, 3 on gold mining camp, 0 queue downtime.
- **Critical Milestone:** 400 Food and 200 Gold banked between **2:10 and 2:30**.
- **Valdemar's Transcript Insight:**
  > *"Every 20 seconds of Town Center idle in the Dark Age permanently robs your economy of 1 villager (~40 resources/min compounding throughout the game). Never let your TC queue empty while rallying."*
- **Base Layout Rules:**
  - Place your gold mining camp directly facing the Town Center for shortest walking path.
  - Keep sheep clustered directly under the Town Center drop-off point.

---

## Phase 2: Feudal Age Landmark Benchmarks (2:30 – 3:45)

| Civilization | Landmark Choice | Builder Vills | Target Complete Time |
| :--- | :--- | :--- | :--- |
| **English** | Council Hall | 3 | **03:00 – 03:15** |
| **French** | School of Cavalry | 3 | **03:15 – 03:25** |
| **Holy Roman Empire** | Aachen Chapel | 3 | **03:00 – 03:10** |
| **Byzantines** | Grand Winery | 3 | **03:30 – 03:40** |
| **Rus** | Golden Gate | 3 | **03:25 – 03:35** |
| **Ayyubids** | House of Wisdom (Growth) | 0 (Passive) | **03:30 – 03:45** |
| **Ottomans** | Twin Minaret Medrese | 3 | **03:40 – 03:50** |

- **Valdemar's 3-Villager Rule:**
  > *"Building with 3 villagers provides the optimal equilibrium between age-up speed and resource preservation. Using 5+ villagers cripples your food income, leaving you without food to train military upon completion."*

---

## Phase 3: First Military & Map Containment (3:45 – 5:30)

- **Target Benchmark:** First military units on the field by **4:30 – 5:30**.
- **Frontline Screening:**
  - Longbows / Archers must be screened by 2–4 Spearmen or Men-at-Arms to prevent cavalry flanks.
  - Place forward Outposts with Arrowslits covering contested outer gold and woodlines.
- **Common Mistake:** Diving enemy base under Town Center fire. Starve the opponent off the map instead of losing units to static defense.

---

## Phase 4: Mid-Game Macro Branch (6:00 – 8:30)

At minute 6, your strategy must deliberately commit to one of three paths:

### Path A: Smooth 8-Farm Mill Wheel Transition
- Do not spend 600 wood all at once.
- Place 1 farm every 60–75 wood, creating a tight 8-farm perimeter around your mill.

### Path B: 2nd Town Center Expansion
- Collect 350 stone between 4:30 and 5:30.
- Drop the 2nd TC by **6:30 – 7:00** directly on a contested deer patch or secondary gold vein.

### Path C: Fast Castle Push
- Transition heavy vills to Gold (6–8 vills) and hit Castle Age between **7:00 and 8:00**.

---

## Phase 5: Castle Age, Relic Sweep & Siege (8:30 – 14:00)

- **Target:** Castle Age completion between **7:30 and 9:30**.
- **The 5-Relic Priority:** Produce 2–3 Monks immediately upon age-up. 5 relics generate 400 gold/min indefinitely (equivalent to 10 free gold miners).
- **Field Siege Assembly:** Research Siege Engineering and construct 2–3 Rams with infantry in the field to crack outlying production buildings.

---

## Pacing Evaluation Scale

- **Grade S (Conqueror):** Feudal Age ≤ 3:30, Castle Age ≤ 8:00.
- **Grade A (Diamond):** Feudal Age 3:31 – 4:05, Castle Age 8:01 – 9:30.
- **Grade B (Platinum):** Feudal Age 4:06 – 4:35, Castle Age 9:31 – 11:00.
- **Grade C / D (Critical Delay):** Feudal Age > 4:35. Indicates significant Town Center idling or misallocated build orders.`,
    bodyRu: `## Анатомия соревновательных таймингов

В профессиональной игре Age of Empires IV матчи выигрываются и проигрываются за счёт секундных преимуществ. Игрок, вышедший в Феодал на 30 секунд раньше, мгновенно захватывает военную инициативу, перекрывает нейтральные ресурсы и диктует темп игры.

На основе детального покадрового анализа и транскрипций 370 видео Valdemar этот гайд описывает **6 универсальных макро-фаз** и точные распределения рабочих для игры на уровне Conqueror.

---

## Фаза 1: Тёмная эпоха и нулевой простой ТЦ (0:00 – 2:30)

- **Цель:** 7 рабочих на овцах, 3 на лагере золотодобычи, нулевой простой очереди ТЦ.
- **Контрольная точка:** Накопление 400 пищи и 200 золота между **2:10 и 2:30**.
- **Цитата из транскрипции Valdemar:**
  > *«Каждые 20 секунд простоя ТЦ в Тёмной эпохе навсегда лишают вас 1 крестьянина (~40 ресурсов/мин накопительным итогом на всю игру). Никогда не допускайте пустой очереди в ТЦ во время разведки.»*
- **Правила расстановки базы:**
  - Лагерь на золоте ставится со стороны, обращённой к ТЦ, для минимальной дистанции ходьбы.
  - Овцы режутся строго под зоной сдачи ресурсов главного Городского центра.

---

## Фаза 2: Феодальные бенчмарки и достопримечательности (2:30 – 3:45)

| Цивилизация | Выбор Landmark | Строители | Время выхода |
| :--- | :--- | :--- | :--- |
| **Англия** | Ратуша совета | 3 | **03:00 – 03:15** |
| **Франция** | Школа кавалерии | 3 | **03:15 – 03:25** |
| **Священная Римская Империя** | Ахенская капелла | 3 | **03:00 – 03:10** |
| **Византия** | Великая винодельня | 3 | **03:30 – 03:40** |
| **Русь** | Золотые ворота | 3 | **03:25 – 03:35** |
| **Айюбиды** | Дом Мудрости (Рост) | 0 (Авто) | **03:30 – 03:45** |
| **Османы** | Медресе с минаретами | 3 | **03:40 – 03:50** |

- **Правило 3 строителей от Valdemar:**
  > *«Постройка 3 крестьянами дает идеальный баланс между скоростью перехода и сохранением добычи. Если снять 5+ рабочих, приток пищи обнулится и по выходу в эпоху у вас не будет ресурсов на заказ первых войск.»*

---

## Фаза 3: Первая армия и контроль карты (3:45 – 5:30)

- **Бенчмарк:** Первые боевые единицы на карте к **4:30 – 5:30**.
- **Защитный скрининг:**
  - Стрелки и лучники обязательно прикрываются 2–4 копейщиками или латниками спереди.
  - Передовые аванпосты с бойницами перекрывают внешнее золото и лесопилки оппонента.
- **Главная ошибка:** Не идите на самоубийственный штурм под стрелы ТЦ. Перекрывайте ресурсы на карте и душите экономику соперника.

---

## Фаза 4: Макро-развилка мидгейма (6:00 – 8:30)

К 6-й минуте необходимо четко выбрать одну из 3 стратегических веток:

### Ветка 1: Плавный переход на колесо из 8 ферм
- Не тратьте 600 дерева единовременно.
- Добавляйте по 1 ферме на каждые 60–75 дерева, формируя плотное кольцо вокруг мельницы.

### Ветка 2: Бум во 2-й Городской центр
- Сбор 350 камня между 4:30 и 5:30.
- Постановка 2-го ТЦ к **6:30 – 7:00** на спорных оленях или внешней золотой жиле.

### Ветка 3: Быстрый Замок (Fast Castle)
- Перевод 6–8 рабочих на золото и взятие Замковой эпохи на **7:00 – 8:00**.

---

## Фаза 5: Замковая эпоха, сбор 5 реликвий и осада (8:30 – 14:00)

- **Цель:** Выход в Замок между **7:30 и 9:30**.
- **Битва за реликвии:** Нанимайте 2–3 монахов сразу по выходу. 5 реликвий дают 400 золота/мин бессрочно (эквивалент 10 бесплатных рабочих на золоте).
- **Полевая осада:** Изучите Осадную инженерию и собирайте 2–3 тарана пехотой прямо в поле для разрушения внешних зданий.

---

## Шкала оценки темпа (Pacing Scale)

- **Grade S (Conqueror):** Феодал ≤ 3:30, Замок ≤ 8:00.
- **Grade A (Diamond):** Феодал 3:31 – 4:05, Замок 8:01 – 9:30.
- **Grade B (Platinum):** Феодал 4:06 – 4:35, Замок 9:31 – 11:00.
- **Grade C / D (Задержка):** Феодал > 4:35. Свидетельствует о значительном простое ТЦ или ошибке в билд-ордере.`,
  },
]

/** Additional references retained for deeper patch and civilization context. */
export const GUIDE_RESOURCES: readonly GuideResource[] = [
  {
    id: 'official-patch-20249',
    kind: 'patch',
    title: 'Age of Empires IV — Patch 20249',
    titleRu: 'Age of Empires IV — патч 20249',
    description:
      'Latest official notes: balance, map changes, hotkey fixes, UI changes, and replay-version caveats.',
    descriptionRu:
      'Последние официальные заметки: баланс, карты, исправления хоткеев, UI и важное предупреждение о версиях реплеев.',
    source: 'Age of Empires Official',
    url: 'https://www.ageofempires.com/news/age-of-empires-iv-patch-20249/',
    publishedAt: '2026-08-04',
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
    source: 'BeastyqtSC2 · YouTube',
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
    source: 'Yellowish · YouTube',
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
    source: 'VortiX · YouTube',
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
  {
    id: 'spirit-farm-mechanics',
    kind: 'video',
    title: 'AoE4 farming mechanics, tips, and civ bonuses',
    titleRu: 'Механики ферм, советы и бонусы цивилизаций',
    description:
      'A focused explanation of farm placement, worker travel, and civilization-specific farm bonuses. Verify exact values against the current patch.',
    descriptionRu:
      'Разбор размещения ферм, пути крестьян и бонусов цивилизаций. Точные значения сверяйте с текущим патчем.',
    source: 'Spirit Of The Law · YouTube',
    url: 'https://www.youtube.com/watch?v=4VvsA3wVNyI',
  },
  {
    id: 'farmman-push-deer',
    kind: 'video',
    title: 'How to PUSH DEER | Age of Empires 4 HINTS and TIPS',
    titleRu: 'Как подгонять оленей: советы AoE4',
    description:
      'A short practical demonstration of moving a hunt closer to the mill with a scout.',
    descriptionRu:
      'Короткая практическая демонстрация: как подвести охоту разведчиком ближе к мельнице.',
    source: 'Farm Man Official · YouTube',
    url: 'https://www.youtube.com/watch?v=uJbxap4ChIM',
  },
  {
    id: 'beasty-ultimate-micro',
    kind: 'video',
    title: 'Age of Empires 4 Ultimate Micro Guide',
    titleRu: 'Полный гайд по микро в Age of Empires 4',
    description:
      'Target fire, stutter-stepping, formations, screens, surrounds, and the decisions that make micro useful.',
    descriptionRu:
      'Фокусный огонь, кайт, формации, прикрытие, окружения и решения, которые делают микро полезным.',
    source: 'BeastyqtSC2 · YouTube',
    url: 'https://www.youtube.com/watch?v=FdJFDsXr4ws',
  },
  {
    id: 'beasty-hotkeys-tips',
    kind: 'video',
    title: 'Hotkeys Tips and Tricks',
    titleRu: 'Советы и приёмы по хоткеям',
    description:
      'A workflow-focused hotkey guide for production, control groups, and faster execution.',
    descriptionRu:
      'Гайд по рабочему процессу с хоткеями: производство, контрольные группы и скорость исполнения.',
    source: 'BeastyqtSC2 · YouTube',
    url: 'https://www.youtube.com/watch?v=asw0FKnIcEo',
  },
  {
    id: 'amerath-attack-commands-formations',
    kind: 'video',
    title: 'Attack Commands and Formations in Age of Empires IV',
    titleRu: 'Команды атаки и формации в Age of Empires IV',
    description:
      'A focused reference for attack-move, target commands, and formation choices in live fights.',
    descriptionRu:
      'Точечный разбор attack-move, команд по цели и выбора формаций в реальном бою.',
    source: 'Amerath · YouTube',
    url: 'https://www.youtube.com/watch?v=-ICXJvJYpjI',
  },
  {
    id: 'nakamura-efficient-farm-placement',
    kind: 'video',
    title: 'How to Place Farms Efficiently in Age of Empires 4',
    titleRu: 'Как эффективно размещать фермы в Age of Empires 4',
    description:
      'A placement-oriented practice video; adapt the layout to the civilization, drop-off, and safety of the map.',
    descriptionRu:
      'Практическое видео о раскладке: адаптируйте её под цивилизацию, точку сдачи и безопасность карты.',
    source: 'Nakamura RTS · YouTube',
    url: 'https://www.youtube.com/watch?v=7R4KrjoVNjo',
  },
  {
    id: 'aussie-simple-improvements',
    kind: 'video',
    title: '6 Simple Things You Can Do To Get Better At AoE4',
    titleRu: '6 простых вещей, которые улучшат вашу игру в AoE4',
    description:
      'Broad, high-signal execution habits to pair with the mechanics guide.',
    descriptionRu:
      'Широкий набор полезных привычек исполнения в паре с гайдом по механикам.',
    source: 'Aussie_Drongo · YouTube',
    url: 'https://www.youtube.com/watch?v=9ovvhWn9XRc',
  },
  {
    id: 'valdy-settings-hotkeys',
    kind: 'video',
    title: '7 Tips & Tricks To Get Faster At AoE4',
    titleRu: '7 советов, как играть быстрее в AoE4',
    description:
      'Settings and hotkey ideas for faster inputs; compare every binding with your own Controls screen.',
    descriptionRu:
      'Идеи по настройкам и хоткеям для быстрых команд; каждую привязку сверяйте со своим экраном Controls.',
    source: 'Valdy · YouTube',
    url: 'https://www.youtube.com/watch?v=yqf-_YOFc8U',
  },
  {
    id: 'crack-mechanics-pros-use',
    kind: 'video',
    title: '5 Advanced Game Mechanics That Pros Use',
    titleRu: '5 продвинутых игровых механик от профессионалов',
    description:
      'Advanced-mechanics examples. Treat any patch-sensitive or unusual interaction as a custom-game test, not a guaranteed exploit.',
    descriptionRu:
      'Примеры продвинутых механик. Любое зависящее от патча или необычное взаимодействие проверяйте в кастомной игре, а не считайте гарантированным эксплойтом.',
    source: 'CrackedyHere · YouTube',
    url: 'https://www.youtube.com/watch?v=Fgl4Ve9akzA',
  },
  {
    id: 'official-shortcuts-reference',
    kind: 'article',
    title: 'Age of Empires IV Shortcuts Revealed',
    titleRu: 'Официальная памятка хоткеев Age of Empires IV',
    description:
      'Official shortcut reference: remapping, control groups, Shift commands, F1/F2/F3 + Tab cycling, and the keyboard grid.',
    descriptionRu:
      'Официальная памятка: переназначение, контрольные группы, Shift, цикл F1/F2/F3 + Tab и keyboard grid.',
    source: 'Age of Empires Official',
    url: 'https://www.ageofempires.com/news/aoeiv-shortcuts-revealed/',
    publishedAt: '2021-10-22',
  },
  {
    id: 'official-army-up-to-speed',
    kind: 'article',
    title: 'Tips to Help Get Your Army Up to Speed',
    titleRu: 'Советы, которые помогут разогнать армию',
    description:
      'Official fundamentals: rally-point resources, age-up decisions, scouting, counters, multiple production buildings, and camera-safe groups.',
    descriptionRu:
      'Официальные основы: rally points ресурсов, переход эпох, разведка, контры, несколько производственных зданий и группы без прыжка камеры.',
    source: 'Age of Empires Official',
    url: 'https://www.ageofempires.com/news/age-of-empires-iv-tips-to-help-you-get-started/',
    publishedAt: '2021-11-03',
  },
  {
    id: 'academix-dark-age-first-steps',
    kind: 'article',
    title: 'Dark Age: First Steps',
    titleRu: 'Тёмная эпоха: первые шаги',
    description:
      'A current editorial lesson on nonstop Town Center production, early sheep scouting, houses, and reading build orders.',
    descriptionRu:
      'Свежий урок о непрерывном производстве в ТЦ, ранней разведке овец, домах и чтении билдов.',
    source: 'AoE4 Academix',
    url: 'https://aoe4academix.com/en/guides/eo-primeros-pasos',
    publishedAt: '2026-05-01',
  },
  {
    id: 'seven-swords-beginner-guide',
    kind: 'article',
    title: 'Age of Empires IV Beginner Guide: Tips, Civilisations and Strategy',
    titleRu: 'Гайд для новичка: советы, цивилизации и стратегия',
    description:
      'A recent beginner pass through the four ages, first civilizations, nonstop villagers, scouting, build orders, and counters.',
    descriptionRu:
      'Свежий вводный текст о четырёх эпохах, первых цивилизациях, крестьянах без простоя, разведке, билдах и контрах.',
    source: 'Seven Swords',
    url: 'https://sevenswords.uk/age-of-empires-iv-beginner-guide/',
    publishedAt: '2026-06-12',
  },
  {
    id: 'aoedb-beginner-guide',
    kind: 'article',
    title: 'Age of Empires 4 Beginner Guide',
    titleRu: 'Гайд AOEDB для новичка',
    description:
      'Reference chapters for basics, economy, age advancement, military counters, and beginner civilizations.',
    descriptionRu:
      'Справочник по основам, экономике, эпохам, военным контрам и цивилизациям для новичка.',
    source: 'AOEDB.net',
    url: 'https://aoedb.net/aoe4/beginner-guide/',
  },
  {
    id: 'my-gaming-tutorials-beginner',
    kind: 'article',
    title: 'Beginner’s Guide: From Basics to Building Your Empire',
    titleRu: 'Гайд: от основ до строительства империи',
    description:
      'A short reading pass on victory conditions, resource drop-offs, economy, unit roles, and practicing against AI.',
    descriptionRu:
      'Короткий текст о целях победы, точках сдачи ресурсов, экономике, ролях юнитов и тренировке против ИИ.',
    source: 'My Gaming Tutorials',
    url: 'https://mygamingtutorials.com/2025/06/15/beginners-guide-to-age-of-empires-iv-aoe4-from-basics-to-building-your-empire/',
    publishedAt: '2025-06-15',
  },
  {
    id: 'aoe4-french-fundamentals',
    kind: 'article',
    title: 'Les fondamentaux',
    titleRu: 'Основы AoE4: французский справочник',
    description:
      'A structured fundamentals index covering economy, army, ages, maps, civilizations, and strategy.',
    descriptionRu:
      'Структурированный справочник по экономике, армии, эпохам, картам, цивилизациям и стратегиям.',
    source: 'Age of Empires IV Communauté Française',
    url: 'https://www.ageofempire4.fr/docs/guide/fondamentaux/',
  },
  {
    id: 'aoe4world-explorer-about',
    kind: 'article',
    title: 'AoE4World Explorer: how to read unit and technology data',
    titleRu: 'AoE4World Explorer: как читать данные юнитов и технологий',
    description:
      'Explains age filters, combat-stat breakdowns, upgrades, technology effects, and civilization comparisons.',
    descriptionRu:
      'Объясняет фильтры эпох, разбор боевых характеристик, улучшения, технологии и сравнение цивилизаций.',
    source: 'AoE4World',
    url: 'https://aoe4world.com/explorer/about',
  },
  {
    id: 'valdemar-fix-mistakes',
    kind: 'video',
    title: 'Fix These Platinum Mistakes Or Be Hardstuck | AoE4 Coaching',
    titleRu: 'Исправьте эти ошибки Платины или останетесь на месте | Коучинг AoE4',
    description:
      'Valdemar breaks down crucial macro habits, army screens, and production scaling during a replay review.',
    descriptionRu:
      'Valdemar разбирает важнейшие привычки макро, прикрытие армии и масштабирование производства на разборе реплея.',
    source: 'Valdy · YouTube',
    url: 'https://www.youtube.com/watch?v=ydDt3gp56fQ',
    publishedAt: '2026-08-10',
  },
  {
    id: 'valdemar-counter-turtles',
    kind: 'video',
    title: 'How To Counter Turtle Players (Without Attacking)',
    titleRu: 'Как контрить закрывающихся игроков (не атакуя в лоб)',
    description:
      'Masterclass on map control, resource denial, and economic advantage when facing heavy defense.',
    descriptionRu:
      'Мастер-класс по контролю карты, удушению ресурсов и получению экономического перевеса против глухой обороны.',
    source: 'Valdy · YouTube',
    url: 'https://www.youtube.com/watch?v=7_c9_X0tK_E',
    publishedAt: '2026-07-20',
  },
  {
    id: 'valdemar-conqueror-byz',
    kind: 'video',
    title: 'Easily Achieve Conqueror 3 With These Byz Strats | AoE4 Valdy',
    titleRu: 'Легко берите Conqueror 3 с этими стратегиями за Византию',
    description:
      'Deep walkthrough of Winery placement, berry scaling, mercenary adaptation, and matchup timing against China and others.',
    descriptionRu:
      'Глубокий разбор Винодельни, сбора ягод, наемников и таймингов матчапа против Китая и других цивилизаций.',
    source: 'Valdy · YouTube',
    url: 'https://www.youtube.com/watch?v=0pkvLN16f4o',
    publishedAt: '2026-08-14',
  },
  {
    id: 'valdemar-defense-tips',
    kind: 'video',
    title: '5 Defense Tips Every AoE4 Player Needs',
    titleRu: '5 советов по защите, необходимых каждому игроку AoE4',
    description:
      'Practical defensive layouts, emergency outposts, small walls, and minimizing worker idle time under attack.',
    descriptionRu:
      'Практическая расстановка обороны, аванпосты, стенки и минимизация простоя рабочих под атакой.',
    source: 'Valdy · YouTube',
    url: 'https://www.youtube.com/watch?v=s9TkSQV1Mhg',
    publishedAt: '2026-07-15',
  },
  {
    id: 'valdemar-win-no-micro',
    kind: 'video',
    title: 'How To Win Without Good Micro | AoE4 Diamond Coaching',
    titleRu: 'Как побеждать без идеального микро | Коучинг Даймонда',
    description:
      'Winning through superior macro setup, counter-composition choices, and positioning rather than twitch APM.',
    descriptionRu:
      'Победа за счет превосходного макро, правильного подбора контр-состава и позиционирования вместо запредельного APM.',
    source: 'Valdy · YouTube',
    url: 'https://www.youtube.com/watch?v=-PPntvN34sE',
    publishedAt: '2026-08-05',
  },
]
