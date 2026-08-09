/**
 * Produces a readable, evidence-first post-game report from the summaries that
 * RTSLytics already caches.  Run it with Electron's Node runtime so the local
 * better-sqlite3 binary has the same ABI as the desktop app:
 *
 *   $env:ELECTRON_RUN_AS_NODE='1'
 *   .\node_modules\electron\dist\electron.exe scripts\generate_forensics_report.mjs \
 *     --profile 25610739 --out data\research\reports\player-forensics.md
 *
 * A summary contains the actual build-event stream for every player.  The
 * report therefore shows observed openings for everyone, while a pass/fail
 * build score is reserved for the user's explicitly pinned reference build.
 * It never grades an opponent against an unrelated community guide.
 */
import Database from 'better-sqlite3'
import { createServer } from 'vite'
import { gunzipSync } from 'node:zlib'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

function option(name, fallback = null) {
  const at = process.argv.indexOf(name)
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback
}

const profileId = Number(option('--profile'))
const outputPath = option('--out')
const appData = option('--app-data', process.env.APPDATA ? resolve(process.env.APPDATA, 'rtslytics') : null)

if (!Number.isSafeInteger(profileId) || profileId <= 0 || !outputPath || !appData) {
  throw new Error('Usage: --profile <AoE4World id> --out <report.md> [--app-data <RTSLytics dir>]')
}

const aliases = {
  '@': resolve('src/renderer'),
  '@shared': resolve('src/renderer/shared'),
  '@domain': resolve('src/domain'),
  '@api': resolve('src/api'),
  '@data': resolve('src/data'),
  '@store': resolve('src/store'),
  '@ipc': resolve('electron/ipc'),
}

const vite = await createServer({
  configFile: false,
  appType: 'custom',
  resolve: { alias: aliases },
  server: { middlewareMode: true },
  optimizeDeps: { noDiscovery: true },
})

try {
  const [{ parseStatsSummary, civFromToken }, { gradeBuildFollow }, buildsModule] = await Promise.all([
    vite.ssrLoadModule('/src/domain/statsSummary.ts'),
    vite.ssrLoadModule('/src/domain/buildTrainer.ts'),
    vite.ssrLoadModule('/src/data/buildOrders/index.ts'),
  ])
  const builds = buildsModule.BUNDLED_BUILD_ORDERS
  const settingsPath = resolve(appData, 'settings.json')
  const settings = existsSync(settingsPath) ? JSON.parse(readFileSync(settingsPath, 'utf8')).settings ?? {} : {}
  const playerName = settings.playerName ?? `Profile ${profileId}`
  const pinnedBuildName = settings.overlay?.buildOrderId ?? null
  const pinnedBuild = builds.find((build) => build.name === pinnedBuildName) ?? null

  const dbPath = resolve(appData, 'history.db')
  if (!existsSync(dbPath)) throw new Error(`RTSLytics history not found: ${dbPath}`)
  const db = new Database(dbPath, { readonly: true, fileMustExist: true })
  const matches = db
    .prepare('SELECT data FROM matches ORDER BY played_at ASC')
    .all()
    .map((row) => JSON.parse(row.data))
    .filter((match) => !match.hidden)
  db.close()

  const lines = [
    `# Детальный разбор матчей — ${escapeMd(playerName)}`,
    '',
    `Создан ${new Date().toISOString()} из локальной истории RTSLytics и кэшированных сводок Relic.`,
    '',
    '## Покрытие данных и как читать вывод',
    '',
    `- Матчей в локальной истории: **${matches.length}**.`,
    `- Точных сводок со всеми игроками: **${matches.filter((match) => existsSync(summaryPath(appData, match.id))).length}/${matches.length}**.`,
    '- «Наблюдаемый старт» восстановлен по реальному потоку построенных сущностей из сводки матча.',
    '- Оценка билда показывается только для вашего закреплённого билда и только когда цивилизация совпадает. Соперники никогда не получают фиктивную оценку по чужому гайду.',
    '- Оценка билда означает отклонение от плановых контрольных точек, а не автоматически ошибку: потери жителей и адаптация к давлению могут быть верным решением.',
    '- В командной игре поражение не списывается автоматически на одного игрока: отчёт показывает вклад и только подтверждённые личные проблемы.',
    '',
    '## Эталонный билд',
    '',
    pinnedBuild
      ? `Закреплён: **${escapeMd(pinnedBuild.name)}** (${escapeMd(Array.isArray(pinnedBuild.civilization) ? pinnedBuild.civilization.join(', ') : pinnedBuild.civilization)}).`
      : 'Закреплённый билд не найден, поэтому фиксированная оценка плана не ставится.',
    '',
  ]

  const missing = []
  const analyzed = []
  for (const match of matches) {
    const file = summaryPath(appData, match.id)
    if (!existsSync(file)) {
      missing.push(match.id)
      continue
    }
    const summary = parseStatsSummary(gunzipSync(readFileSync(file)))
    if (!summary || summary.players.length === 0) {
      missing.push(`${match.id} (unreadable)`)
      continue
    }
    analyzed.push(appendMatch(lines, { match, summary, profileId, civFromToken, pinnedBuild, gradeBuildFollow }))
  }

  appendCrossMatchSummary(lines, analyzed)

  if (missing.length > 0) {
    lines.push('## Недостающие данные', '', `Нет кэшированной сводки со всеми игроками для: ${missing.map((id) => `\`${id}\``).join(', ')}.`, '')
  }

  const target = resolve(outputPath)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, `${lines.join('\n')}\n`, 'utf8')
} finally {
  await vite.close()
}

function appendMatch(lines, context) {
  const { match, summary, profileId, civFromToken, pinnedBuild, gradeBuildFollow } = context
  const me = summary.players.find((player) => player.profileId === profileId)
  const perPlayer = new Map((match.perPlayer ?? []).map((row) => [row.profileId, row]))
  const myCounter = perPlayer.get(profileId) ?? null
  const myTeamId = myCounter?.teamId ?? null
  const ownTeam = summary.players.filter((player) => perPlayer.get(player.profileId)?.teamId === myTeamId)
  const enemyTeam = summary.players.filter((player) => perPlayer.get(player.profileId)?.teamId !== myTeamId)
  const referenceApplies =
    me &&
    pinnedBuild &&
    civMatchesBuild(civFromToken(me.civToken), pinnedBuild.civilization)
      ? gradeBuildFollow({ reference: pinnedBuild, events: me.buildOrder, civ: civFromToken(me.civToken) })
      : null
  const result = match.result === 'win' ? 'ПОБЕДА' : match.result === 'loss' ? 'ПОРАЖЕНИЕ' : 'РЕЗУЛЬТАТ НЕИЗВЕСТЕН'

  lines.push(`## ${result} — ${formatDate(match.playedAt)} — game \`${match.id}\``, '')
  lines.push(
    `${escapeMd(match.format ?? 'режим неизвестен')} · ${escapeMd(match.map ?? 'карта неизвестна')} · ${formatDuration(match.durationSec ?? summary.gameLengthSec)} · ${escapeMd(match.civ)} vs ${escapeMd(match.oppCiv ?? 'неизвестно')}.`,
    '',
  )
  if (referenceApplies) {
    lines.push(
      `Отклонение от закреплённого билда: **${referenceApplies.score ?? 'недостаточно данных'}${referenceApplies.score != null ? '%' : ''} совпадения с планом** — **${escapeMd(referenceApplies.buildName)}**.`,
      '',
    )
  } else {
    lines.push('Оценка закреплённого билда неприменима: выбранный эталон для другой цивилизации или строка игрока отсутствует.', '')
  }

  lines.push('| Игрок | Сторона | Эпоха II / III / IV | Пик жителей | Собрано рес. | Армия (уб./пот.) | Пик армии | Техи | APM | Наблюдаемый старт |')
  lines.push('| --- | --- | --- | ---: | ---: | --- | ---: | ---: | ---: | --- |')
  for (const player of summary.players) {
    const counter = player.profileId != null ? perPlayer.get(player.profileId) ?? null : null
    const totals = player.totals
    const militaryLost = totals ? Math.max(0, totals.unitsLost - (player.villagersLost ?? 0)) : null
    const military = totals
      ? `${totals.unitsKilled}/${militaryLost ?? totals.unitsLost}${player.villagersLost ? ` (+${player.villagersLost} vill)` : ''}`
      : counter?.kills != null
        ? `${counter.kills}/${counter.deaths ?? '?'}`
        : '—'
    const side = counter?.teamId === myTeamId ? (player.profileId === profileId ? 'ВЫ' : 'союзник') : 'враг'
    lines.push(
      `| ${escapeCell(playerLabel(player, civFromToken))} | ${side} | ${ageLine(totals)} | ${fmt(totals?.villagerHigh)} | ${fmt(totalResources(totals?.resourcesGathered))} | ${military} | ${fmt(totals?.largestArmy)} | ${fmt(totals?.techResearched)} | ${fmt(counter?.apm)} | ${escapeCell(openingLine(player))} |`,
    )
  }
  lines.push('')

  lines.push('### Ваш разбор по подтверждённым данным', '')
  const findings = personalFindings({
    match,
    me,
    profileId,
    perPlayer,
    ownTeam,
    enemyTeam,
    reference: referenceApplies,
  })
  if (findings.length === 0) lines.push('- По доступной сводке нельзя честно подтвердить решающую личную ошибку.', '')
  else {
    for (const finding of findings) lines.push(`- ${finding}`)
    lines.push('')
  }

  lines.push('### Фактические события билда всех игроков', '')
  for (const player of summary.players) {
    const tag = player.profileId === profileId ? ' — ВЫ' : ''
    lines.push(`- **${escapeMd(playerLabel(player, civFromToken))}${tag}:** ${escapeMd(buildSnapshot(player))}`)
  }
  lines.push('')

  return {
    match,
    me,
    reference: referenceApplies,
    villagerGap: me ? villagerRhythm(me) : null,
  }
}

function appendCrossMatchSummary(lines, reports) {
  const withMe = reports.filter((report) => report.me)
  if (withMe.length === 0) return
  const villagerLosses = withMe.reduce((sum, report) => sum + (report.me.villagersLost ?? 0), 0)
  const raidedGames = withMe.filter((report) => (report.me.villagersLost ?? 0) >= 6)
  const earlyBreaks = withMe.filter((report) => (report.villagerGap?.longestEarlyGapSec ?? 0) >= 70)
  const scoredBuilds = withMe.filter((report) => report.reference?.score != null)
  const ageObservations = scoredBuilds
    .flatMap((report) => report.reference.checkpoints)
    .filter((checkpoint) => checkpoint.kind === 'ageup' && checkpoint.ageUpTo === 2 && checkpoint.deltaSec != null)
  const lateFeudals = ageObservations.filter((checkpoint) => checkpoint.deltaSec > 60)

  lines.push('## Повторяющиеся закономерности', '')
  lines.push(
    `- За ${withMe.length} матчей с полной сводкой потеряно **${villagerLosses} жителей**; минимум в **${raidedGames.length}** матчах потерь было 6 или больше. Главный приоритет — не «ещё один юнит», а безопасная добыча, обзор флангов и своевременная реакция на рейд.`,
  )
  lines.push(
    `- В **${earlyBreaks.length}/${withMe.length}** матчах до 10-й минуты был разрыв создания жителей не меньше 1:10. Это повторяющийся сигнал простоя ТЦ/очереди, а не единичная неудача.`,
  )
  if (scoredBuilds.length > 0) {
    const averageScore = Math.round(scoredBuilds.reduce((sum, report) => sum + report.reference.score, 0) / scoredBuilds.length)
    const deviated = scoredBuilds.filter((report) => report.reference.score < 80).length
    lines.push(
      `- Закреплённый билд был применим в **${scoredBuilds.length}** матчах: среднее совпадение **${averageScore}%**, заметное отклонение — в **${deviated}/${scoredBuilds.length}**. Это повод отрабатывать именно этот план в кастомке, но сверять его с картой и ранним давлением.`,
    )
  }
  if (ageObservations.length > 0) {
    lines.push(
      `- Из **${ageObservations.length}** наблюдаемых Feudal-таймингов относительно закреплённого билда **${lateFeudals.length}** были позже более чем на минуту.`,
    )
  }
  lines.push('')
}

function personalFindings({ match, me, profileId, perPlayer, ownTeam, enemyTeam, reference }) {
  if (!me) return ['В этой сводке нет вашей строки игрока, поэтому личный вывод невозможен.']
  const findings = []
  const totals = me.totals
  const counter = perPlayer.get(profileId) ?? null
  const duration = match.durationSec ?? 0
  const militaryLost = totals ? Math.max(0, totals.unitsLost - (me.villagersLost ?? 0)) : null
  const kd = totals && militaryLost != null && militaryLost > 0 ? totals.unitsKilled / militaryLost : counter?.kd ?? null
  const villagerGap = villagerRhythm(me)
  const ownResources = totalResources(totals?.resourcesGathered)
  const teamResources = ownTeam.reduce((sum, player) => sum + totalResources(player.totals?.resourcesGathered), 0)
  const share = ownResources != null && teamResources > 0 ? ownResources / teamResources : null
  const teamSize = ownTeam.length
  const myAge2 = totals?.age2Sec ?? null
  const earliestEnemyAge2 = minAge(enemyTeam, 'age2Sec')

  if (reference?.score != null) {
    const failed = reference.checkpoints.filter((checkpoint) => checkpoint.ok === false)
    if (failed.length > 0) {
      findings.push(
        `Отклонение от закреплённого билда: **${reference.score}%** совпадения. Контрольные точки: ${failed
          .slice(0, 3)
          .map(checkpointEvidence)
          .join('; ')}. Это расхождение с планом, а не само по себе доказательство ошибки.`,
      )
    } else {
      findings.push(`Закреплённый билд выполнен на **${reference.score}%**; отслеживаемые стартовые точки не объясняют это поражение.`)
    }
  }
  if (duration >= 900 && totals?.villagerHigh != null && totals.villagerHigh < 55) {
    findings.push(`Экономика не выросла: пик жителей — только **${totals.villagerHigh}** за ${formatDuration(duration)} игры.`)
  }
  if (villagerGap && villagerGap.longestEarlyGapSec >= 70) {
    findings.push(`В первые 10 минут есть **${formatDuration(villagerGap.longestEarlyGapSec)}** без создания жителя (порог 1:10): проверьте простой ТЦ, пустую очередь или потерю жителя.`)
  }
  if ((me.villagersLost ?? 0) >= 6) {
    findings.push(`Потеряно **${me.villagersLost} жителей** — это реальный урон экономике, а не общий совет «лучше макро».`)
  }
  if (kd != null && militaryLost != null && militaryLost >= 15 && kd < 0.65) {
    findings.push(`Неудачные размены армии: **${totals?.unitsKilled ?? counter?.kills ?? 0} убийств / ${militaryLost} военных потерь = ${kd.toFixed(2)} K/D**. Сначала разведка состава, затем выход из невыгодной драки.`)
  }
  if (share != null && teamSize > 1 && share < 0.7 / teamSize) {
    findings.push(`Ваша доля собранных ресурсов — **${Math.round(share * 100)}%** от общей команды (равная доля ≈ ${Math.round(100 / teamSize)}%). Это подтверждает отставание по экономике/аптайму от союзников.`)
  }
  if (myAge2 != null && earliestEnemyAge2 != null && myAge2 - earliestEnemyAge2 > 100) {
    findings.push(`Переход в II эпоху был на **${formatDuration(myAge2 - earliestEnemyAge2)}** позже самого раннего врага. Окно феодального давления было реальным: адаптируйте билд или добавляйте раннюю защиту.`)
  }
  if (counter?.apm != null && counter.apm < 35 && duration >= 600) {
    findings.push(`Зафиксировано только **${counter.apm} APM**. Это скорее проблема внимания к производству и разведке, а не «скорости рук».`)
  }
  return findings
}

function checkpointEvidence(checkpoint) {
  if (checkpoint.kind === 'villagers') {
    const actual = checkpoint.actualVillagers == null ? 'нет данных' : checkpoint.actualVillagers
    const delta = checkpoint.villagerDelta == null ? '' : ` (${checkpoint.villagerDelta > 0 ? '+' : ''}${checkpoint.villagerDelta})`
    return `${checkpoint.label}: план ${checkpoint.targetVillagers}, факт ${actual}${delta}`
  }
  const actual = checkpoint.actualTimeSec == null ? 'не замечен' : formatDuration(checkpoint.actualTimeSec)
  const delta = checkpoint.deltaSec == null ? '' : ` (${checkpoint.deltaSec > 0 ? '+' : '−'}${formatDuration(Math.abs(checkpoint.deltaSec))})`
  return `${checkpoint.label}: план ${formatDuration(checkpoint.targetTimeSec)}, факт ${actual}${delta}`
}

function summaryPath(appData, gameId) {
  return resolve(appData, 'summaries', `${gameId}.rgs.gz`)
}

function playerLabel(player, civFromToken) {
  const civ = civFromToken(player.civToken) ?? player.civToken ?? 'unknown civ'
  return `${player.name ?? `Player ${player.playerId}`} (${civ})`
}

function openingLine(player) {
  const events = player.buildOrder.filter((event) => !isVillagerEvent(event)).slice(0, 7)
  if (events.length === 0) return 'События билда не расшифрованы'
  return events.map((event) => `${formatDuration(event.timeSec)} ${event.name}`).join(' → ')
}

function buildSnapshot(player) {
  const nonVillagers = player.buildOrder.filter((event) => !isVillagerEvent(event))
  const early = nonVillagers.slice(0, 10).map((event) => `${formatDuration(event.timeSec)} ${event.name}`)
  const military = player.buildOrder
    .filter((event) => event.category === 'unit' && !isVillagerEvent(event) && event.timeSec <= 900)
    .slice(0, 8)
    .map((event) => `${formatDuration(event.timeSec)} ${event.name}`)
  const rhythm = villagerRhythm(player)
  const gaps = rhythm && rhythm.longestEarlyGapSec >= 50 ? `; ранний разрыв жителей ${formatDuration(rhythm.longestEarlyGapSec)}` : ''
  return `старт: ${early.join(' → ') || 'не расшифрован'}${military.length ? `; ранняя армия: ${military.join(', ')}` : ''}${gaps}`
}

function villagerRhythm(player) {
  const times = player.buildOrder
    .filter(isVillagerEvent)
    .map((event) => event.timeSec)
    .sort((left, right) => left - right)
  if (times.length < 2) return null
  let longestEarlyGapSec = 0
  let longGaps = 0
  for (let index = 1; index < times.length; index++) {
    const gap = times[index] - times[index - 1]
    // The summary cannot distinguish a late-game idle TC from population cap,
    // multi-TC macro, resignation, or a deliberate tech switch.  Restrict this
    // signal to the opening where a production break is genuinely actionable.
    if (times[index - 1] > 600 || times[index] > 720) continue
    longestEarlyGapSec = Math.max(longestEarlyGapSec, gap)
    if (gap >= 50) longGaps++
  }
  return { longestEarlyGapSec, longGaps, villagersMade: times.length }
}

/** Unit display labels keep their civilization suffix on some DLC variants;
 * blueprint token is the stable discriminator for villagers/workers. */
function isVillagerEvent(event) {
  return /villager|worker_elephant/i.test(`${event.blueprint ?? ''} ${event.name ?? ''}`)
}

function civMatchesBuild(civ, buildCiv) {
  const wanted = normalize(civ ?? '')
  const labels = Array.isArray(buildCiv) ? buildCiv : [buildCiv]
  return labels.some((label) => normalize(label) === wanted)
}

function normalize(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function ageLine(totals) {
  if (!totals) return '—'
  return [totals.age2Sec, totals.age3Sec, totals.age4Sec].map((age) => formatDuration(age)).join(' / ')
}

function minAge(players, key) {
  const values = players.map((player) => player.totals?.[key]).filter((value) => value != null)
  return values.length ? Math.min(...values) : null
}

function totalResources(resources) {
  if (!resources) return null
  return resources.food + resources.wood + resources.gold + resources.stone
}

function formatDuration(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return '—'
  const rounded = Math.max(0, Math.round(seconds))
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`
}

function formatDate(iso) {
  return iso ? new Date(iso).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : 'date unknown'
}

function fmt(value) {
  return value == null || !Number.isFinite(value) ? '—' : Math.round(value).toLocaleString('en-US')
}

function escapeMd(value) {
  return String(value)
    .replace(/[\\`*_{}<>]/g, '\\$&')
    .replaceAll('[', '\\[')
    .replaceAll(']', '\\]')
}

function escapeCell(value) {
  return escapeMd(value).replace(/\|/g, '\\|')
}
