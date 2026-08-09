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
    summary: 'Turn each scouting pass into one useful decision instead of simply revealing the map.',
    summaryRu: 'Превращайте каждый заход разведчика в одно полезное решение, а не просто открывайте карту.',
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
    summary: 'Run a short macro loop that turns resources into the army, technology, or expansion you actually need.',
    summaryRu: 'Используйте короткий макроцикл, который превращает ресурсы в нужную армию, технологии или расширение.',
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
    summary: 'Build by battlefield role and the enemy’s actual composition, not by a memorized single-unit counter.',
    summaryRu: 'Собирайте армию по боевым ролям и реальному составу врага, а не по заученному контру одним юнитом.',
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
    summary: 'Attack for a concrete objective when your composition, reinforcement, and economy can support it.',
    summaryRu: 'Атакуйте с конкретной целью, когда состав, подкрепления и экономика поддерживают выход.',
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
    summary: 'Use build-specific gates and correct villager baselines instead of chasing a misleading universal clock.',
    summaryRu: 'Сверяйтесь с этапами своего билда и реалистичной базой крестьян, а не гонитесь за обманчивым общим таймером.',
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
    summary: 'A repeatable opening routine: establish income, read the opponent, choose one plan, and keep it flexible.',
    summaryRu: 'Повторяемая рутина старта: наладьте доход, прочитайте соперника, выберите один план и сохраняйте гибкость.',
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
    summary: 'Stabilize without panic: protect the resource under attack, produce the right answer, and keep your economy alive.',
    summaryRu: 'Стабилизируйтесь без паники: защитите атакованный ресурс, производите правильный ответ и сохраняйте экономику.',
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
    summary: 'Take space that pays for your next plan, while making the opponent’s economy harder and riskier to use.',
    summaryRu: 'Занимайте пространство, которое оплачивает ваш следующий план, и делайте экономику врага более дорогой и рискованной.',
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
    summary: 'Find the first costly decision, name its cause, and practice one correction in the next match.',
    summaryRu: 'Найдите первое дорогое решение, назовите его причину и потренируйте одно исправление в следующей игре.',
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
]
