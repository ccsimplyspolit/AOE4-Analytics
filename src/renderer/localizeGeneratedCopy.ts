import { UNIT_NAMES_RU } from '@data/unitNames'
import { CIV_AND_MAP_NAMES, lookupCivOrMapName } from '@domain/gameNameDictionary'

/** Extra RTS terms that appear in generated match-page sentences. */
const MATCH_TERMS_RU: Record<string, string> = {
  Villager: 'крестьянин',
  Villagers: 'крестьяне',
  villager: 'крестьянин',
  villagers: 'крестьяне',
  Scout: 'Разведчик',
  'Town Center': 'Ратуша',
  'Town Centers': 'Ратуши',
  Feudal: 'Феодальную',
  Castle: 'Замковую',
  Imperial: 'Имперскую',
  food: 'еды',
  wood: 'дерева',
  gold: 'золота',
  stone: 'камня',
  Primary: 'Основной',
  Support: 'Поддержка',
  'unknown civ': 'неизвестная цивилизация',
  unknown: 'неизвестная',
  siege: 'осада',
  mobility: 'мобильность',
  'ranged damage': 'дальний урон',
  frontline: 'передняя линия',
  'other military': 'прочие войска',
}

const AGE_ADJ: Record<string, string> = {
  Feudal: 'Феодальный',
  Castle: 'Замковый',
  Imperial: 'Имперский',
}

const AGE_ACC: Record<string, string> = {
  Feudal: 'Феодальную',
  Castle: 'Замковую',
  Imperial: 'Имперскую',
}

const SCORE_LANE: Record<string, string> = {
  economy: 'экономики',
  military: 'армии',
  society: 'общества',
  technology: 'технологий',
}

const EXACT_RU: Record<string, string> = {
  'Opening health': 'Старт игры',
  'Longest villager-production gap': 'Самый длинный простой производства крестьян',
  Information: 'Информация',
  Reaction: 'Реакция',
  Spending: 'Расход ресурсов',
  Conversion: 'Закрепление преимущества',
  'Resource bottleneck': 'Узкое место по ресурсу',
  'Greedy investment': 'Рискованное вложение',
  'First-fight readiness': 'Готовность к первому бою',
  'Post-fight reset': 'Сброс после боя',
  'Team plan': 'План команды',
  'confirmed fact': 'подтверждённый факт',
  'replay check': 'проверка реплея',
  'no flag found': 'флаг не найден',
  'not recorded': 'не записано',
  Trigger: 'Условие',
  Action: 'Действие',
  'Largest recorded resource bank': 'Крупнейший зафиксированный запас ресурсов',
  'Largest recorded score shift in your favor': 'Крупнейший зафиксированный сдвиг счёта в вашу пользу',
  'Largest recorded score shift against you': 'Крупнейший зафиксированный сдвиг счёта против вас',
  'Largest recorded economy shift in your favor':
    'Крупнейший зафиксированный сдвиг экономики в вашу пользу',
  'Largest recorded economy shift against you':
    'Крупнейший зафиксированный сдвиг экономики против вас',
  'Keep making villagers.': 'Не останавливайте производство крестьян.',
  'Keep making villagers': 'Не останавливайте производство крестьян',
  '5:30–8:00 after the first military building is producing':
    '5:30–8:00 после того, как первое военное здание начало производить',
  'One player makes the mobile army, one keeps production and siege. Do not both dive.':
    'Один игрок делает мобильную армию, второй держит производство и осаду. Не ныряйте оба.',
  'Answer the scouted army: spears vs cavalry, cavalry vs ranged, ranged vs spears. Add siege before the third fight.':
    'Отвечайте на разведанную армию: копья против конницы, конница против дальнего боя, дальний бой против копий. Добавьте осаду до третьего боя.',
  'Fight 1v2, idle the Town Center during the first engagement, or dive a Town Center without siege.':
    'Драться 1 на 2, простаивать Ратушу в первом столкновении или нырять в Ратушу без осады.',
  'If Plan A bounces: stop the dive, re-queue villagers, add a counter unit, and raid a different resource.':
    'Если план А не сработал: остановите нырок, верните крестьян в очередь, добавьте контр-юнит и рейдьте другой ресурс.',
  '2 Town Centers': 'Две Ратуши',
  'Fast Castle': 'Быстрый Замок',
  'Early rush': 'Ранний раш',
  'Mass cavalry': 'Массовая конница',
  'Mass ranged': 'Массовый дальний бой',
  Trade: 'Торговля',
  'One opponent snowballing': 'Один соперник начинает снежный ком',
  'Do not mirror blindly. Make army, hit the exposed gold, and delay their Castle by 2 minutes.':
    'Не копируйте вслепую. Делайте армию, бейте открытое золото и задержите их Замок на 2 минуты.',
  'Pressure gold now. Food-heavy Fast Castle is weakest while the landmark is building.':
    'Давите золото сейчас. Быстрый Замок на еде слабее всего, пока строится лендмарк.',
  'Keep Town Center queued, drop spears/horsemen, and pull villagers only under the Town Center.':
    'Держите очередь Ратуши, ставьте копейщиков/конников и отводите крестьян только под Ратушу.',
  'Spears + spear upgrades before adding more cavalry of your own.':
    'Копья и апгрейды копий до того, как добавлять свою конницу.',
  'Horsemen or mangonel; do not walk melee through open field without a screen.':
    'Конники или мангонель; не ведите мили через открытое поле без прикрытия.',
  'Raid the route with cavalry. Do not both boom trade if nobody is defending it.':
    'Рейдьте маршрут конницей. Не бумьте торговлю вдвоём, если её никто не защищает.',
  'Contain the carry with vision + counter units; attack the weaker partner to collapse the team.':
    'Сдерживайте керри обзором и контр-юнитами; бейте более слабого партнёра, чтобы развалить команду.',
  'This is the earliest concrete opening checkpoint to inspect. The timeline cannot distinguish a housing block, idle Town Center, or an incomplete event stream.':
    'Это самая ранняя конкретная контрольная точка старта. Таймлайн не отличает блок домов, простой Ратуши и неполный поток событий.',
  'Replay the opening before this age-up and name the first realistic cause: villager rhythm, worker travel, an unsafe resource, or a defensive spend.':
    'Пересмотрите старт до этого перехода в эпоху и назовите первую реалистичную причину: ритм крестьян, путь рабочих, небезопасный ресурс или оборонительный расход.',
  'This is a timing difference, not proof of an error. Check whether the slower age-up was intentional and survivable for the matchup.':
    'Это разница в тайминге, а не доказательство ошибки. Проверьте, был ли более медленный переход намеренным и пережитым для матчапа.',
  'The decoded opening has no early villager-production gap or late Feudal checkpoint above the review threshold.':
    'В распознанном старте нет раннего разрыва производства крестьян и поздней Феодальной контрольной точки выше порога проверки.',
  'Housing blocks and worker walking are not recorded directly; use the replay camera if either still looks suspicious.':
    'Блоки домов и ходьба рабочих не записываются напрямую; используйте камеру реплея, если что-то всё ещё выглядит подозрительно.',
  'No usable villager-production or age-up timeline was decoded for this player.':
    'Для этого игрока не распознана пригодная шкала производства крестьян или перехода в эпоху.',
  'Check the replay manually for Town Center idle time, housing blocks, and worker travel.':
    'Вручную проверьте реплей на простой Ратуши, блоки домов и путь рабочих.',
  'This is a team or incomplete summary, so no single opponent timeline is safe to compare.':
    'Это командная или неполная сводка, поэтому ни одну шкалу соперника нельзя безопасно сравнивать.',
  'Review your scout route and identify the first enemy production or expansion clue you needed.':
    'Проверьте маршрут разведчика и найдите первую подсказку о производстве или экспансии врага, которая была нужна.',
  'The replay summary cannot prove whether you scouted. Use the replay to record the first clue you missed or acted on.':
    'Сводка реплея не доказывает, разведывали ли вы. По реплею запишите первую подсказку, которую пропустили или на которую среагировали.',
  'No opponent military-production event was decoded from the summary.':
    'Из сводки не распознано событие военного производства соперника.',
  'Review this interval for the smallest response that was available: counter units, safer workers, a defensive rally, or disengaging. The casualty stream does not prove why the gap occurred.':
    'Проверьте этот интервал на самый маленький доступный ответ: контр-юниты, более безопасные рабочие, оборонительная точка сбора или отход. Поток потерь не доказывает, почему возник разрыв.',
  'This is a timing checkpoint, not proof that you saw the building. Rewatch the interval and decide whether an earlier counter, safer resource placement, or different spend was realistic.':
    'Это контрольная точка тайминга, а не доказательство, что вы видели здание. Пересмотрите интервал и решите, был ли реалистичен более ранний контр, более безопасный ресурс или другой расход.',
  'Use the replay to verify whether your first counter and worker repositioning matched the information you had.':
    'По реплею проверьте, совпали ли первый контр и перестановка рабочих с той информацией, которая у вас была.',
  'No usable casualty or production timeline was decoded for a response check.':
    'Для проверки ответа не распознана пригодная шкала потерь или производства.',
  'Review the first pressure window manually and record what you saw, then what you did.':
    'Вручную разберите первое окно давления: что увидели, затем что сделали.',
  'No resource-bank timeline was decoded for this player.':
    'Для этого игрока не распознана шкала запаса ресурсов.',
  'Use the replay or post-game graph to look for a bank while production or upgrades were missing.':
    'По реплею или послематчевому графику ищите запас в момент, когда не хватало производства или апгрейдов.',
  'A bank may be an intentional age-up or technology save. Verify the intended spend; if there was none, make production capacity or unit queues the next correction.':
    'Запас может быть намеренным накоплением на эпоху или технологию. Проверьте запланированный расход; если его не было, следующей правкой сделайте производственные слоты или очереди юнитов.',
  'The largest decoded resource bank was below the review threshold.':
    'Крупнейший распознанный запас ресурсов ниже порога проверки.',
  'This does not prove spending was perfect, but no large bank is visible in the available samples.':
    'Это не доказывает идеальный расход, но большого запаса в доступных замерах не видно.',
  'A team summary cannot safely attribute a score or resource swing to one opponent interaction.':
    'Командная сводка не позволяет безопасно отнести сдвиг счёта или ресурсов к одному взаимодействию с соперником.',
  'After the next successful team fight, name one shared conversion: a resource, production, expansion, relic, trade route, or map objective.':
    'После следующего успешного командного боя назовите одно общее закрепление: ресурс, производство, экспансию, реликвию, торговый путь или цель на карте.',
  'No shared score-timeline swing large enough to review was decoded.':
    'Не распознан достаточно большой общий сдвиг шкалы счёта для разбора.',
  'The summary cannot show whether you converted a fight. Review the first advantage or defence manually and ask what it bought you next.':
    'Сводка не показывает, закрепили ли вы бой. Вручную разберите первое преимущество или оборону и спросите, что это дало дальше.',
  'This is a possible conversion window, not proof that a fight was won. Rewatch it and test one follow-up: secure food, take space, add production, expand, or age up.':
    'Это возможное окно закрепления, а не доказательство выигранного боя. Пересмотрите его и проверьте одно продолжение: закрепить еду, взять пространство, добавить производство, расшириться или перейти в эпоху.',
  'Use the replay economy graph to identify which resource stopped the next useful action.':
    'По экономическому графику реплея определите, какой ресурс остановил следующее полезное действие.',
  'This pattern can delay houses, farms, ranged production, or a second military building. Move the next workers before wood becomes the bottleneck; verify the intended unit mix in the replay.':
    'Такой рисунок может задержать дома, фермы, дальнобойное производство или второе военное здание. Переведите следующих рабочих, пока дерево не стало узким местом; проверьте задуманный состав в реплее.',
  'This can mean buildings were added before the economy could sustain units, or that food became unsafe. Protect food and align the next workers with the plan instead of adding empty production.':
    'Это может значить, что здания появились раньше, чем экономика могла содержать юнитов, или что еда стала небезопасной. Защитите еду и выровняйте следующих рабочих с планом вместо пустого производства.',
  'Gold alone does not become an army. Check whether the composition needed more food/wood, another production building, or a different unit choice.':
    'Одно золото не становится армией. Проверьте, не нужны ли составу больше еды/дерева, ещё одно производство или другой юнит.',
  'Stone is an investment, not a score. If there was no expansion or defensive plan, redirect workers to the next army or age-up resource.':
    'Камень — это вложение, а не очки. Если не было плана экспансии или обороны, переведите рабочих на ресурс следующей армии или перехода в эпоху.',
  'A large bank may be intentional saving. Name the age-up, technology, expansion, or army it was funding; otherwise add usable production before the next fight.':
    'Большой запас может быть намеренным накоплением. Назовите эпоху, технологию, экспансию или армию, на которую он шёл; иначе добавьте полезное производство до следующего боя.',
  'This does not prove the worker split was optimal. Compare each bank with the next 60–90 seconds of intended spending.':
    'Это не доказывает оптимальный сплит рабочих. Сравните каждый запас со следующими 60–90 секундами запланированного расхода.',
  'No second Town Center completion was decoded for this player.':
    'Для этого игрока не распознано завершение второй Ратуши.',
  'If the game contained a fast Castle, keep, or expensive technology instead, compare that investment with the defense and production it delayed.':
    'Если вместо этого в игре был быстрый Замок, кип или дорогая технология, сравните это вложение с обороной и производством, которые оно задержало.',
  'This is a risk window, not proof that the Town Center was wrong. Check whether builders, the location, and the next minute were safe against the pressure you had seen.':
    'Это окно риска, а не доказательство, что Ратуша была ошибкой. Проверьте, были ли строители, место и следующая минута безопасны против уже увиденного давления.',
  'Before repeating the investment, name the defensive plan for its construction window and the production that keeps it alive.':
    'Перед повторным вложением назовите оборонительный план на окно строительства и производство, которое его удерживает.',
  'Compare the investment with the current matchup and map; a safe 2TC is a plan, not a universal benchmark.':
    'Сравните вложение с текущим матчапом и картой; безопасные 2 Ратуши — это план, а не универсальный эталон.',
  'No first military casualty window was decoded, so the summary cannot identify the first attack or defence.':
    'Не распознано окно первых военных потерь, поэтому сводка не может указать первую атаку или оборону.',
  'Before the next move-out, check composition, reinforcements, and the safety of your own exposed resources in the replay.':
    'Перед следующим выходом проверьте состав, подкрепления и безопасность своих открытых ресурсов в реплее.',
  'This may be a raid or a fight taken before reinforcements arrived. Review whether a smaller harassment, safer retreat, or one more production cycle was the realistic choice.':
    'Это может быть рейд или бой до подхода подкреплений. Проверьте, не был ли реалистичнее меньший харасс, более безопасный отход или ещё один цикл производства.',
  'Before adding another expensive unit, identify the missing frontline, cover, damage, mobility, or siege role and confirm the map position in the replay.':
    'Перед ещё одним дорогим юнитом найдите недостающую роль линии, прикрытия, урона, мобильности или осады и подтвердите позицию на карте в реплее.',
  'Before an attack, still confirm the target, reinforcement path, and safe retreat line; the summary does not record position.':
    'Перед атакой всё равно подтвердите цель, путь подкреплений и линию безопасного отхода; сводка не записывает позицию.',
  'No military loss explicitly attributed to you was decoded, so a post-fight conversion window cannot be isolated.':
    'Не распознана военная потеря, явно записанная на вас, поэтому окно закрепления после боя нельзя выделить.',
  'After the next successful defence or attack, name one concrete conversion before chasing: resource, production, age, expansion, or objective.':
    'После следующей успешной обороны или атаки назовите одно конкретное закрепление до погони: ресурс, производство, эпоху, экспансию или цель.',
  'A kill is only a timing if it buys something. Rewatch the reset and choose the nearest safe resource, production, age-up, expansion, or map objective.':
    'Убийство — тайминг, только если оно что-то покупает. Пересмотрите сброс и выберите ближайший безопасный ресурс, производство, переход в эпоху, экспансию или цель на карте.',
  'Check whether those events converted the advantage into map control or only replaced the army; the summary cannot see resource safety or retreat paths.':
    'Проверьте, превратили ли эти события преимущество в контроль карты или только заменили армию; сводка не видит безопасность ресурсов и пути отхода.',
  'This team summary does not expose reliable team ids for the selected player.':
    'Эта командная сводка не даёт надёжных id команд для выбранного игрока.',
  'Use the replay to name who owned first pressure, the exposed flank, economic scaling, and the next shared objective.':
    'По реплею назовите, кто держал первое давление, открытый фланг, экономический разгон и следующую общую цель.',
  'The team summary does not contain enough first-army timings to compare coordinated pressure.':
    'В командной сводке недостаточно таймингов первой армии, чтобы сравнить согласованное давление.',
  'Review the replay callout moments: first army, reinforcements, age/composition change, and the shared conversion target.':
    'Разберите в реплее моменты колла: первая армия, подкрепления, смена эпохи/состава и общая цель закрепления.',
  'A smaller army arriving together can beat larger staggered armies. Assign pressure, protection, and economy roles, then rally the first useful timing.':
    'Меньшая армия, пришедшая вместе, бьёт более крупные растянутые армии. Назначьте роли давления, защиты и экономики, затем поставьте точку сбора на первый полезный тайминг.',
  'Timing alone does not prove coordination. Check whether the team converted that arrival into one shared target instead of separate fights.':
    'Один тайминг не доказывает координацию. Проверьте, превратила ли команда этот приход в одну общую цель, а не в отдельные бои.',
  'At 2:30 and while aging up': 'В 2:30 и во время перехода в эпоху',
  'Select every Town Center, queue two villagers, and check population space.':
    'Выделите каждую Ратушу, поставьте двух крестьян в очередь и проверьте лимит населения.',
  'When the first enemy production clue or army appears':
    'Когда появляется первая подсказка о производстве врага или его армия',
  'Start the smallest counter response before moving your own army out, then make exposed workers safe.':
    'Начните самый маленький контр-ответ до выхода своей армии, затем уберите открытых рабочих в безопасность.',
  'When the bank reaches 800 before the next fight': 'Когда запас достигает 800 до следующего боя',
  'Spend first on queued units or usable production; only keep the bank if you can name the planned age-up or technology.':
    'Сначала тратьте на юнитов в очереди или полезное производство; оставляйте запас, только если можете назвать запланированную эпоху или технологию.',
  'After the first favourable fight or defended push':
    'После первого выгодного боя или отбитого пуша',
  'Claim one safe external food source, expansion, age-up, or map objective before chasing farther.':
    'Возьмите один безопасный внешний источник еды, экспансию, переход в эпоху или цель на карте до дальнейшей погони.',
  'When one resource is high and the next required resource is low':
    'Когда одного ресурса много, а следующего нужного мало',
  'Move the next workers to the bottleneck before production stops, then recheck the bank after 60–90 seconds.':
    'Переведите следующих рабочих на узкое место до остановки производства, затем перепроверьте запас через 60–90 секунд.',
  'Before starting a second Town Center or other expensive investment':
    'Перед второй Ратушей или другим дорогим вложением',
  'Name the defensive army and the next-minute production plan that keeps the investment alive.':
    'Назовите оборонительную армию и план производства на следующую минуту, который удерживает вложение.',
  'Before the first move-out': 'Перед первым выходом',
  'Confirm the damage, frontline, cover, reinforcement path, target, and safe retreat line.':
    'Подтвердите урон, линию, прикрытие, путь подкреплений, цель и линию безопасного отхода.',
  'Before the first team army arrives': 'До прихода первой командной армии',
  'Assign pressure, protection, and economy roles and rally one shared target instead of splitting fights.':
    'Назначьте роли давления, защиты и экономики и поставьте точку сбора на одну общую цель вместо разорванных боёв.',
  'Before placing your first military building': 'Перед первым военным зданием',
  'Scout enemy gold and first production, then write down the one response that observation requires.':
    'Разведайте золото врага и первое производство, затем запишите один ответ, которого требует это наблюдение.',
  'Use this as an opening checkpoint. The timestamp alone does not show whether the timing fit the matchup or your chosen build.':
    'Используйте это как контрольную точку старта. По одному времени нельзя понять, подошёл ли тайминг матчапу или выбранному билду.',
  'Treat this as an opening checkpoint. Whether it was early or late depends on the selected build, civilization, and matchup.':
    'Считайте это контрольной точкой старта. Ранним или поздним тайминг делает выбранный билд, цивилизация и матчап.',
  'This shows where that score lane grew fastest between samples. It does not identify a fight, decision, teammate contribution, or underlying cause.':
    'Здесь показан самый быстрый рост этой линии счёта между замерами. Это не определяет бой, решение, вклад союзника или настоящую причину.',
  'This may indicate Town Center idle time. Extra Town Centers, production-speed changes, or incomplete build events can also affect the interval.':
    'Это может указывать на простой Ратуши. Дополнительные Ратуши, изменение скорости производства или неполные события билда тоже влияют на интервал.',
  'This may have been intentional saving for an age-up or technology. If it was not, check whether units, upgrades, or production could have been queued sooner.':
    'Это могло быть намеренным накоплением на эпоху или технологию. Если нет — проверьте, нельзя ли было раньше поставить в очередь юнитов, апгрейды или производство.',
  'This may mark a momentum shift. Compare the score lanes and build events around this interval; total score alone does not identify a fight or its cause.':
    'Это может отмечать смену темпа. Сравните линии счёта и события билда вокруг интервала; один общий счёт не определяет бой и его причину.',
  'This may reflect worker count, idle time, or access to safer resources. The resource totals do not prove which cause was responsible.':
    'Это может отражать число рабочих, простой или доступ к более безопасным ресурсам. Итоги ресурсов не доказывают причину.',
  'That timing difference may have created a technology window, but the summary does not show how either player used it.':
    'Эта разница в тайминге могла создать окно по технологиям, но сводка не показывает, как им воспользовался любой из игроков.',
  'That timing difference may have created a technology window. Check nearby production events to see whether you converted it into pressure or economy.':
    'Эта разница в тайминге могла создать окно по технологиям. Проверьте ближайшие события производства: превратили ли вы его в давление или экономику.',
  'The age timing was even; nearby production and resource choices are more useful for explaining what happened next.':
    'Тайминг эпохи был равным; ближайшие решения по производству и ресурсам лучше объясняют, что было дальше.',
  'Rewatch the 30 seconds before this point: did your scout see the building or another clue, and did that information change your plan?':
    'Пересмотрите 30 секунд до этой точки: видел ли разведчик здание или другую подсказку, и изменила ли эта информация ваш план?',
  'No large response-lag signal was confirmed from the decoded casualty and production timelines.':
    'По распознанным шкалам потерь и производства большого сигнала задержки ответа не подтверждено.',
  'Inspect this window before calling it idle production: the summary cannot identify individual queues. If the bank was not an intentional age-up or tech save, practise spending before the next fight.':
    'Проверьте это окно, прежде чем называть его простоем производства: сводка не видит отдельные очереди. Если запас не был намеренным накоплением на эпоху или технологию, тренируйте расход до следующего боя.',
  'Total score is not a fight log. Use the replay to decide whether that window should have become a map or economic advantage.':
    'Общий счёт — не лог боёв. По реплею решите, должно ли это окно было стать преимуществом на карте или в экономике.',
  'Rewatch the 30 seconds before this point: did your scout see the building or another clue, and did that information change your next 60 seconds?':
    'Пересмотрите 30 секунд до этой точки: видел ли разведчик здание или другую подсказку, и изменила ли эта информация следующие 60 секунд?',
  'Horsemen or manganel; do not walk melee through open field without a screen.':
    'Конники или мангонель; не ведите мили через открытое поле без прикрытия.',
}

function ruEntity(name: string): string {
  const trimmed = name.trim()
  const civTable = CIV_AND_MAP_NAMES.ru as Record<string, string>
  return (
    MATCH_TERMS_RU[trimmed] ??
    UNIT_NAMES_RU[trimmed] ??
    lookupCivOrMapName(civTable, trimmed) ??
    trimmed
  )
}

function ruFavor(flag: string): string {
  return flag === 'in your favor' || flag === 'in your favour' ? 'в вашу пользу' : 'против вас'
}

/**
 * Translate generated match-page English (turning points, first-cause review,
 * briefing) without substituting entity names inside leftover English grammar.
 */
export function localizeGeneratedRu(input: string): string | null {
  const exact = EXACT_RU[input]
  if (exact) return exact

  const ageTiming = /^(Feudal|Castle|Imperial) timing$/.exec(input)
  if (ageTiming) return `${AGE_ADJ[ageTiming[1]!] ?? ageTiming[1]} тайминг`

  const fastestLane = /^Fastest (economy|military|society|technology) score growth$/.exec(input)
  if (fastestLane) return `Самый быстрый рост счёта ${SCORE_LANE[fastestLane[1]!] ?? fastestLane[1]}`

  const reached =
    /^You reached (Feudal|Castle|Imperial) Age at ([0-9:]+)(?:, ([0-9:]+) (after|before) the other player)?\.$/.exec(
      input,
    )
  if (reached) {
    const age = AGE_ACC[reached[1]!] ?? reached[1]
    if (!reached[3]) return `Вы достигли ${age} эпоху в ${reached[2]}.`
    const when = reached[4] === 'after' ? 'после' : 'до'
    return `Вы достигли ${age} эпоху в ${reached[2]}, на ${reached[3]} ${when} другого игрока.`
  }

  const bothReached = /^Both players reached (Feudal|Castle|Imperial) Age at ([0-9:]+)\.$/.exec(
    input,
  )
  if (bothReached) {
    return `Оба игрока достигли ${AGE_ACC[bothReached[1]!] ?? bothReached[1]} эпоху в ${bothReached[2]}.`
  }

  const villagerGap =
    /^No villager completion was recorded for ([0-9:]+), from ([0-9:]+) to ([0-9:]+)\.$/.exec(input)
  if (villagerGap) {
    return `Завершение крестьянина не записывалось ${villagerGap[1]}, с ${villagerGap[2]} до ${villagerGap[3]}.`
  }

  const firstUnit =
    /^(.+) was the first recorded non-villager unit, completed at ([0-9:]+)\.$/.exec(input)
  if (firstUnit) {
    return `${ruEntity(firstUnit[1]!)} — первый записанный некрестьянин, завершён в ${firstUnit[2]}.`
  }

  const scoreGap =
    /^The total-score gap moved by (\d+) (in your favor|against you), from ([+\-]?\d+) to ([+\-]?\d+)\.$/.exec(
      input,
    )
  if (scoreGap) {
    return `Разрыв общего счёта сдвинулся на ${scoreGap[1]} ${ruFavor(scoreGap[2]!)}, с ${scoreGap[3]} до ${scoreGap[4]}.`
  }

  const scoreRose =
    /^Your recorded (economy|military|society|technology) score rose by (\d+) during this interval\.$/.exec(
      input,
    )
  if (scoreRose) {
    return `Ваш записанный счёт ${SCORE_LANE[scoreRose[1]!] ?? scoreRose[1]} вырос на ${scoreRose[2]} за этот интервал.`
  }

  const ecoGap =
    /^The cumulative gathered-resource gap moved by (\d+) (in your favor|against you), from ([+\-]?\d+) to ([+\-]?\d+)\.$/.exec(
      input,
    )
  if (ecoGap) {
    return `Накопленный разрыв собранных ресурсов сдвинулся на ${ecoGap[1]} ${ruFavor(ecoGap[2]!)}, с ${ecoGap[3]} до ${ecoGap[4]}.`
  }

  const bankPeak =
    /^Your recorded bank peaked at (\d+) total resources at ([0-9:]+)\.$/.exec(input)
  if (bankPeak) {
    return `Ваш записанный запас достиг пика в ${bankPeak[1]} суммарных ресурсов в ${bankPeak[2]}.`
  }

  const openingVillager =
    /^No villager completion was recorded for ([0-9:]+), from ([0-9:]+) to ([0-9:]+)\.$/.exec(input)
  if (openingVillager) {
    return `Завершение крестьянина не записывалось ${openingVillager[1]}, с ${openingVillager[2]} до ${openingVillager[3]}.`
  }

  const feudalLate =
    /^Feudal completed at ([0-9:]+), ([0-9:]+) after the selected build target of ([0-9:]+)\.$/.exec(
      input,
    )
  if (feudalLate) {
    return `Феодальная эпоха завершена в ${feudalLate[1]}, на ${feudalLate[2]} позже цели выбранного билда ${feudalLate[3]}.`
  }

  const feudalAfterOpp =
    /^You reached Feudal at ([0-9:]+), ([0-9:]+) after the opponent at ([0-9:]+)\.$/.exec(input)
  if (feudalAfterOpp) {
    return `Вы вышли в Феодальную эпоху в ${feudalAfterOpp[1]}, на ${feudalAfterOpp[2]} позже соперника (${feudalAfterOpp[3]}).`
  }

  const enemyBuilding =
    /^The opponent's first recorded military building was (.+) at ([0-9:]+)\. The summary does not record what you had vision of\.$/.exec(
      input,
    )
  if (enemyBuilding) {
    return `Первое записанное военное здание соперника — ${ruEntity(enemyBuilding[1]!)} в ${enemyBuilding[2]}. Сводка не фиксирует, что вы видели.`
  }

  const lossLag =
    /^Your first recorded military loss was at ([0-9:]+); the first enemy military loss attributed to you was at ([0-9:]+) \(([0-9:]+) later\)\.$/.exec(
      input,
    )
  if (lossLag) {
    return `Ваша первая записанная военная потеря — в ${lossLag[1]}; первая вражеская военная потеря, записанная на вас, — в ${lossLag[2]} (на ${lossLag[3]} позже).`
  }

  const prodLag =
    /^The opponent's (.+) completed at ([0-9:]+); your first recorded military building, (.+), completed ([0-9:]+) later\.$/.exec(
      input,
    )
  if (prodLag) {
    return `${ruEntity(prodLag[1]!)} соперника завершён в ${prodLag[2]}; ваше первое записанное военное здание, ${ruEntity(prodLag[3]!)}, завершено на ${prodLag[4]} позже.`
  }

  const bankDuringGap =
    /^Your bank was (\d+) at ([0-9:]+) during a ([0-9:]+) gap between recorded military-unit completions\.$/.exec(
      input,
    )
  if (bankDuringGap) {
    return `Ваш запас был ${bankDuringGap[1]} в ${bankDuringGap[2]} во время паузы ${bankDuringGap[3]} между записанными завершениями военных юнитов.`
  }

  const largestBank = /^The largest recorded resource bank was (\d+) at ([0-9:]+)\.$/.exec(input)
  if (largestBank) {
    return `Крупнейший записанный запас ресурсов — ${largestBank[1]} в ${largestBank[2]}.`
  }

  const largestBankBelow =
    /^The largest decoded resource bank was (\d+) at ([0-9:]+), below the review threshold\.$/.exec(
      input,
    )
  if (largestBankBelow) {
    return `Крупнейший распознанный запас ресурсов — ${largestBankBelow[1]} в ${largestBankBelow[2]}, ниже порога проверки.`
  }

  const scoreThenEco =
    /^The score gap improved by (\d+) in your favour from ([0-9:]+) to ([0-9:]+), then the gathered-resource gap moved (\d+) against you by ([0-9:]+)\.$/.exec(
      input,
    )
  if (scoreThenEco) {
    return `Разрыв счёта улучшился на ${scoreThenEco[1]} в вашу пользу с ${scoreThenEco[2]} до ${scoreThenEco[3]}, затем разрыв собранных ресурсов ушёл на ${scoreThenEco[4]} против вас к ${scoreThenEco[5]}.`
  }

  const positiveShift =
    /^A positive score shift was recorded from ([0-9:]+) to ([0-9:]+), but the following resource samples do not show a clear lost-conversion pattern\.$/.exec(
      input,
    )
  if (positiveShift) {
    return `Положительный сдвиг счёта записан с ${positiveShift[1]} до ${positiveShift[2]}, но следующие замеры ресурсов не показывают явной потерянной конверсии.`
  }

  const foodWood =
    /^At ([0-9:]+) the bank held (\d+) food but only (\d+) wood\.$/.exec(input)
  if (foodWood) {
    return `В ${foodWood[1]} в запасе было ${foodWood[2]} еды и только ${foodWood[3]} дерева.`
  }

  const woodFood =
    /^At ([0-9:]+) the bank held (\d+) wood but only (\d+) food\.$/.exec(input)
  if (woodFood) {
    return `В ${woodFood[1]} в запасе было ${woodFood[2]} дерева и только ${woodFood[3]} еды.`
  }

  const goldStuck =
    /^At ([0-9:]+) the bank held (\d+) gold while food and wood together were only (\d+); no military completion followed in the next two minutes\.$/.exec(
      input,
    )
  if (goldStuck) {
    return `В ${goldStuck[1]} в запасе было ${goldStuck[2]} золота, а еда и дерево вместе — только ${goldStuck[3]}; в следующие две минуты военного завершения не было.`
  }

  const stoneStuck =
    /^At ([0-9:]+) the bank held (\d+) stone, but no Town Center, keep, or fortification event followed in the next two minutes\.$/.exec(
      input,
    )
  if (stoneStuck) {
    return `В ${stoneStuck[1]} в запасе было ${stoneStuck[2]} камня, но в следующие две минуты не было Ратуши, кипа или укрепления.`
  }

  const idleBank =
    /^The bank reached (\d+) total resources at ([0-9:]+) with no recorded unit, building, or upgrade completion in the next two minutes\.$/.exec(
      input,
    )
  if (idleBank) {
    return `Запас достиг ${idleBank[1]} суммарных ресурсов в ${idleBank[2]} без записанного завершения юнита, здания или апгрейда в следующие две минуты.`
  }

  const noImbalance =
    /^No single-resource imbalance crossed the review threshold; the largest total bank was (\d+) at ([0-9:]+)\.$/.exec(
      input,
    )
  if (noImbalance) {
    return `Ни один перекос по ресурсу не перешёл порог проверки; крупнейший суммарный запас — ${noImbalance[1]} в ${noImbalance[2]}.`
  }

  const greedyAfterEnemy =
    /^The second Town Center completed at ([0-9:]+) after the opponent's (.+) at ([0-9:]+); only (\d+) military completions were recorded beforehand\.$/.exec(
      input,
    )
  if (greedyAfterEnemy) {
    return `Вторая Ратуша завершена в ${greedyAfterEnemy[1]} после ${ruEntity(greedyAfterEnemy[2]!)} соперника в ${greedyAfterEnemy[3]}; до этого записано только ${greedyAfterEnemy[4]} военных завершений.`
  }

  const greedyQuiet =
    /^The second Town Center completed at ([0-9:]+) with only (\d+) recorded military completions and no military completion in the following two minutes\.$/.exec(
      input,
    )
  if (greedyQuiet) {
    return `Вторая Ратуша завершена в ${greedyQuiet[1]} при только ${greedyQuiet[2]} записанных военных завершениях и без военного завершения в следующие две минуты.`
  }

  const greedyOk =
    /^The second Town Center completed at ([0-9:]+) after (\d+) military completions, with follow-up activity recorded\.$/.exec(
      input,
    )
  if (greedyOk) {
    return `Вторая Ратуша завершена в ${greedyOk[1]} после ${greedyOk[2]} военных завершений, с записанной последующей активностью.`
  }

  const firstLossThin =
    /^Your first recorded military loss arrived at ([0-9:]+) with only (\d+) military completions in the timeline\.$/.exec(
      input,
    )
  if (firstLossThin) {
    return `Ваша первая записанная военная потеря пришла в ${firstLossThin[1]} при только ${firstLossThin[2]} военных завершениях на шкале.`
  }

  const oneRole =
    /^Your first casualty window had one recorded army role \((.+)\) while the opponent's window contained at least two roles\.$/.exec(
      input,
    )
  if (oneRole) {
    return `В окне ваших первых потерь записана одна роль армии (${ruEntity(oneRole[1]!)}) , а у соперника — как минимум две.`
  }

  const firstFightOk =
    /^The first recorded casualty window at ([0-9:]+) had (\d+) military completions and more than one visible army role or no comparable enemy role data\.$/.exec(
      input,
    )
  if (firstFightOk) {
    return `Первое записанное окно потерь в ${firstFightOk[1]} имело ${firstFightOk[2]} военных завершений и больше одной видимой роли армии либо нет сравнимых данных по ролям врага.`
  }

  const noFollowUp =
    /^The first enemy military loss attributed to you was at ([0-9:]+), with no unit, building, or upgrade completion recorded in the next two minutes\.$/.exec(
      input,
    )
  if (noFollowUp) {
    return `Первая вражеская военная потеря, записанная на вас, была в ${noFollowUp[1]}, без завершения юнита, здания или апгрейда в следующие две минуты.`
  }

  const followUpCount =
    /^(\d+) follow-up build or upgrade events were recorded after the first attributed enemy loss at ([0-9:]+)\.$/.exec(
      input,
    )
  if (followUpCount) {
    return `После первой записанной на вас потери врага в ${followUpCount[2]} зафиксировано ${followUpCount[1]} последующих событий строительства или апгрейда.`
  }

  const teamSpread =
    /^Your team's first recorded military timings were spread across ([0-9:]+) \(([0-9:]+) to ([0-9:]+)\)\.$/.exec(
      input,
    )
  if (teamSpread) {
    return `Первые записанные военные тайминги вашей команды растянуты на ${teamSpread[1]} (${teamSpread[2]}–${teamSpread[3]}).`
  }

  const teamTight =
    /^Your team's first military timings were within ([0-9:]+) of one another\.$/.exec(input)
  if (teamTight) {
    return `Первые военные тайминги вашей команды уложились в ${teamTight[1]} друг от друга.`
  }

  const playOnRole =
    /^Play (.+) on[- ]role\. First target is (.+) \((.+)\)\.$/.exec(input)
  if (playOnRole) {
    return `Играйте ${ruEntity(playOnRole[1]!)} в своей роли. Первая цель — ${playOnRole[2]} (${ruEntity(playOnRole[3]!)}).`
  }

  const reviewMatchup = /^Review (.+) vs (.+)\. First question: did you hit the planned timing\?$/.exec(
    input,
  )
  if (reviewMatchup) {
    return `Разберите ${ruEntity(reviewMatchup[1]!)} против ${ruEntity(reviewMatchup[2]!)}. Первый вопрос: попали ли вы в запланированный тайминг?`
  }

  const punish = /^Punish “(.+)” — (.+)$/.exec(input) ?? /^Punish "(.+)" — (.+)$/.exec(input)
  if (punish) return `Накажите «${punish[1]}» — ${localizeGeneratedRu(punish[2]!) ?? punish[2]}`

  const denyDefault = /^Deny (.+)'s first gold \/ forward food\. That is the default economic target\.$/.exec(
    input,
  )
  if (denyDefault) {
    return `Отрежьте первое золото / переднюю еду у ${denyDefault[1]}. Это цель экономики по умолчанию.`
  }

  const playCivQueued = /^Play (.+) on[- ]role; keep Town Center queued\.$/.exec(input)
  if (playCivQueued) {
    return `Играйте ${ruEntity(playCivQueued[1]!)} в роли; держите очередь Ратуши.`
  }

  const convertTiming = /^Convert the first (.+) timing into a denied gold or relics\.$/.exec(input)
  if (convertTiming) {
    return `Превратите первый тайминг ${ruEntity(convertTiming[1]!)} в отрезанное золото или реликвии.`
  }

  const threatAhead = /^(.+) getting ahead$/.exec(input)
  if (threatAhead) return `${threatAhead[1]} начинает уходить вперёд`

  const focusLine = /^(.+) · (.+)$/.exec(input)
  if (
    focusLine &&
    lookupCivOrMapName(CIV_AND_MAP_NAMES.ru as Record<string, string>, focusLine[2]!.trim())
  ) {
    return `${focusLine[1]} · ${ruEntity(focusLine[2]!)}`
  }

  const shortGame = /^Short game \((.+)\)$/.exec(input)
  if (shortGame) return `Короткий матч (${shortGame[1]})`
  const longMacro = /^Long macro game \((.+)\)$/.exec(input)
  if (longMacro) return `Длинный макро-матч (${longMacro[1]})`
  const tough = /^Tough matchup: (.+) vs (.+)$/.exec(input)
  if (tough) return `Трудный матчап: ${ruEntity(tough[1]!)} против ${ruEntity(tough[2]!)}`
  const favourable = /^Favourable matchup vs (.+)$/.exec(input)
  if (favourable) return `Выгодный матчап против ${ruEntity(favourable[1]!)}`
  const stronger = /^Faced a stronger opponent \(\+(.+)\)$/.exec(input)
  if (stronger) return `Соперник сильнее (+${stronger[1]})`
  const lowVill = /^Low villager count \((\d+)\)$/.exec(input)
  if (lowVill) return `Мало крестьян (${lowVill[1]})`
  const solidVill = /^Solid villager production \((\d+)\)$/.exec(input)
  if (solidVill) return `Стабильное производство крестьян (${solidVill[1]})`
  const lowApm = /^Low activity \(~(.+) APM\)$/.exec(input)
  if (lowApm) return `Низкая активность (~${lowApm[1]} APM)`
  const tradedPoorly = /^You traded poorly \(K\/D (.+)\)$/.exec(input)
  if (tradedPoorly) return `Плохой размен (K/D ${tradedPoorly[1]})`
  const wonFights = /^You won your fights \(K\/D (.+)\)$/.exec(input)
  if (wonFights) return `Выигрывали бои (K/D ${wonFights[1]})`
  const outProduced = /^Out-produced \((.+) vs (.+) units\)$/.exec(input)
  if (outProduced) return `Отстали по производству (${outProduced[1]} против ${outProduced[2]} юнитов)`
  const strongProd = /^Strong production \((.+) vs (.+) units\)$/.exec(input)
  if (strongProd) return `Сильное производство (${strongProd[1]} против ${strongProd[2]} юнитов)`
  const fewerUp = /^Fewer upgrades \((.+) vs (.+)\)$/.exec(input)
  if (fewerUp) return `Меньше улучшений (${fewerUp[1]} против ${fewerUp[2]})`
  const outGathered = /^Out-gathered \((.+)\/min vs their (.+)\/min\)$/.exec(input)
  if (outGathered) return `Отстали по сбору (${outGathered[1]}/мин против их ${outGathered[2]}/мин)`
  const outGatheredThem = /^Out-gathered them \((.+)\/min vs (.+)\/min\)$/.exec(input)
  if (outGatheredThem) {
    return `Обогнали по сбору (${outGatheredThem[1]}/мин против ${outGatheredThem[2]}/мин)`
  }
  const tcIdle = /^Town Center sat idle \(~(\d+) villagers never made\)$/.exec(input)
  if (tcIdle) return `Ратуша простаивала (~${tcIdle[1]} крестьян так и не сделаны)`
  const feudalAt = /^Feudal at (.+) — your build targets (.+)$/.exec(input)
  if (feudalAt) return `Феодал в ${feudalAt[1]} — цель билда ${feudalAt[2]}`
  const theyFeudal = /^They reached Feudal first \((.+) vs your (.+)\)$/.exec(input)
  if (theyFeudal) {
    return `Они вышли в феодал первыми (${theyFeudal[1]} против ваших ${theyFeudal[2]})`
  }
  const youAged = /^You aged up first \((.+) vs their (.+)\)$/.exec(input)
  if (youAged) return `Вы перешли в эпоху первыми (${youAged[1]} против их ${youAged[2]})`
  const outBoomed = /^Out-boomed \((.+) vs their (.+) villagers\)$/.exec(input)
  if (outBoomed) return `Отстали по буму (${outBoomed[1]} против их ${outBoomed[2]} крестьян)`
  const armyPeak = /^Their army peaked far bigger \((.+) vs your (.+)\)$/.exec(input)
  if (armyPeak) return `Их армия была намного больше (${armyPeak[1]} против ваших ${armyPeak[2]})`
  const relics = /^They took the relics \((.+) vs 0\)$/.exec(input)
  if (relics) return `Они забрали реликвии (${relics[1]} против 0)`
  const unspent = /^Resources were left unspent \((.+) in the last sample\)$/.exec(input)
  if (unspent) return `Ресурсы остались неотраченными (${unspent[1]} в последнем замере)`
  const poorTrade = /^Poor troop trade \((.+) kills for (.+) losses\)$/.exec(input)
  if (poorTrade) return `Плохой размен войск (${poorTrade[1]} убийств за ${poorTrade[2]} потерь)`
  const lostVills = /^Lost (\d+) villagers$/.exec(input)
  if (lostVills) return `Потеряно крестьян: ${lostVills[1]}`
  const firstUnitLate = /^First non-villager unit came (.+) late$/.exec(input)
  if (firstUnitLate) return `Первый некрестьянин опоздал на ${firstUnitLate[1]}`
  const unitGaps = /^Long unit-completion gaps \((.+) max\)$/.exec(input)
  if (unitGaps) return `Длинные паузы в производстве войск (макс. ${unitGaps[1]})`
  const responseLag = /^Response after first loss took (.+)$/.exec(input)
  if (responseLag) return `Ответ после первой потери занял ${responseLag[1]}`

  return null
}
