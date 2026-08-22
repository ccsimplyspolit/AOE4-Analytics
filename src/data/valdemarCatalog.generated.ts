/**
 * Valdemar1902 Comprehensive AoE4 Video & Match Analysis Catalog.
 * Generated automatically by scripts/harvest_valdemar_catalog.py.
 * Contains 3-year video analysis, transcripts, tactical timings and civ links.
 */

export type ValdemarVideoCategory =
  | 'match_analysis'
  | 'civ_guide'
  | 'build_order'
  | 'mechanics_fundamentals'
  | 'tier_list_meta'

export interface ValdemarTacticSnippet {
  name: string
  timeSec: number
  timeFormatted: string
  text: string
}

export interface ValdemarVideoEntry {
  id: string
  title: string
  url: string
  durationSec: number
  category: ValdemarVideoCategory
  primaryCivs: string[]
  opponentCivs: string[]
  proPlayers: string[]
  transcriptStatus: 'available' | 'members_only' | 'unavailable'
  snippetsCount: number
  summary: string
  keyTactics: ValdemarTacticSnippet[]
  transcriptExcerpt?: string | null
}

export const VALDEMAR_CATALOG_STATS = {
  "totalVideos": 370,
  "transcriptsAvailable": 26,
  "categories": {
    "civ_guide": 120,
    "build_order": 83,
    "match_analysis": 128,
    "tier_list_meta": 27,
    "mechanics_fundamentals": 12
  },
  "updatedAt": "2026-08-22"
};

export const VALDEMAR_VIDEOS: readonly ValdemarVideoEntry[] = [
  {
    "id": "0pkvLN16f4o",
    "title": "Easily Achieve Conqueror 3 With These Byz Strats | AoE4 Valdy",
    "url": "https://www.youtube.com/watch?v=0pkvLN16f4o",
    "durationSec": 1591,
    "category": "civ_guide",
    "primaryCivs": [
      "byzantines"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 714,
    "summary": "What's up guys? Welcome to another video. So, I was recently asked by one of my students a very I would say stupid question in my opinion. How do you play this? And what's changed? I don't know the matter, etc. I'm going to be honest. Nothing's changed. And so, let me show you...",
    "keyTactics": [
      {
        "name": "2TC Boom",
        "timeSec": 711,
        "timeFormatted": "11:51",
        "text": "he's going to go for second TC or"
      },
      {
        "name": "Fast Castle",
        "timeSec": 1546,
        "timeFormatted": "25:46",
        "text": "simple to play. Just age up to castle"
      },
      {
        "name": "Pro Scouts",
        "timeSec": 100,
        "timeFormatted": "01:40",
        "text": "pro scout and then just do hyper"
      },
      {
        "name": "Winery / Berries",
        "timeSec": 28,
        "timeFormatted": "00:28",
        "text": "winery. Now, many matchups nowadays"
      },
      {
        "name": "Hippodrome / Cav",
        "timeSec": 190,
        "timeFormatted": "03:10",
        "text": "triumph is very powerful."
      },
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 1415,
        "timeFormatted": "23:35",
        "text": "Let's bring in monastery. We don't have"
      }
    ],
    "transcriptExcerpt": "What's up guys? Welcome to another video. So, I was recently asked by one of my students a very I would say stupid question in my opinion. How do you play this? And what's changed? I don't know the matter, etc. I'm going to be honest. Nothing's changed. And so, let me show you and remind you how Byzantines is played. Playing against China on Flankwoods, and I think this is actually a really decent base map in this matchup as well. What you can do is you can actually go for winery. Now, many matchups nowadays don't allow that the same way because spear rushes can come from any civ really, but China is one of those civilizations where you actually can't really open spears. It is not very strong to do that. So, what we're doing is we open with three on stone, we're going with one on gold. Dropping off our sheep here. And then we're going to build winery later on these berries. We also going to have some more berries on the sides here, so that's always great when you play this map. Uh Flankwoods is nice that way, and you have gold and stone in the back, so that makes it quite nice. Yeah, I like it. Not a bad map at all. Now, versus China you have to be careful. You're not necessarily g"
  },
  {
    "id": "_1LWItYaLsk",
    "title": "Rus Tempo Boom Build Order (New Meta) | AoE4 Valdy",
    "url": "https://www.youtube.com/watch?v=_1LWItYaLsk",
    "durationSec": 1075,
    "category": "build_order",
    "primaryCivs": [
      "rus"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "Rus Tempo Boom Build Order (New Meta) | AoE4 Valdy",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "NAlDQ47uIqE",
    "title": "Top 5 BEST Civs for Beginners in AoE4",
    "url": "https://www.youtube.com/watch?v=NAlDQ47uIqE",
    "durationSec": 532,
    "category": "match_analysis",
    "primaryCivs": [
      "abbasid_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 259,
    "summary": "Age of Empires IV now has 23 civilizations and two more are coming later this year, the Vikings and the Scots. And picking your first civs in AoE IV can therefore be quite overwhelming, especially if you're a beginner. So, in this video, I will help you find the best beginner ...",
    "keyTactics": [
      {
        "name": "2TC Boom",
        "timeSec": 68,
        "timeFormatted": "01:08",
        "text": "second town center on gold or deer, then"
      },
      {
        "name": "Fast Castle",
        "timeSec": 200,
        "timeFormatted": "03:20",
        "text": "will do what is called a fast castle."
      },
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 107,
        "timeFormatted": "01:47",
        "text": "inspiration buffs and taking relics in"
      }
    ],
    "transcriptExcerpt": "Age of Empires IV now has 23 civilizations and two more are coming later this year, the Vikings and the Scots. And picking your first civs in AoE IV can therefore be quite overwhelming, especially if you're a beginner. So, in this video, I will help you find the best beginner civ for you. The Abbasid Dynasty. Coming in at number five is the Abbasid Dynasty. Abbasid Dynasty is an economic civilization that allows you to play two town center in feudal, defend yourself, and then go into castle age with a massive infantry, typically ghulams, spears, crossbows, and archers. They will be your go-tos. But, the civilization also has a benefit in its camel archer and camel rider unit. The camel archers in the feudal age will allow you to kill heavy tag units like men-at-arms and knights when you're fighting against either an age two or even an age three opponent. The camel riders in age four, when fully buffed with all the bonuses from golden age and the unique upgrades, prove to be some of the very best and most cost-efficient and high-quality units of any late game army in both one-v-ones and in team games. The Abbasid game plan is simple. Get to feudal with economic wing, build a second "
  },
  {
    "id": "fnGBUeVP_54",
    "title": "The Only OOTD Build You Need To WIN | AoE4 Valdy",
    "url": "https://www.youtube.com/watch?v=fnGBUeVP_54",
    "durationSec": 840,
    "category": "build_order",
    "primaryCivs": [
      "order_of_the_dragon"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "The Only OOTD Build You Need To WIN | AoE4 Valdy",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "ydDt3gp56fQ",
    "title": "Fix These Platinum Mistakes Or Be Hardstuck | AoE4 Platinum Coaching (Old Conqueror)",
    "url": "https://www.youtube.com/watch?v=ydDt3gp56fQ",
    "durationSec": 1546,
    "category": "match_analysis",
    "primaryCivs": [
      "byzantines",
      "malians"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 752,
    "summary": "What's up everyone? Welcome to another video. Today we're going to be taking a look at Yascara's Byzantines versus Malians. This is one of my old students. He sent me this game and he wanted me to take a look at it and give some feedback, but still go a little bit easy on him ...",
    "keyTactics": [
      {
        "name": "2TC Boom",
        "timeSec": 94,
        "timeFormatted": "01:34",
        "text": "second town center. And then it act"
      },
      {
        "name": "Hippodrome / Cav",
        "timeSec": 136,
        "timeFormatted": "02:16",
        "text": "you're playing more into hippodrome"
      },
      {
        "name": "Farm Transition",
        "timeSec": 1062,
        "timeFormatted": "17:42",
        "text": "to farm transition now, like for"
      },
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 1031,
        "timeFormatted": "17:11",
        "text": ">> how many relics did we get? Did we get"
      },
      {
        "name": "Defense & Walls",
        "timeSec": 1097,
        "timeFormatted": "18:17",
        "text": "great engagement, upgrade this outpost"
      },
      {
        "name": "Counter-Attack",
        "timeSec": 1436,
        "timeFormatted": "23:56",
        "text": "immediately. Punish him for doing it."
      }
    ],
    "transcriptExcerpt": "What's up everyone? Welcome to another video. Today we're going to be taking a look at Yascara's Byzantines versus Malians. This is one of my old students. He sent me this game and he wanted me to take a look at it and give some feedback, but still go a little bit easy on him because he hasn't played in a long time. And so that is fair. We'll take a look and try to see if we can find things in the strategy and of course micro, macro, meta, all those things and see if there's something. So first of all, we are playing on Gorge. We're playing Malians versus Byzantines. What I like to think about when I play against Malians as Byzantines is do I need to go 1T one TC or do I need to play two town center? And I think there's really two ways of playing it. OneTC, you want to play very much into Byzantine um Limit and the Longbows. And you want to play first of all quite defensive. Then you want to wall up. You want to secure your resources, your second barry, your your third barry so you can maximize longbow count. And then when you have around, I don't know, like 20 spears or something, you go for a scent. And then you can either age up if your opponent has a lot of army or you can atta"
  },
  {
    "id": "zNPvIkw1ZuM",
    "title": "Is Delhi Actually The Best Civ? (The Winrate Says So)",
    "url": "https://www.youtube.com/watch?v=zNPvIkw1ZuM",
    "durationSec": 1750,
    "category": "tier_list_meta",
    "primaryCivs": [
      "delhi_sultanate"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 514,
    "summary": "Delhi versus Japanese. Okay, so this is an interesting matchup because it can be quite hard for Delhi actually. You think about it is like Delhi struggles a lot against civs that have mana arms. They struggle a lot against civs that have really good castle age times. And if yo...",
    "keyTactics": [
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 202,
        "timeFormatted": "03:22",
        "text": "by uh not having any gold for scholars,"
      }
    ],
    "transcriptExcerpt": "Delhi versus Japanese. Okay, so this is an interesting matchup because it can be quite hard for Delhi actually. You think about it is like Delhi struggles a lot against civs that have mana arms. They struggle a lot against civs that have really good castle age times. And if you combine the two, it can be really devastating with a civilization like Japan having like 20 samurai and going into castle age. Well, so what we want to try to do today is avoid that situation. want to avoid getting into uh possible H3 uh with too much damage taken, that kind of that kind of thing. >> All right, so we're just opening up with Delhi here. Delhi is a really fun it's fun civ actually. Uh it's also really good apparently looking at the ladder. I know I did a video not too long ago about um about how China has like 42% win rate, but it's like in my opinion like still one of the best saves in the game. Delhi is like not in my opinion one of the best civs in the game. It's like a good mid-tier civ. But why does it have the highest win rate in Concord 4? Well, there could be multiple reasons for it. It could be that it's actually a really good civ and people are just not playing it enough. It could al"
  },
  {
    "id": "nv-SU1cfWM0",
    "title": "This Is Why Chinese Is So Powerful (The Winrate Is Lying)",
    "url": "https://www.youtube.com/watch?v=nv-SU1cfWM0",
    "durationSec": 1276,
    "category": "civ_guide",
    "primaryCivs": [
      "chinese"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 524,
    "summary": "What's everyone? Welcome to another video. Today, we're going to be playing China. China, probably the lowest win rate Civ on ladder at the moment, but highly regarded by tournament players. So, what's that all about? Let's figure it out. I'm going to be narrating my gameplay ...",
    "keyTactics": [
      {
        "name": "Fast Castle",
        "timeSec": 418,
        "timeFormatted": "06:58",
        "text": "fast castle into horse archers."
      },
      {
        "name": "Pro Scouts",
        "timeSec": 43,
        "timeFormatted": "00:43",
        "text": "we're going to be pro scouting, all of"
      },
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 470,
        "timeFormatted": "07:50",
        "text": "want to use some to my relics and be a"
      }
    ],
    "transcriptExcerpt": "What's everyone? Welcome to another video. Today, we're going to be playing China. China, probably the lowest win rate Civ on ladder at the moment, but highly regarded by tournament players. So, what's that all about? Let's figure it out. I'm going to be narrating my gameplay as I play China today, and hopefully it's going to give you some idea of what we're trying to do with the civilization, because it seems that most people have gotten it wrong. Building a mill over here in the woodline. The main reason I'm doing that is because we want to get tax, and we want to maximize tax, and the way you maximize tax with the civilization is by building your Imperial Academy, which is your feudal landmark, close to the woodline, close to the food. And since we're going to be pro scouting, all of our food will be under here anyways. Now, we're up against Rus, and Rus is one of one of those Civs that also pro scout, so there'll be a little bit of fighting maybe in the feudal age. But other than that, you pretty much just want to age up around 10 minutes. Just go for that. Uh enough units to stay alive. Break point is about 10 minutes get to Castle Age start making knights, archer, spear, and "
  },
  {
    "id": "wJDKYnv1trU",
    "title": "Delhi Is Super OP If Played Like This | AoE4 Valdy",
    "url": "https://www.youtube.com/watch?v=wJDKYnv1trU",
    "durationSec": 1660,
    "category": "civ_guide",
    "primaryCivs": [
      "delhi_sultanate"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "Delhi Is Super OP If Played Like This | AoE4 Valdy",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "dz1a7QjUMwM",
    "title": "Age Of Empires 4 Has A Serious AI Problem",
    "url": "https://www.youtube.com/watch?v=dz1a7QjUMwM",
    "durationSec": 1545,
    "category": "mechanics_fundamentals",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 777,
    "summary": "What's up everyone? Welcome to another video. Today I want to be talking about a topic that I think is a little bit controversial and I think a lot of people have an opinion about and that is the rise of AI, especially in the context of Age of Empires 4. So let's take a look a...",
    "keyTactics": [
      {
        "name": "Fast Castle",
        "timeSec": 1088,
        "timeFormatted": "18:08",
        "text": "TC? Are they going to go fast castle?"
      },
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 1091,
        "timeFormatted": "18:11",
        "text": "looking to pick up relics super duper"
      },
      {
        "name": "Defense & Walls",
        "timeSec": 300,
        "timeFormatted": "05:00",
        "text": "entire army. Use outpost and palisade"
      },
      {
        "name": "Counter-Attack",
        "timeSec": 313,
        "timeFormatted": "05:13",
        "text": "destruction because archers punish them"
      }
    ],
    "transcriptExcerpt": "What's up everyone? Welcome to another video. Today I want to be talking about a topic that I think is a little bit controversial and I think a lot of people have an opinion about and that is the rise of AI, especially in the context of Age of Empires 4. So let's take a look at it. So I think one of the main problems that people are trying to solve when they're using AI tools and creating the AI tools is they are trying to solve issues such as I don't have the skill to analyze my own games. I don't have the time to do that. I don't have the money I want to spend on a coach or maybe I don't know anyone that I could analyze my games with. Or maybe I just don't want to analyze my games. And so what a lot of people are doing, I think, is they are using AI like Claude, like ChatGPT to program these API integrated tools where they grab from the AoE4 world all the data they can and then they make a an AI tool that can then tell them what they're doing wrong. So let's try using a few of them and then see how it feels and we'll make some opinions off of it. So here's a tool called macro coach. Macro coach is a little bit weird and I don't really understand it too well. Basically what it tri"
  },
  {
    "id": "hgUTsttQwWA",
    "title": "The Mongol Strat That Won 2 S-Tiers | AoE4 Valdy",
    "url": "https://www.youtube.com/watch?v=hgUTsttQwWA",
    "durationSec": 1165,
    "category": "tier_list_meta",
    "primaryCivs": [
      "mongols"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "The Mongol Strat That Won 2 S-Tiers | AoE4 Valdy",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "-PPntvN34sE",
    "title": "How To Win Without Good Micro | AoE4 Diamond Coaching",
    "url": "https://www.youtube.com/watch?v=-PPntvN34sE",
    "durationSec": 1406,
    "category": "match_analysis",
    "primaryCivs": [
      "japanese",
      "ottomans"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 745,
    "summary": "So, I was sent this replay here by Barca, who is playing as the Ottomans here in the blue versus Segerant. And uh I know both of these players, actually. They're both students of mine. Barca has been uh on the grind lately with Ottomans, though. So, I'm very curious to see whe...",
    "keyTactics": [
      {
        "name": "Fast Castle",
        "timeSec": 282,
        "timeFormatted": "04:42",
        "text": "a fast castle. If that happens, you want"
      },
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 494,
        "timeFormatted": "08:14",
        "text": "They need to be on the relics for the"
      }
    ],
    "transcriptExcerpt": "So, I was sent this replay here by Barca, who is playing as the Ottomans here in the blue versus Segerant. And uh I know both of these players, actually. They're both students of mine. Barca has been uh on the grind lately with Ottomans, though. So, I'm very curious to see where he is at the moment and uh try to help him a little bit today. So, let's do it. In this matchup >> [clears throat] >> versus the Japanese, uh this is actually pretty decent matchup for Ottomans and uh I can see we're opening up with this military school openers. That's good. Pretty good um it's pretty good uh matchup for the Ottomans because they can find some very early gold denial um timings through their metters and healers and uh sipahis. Uh of course, it requires that you don't invest too much into military schools. Even if the game goes to castle age, you're usually in a good spot. You're They can't really go for their crossbow unit. So, there is certainly some play around sipahi there if they do. Um but yeah, knight archer spear can still be quite complicated for Ottomans to deal with if it's kind of like constant aggression. Uh the problem is when uh you can't build up a proper army as the Ottomans "
  },
  {
    "id": "CS3IWSLSMPQ",
    "title": "Zhu Xi's Pro Scout Build Is Broken Right Now (Nerf Incoming) | AoE4 Guide",
    "url": "https://www.youtube.com/watch?v=CS3IWSLSMPQ",
    "durationSec": 1178,
    "category": "build_order",
    "primaryCivs": [
      "zhu_xis_legacy"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "Zhu Xi's Pro Scout Build Is Broken Right Now (Nerf Incoming) | AoE4 Guide",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "Xkn4xxJg8GY",
    "title": "The Lancaster Feudal All In Is Still Very Strong | Think Like A Pro | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=Xkn4xxJg8GY",
    "durationSec": 920,
    "category": "match_analysis",
    "primaryCivs": [
      "house_of_lancaster"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 443,
    "summary": "One of my favorite strategies is to play really, really aggressive, even to the extent of an all-in. I like to stay in fuel age a long time. I like to finish games early if possible. Uh, but I can also enjoy a long late game as well. So, I want to show you guys this game here....",
    "keyTactics": [
      {
        "name": "Feudal Pressure",
        "timeSec": 4,
        "timeFormatted": "00:04",
        "text": "extent of an all-in. I like to stay in"
      },
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 616,
        "timeFormatted": "10:16",
        "text": "he's not going to get relics. He's not"
      },
      {
        "name": "Counter-Attack",
        "timeSec": 178,
        "timeFormatted": "02:58",
        "text": "punishing people who wants to go castle"
      }
    ],
    "transcriptExcerpt": "One of my favorite strategies is to play really, really aggressive, even to the extent of an all-in. I like to stay in fuel age a long time. I like to finish games early if possible. Uh, but I can also enjoy a long late game as well. So, I want to show you guys this game here. It's pretty cool. It is Lancaster versus Iubits. One of my lad games I played here yesterday. And basically the point of uh showing you this game here is I just want to show you how much you can actually stretch a feudal age to be able to deal with somebody who's in castle age. Most people see castle age and then they panic. The problem with seeing somebody goes castle age is all of a sudden they see all these things play out the way that they've experienced before. Okay, they got mana arms, they've got um upgraded archers, etc. Things are not going to work out. If you're able to set up your feudal age well enough to be able to continue to play it despite your opponent being in castle age via resource denial via taking a few good trades and the right unit compositions and playing into your s strings correctly, you'll find that often times you don't need to age up. If you stay in feudal and your opponent's goi"
  },
  {
    "id": "Y2Aild_Z2R8",
    "title": "Sengoku Has FINALLY Been Figured Out And It Is NUTS | AoE4 Guide",
    "url": "https://www.youtube.com/watch?v=Y2Aild_Z2R8",
    "durationSec": 2001,
    "category": "civ_guide",
    "primaryCivs": [
      "sengoku_daimyo"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "Sengoku Has FINALLY Been Figured Out And It Is NUTS | AoE4 Guide",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "KogVd0c1zFw",
    "title": "Mistakes Pros Instantly Punish | AoE4 Valdy",
    "url": "https://www.youtube.com/watch?v=KogVd0c1zFw",
    "durationSec": 979,
    "category": "match_analysis",
    "primaryCivs": [
      "golden_horde"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 514,
    "summary": "What's everyone? Welcome to another video. Today, I want to show you something a little bit funny, maybe interesting to you. I thought it was a little bit interesting as well. I had this student of mine contact me and he's like, \"I have my friend. I can't beat him. He plays th...",
    "keyTactics": [
      {
        "name": "2TC Boom",
        "timeSec": 611,
        "timeFormatted": "10:11",
        "text": "I fast castle with a civ that's a two TC"
      },
      {
        "name": "Fast Castle",
        "timeSec": 611,
        "timeFormatted": "10:11",
        "text": "I fast castle with a civ that's a two TC"
      },
      {
        "name": "Feudal Pressure",
        "timeSec": 204,
        "timeFormatted": "03:24",
        "text": "a proper food income and their all-in"
      },
      {
        "name": "Pro Scouts",
        "timeSec": 59,
        "timeFormatted": "00:59",
        "text": "cabin Kremlin.\" Not pro scouts or"
      },
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 840,
        "timeFormatted": "14:00",
        "text": "got castle age. We're making monks. We"
      },
      {
        "name": "Defense & Walls",
        "timeSec": 79,
        "timeFormatted": "01:19",
        "text": "wall off my second deer pack.\" So,"
      },
      {
        "name": "Counter-Attack",
        "timeSec": 461,
        "timeFormatted": "07:41",
        "text": "villagers. We counter attacked, we"
      }
    ],
    "transcriptExcerpt": "What's everyone? Welcome to another video. Today, I want to show you something a little bit funny, maybe interesting to you. I thought it was a little bit interesting as well. I had this student of mine contact me and he's like, \"I have my friend. I can't beat him. He plays these Golden Horde horse archers against me and I just I have no success against him.\" And so, I basically just said, \"Well, well, send him send him my way and I'll see what I can do and see if I'll show you how he's not unbeatable, right? You can copy my strategy. And so, in that, I thought, \"Why not just make a video about it? Show you what the difference between somebody at 1,200 Elo, around that diamond level, and somebody at around 2,100 Elo.\" So, way beyond conqueror three, of course. So, yeah, let's go ahead and take a look. Of course, we're playing Roos versus Golden Horde. My student was also playing Roos, struggling a little bit against Golden Horde. And so, I thought, \"Okay, we're just going to play uh pretty standard game, play some 100 cabin Kremlin.\" Not pro scouts or anything like that, because as you all know, when you get to high level, you need to adapt a lot. So, I thought about pro scouting a"
  },
  {
    "id": "pT5qRqOlNLY",
    "title": "Map Guide: Himeyama — 2 Builds To Easily Win | Valdy",
    "url": "https://www.youtube.com/watch?v=pT5qRqOlNLY",
    "durationSec": 1202,
    "category": "build_order",
    "primaryCivs": [
      "english"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 600,
    "summary": "What's up everyone? Welcome to another video. Today I'll be showing you two games and how you can play Himayyama, which is in the current ranked 1 v one map pool. So, let's get into it. The first game I want to be showing you guys is English versus Sangoku Damio. I want to tal...",
    "keyTactics": [
      {
        "name": "2TC Boom",
        "timeSec": 372,
        "timeFormatted": "06:12",
        "text": "and build a second TC at some point or"
      },
      {
        "name": "Fast Castle",
        "timeSec": 798,
        "timeFormatted": "13:18",
        "text": "fast castle themselves would not lose if"
      },
      {
        "name": "Feudal Pressure",
        "timeSec": 180,
        "timeFormatted": "03:00",
        "text": "allows you to put on early aggression,"
      },
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 940,
        "timeFormatted": "15:40",
        "text": "I, for example, will not get any relics"
      },
      {
        "name": "Counter-Attack",
        "timeSec": 155,
        "timeFormatted": "02:35",
        "text": "punish our opponent for playing uh just"
      }
    ],
    "transcriptExcerpt": "What's up everyone? Welcome to another video. Today I'll be showing you two games and how you can play Himayyama, which is in the current ranked 1 v one map pool. So, let's get into it. The first game I want to be showing you guys is English versus Sangoku Damio. I want to talk a little bit about the map and what you want to do on this map and how it's structured compared to, for example, Dry Arabia. And then I'll show you two strats. So, Himyama is unique because you spawn with this um pond in the middle. It's quite irregular, but basically what it is, it's like four or five shoreline fish, and these have 600 food. So, you can kind of see there's a little bit of a like an opportunity to get some extra food in the early game. Shoreline fish is the fastest gather rate that you can get on villages in the dark age. Uh, I think it's one food per second for a villager, which is faster than the boar. So, you want to prioritize getting this or use a dock to uh gather from the shoreline fish with fishing boats instead, boosting your economy with additional workers. Other things to notice about note about this map is the fact that the deer packs are pushed towards the middle. So if you look"
  },
  {
    "id": "Kx0LubVSxZA",
    "title": "Chinese Is Broken If You Play It Like This | Valdy AoE4",
    "url": "https://www.youtube.com/watch?v=Kx0LubVSxZA",
    "durationSec": 1098,
    "category": "civ_guide",
    "primaryCivs": [
      "chinese"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "Chinese Is Broken If You Play It Like This | Valdy AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "uaAFYPM01qo",
    "title": "This Is Why French Is So Strong | Valdy AoE4",
    "url": "https://www.youtube.com/watch?v=uaAFYPM01qo",
    "durationSec": 1188,
    "category": "civ_guide",
    "primaryCivs": [
      "french"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 607,
    "summary": "What's up everyone? Welcome to another video. Today we're going to be playing some French. And French is the civilization that I would always recommend new players to play. It's a civilization that's very simple and it doesn't actually change its format as you get better at ga...",
    "keyTactics": [
      {
        "name": "2TC Boom",
        "timeSec": 247,
        "timeFormatted": "04:07",
        "text": "he playing two TC or is he playing pro"
      },
      {
        "name": "Fast Castle",
        "timeSec": 418,
        "timeFormatted": "06:58",
        "text": "fast castle. Here's tower, so we'll make"
      },
      {
        "name": "Pro Scouts",
        "timeSec": 414,
        "timeFormatted": "06:54",
        "text": "probably going to go pro scout"
      }
    ],
    "transcriptExcerpt": "What's up everyone? Welcome to another video. Today we're going to be playing some French. And French is the civilization that I would always recommend new players to play. It's a civilization that's very simple and it doesn't actually change its format as you get better at game. So you could essentially play the same strategy, same sort of style with some small adaptations, etc. throughout your entire journey towards whatever rank you would like to achieve, whether that be conquer three or just the next one above you. If you're gold three, maybe you want to get plat one or plat two. Or just staying plat one, right? A lot of people they they kind of fluctuate a lot. They go from gold three, plat one, plat two, and then they might hit diamond one and drop down to gold two again. It's like they're very inconsistent. Now, inconsistency is a is a whole topic in of itself. A lot of the times inconsistency is tied into a into multitasking practice. And and that might sound strange, but it's actually the way that that you practice that uh helps you a lot with that. So, why do I say multiplay uh multitasking practice? So multitasking, a lot of people when I'm [clears throat] coaching them,"
  },
  {
    "id": "KNqi3OeKRbA",
    "title": "LoueMT Being Hilariously Good at Age of Empires 4 | Valdy",
    "url": "https://www.youtube.com/watch?v=KNqi3OeKRbA",
    "durationSec": 1090,
    "category": "civ_guide",
    "primaryCivs": [
      "english",
      "golden_horde"
    ],
    "opponentCivs": [],
    "proPlayers": [
      "LoueMT"
    ],
    "transcriptStatus": "available",
    "snippetsCount": 539,
    "summary": "I got to show you guys something. It is sometimes so fun to just go and peek on other people's match history. Take a look at this. We're on King of the Hill with LouieMT versus Chuck Francis. Chuck Francis introduction would be something along the lines of somebody who plays a...",
    "keyTactics": [
      {
        "name": "2TC Boom",
        "timeSec": 318,
        "timeFormatted": "05:18",
        "text": "opponent already has a second TC. So you"
      },
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 994,
        "timeFormatted": "16:34",
        "text": "is not producing scholars, so the timing"
      },
      {
        "name": "Defense & Walls",
        "timeSec": 256,
        "timeFormatted": "04:16",
        "text": "is now building a fortified outpost and"
      }
    ],
    "transcriptExcerpt": "I got to show you guys something. It is sometimes so fun to just go and peek on other people's match history. Take a look at this. We're on King of the Hill with LouieMT versus Chuck Francis. Chuck Francis introduction would be something along the lines of somebody who plays a lot of ladder. He hasn't played too many tournaments as much as I thought he actually had. Um he's a bit more of a of a ladder player. Um but he's solid solid like 2K elo or something. And of course on the other side watching LouieMT here of course needs no introduction. I want to show you guys these games here because I was peeking on LouieMT's match history. And these games are hilarious. I'm going to show you guys two games today. The first game here is uh Golden Horde versus English. And as per usual when you face somebody on on ladder that's playing English it's it's usually the same shenanigans every single time. There's always two town center, Abbey of Kings, into some sort of white tower, or maybe a bit of feudal age aggression. So it depends on uh the match up and and and who you're playing against. And so LouieMT in this match up I wouldn't say is too favored. I mean it's certainly playable. But wha"
  },
  {
    "id": "cCJ5Rw2GTSc",
    "title": "Feudal Delhi Is Amazing - Here's How To Play It (Tower Of Victory) | AoE4",
    "url": "https://www.youtube.com/watch?v=cCJ5Rw2GTSc",
    "durationSec": 1047,
    "category": "civ_guide",
    "primaryCivs": [
      "delhi_sultanate"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "Feudal Delhi Is Amazing - Here's How To Play It (Tower Of Victory) | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "I54KtEakRsQ",
    "title": "The LEAST Played Civ In AoE4 (Jin Dynasty)",
    "url": "https://www.youtube.com/watch?v=I54KtEakRsQ",
    "durationSec": 2548,
    "category": "civ_guide",
    "primaryCivs": [
      "jin_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 913,
    "summary": "What's up everyone? So recently I've been very curious about Jen and I'm I'm really interested to see okay are there actually other ways of playing the civilization than what we are actually doing right now. So few weeks ago I made a video on this channel which was um basicall...",
    "keyTactics": [
      {
        "name": "2TC Boom",
        "timeSec": 148,
        "timeFormatted": "02:28",
        "text": "second TC kind of game, right? If it's a"
      },
      {
        "name": "Fast Castle",
        "timeSec": 2444,
        "timeFormatted": "40:44",
        "text": "like a one TC fast castle with just one"
      },
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 637,
        "timeFormatted": "10:37",
        "text": "start taking relics."
      }
    ],
    "transcriptExcerpt": "What's up everyone? So recently I've been very curious about Jen and I'm I'm really interested to see okay are there actually other ways of playing the civilization than what we are actually doing right now. So few weeks ago I made a video on this channel which was um basically similar to this one actually the same matchup and everything. Uh, and I played against a demo in a 2DC versus 2DC game and I was thinking about, okay, well, it feels like 2DC seems pretty good, especially if people wants to attack you as Jin. But what I've noticed is, of course, like everyone else been noticing, meta's shifting a little bit towards something along the lines of two town center, especially if there's a matchup for it. And that's the key, especially at the high level. People play matchups more so than metas. Um although of course uh a matchup can have a certain meta. Um for example in this one I would almost always expect KT to go for two town center with the knowledge that they could pro probably still be something like a you know spear rush coming or something like that. You take some risks when you play A4 and that's what it is. For example uh this move out here going for this deer pack is n"
  },
  {
    "id": "NIaH6n_JMJk",
    "title": "The Golden Horde MAA Timing Attack | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=NIaH6n_JMJk",
    "durationSec": 759,
    "category": "civ_guide",
    "primaryCivs": [
      "golden_horde"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "The Golden Horde MAA Timing Attack | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "7_c9_X0tK_E",
    "title": "How To Counter Turtle Players (Without Attacking) | Golden Horde | AoE4",
    "url": "https://www.youtube.com/watch?v=7_c9_X0tK_E",
    "durationSec": 1307,
    "category": "mechanics_fundamentals",
    "primaryCivs": [
      "golden_horde"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 651,
    "summary": "What's up everyone, welcome to another video. Today I want to show you guys a pretty cool strategy with Golden Horde. I got the perfect matchup for it. What we're going to do is we're going to play against Lancaster. And this is the perfect matchup because it goes to show just...",
    "keyTactics": [
      {
        "name": "2TC Boom",
        "timeSec": 66,
        "timeFormatted": "01:06",
        "text": "into a second town center."
      },
      {
        "name": "Fast Castle",
        "timeSec": 211,
        "timeFormatted": "03:31",
        "text": "fast castle. He's made five spearmen."
      },
      {
        "name": "Farm Transition",
        "timeSec": 494,
        "timeFormatted": "08:14",
        "text": "for farm transition or securing it by"
      },
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 290,
        "timeFormatted": "04:50",
        "text": "we'll go for a sacred site or siege"
      }
    ],
    "transcriptExcerpt": "What's up everyone, welcome to another video. Today I want to show you guys a pretty cool strategy with Golden Horde. I got the perfect matchup for it. What we're going to do is we're going to play against Lancaster. And this is the perfect matchup because it goes to show just how differently you can actually play Golden Horde. You don't actually always have to do this all in, although the all in is probably one of the strongest in the game. If you all in with war goods in the garage giving extra armor etc., you'll find that there's actually another strategy that most Golden Horde players don't know how to play. And what I'm going to do is I'm going to reveal that strategy in this video. So what we're doing here is we are actually going to not scout our opponent here in the beginning. We'll just focus on sheep. And the reason that is is because when you play Golden Horde, you'll find that you are not going to want to have idle time. You're not going to want to build a tower or barrack defense or anything against somebody who goes spear rush Lancaster. In theory, you we've seen this so many times in the tournament in the past five weeks. We've seen this matchup quite a lot where Lan"
  },
  {
    "id": "YMKgy9jRxq0",
    "title": "The Only AoE4 Tier List Based on Results, Not Opinions | July 2026",
    "url": "https://www.youtube.com/watch?v=YMKgy9jRxq0",
    "durationSec": 931,
    "category": "tier_list_meta",
    "primaryCivs": [
      "delhi_sultanate",
      "french",
      "golden_horde",
      "japanese",
      "mongols",
      "rus"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 429,
    "summary": "The Elite Classic just concluded this last weekend with the grand finals between Marine Lord and Poppy Paw. If you haven't watched it yet, go check it out. And watch out, there might be a few spoilers in this video as well as we'll be taking a look at the numbers of this tourn...",
    "keyTactics": [
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 81,
        "timeFormatted": "01:21",
        "text": "attacks or to contest relics in two town"
      },
      {
        "name": "Counter-Attack",
        "timeSec": 527,
        "timeFormatted": "08:47",
        "text": "um the more the civ choice punishes you."
      }
    ],
    "transcriptExcerpt": "The Elite Classic just concluded this last weekend with the grand finals between Marine Lord and Poppy Paw. If you haven't watched it yet, go check it out. And watch out, there might be a few spoilers in this video as well as we'll be taking a look at the numbers of this tournament and try to break down what does the current meta picks say about the civilizations and their strength levels right now. We've got the data on 23 civilizations, win rates, the games that have been played, the bans, and when you actually look at all three together, some really interesting things pop up. So, let's go tier by tier. If you were to do a tier list based on the win rates from the tournament without taking into account the different maps, the tier list would look something like this. You would have Mongols sitting here with their 85% win rate, and the rest of the civilizations that have 60% win rate and higher would be in S tier. Then, in A tier, let's say that's 50% to 60%, that would be Rus, Golden Horde, Biz, Delhi, French, Japan. The most surprising one here would be Rus, that's really had a resurgence, a real comeback with the Trinity builds that people have been going for. We've been seeing"
  },
  {
    "id": "KBmcjUzUioI",
    "title": "The Fastest 2TC KT Build | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=KBmcjUzUioI",
    "durationSec": 1001,
    "category": "build_order",
    "primaryCivs": [
      "knights_templar"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "The Fastest 2TC KT Build | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "WZeczqGf9EA",
    "title": "Is Abbasid Admin Wing the New Meta? | AoE4",
    "url": "https://www.youtube.com/watch?v=WZeczqGf9EA",
    "durationSec": 1196,
    "category": "tier_list_meta",
    "primaryCivs": [
      "abbasid_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 619,
    "summary": "What's up everyone? Welcome to another video. Today I want to take a look at the round of six of the recent EGC tournament that's happening both last weekend and the coming weekend as well. If you have not checked it out, you should go look at it because it's such a good tourn...",
    "keyTactics": [
      {
        "name": "Feudal Pressure",
        "timeSec": 753,
        "timeFormatted": "12:33",
        "text": "more units out. Good for an all-in if"
      },
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 76,
        "timeFormatted": "01:16",
        "text": "scholars uh when they play Delhi."
      },
      {
        "name": "Counter-Attack",
        "timeSec": 815,
        "timeFormatted": "13:35",
        "text": "home and Lucifer is looking to punish"
      }
    ],
    "transcriptExcerpt": "What's up everyone? Welcome to another video. Today I want to take a look at the round of six of the recent EGC tournament that's happening both last weekend and the coming weekend as well. If you have not checked it out, you should go look at it because it's such a good tournament. There's so many interesting plays with all of the changes that have been made over the on the game in the past few months and the professional level, the absolute top level utilizing these things to absolute full effect. Um you should go watch it. It's it's really amazing tournament and I even played in it a bit myself and that was a fun experience. Learned a lot from that. I want to take a look at this game and there's a reason I'm showing this one in specific. It's from the round of six BC versus Luciferon. And that was a I won't spoil the result, but it was a really good series. You should go watch it. I want to show you this replay and talk a little bit about administration wing. We're on King of the Hill. And King of the Hill has one sacred site. And Delhi is actually not necessarily bad because of it. King of the Hill is a map that's very linear. It's very good for infantry, but it's actually also"
  },
  {
    "id": "8wJW0U38Vgc",
    "title": "How To Play High Level Ottomans | AoE4 Guide",
    "url": "https://www.youtube.com/watch?v=8wJW0U38Vgc",
    "durationSec": 1129,
    "category": "civ_guide",
    "primaryCivs": [
      "ottomans"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "How To Play High Level Ottomans | AoE4 Guide",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "oFfv5cHry68",
    "title": "The Best Civ In AoE4 - And It Is Not Even Close...",
    "url": "https://www.youtube.com/watch?v=oFfv5cHry68",
    "durationSec": 1606,
    "category": "tier_list_meta",
    "primaryCivs": [
      "order_of_the_dragon",
      "ottomans"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 566,
    "summary": "What's up everyone? Welcome to another video. Today we're going to be taking a look at some Ottomans. I thought I'd do a play through here of Ottomans just going to show you why this is probably the best civilization in the game at the moment. I'm against Order of the Dragon. ...",
    "keyTactics": [
      {
        "name": "2TC Boom",
        "timeSec": 35,
        "timeFormatted": "00:35",
        "text": "You can even do two TC fast castle as"
      },
      {
        "name": "Fast Castle",
        "timeSec": 35,
        "timeFormatted": "00:35",
        "text": "You can even do two TC fast castle as"
      },
      {
        "name": "Feudal Pressure",
        "timeSec": 43,
        "timeFormatted": "00:43",
        "text": "feudal aggression very easily, I think."
      },
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 452,
        "timeFormatted": "07:32",
        "text": "each of the relics."
      }
    ],
    "transcriptExcerpt": "What's up everyone? Welcome to another video. Today we're going to be taking a look at some Ottomans. I thought I'd do a play through here of Ottomans just going to show you why this is probably the best civilization in the game at the moment. I'm against Order of the Dragon. I'm going to go for standard opening here. Just one military school. And then go straight to feudal after that. Playing against Ezra. Definitely not a bad player. And Order of the Dragon on Hill and Dale, Hill and Dale seems to also be quite a solid safe pick here as well. You have a deer pick in your base so you can fast castle. You can even do two TC fast castle as well. So, in terms of like playing this match-up, you're not going to find that you can do something like feudal aggression very easily, I think. I think this is going to be a little bit of a of a harder match, probably. So, what we are doing now is we're just putting seven on food. Putting one here to the military school afterwards. We will go to to get the um the gold. We just need to collect 50 wood here as well for a mining camp. Thinking about this match-up, I mean it's kind of like Ottomans have a long set up time in the early game, right? T"
  },
  {
    "id": "s9TkSQV1Mhg",
    "title": "5 Defense Tips Every AoE4 Player Needs",
    "url": "https://www.youtube.com/watch?v=s9TkSQV1Mhg",
    "durationSec": 1304,
    "category": "mechanics_fundamentals",
    "primaryCivs": [
      "byzantines",
      "house_of_lancaster"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 679,
    "summary": "What's up everyone? Welcome to another video. Today we're going to be taking a look at five things you can do to better defend yourself against all ins. And so what I'm going to do is I'm going to show you a game against Lancaster, against the player that goes for a fast castl...",
    "keyTactics": [
      {
        "name": "2TC Boom",
        "timeSec": 137,
        "timeFormatted": "02:17",
        "text": "for a second town center."
      },
      {
        "name": "Fast Castle",
        "timeSec": 248,
        "timeFormatted": "04:08",
        "text": "He's going fast castle."
      },
      {
        "name": "Feudal Pressure",
        "timeSec": 722,
        "timeFormatted": "12:02",
        "text": "all-inning, uh where you just don't have"
      },
      {
        "name": "Winery / Berries",
        "timeSec": 66,
        "timeFormatted": "01:06",
        "text": "grand winery, their feudal landmark,"
      },
      {
        "name": "Hippodrome / Cav",
        "timeSec": 360,
        "timeFormatted": "06:00",
        "text": "with hippodrome, I could use triumph"
      },
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 1264,
        "timeFormatted": "21:04",
        "text": "HRE and you don't get your relics,"
      },
      {
        "name": "Counter-Attack",
        "timeSec": 397,
        "timeFormatted": "06:37",
        "text": "If I want to counter attack him, which"
      }
    ],
    "transcriptExcerpt": "What's up everyone? Welcome to another video. Today we're going to be taking a look at five things you can do to better defend yourself against all ins. And so what I'm going to do is I'm going to show you a game against Lancaster, against the player that goes for a fast castle manner arms spam all in with a few knights sprinkled in as well. The first thing I want to really emphasize when you play against any civ, any player, any game, it pretty much any strategy game essentially is you need information. And so you have a bank of information already from games you've already played. If you're a brand new player, I'm sorry. You need to build up some experience. But if you have played a match up before or you've played a civilization before, then you start to get familiar with things that you need to defend yourself with. And one of those things is absolutely vision and knowledge. You need some info on what your opponent is doing. That means very early on the game, especially if you're playing a super vulnerable civ like Byzantines, you need to defend yourself. That means you also need to prepare yourself for the worst likely thing to happen. For Byzantines, a lot of Biz players have"
  },
  {
    "id": "AEGIGZXbSuA",
    "title": "2TC Jin Is Pretty Decent - Let's Play It! | AoE4",
    "url": "https://www.youtube.com/watch?v=AEGIGZXbSuA",
    "durationSec": 1957,
    "category": "build_order",
    "primaryCivs": [
      "jin_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 626,
    "summary": "What's up everyone? Welcome to another video. Today we're going to be playing as the Jin Dynasty. We're going to play on Hill and Dale versus I think a pretty good player actually on the KT. So I'm curious who this actually is. Let's see. It's Demo. All right. It's always Demo...",
    "keyTactics": [
      {
        "name": "2TC Boom",
        "timeSec": 85,
        "timeFormatted": "01:25",
        "text": "to put your second town center on the"
      },
      {
        "name": "Fast Castle",
        "timeSec": 91,
        "timeFormatted": "01:31",
        "text": "can fast castle. There's no other answer"
      },
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 269,
        "timeFormatted": "04:29",
        "text": "get some relics."
      },
      {
        "name": "Counter-Attack",
        "timeSec": 1082,
        "timeFormatted": "18:02",
        "text": "I mean, he can't punish me, so the safe"
      }
    ],
    "transcriptExcerpt": "What's up everyone? Welcome to another video. Today we're going to be playing as the Jin Dynasty. We're going to play on Hill and Dale versus I think a pretty good player actually on the KT. So I'm curious who this actually is. Let's see. It's Demo. All right. It's always Demo. Oh my lord. Every time I queue up I either get Demo or I get some [ __ ] That's that's how it goes. Anyways, we're playing against KT. We're playing as the Jin Dynasty. And Jin Dynasty feels like a civilization that kind of just has to play two town center. What do you guys think? Let me know in the comment section below what you guys think of Jin Dynasty. I think personally they're actually not that bad and they're actually kind of playable in many situations. But it feels like as long as you can avoid feudal versus feudal or any sort of situation where you are forced to fight and you can't play defensive or raid then they feel kind of awkward. So I think in a situation for example here against KT where we can end up playing something like two town center I think we should be perfectly fine. So anyways let's let's see how this match unfolds. We have front gold here which always is a little bit of an issue. "
  },
  {
    "id": "NnO7k4AvazU",
    "title": "The Fastest 2TC Rus Build Order | Aoe4",
    "url": "https://www.youtube.com/watch?v=NnO7k4AvazU",
    "durationSec": 1012,
    "category": "build_order",
    "primaryCivs": [
      "rus"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "The Fastest 2TC Rus Build Order | Aoe4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "Lku9kFlDULc",
    "title": "Pros Are Playing 2TC Rus... Is It Actually Good? | AoE4",
    "url": "https://www.youtube.com/watch?v=Lku9kFlDULc",
    "durationSec": 1381,
    "category": "build_order",
    "primaryCivs": [
      "rus"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 609,
    "summary": "What's up everyone? Welcome to another video. Today we're going to be taking a look at Roose two Town Center. And what I'm going to do is I'm going to just try to play it. I've watched a few professional players now play it, and I thought, why not just shoot a video with it, t...",
    "keyTactics": [
      {
        "name": "2TC Boom",
        "timeSec": 184,
        "timeFormatted": "03:04",
        "text": "And then build a second town center here"
      },
      {
        "name": "Fast Castle",
        "timeSec": 30,
        "timeFormatted": "00:30",
        "text": "feudal age to go fast castle, maybe into"
      },
      {
        "name": "Hippodrome / Cav",
        "timeSec": 243,
        "timeFormatted": "04:03",
        "text": "Question is, will it be with hippodrome?"
      },
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 421,
        "timeFormatted": "07:01",
        "text": "and then start hunting monks with them."
      },
      {
        "name": "Defense & Walls",
        "timeSec": 468,
        "timeFormatted": "07:48",
        "text": "I'm going to wall off this side here."
      }
    ],
    "transcriptExcerpt": "What's up everyone? Welcome to another video. Today we're going to be taking a look at Roose two Town Center. And what I'm going to do is I'm going to just try to play it. I've watched a few professional players now play it, and I thought, why not just shoot a video with it, try to see if it works, and uh take it from there. I'm playing against Byzantines, which is arguably not a match up where you want to go for it, but I thought, why not try it? So, we're going to play Roose two Town Center, probably with Kremlin in this match up, I would say. And then we'll see if we need to defend feudal age to go fast castle, maybe into men at arms or something. So, we're going to do a Roose opening here that involves double double cabin, of course. And double cabin is of course a way for us to get more gold. Double cabin is pretty much the standard for Roose. It's a way for us to get two scouts in total. Also a way for us to start generating gold. So, if we do want to play Golden Gate, which isn't the case today, I can already now see an amazing spot here for a Kremlin and a suit a second Town Center. If you do want to play uh Golden Gate, then of course honey cabins are amazing. So, uh anyon"
  },
  {
    "id": "ApTpn3yKFv4",
    "title": "HRE Is Back In The Meta! | HRE Build Order Guide | AoE4",
    "url": "https://www.youtube.com/watch?v=ApTpn3yKFv4",
    "durationSec": 1486,
    "category": "build_order",
    "primaryCivs": [
      "holy_roman_empire"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "HRE Is Back In The Meta! | HRE Build Order Guide | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "gN6nVOjCOgM",
    "title": "This Build Ends Games FAST | Zhu Xi's Legacy Build Order | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=gN6nVOjCOgM",
    "durationSec": 887,
    "category": "build_order",
    "primaryCivs": [
      "zhu_xis_legacy"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "This Build Ends Games FAST | Zhu Xi's Legacy Build Order | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "yvaWvgufajk",
    "title": "This Civ Just Auto-Wins For You... | AoE4",
    "url": "https://www.youtube.com/watch?v=yvaWvgufajk",
    "durationSec": 1541,
    "category": "civ_guide",
    "primaryCivs": [
      "byzantines"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 641,
    "summary": "What's up everyone? Welcome to another video. So, today we're going to be taking a look at the buffed Byzantines yet again. Byzantines have actually been buffed and I think it might be actually one of the strongest civilizations in the game at the moment. So, what we're going ...",
    "keyTactics": [
      {
        "name": "Winery / Berries",
        "timeSec": 210,
        "timeFormatted": "03:30",
        "text": "These guys will go build the winery."
      },
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 699,
        "timeFormatted": "11:39",
        "text": "And then push out. Take some relics."
      },
      {
        "name": "Counter-Attack",
        "timeSec": 1311,
        "timeFormatted": "21:51",
        "text": "get punished for it."
      }
    ],
    "transcriptExcerpt": "What's up everyone? Welcome to another video. So, today we're going to be taking a look at the buffed Byzantines yet again. Byzantines have actually been buffed and I think it might be actually one of the strongest civilizations in the game at the moment. So, what we're going to do here is we're going to do a little bit of a play-through. We're going to see how it's going to feel. We're just going to do the standard build that Byzantines have been doing since forever with with triple stone and uh and one on gold of course and just try to get four cisterns pretty quickly and let the the fifth one come in with the stone that we get from landmarks and from other buildings. And the cool thing about Biz now is you can build a cistern immediately. You actually don't have to wait for the mining camps, houses, etc. So, that is actually already something I could have done a bit faster. We start built that cistern immediately. So, it's really cool that you can get a little bit more of a tempo boost early on that way. It also feels like Biz now just becomes extremely powerful in the early game. Um we have a bit of a a farm nerf uh in the late game, 5% less oil gathered from farms. But what is"
  },
  {
    "id": "B6x1S-yqLw0",
    "title": "🔴AoE4 Patch! Abbasid Rework, Sheep Changes & More!",
    "url": "https://www.youtube.com/watch?v=B6x1S-yqLw0",
    "durationSec": 1923,
    "category": "tier_list_meta",
    "primaryCivs": [
      "abbasid_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 957,
    "summary": "What's up, everyone? Welcome to another video. So, I wasn't expecting this to happen, but apparently in the middle of our 2v2 tournament, uh new patch just dropped. And uh it has a ton of new changes. We did not know about this coming at all. It is all out of the blue, and uh ...",
    "keyTactics": [
      {
        "name": "Fast Castle",
        "timeSec": 205,
        "timeFormatted": "03:25",
        "text": "fast castle. Used to just be a map where"
      },
      {
        "name": "Hippodrome / Cav",
        "timeSec": 1005,
        "timeFormatted": "16:45",
        "text": "Imperial Hippodrome, Triumph health"
      },
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 337,
        "timeFormatted": "05:37",
        "text": "Okay, Oasis, boars and sacred sites were"
      },
      {
        "name": "Defense & Walls",
        "timeSec": 1237,
        "timeFormatted": "20:37",
        "text": "Outpost health decreased to 200. That's"
      }
    ],
    "transcriptExcerpt": "What's up, everyone? Welcome to another video. So, I wasn't expecting this to happen, but apparently in the middle of our 2v2 tournament, uh new patch just dropped. And uh it has a ton of new changes. We did not know about this coming at all. It is all out of the blue, and uh it's going to change a lot. It's going to be civ changes, map changes, new map pool, so many new things. So, let's go through it. The first thing is they're going to change our map pool, and it's going to be ranked uh 1v1s Arabia, Cliffs Edge, Crater, Hill and Dale, Migration, Danube River, West Lake, Hideout, and High Woods. So, it looks like this, as you can see. I've banned Crater, Danube, Migration, and I've kind of kept the other ones. I don't know about about High Woods yet. Maybe I'll ban it. I haven't actually seen the map. And for team games, it's going to be Arabia, Caravan, Rocky River, Lipany, Migration, Canal, Gorge, Flankwoods, and Hedge Maze. This is actually also a pretty cool um pretty pretty cool map pool. If you just want standard maps, it seems you're going to actually get that quite easily just doing this. So, this is actually one of the better team game uh map pools that I've ever seen. U"
  },
  {
    "id": "aTmT53_-pew",
    "title": "All 23 Civilizations Ranked Best To Worst | AoE4 Tierlist June 2026",
    "url": "https://www.youtube.com/watch?v=aTmT53_-pew",
    "durationSec": 2042,
    "category": "tier_list_meta",
    "primaryCivs": [
      "english"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 1025,
    "summary": "What's up everyone? Welcome to a another video. Today we're going to taking a look at a tier list for the June version of the game June 2026. We've just entered a new tournament, the EGC, and I was really fortunate to actually make it through the qualifier. It was a really tou...",
    "keyTactics": [
      {
        "name": "Fast Castle",
        "timeSec": 350,
        "timeFormatted": "05:50",
        "text": "usually can only fast castle. And if you"
      },
      {
        "name": "Feudal Pressure",
        "timeSec": 680,
        "timeFormatted": "11:20",
        "text": "one of the strongest all-ins right now."
      },
      {
        "name": "Pro Scouts",
        "timeSec": 227,
        "timeFormatted": "03:47",
        "text": "You can also play Meinwerk pro scouts"
      },
      {
        "name": "Hippodrome / Cav",
        "timeSec": 583,
        "timeFormatted": "09:43",
        "text": "hippodrome all the time. Other people"
      },
      {
        "name": "Farm Transition",
        "timeSec": 1641,
        "timeFormatted": "27:21",
        "text": "farm transition,"
      },
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 194,
        "timeFormatted": "03:14",
        "text": "use of Swabia and relics and a lot of"
      },
      {
        "name": "Counter-Attack",
        "timeSec": 142,
        "timeFormatted": "02:22",
        "text": "your opponent doesn't punish you and"
      }
    ],
    "transcriptExcerpt": "What's up everyone? Welcome to a another video. Today we're going to taking a look at a tier list for the June version of the game June 2026. We've just entered a new tournament, the EGC, and I was really fortunate to actually make it through the qualifier. It was a really tough one. Uh my opponent was very strong and uh I was definitely close to not making it, but uh having a good knowledge about civ strengths, having a good knowledge about um when to play what civs is really important. And that's why I'm going to bring you a tier list today and give you my two cents on uh the current meta of the game, the current balance, and what civs are the best and the worst. And a lot of things have indeed changed since the last time we took a look at this. So, let's go. The first civ we're going to take a look at is probably one that everyone looks towards and asks the question, is this viable or not? I'm going to say English is probably not the most viable civ right now. At least not for the high level. And that is going to be also the main sort of perspective for this video. It's going to be the high level because we minimize the mistakes and we maximize the uh usage of all the civs' abil"
  },
  {
    "id": "XmqZZ7yShYU",
    "title": "You Started A Game Of English - Now What? | AoE4",
    "url": "https://www.youtube.com/watch?v=XmqZZ7yShYU",
    "durationSec": 2120,
    "category": "civ_guide",
    "primaryCivs": [
      "english"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 876,
    "summary": "Hi guys, what's up? I thought today we'll do something a little bit different. We'll get started on a little bit of a uh an over-explained what do I do when I I'm starting with English. I'm just starting the new game. I haven't actually played too much AoE 4. What should I do?...",
    "keyTactics": [
      {
        "name": "2TC Boom",
        "timeSec": 197,
        "timeFormatted": "03:17",
        "text": "second town center or something, they"
      },
      {
        "name": "Fast Castle",
        "timeSec": 312,
        "timeFormatted": "05:12",
        "text": "center into fast castle."
      },
      {
        "name": "Farm Transition",
        "timeSec": 764,
        "timeFormatted": "12:44",
        "text": "We've got a nice farming setup here."
      },
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 594,
        "timeFormatted": "09:54",
        "text": "start making taking relics."
      },
      {
        "name": "Defense & Walls",
        "timeSec": 493,
        "timeFormatted": "08:13",
        "text": "I'm going to wall off the back here even"
      }
    ],
    "transcriptExcerpt": "Hi guys, what's up? I thought today we'll do something a little bit different. We'll get started on a little bit of a uh an over-explained what do I do when I I'm starting with English. I'm just starting the new game. I haven't actually played too much AoE 4. What should I do? I'm starting as English on Hill and Dale. I want to play a safe strategy that I can do in all of my games and learn the game with. And I thought what better civ to do that with than with English. So what we're doing here, we're just playing on Hill and Dale. And what's really important to know about Hill and Dale is it is a map that is very easy to camp on. It is therefore a very easy map to also play uh with a strategy like this where you can sit in your base for a long period of time and not really care too much about resources. What I've done so far is I've opened up with six and food and I'm going to deer this time. The reason I've gone on deer is because on Hill and Dale you always spawn with a deer pack in your face. And this allows us to gather food a lot faster than normal. And so we basically get almost another villager for free by doing that. On top of that we also got survival techniques. And then "
  },
  {
    "id": "oqbBXshDUiY",
    "title": "The Only Byzantines Build You Need To WIN | Byzantines Build Order | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=oqbBXshDUiY",
    "durationSec": 1067,
    "category": "build_order",
    "primaryCivs": [
      "byzantines"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "The Only Byzantines Build You Need To WIN | Byzantines Build Order | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "CyNUh2bApoE",
    "title": "Advanced Mongol Strategy To Punish 2TC | Mongol Build Order | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=CyNUh2bApoE",
    "durationSec": 874,
    "category": "build_order",
    "primaryCivs": [
      "mongols"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "Advanced Mongol Strategy To Punish 2TC | Mongol Build Order | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "bBMj9QfNKX0",
    "title": "Don't Make These SIMPLE 1500 Elo Mistakes | Conqueror Coaching",
    "url": "https://www.youtube.com/watch?v=bBMj9QfNKX0",
    "durationSec": 2582,
    "category": "match_analysis",
    "primaryCivs": [
      "chinese",
      "malians"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 1384,
    "summary": "What's up? >> What's up everyone? Welcome to another video. Today we're going to be taking a look at one of my students' games. It's going to be a live game, actually. I don't know how this one's going to end. I don't know if it's going to be a good game, but I wanted to check...",
    "keyTactics": [
      {
        "name": "2TC Boom",
        "timeSec": 98,
        "timeFormatted": "01:38",
        "text": "can't stop a second town center,"
      },
      {
        "name": "Fast Castle",
        "timeSec": 242,
        "timeFormatted": "04:02",
        "text": "to fast castle or into units after that."
      },
      {
        "name": "Feudal Pressure",
        "timeSec": 466,
        "timeFormatted": "07:46",
        "text": "all-in or something, we're going to"
      },
      {
        "name": "Farm Transition",
        "timeSec": 1575,
        "timeFormatted": "26:15",
        "text": "He's just delaying his farm transition a"
      },
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 1092,
        "timeFormatted": "18:12",
        "text": "We're able to take some relics now."
      },
      {
        "name": "Counter-Attack",
        "timeSec": 708,
        "timeFormatted": "11:48",
        "text": "Because opponents going to punish us,"
      }
    ],
    "transcriptExcerpt": "What's up? >> What's up everyone? Welcome to another video. Today we're going to be taking a look at one of my students' games. It's going to be a live game, actually. I don't know how this one's going to end. I don't know if it's going to be a good game, but I wanted to check in on one of my students that I coached recently for a coaching tournament. And we got third place, which I actually thought was not too bad. And we worked in a lot of things like how to play a mid game, late game, and especially also stuff like how should we do the early game, which is something we worked a little bit more on recently. So, one of Deepshine's main problems is, especially when playing Malians and stuff, is figuring out how do I deal with somebody who's going to go very um greedy against me. How do I, with Donso Jav or any other sort of composition, not end up in a situation where I'm always going to struggle against somebody who just completely over greeds. We're talking about like Chinese 3 TC. We're talking about, you know, Abyssinian 3 TC. How do I win against this? And so, what I'm trying to pass down to her and kind of make her understand make her implement here is the idea of having an e"
  },
  {
    "id": "tJWbi1Qqz0A",
    "title": "Is Sengoku Still The BEST Civ In AoE4?",
    "url": "https://www.youtube.com/watch?v=tJWbi1Qqz0A",
    "durationSec": 3029,
    "category": "tier_list_meta",
    "primaryCivs": [
      "sengoku_daimyo"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "available",
    "snippetsCount": 346,
    "summary": "It's time for Sang Goku. Sang Goku played three times yesterday in Homestead Cup. 0% win rate. I have a thesis and the thesis is ladder players are better at playing Senoku than tournament players. I said it. That's I think that's how it is. I think there are some ladder playe...",
    "keyTactics": [
      {
        "name": "Relics & Sacred Sites",
        "timeSec": 1674,
        "timeFormatted": "27:54",
        "text": "He had four relics. I couldn't get more"
      }
    ],
    "transcriptExcerpt": "It's time for Sang Goku. Sang Goku played three times yesterday in Homestead Cup. 0% win rate. I have a thesis and the thesis is ladder players are better at playing Senoku than tournament players. I said it. That's I think that's how it is. I think there are some ladder players out there who have played so much Sing Goku that they are literally better at it than players like Anitant Vortex and um I think it's time to practice it because it's going to be let through now in tournaments. There's going to be some delusion. I think this civ should still be very OP. But now I'm not sure where people think it is where where it is actually so strong that all you have to do is just [ __ ] age up. You have everything in base and then you spam W to make Mount of Samurai. But now people have to actually use more of their keyboard. And um that's the hard part. I mean look at all these units that they have. Nobody knows when to use them. When do you go for Canabo samurai? When do you go for audu? When do you go gunners? I mean, gunners are different than crossbows. So, it's a no-brainer. Um, it's not a no-brainer, but it was a no-brainer. Now, it's time to figure [ __ ] out. So, yeah, doesn't r"
  },
  {
    "id": "m-VnMi2QnAM",
    "title": "The New Way To Play Zhu Xi's Legacy | AoE4",
    "url": "https://www.youtube.com/watch?v=m-VnMi2QnAM",
    "durationSec": 2214,
    "category": "civ_guide",
    "primaryCivs": [
      "zhu_xis_legacy"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The New Way To Play Zhu Xi's Legacy | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "OARzI0pzMe0",
    "title": "The Hidden Jin Strategy Noone Knows About | AoE4",
    "url": "https://www.youtube.com/watch?v=OARzI0pzMe0",
    "durationSec": 1527,
    "category": "civ_guide",
    "primaryCivs": [
      "jin_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "The Hidden Jin Strategy Noone Knows About | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "YkSMCs_b9C4",
    "title": "Jin Dynasty Is A Lategame POWERHOUSE | AoE4",
    "url": "https://www.youtube.com/watch?v=YkSMCs_b9C4",
    "durationSec": 2537,
    "category": "civ_guide",
    "primaryCivs": [
      "jin_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Jin Dynasty Is A Lategame POWERHOUSE | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "d_vP08tT3NY",
    "title": "3 Build Orders You Need to Learn To Play Jin Dynasty | AoE4",
    "url": "https://www.youtube.com/watch?v=d_vP08tT3NY",
    "durationSec": 2058,
    "category": "build_order",
    "primaryCivs": [
      "jin_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "3 Build Orders You Need to Learn To Play Jin Dynasty | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "UbovknydN8k",
    "title": "New AoE4 Campaign – First 2 Missions (Full Playthrough + Thoughts)",
    "url": "https://www.youtube.com/watch?v=UbovknydN8k",
    "durationSec": 2708,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "New AoE4 Campaign – First 2 Missions (Full Playthrough + Thoughts)",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "4A0w4Fctg3U",
    "title": "Everything You Need To Know About JIN DYNASTY | AoE4",
    "url": "https://www.youtube.com/watch?v=4A0w4Fctg3U",
    "durationSec": 1564,
    "category": "civ_guide",
    "primaryCivs": [
      "jin_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Everything You Need To Know About JIN DYNASTY | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "JlOC1_mf-VU",
    "title": "🔴DLC PATCH! Civ Reworks, Map Pools & MUCH MORE",
    "url": "https://www.youtube.com/watch?v=JlOC1_mf-VU",
    "durationSec": 2715,
    "category": "tier_list_meta",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "🔴DLC PATCH! Civ Reworks, Map Pools & MUCH MORE",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "hRXfSgDlTOA",
    "title": "Don't Attack His Army! | Diamond 2 Coaching",
    "url": "https://www.youtube.com/watch?v=hRXfSgDlTOA",
    "durationSec": 1258,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Don't Attack His Army! | Diamond 2 Coaching",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "pDKO3N4zhx8",
    "title": "Everything You Need To Know About Defending In AoE 4",
    "url": "https://www.youtube.com/watch?v=pDKO3N4zhx8",
    "durationSec": 1280,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Everything You Need To Know About Defending In AoE 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "RiNhLnPWozc",
    "title": "From Start to Finals – 3 Hours of AoE4 Tournament Action",
    "url": "https://www.youtube.com/watch?v=RiNhLnPWozc",
    "durationSec": 11382,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "From Start to Finals – 3 Hours of AoE4 Tournament Action",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "MXmROXoUjs8",
    "title": "A Pro Breakdown Of Fast Castle Strategy | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=MXmROXoUjs8",
    "durationSec": 1306,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "A Pro Breakdown Of Fast Castle Strategy | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "_XGGsuHL8Qo",
    "title": "A Plat Viewer Paid to Play Me… So I Surprised Him | AoE4",
    "url": "https://www.youtube.com/watch?v=_XGGsuHL8Qo",
    "durationSec": 906,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "A Plat Viewer Paid to Play Me… So I Surprised Him | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "lpTy4BX7qLE",
    "title": "Zhuxi Lategame Is Better Than Ottomans... | Top Of The Ladder #18",
    "url": "https://www.youtube.com/watch?v=lpTy4BX7qLE",
    "durationSec": 2353,
    "category": "match_analysis",
    "primaryCivs": [
      "ottomans"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Zhuxi Lategame Is Better Than Ottomans... | Top Of The Ladder #18",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "h7k3PoKC5CA",
    "title": "This Guy Had Insane Unit Control! | Top Of The Ladder #17",
    "url": "https://www.youtube.com/watch?v=h7k3PoKC5CA",
    "durationSec": 1582,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "This Guy Had Insane Unit Control! | Top Of The Ladder #17",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "QVlmDVgB6y4",
    "title": "How To Build An Early Lead In Age Of Empires 4",
    "url": "https://www.youtube.com/watch?v=QVlmDVgB6y4",
    "durationSec": 991,
    "category": "build_order",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "How To Build An Early Lead In Age Of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "0xIjA-Sl8Ww",
    "title": "Zhuge Nu Spam Is Still Very Strong | Top Of The Ladder #16",
    "url": "https://www.youtube.com/watch?v=0xIjA-Sl8Ww",
    "durationSec": 1610,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Zhuge Nu Spam Is Still Very Strong | Top Of The Ladder #16",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "z5zeOUmVgZ8",
    "title": "\"I Just Want You To Play A Cheese Strategy\" | Top Of The Ladder #15",
    "url": "https://www.youtube.com/watch?v=z5zeOUmVgZ8",
    "durationSec": 992,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "\"I Just Want You To Play A Cheese Strategy\" | Top Of The Ladder #15",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "QE9fU360ZJU",
    "title": "Is This The Best Counter To Tughlaq 2TC? | Top Of The Ladder #14",
    "url": "https://www.youtube.com/watch?v=QE9fU360ZJU",
    "durationSec": 1295,
    "category": "match_analysis",
    "primaryCivs": [
      "tughlaq_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Is This The Best Counter To Tughlaq 2TC? | Top Of The Ladder #14",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "eHln0ZOY9v8",
    "title": "How To Play Jeanne D'arc In 2026 | AoE4",
    "url": "https://www.youtube.com/watch?v=eHln0ZOY9v8",
    "durationSec": 1873,
    "category": "civ_guide",
    "primaryCivs": [
      "jeanne_darc"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Jeanne D'arc In 2026 | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "6cLNcPEhfwY",
    "title": "AoE4 Update Drops NEW CIV In May 2026! + Singleplayer & Multiplayer Content",
    "url": "https://www.youtube.com/watch?v=6cLNcPEhfwY",
    "durationSec": 1072,
    "category": "tier_list_meta",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "AoE4 Update Drops NEW CIV In May 2026! + Singleplayer & Multiplayer Content",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "yunmxIjydY4",
    "title": "The Free Elo Build? | Top Of The Ladder #13",
    "url": "https://www.youtube.com/watch?v=yunmxIjydY4",
    "durationSec": 2167,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The Free Elo Build? | Top Of The Ladder #13",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "XivlYNuy5Sc",
    "title": "Who Has The Best Abbasid? (Showmatch) | coRe vs Msn.dk | AoE4",
    "url": "https://www.youtube.com/watch?v=XivlYNuy5Sc",
    "durationSec": 1298,
    "category": "match_analysis",
    "primaryCivs": [
      "abbasid_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Who Has The Best Abbasid? (Showmatch) | coRe vs Msn.dk | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "hWkeU9U6Jjk",
    "title": "How To Play Tughlaq Dynasty In 2026 | AoE4",
    "url": "https://www.youtube.com/watch?v=hWkeU9U6Jjk",
    "durationSec": 2106,
    "category": "civ_guide",
    "primaryCivs": [
      "tughlaq_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Tughlaq Dynasty In 2026 | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "Vyc05D3ojeY",
    "title": "AoE4 Tier List: ALL Civs Ranked (Best → Worst)",
    "url": "https://www.youtube.com/watch?v=Vyc05D3ojeY",
    "durationSec": 1610,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "AoE4 Tier List: ALL Civs Ranked (Best → Worst)",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "m1fiM5wk7yM",
    "title": "A Macro Game Against Corvinus | Top Of The Ladder #12",
    "url": "https://www.youtube.com/watch?v=m1fiM5wk7yM",
    "durationSec": 2097,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [
      "Corvinus"
    ],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "A Macro Game Against Corvinus | Top Of The Ladder #12",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "3Rkix0K9WVI",
    "title": "Intense KT Game Against Macedonia! | Top Of The Ladder #11",
    "url": "https://www.youtube.com/watch?v=3Rkix0K9WVI",
    "durationSec": 1576,
    "category": "match_analysis",
    "primaryCivs": [
      "knights_templar"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Intense KT Game Against Macedonia! | Top Of The Ladder #11",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "i327lTLOJ-I",
    "title": "These Small Mistakes Are Losing You Games! | Diamond 1 Coaching",
    "url": "https://www.youtube.com/watch?v=i327lTLOJ-I",
    "durationSec": 1449,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "These Small Mistakes Are Losing You Games! | Diamond 1 Coaching",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "IFUNfAxEhas",
    "title": "How To Play Knights Templar In 2026 | AoE4",
    "url": "https://www.youtube.com/watch?v=IFUNfAxEhas",
    "durationSec": 1887,
    "category": "civ_guide",
    "primaryCivs": [
      "knights_templar"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Knights Templar In 2026 | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "ZWtXPI6Jpf8",
    "title": "How To Analyze Losses - Step By Step | AoE4",
    "url": "https://www.youtube.com/watch?v=ZWtXPI6Jpf8",
    "durationSec": 1781,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "How To Analyze Losses - Step By Step | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "S20mpMMCCSk",
    "title": "Crazy Lategame Vs Byzantines | Top Of The Ladder #10",
    "url": "https://www.youtube.com/watch?v=S20mpMMCCSk",
    "durationSec": 2090,
    "category": "match_analysis",
    "primaryCivs": [
      "byzantines"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Crazy Lategame Vs Byzantines | Top Of The Ladder #10",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "baFjGPycfEI",
    "title": "Is This The Worst Matchup In The Game? | Top Of The Ladder #9",
    "url": "https://www.youtube.com/watch?v=baFjGPycfEI",
    "durationSec": 1176,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Is This The Worst Matchup In The Game? | Top Of The Ladder #9",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "bUhjh7k5lIo",
    "title": "Use Your Army Correctly! | Conqueror 3 Coaching",
    "url": "https://www.youtube.com/watch?v=bUhjh7k5lIo",
    "durationSec": 1829,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Use Your Army Correctly! | Conqueror 3 Coaching",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "-tSYJ0xH-cA",
    "title": "I Ran Into Marinelord On Ladder | Top Of The Ladder #8",
    "url": "https://www.youtube.com/watch?v=-tSYJ0xH-cA",
    "durationSec": 1282,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [
      "MarineLorD"
    ],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "I Ran Into Marinelord On Ladder | Top Of The Ladder #8",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "hxxmbmr9a3M",
    "title": "How To Play Golden Horde In 2026 | AoE4",
    "url": "https://www.youtube.com/watch?v=hxxmbmr9a3M",
    "durationSec": 1299,
    "category": "civ_guide",
    "primaryCivs": [
      "golden_horde"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Golden Horde In 2026 | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "Xn62hEuKkKg",
    "title": "What Happens If Both Players Boom? | Top Of The Ladder #7",
    "url": "https://www.youtube.com/watch?v=Xn62hEuKkKg",
    "durationSec": 2508,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "What Happens If Both Players Boom? | Top Of The Ladder #7",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "gQDVpDom6mU",
    "title": "My English Opponent Messed Up My French Knight Kitchen! | Top Of The Ladder #6",
    "url": "https://www.youtube.com/watch?v=gQDVpDom6mU",
    "durationSec": 1569,
    "category": "match_analysis",
    "primaryCivs": [
      "english",
      "french"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "My English Opponent Messed Up My French Knight Kitchen! | Top Of The Ladder #6",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "8AyZK804W-k",
    "title": "🔴New Patch! Incredible Update To The Caster Mode!",
    "url": "https://www.youtube.com/watch?v=8AyZK804W-k",
    "durationSec": 713,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "🔴New Patch! Incredible Update To The Caster Mode!",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "M961c97ctU4",
    "title": "How To Play HRE In 2026 | AoE4",
    "url": "https://www.youtube.com/watch?v=M961c97ctU4",
    "durationSec": 1913,
    "category": "civ_guide",
    "primaryCivs": [
      "holy_roman_empire"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play HRE In 2026 | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "YwddPk9XCvE",
    "title": "I Love Beating Up Streamsnipers - It Is My Passion! | Top Of The Ladder #5",
    "url": "https://www.youtube.com/watch?v=YwddPk9XCvE",
    "durationSec": 1852,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "I Love Beating Up Streamsnipers - It Is My Passion! | Top Of The Ladder #5",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "hMTIOrfXsgI",
    "title": "The Best Female Players In The Grand Finals! | Rabbitsweet Vs Luise | WhamensCup II",
    "url": "https://www.youtube.com/watch?v=hMTIOrfXsgI",
    "durationSec": 4223,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The Best Female Players In The Grand Finals! | Rabbitsweet Vs Luise | WhamensCup II",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "C2AXvACcmjM",
    "title": "Rabbitsweet Builds The Great Wall Of China! | Rabbitsweet Vs Nostromia | WhamensCup II",
    "url": "https://www.youtube.com/watch?v=C2AXvACcmjM",
    "durationSec": 3885,
    "category": "match_analysis",
    "primaryCivs": [
      "chinese"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Rabbitsweet Builds The Great Wall Of China! | Rabbitsweet Vs Nostromia | WhamensCup II",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "LJcsa5tbEfA",
    "title": "This Set Has More TCs Than I've Constructed This Year... | Deepshine Vs Nostromia | WhamensCup II",
    "url": "https://www.youtube.com/watch?v=LJcsa5tbEfA",
    "durationSec": 6545,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "This Set Has More TCs Than I've Constructed This Year... | Deepshine Vs Nostromia | WhamensCup II",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "OW1qDA5L0so",
    "title": "A Knight Micro Masterclass! | Luise Vs Rabbitsweet | WhamensCup II",
    "url": "https://www.youtube.com/watch?v=OW1qDA5L0so",
    "durationSec": 1834,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "A Knight Micro Masterclass! | Luise Vs Rabbitsweet | WhamensCup II",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "fHDae_9IVFI",
    "title": "LuiseMT Is Born! | Luise Vs Peppino Pig | WhamensCup II ft. @Meowasis",
    "url": "https://www.youtube.com/watch?v=fHDae_9IVFI",
    "durationSec": 4704,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "LuiseMT Is Born! | Luise Vs Peppino Pig | WhamensCup II ft. @Meowasis",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "89umLWXh7WM",
    "title": "Age Up To Castle Or Stay Feudal? | Conqueror 3 AoE4 Coaching",
    "url": "https://www.youtube.com/watch?v=89umLWXh7WM",
    "durationSec": 1174,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Age Up To Castle Or Stay Feudal? | Conqueror 3 AoE4 Coaching",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "nEF_yctzBkI",
    "title": "Meta Out the Window In The Women's League! | Bella Vs Nostromia | WhamensCup II ft. @Meowasis",
    "url": "https://www.youtube.com/watch?v=nEF_yctzBkI",
    "durationSec": 2702,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Meta Out the Window In The Women's League! | Bella Vs Nostromia | WhamensCup II ft. @Meowasis",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "dRvmG-HSfz4",
    "title": "How To Play Delhi Sultanate In 2026 | AoE4",
    "url": "https://www.youtube.com/watch?v=dRvmG-HSfz4",
    "durationSec": 1927,
    "category": "civ_guide",
    "primaryCivs": [
      "delhi_sultanate"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Delhi Sultanate In 2026 | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "DFeaV1FKK7A",
    "title": "Fun Games Are Feudal Games! | Top Of The Ladder #4",
    "url": "https://www.youtube.com/watch?v=DFeaV1FKK7A",
    "durationSec": 1142,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Fun Games Are Feudal Games! | Top Of The Ladder #4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "h9WRRiS75YE",
    "title": "The Next Female-Only Tournament In AoE4! | Deepshine Vs TamTheTerrible | WhamensCup II",
    "url": "https://www.youtube.com/watch?v=h9WRRiS75YE",
    "durationSec": 1159,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The Next Female-Only Tournament In AoE4! | Deepshine Vs TamTheTerrible | WhamensCup II",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "-VXyIzMhf4s",
    "title": "Easily Fix These Feudal Mistakes! | Diamond AoE4 Coaching",
    "url": "https://www.youtube.com/watch?v=-VXyIzMhf4s",
    "durationSec": 1445,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Easily Fix These Feudal Mistakes! | Diamond AoE4 Coaching",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "7v0S68Eh6r8",
    "title": "People Need To Chill In Ranked... | Top Of The Ladder #3",
    "url": "https://www.youtube.com/watch?v=7v0S68Eh6r8",
    "durationSec": 1591,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "People Need To Chill In Ranked... | Top Of The Ladder #3",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "LKH4uwXd24E",
    "title": "How To Play Macedonian Dynasty In 2026 | AoE4",
    "url": "https://www.youtube.com/watch?v=LKH4uwXd24E",
    "durationSec": 1872,
    "category": "civ_guide",
    "primaryCivs": [
      "macedonian_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Macedonian Dynasty In 2026 | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "oN3UfYvqV3g",
    "title": "There Was A 1200 Elo Difference Between Us... | Top Of The Ladder #2",
    "url": "https://www.youtube.com/watch?v=oN3UfYvqV3g",
    "durationSec": 1643,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "There Was A 1200 Elo Difference Between Us... | Top Of The Ladder #2",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "Fgiv2WXO5gw",
    "title": "How To Play Mongols In 2026 | AoE4",
    "url": "https://www.youtube.com/watch?v=Fgiv2WXO5gw",
    "durationSec": 2599,
    "category": "civ_guide",
    "primaryCivs": [
      "mongols"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Mongols In 2026 | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "nfv0Odi5VY0",
    "title": "Watch This If You Like FAST Games | Top Of The Ladder #1",
    "url": "https://www.youtube.com/watch?v=nfv0Odi5VY0",
    "durationSec": 1288,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Watch This If You Like FAST Games | Top Of The Ladder #1",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "ZHSegmY5rsM",
    "title": "Sengoku French Knights, Crucible Points, New Map Pools!",
    "url": "https://www.youtube.com/watch?v=ZHSegmY5rsM",
    "durationSec": 1324,
    "category": "civ_guide",
    "primaryCivs": [
      "french",
      "sengoku_daimyo"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Sengoku French Knights, Crucible Points, New Map Pools!",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "s2LUxq_E7pE",
    "title": "How To Play Sengoku Daimyo In 2026 | AoE4",
    "url": "https://www.youtube.com/watch?v=s2LUxq_E7pE",
    "durationSec": 1543,
    "category": "civ_guide",
    "primaryCivs": [
      "sengoku_daimyo"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Sengoku Daimyo In 2026 | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "HdlqFpLRkOk",
    "title": "How To Play Ottomans In 2026 | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=HdlqFpLRkOk",
    "durationSec": 1901,
    "category": "civ_guide",
    "primaryCivs": [
      "ottomans"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Ottomans In 2026 | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "TvAOLixs7ik",
    "title": "How To Play Rus In 2026 | AoE4",
    "url": "https://www.youtube.com/watch?v=TvAOLixs7ik",
    "durationSec": 1755,
    "category": "civ_guide",
    "primaryCivs": [
      "rus"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Rus In 2026 | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "XWHfruGPIrM",
    "title": "How To Play Lancaster In 2026 | AoE4",
    "url": "https://www.youtube.com/watch?v=XWHfruGPIrM",
    "durationSec": 1682,
    "category": "match_analysis",
    "primaryCivs": [
      "house_of_lancaster"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Lancaster In 2026 | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "dlTvZ52sw2E",
    "title": "How To Counter Fast Castle With Feudal Aggression | AoE4",
    "url": "https://www.youtube.com/watch?v=dlTvZ52sw2E",
    "durationSec": 1050,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "How To Counter Fast Castle With Feudal Aggression | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "UnHyHX9YQ9Y",
    "title": "How To Play Zhu Xi's Legacy In 2026 | AoE4",
    "url": "https://www.youtube.com/watch?v=UnHyHX9YQ9Y",
    "durationSec": 1775,
    "category": "civ_guide",
    "primaryCivs": [
      "zhu_xis_legacy"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Zhu Xi's Legacy In 2026 | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "xNyOKJOb-qE",
    "title": "How To Play Byzantines In 2026 | AoE4",
    "url": "https://www.youtube.com/watch?v=xNyOKJOb-qE",
    "durationSec": 1436,
    "category": "civ_guide",
    "primaryCivs": [
      "byzantines"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Byzantines In 2026 | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "EKnex4_ESkU",
    "title": "How To Play Chinese In 2026 | AoE4",
    "url": "https://www.youtube.com/watch?v=EKnex4_ESkU",
    "durationSec": 1426,
    "category": "civ_guide",
    "primaryCivs": [
      "chinese"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Chinese In 2026 | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "zlFwOhCfX3M",
    "title": "How To Play Abbasid In 2026 | AoE4",
    "url": "https://www.youtube.com/watch?v=zlFwOhCfX3M",
    "durationSec": 1626,
    "category": "civ_guide",
    "primaryCivs": [
      "abbasid_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Abbasid In 2026 | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "MOhYn-gXPjE",
    "title": "How To Play Japanese In 2026 | AoE4",
    "url": "https://www.youtube.com/watch?v=MOhYn-gXPjE",
    "durationSec": 1947,
    "category": "civ_guide",
    "primaryCivs": [
      "japanese"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Japanese In 2026 | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "t2u-62wAKWU",
    "title": "How To Play Ayyubids In 2026 | AoE4",
    "url": "https://www.youtube.com/watch?v=t2u-62wAKWU",
    "durationSec": 1026,
    "category": "civ_guide",
    "primaryCivs": [
      "ayyubids"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Ayyubids In 2026 | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "ZzZICnaDBsQ",
    "title": "How To Play French In 2026 | AoE4",
    "url": "https://www.youtube.com/watch?v=ZzZICnaDBsQ",
    "durationSec": 1805,
    "category": "civ_guide",
    "primaryCivs": [
      "french"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play French In 2026 | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "ApuGahvKpf0",
    "title": "How To Play Malians In 2026 | AoE4",
    "url": "https://www.youtube.com/watch?v=ApuGahvKpf0",
    "durationSec": 1072,
    "category": "civ_guide",
    "primaryCivs": [
      "malians"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Malians In 2026 | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "YPRL2C_pSoM",
    "title": "How To Play Order of the Dragon In 2026 | AoE4",
    "url": "https://www.youtube.com/watch?v=YPRL2C_pSoM",
    "durationSec": 1390,
    "category": "civ_guide",
    "primaryCivs": [
      "order_of_the_dragon"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Order of the Dragon In 2026 | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "aRkeTDdkd4I",
    "title": "How To Play English In 2026 | AoE4",
    "url": "https://www.youtube.com/watch?v=aRkeTDdkd4I",
    "durationSec": 1553,
    "category": "civ_guide",
    "primaryCivs": [
      "english"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play English In 2026 | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "fjR2DcCNX20",
    "title": "How My Student Outplayed a Top 30 Player",
    "url": "https://www.youtube.com/watch?v=fjR2DcCNX20",
    "durationSec": 1310,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How My Student Outplayed a Top 30 Player",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "zmBtKTCzG10",
    "title": "The GENIUS Behind 1puppypaw’s Feudal Aggro | AoE4",
    "url": "https://www.youtube.com/watch?v=zmBtKTCzG10",
    "durationSec": 1473,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "The GENIUS Behind 1puppypaw’s Feudal Aggro | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "uI1WDaYLfAY",
    "title": "Explaining Every Age of Empires 4 Rank",
    "url": "https://www.youtube.com/watch?v=uI1WDaYLfAY",
    "durationSec": 1873,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Explaining Every Age of Empires 4 Rank",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "tCggRtwb4ZU",
    "title": "AoE’s Biggest Announcement Just Landed",
    "url": "https://www.youtube.com/watch?v=tCggRtwb4ZU",
    "durationSec": 564,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "AoE’s Biggest Announcement Just Landed",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "gg6QpqtAGng",
    "title": "You Are Playing Ottomans Wrong - This Is How | AoE4",
    "url": "https://www.youtube.com/watch?v=gg6QpqtAGng",
    "durationSec": 1175,
    "category": "civ_guide",
    "primaryCivs": [
      "ottomans"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "You Are Playing Ottomans Wrong - This Is How | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "9Y5hsGP00fc",
    "title": "4:15 Rus Pro Scouts w/ 3 Cabins | AoE4",
    "url": "https://www.youtube.com/watch?v=9Y5hsGP00fc",
    "durationSec": 682,
    "category": "civ_guide",
    "primaryCivs": [
      "rus"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "4:15 Rus Pro Scouts w/ 3 Cabins | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "JKpWYtxsr6s",
    "title": "A Game-Saving Patch: Golden Horde Fixed, Crucible Changed, Rus Buff??",
    "url": "https://www.youtube.com/watch?v=JKpWYtxsr6s",
    "durationSec": 1721,
    "category": "tier_list_meta",
    "primaryCivs": [
      "golden_horde",
      "rus"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "A Game-Saving Patch: Golden Horde Fixed, Crucible Changed, Rus Buff??",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "-_1IlcQBJZk",
    "title": "Viewer Request: KT 2TC Vs Fast Castle | AoE4",
    "url": "https://www.youtube.com/watch?v=-_1IlcQBJZk",
    "durationSec": 1038,
    "category": "match_analysis",
    "primaryCivs": [
      "knights_templar"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Viewer Request: KT 2TC Vs Fast Castle | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "_DJ2mz-qkJw",
    "title": "Ranking ALL The Civs From Best To Worst! | AoE4 Tierlist",
    "url": "https://www.youtube.com/watch?v=_DJ2mz-qkJw",
    "durationSec": 1764,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Ranking ALL The Civs From Best To Worst! | AoE4 Tierlist",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "BdCHEXkpe4M",
    "title": "A Guide To Flexible 2TC Templars | Build Order | AoE4",
    "url": "https://www.youtube.com/watch?v=BdCHEXkpe4M",
    "durationSec": 929,
    "category": "build_order",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "A Guide To Flexible 2TC Templars | Build Order | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "6NFCW5YZtrA",
    "title": "Playing Ranked Like A Tournament #1 | AoE4",
    "url": "https://www.youtube.com/watch?v=6NFCW5YZtrA",
    "durationSec": 2357,
    "category": "tier_list_meta",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Playing Ranked Like A Tournament #1 | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "319Cu7-eFXg",
    "title": "The Stealth Forest Is Dark, And Full Of Shinobis",
    "url": "https://www.youtube.com/watch?v=319Cu7-eFXg",
    "durationSec": 1175,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The Stealth Forest Is Dark, And Full Of Shinobis",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "LoonV5VWdAw",
    "title": "This Is My Favourite Map in AoE4 (It's Not Dry Arabia)",
    "url": "https://www.youtube.com/watch?v=LoonV5VWdAw",
    "durationSec": 999,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "This Is My Favourite Map in AoE4 (It's Not Dry Arabia)",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "rA52Fc5Hejc",
    "title": "A Simple Guide To The Current Meta",
    "url": "https://www.youtube.com/watch?v=rA52Fc5Hejc",
    "durationSec": 737,
    "category": "tier_list_meta",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "A Simple Guide To The Current Meta",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "LXOR1Le6ICY",
    "title": "Airing Some Frustrations Around Tournaments And Competition in AoE4",
    "url": "https://www.youtube.com/watch?v=LXOR1Le6ICY",
    "durationSec": 818,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Airing Some Frustrations Around Tournaments And Competition in AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "x8Nge9UV-tg",
    "title": "How To Counter Elephant Healer Cheese | AoE4",
    "url": "https://www.youtube.com/watch?v=x8Nge9UV-tg",
    "durationSec": 1430,
    "category": "mechanics_fundamentals",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Counter Elephant Healer Cheese | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "PjsVXaDCgI0",
    "title": "This Is The Most OP Unit Of The DLC | AoE4",
    "url": "https://www.youtube.com/watch?v=PjsVXaDCgI0",
    "durationSec": 1385,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "This Is The Most OP Unit Of The DLC | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "3WnJ5ywG8GY",
    "title": "They Say Templar Sucks? | AoE4",
    "url": "https://www.youtube.com/watch?v=3WnJ5ywG8GY",
    "durationSec": 1065,
    "category": "civ_guide",
    "primaryCivs": [
      "knights_templar"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "They Say Templar Sucks? | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "Jn620aobMRQ",
    "title": "A Guide To Expert Level Sengoku Daimyo",
    "url": "https://www.youtube.com/watch?v=Jn620aobMRQ",
    "durationSec": 1053,
    "category": "civ_guide",
    "primaryCivs": [
      "sengoku_daimyo"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "A Guide To Expert Level Sengoku Daimyo",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "w_UZ3CYwIQU",
    "title": "So I Stronghold-Rushed My Opponent With Macedonians...",
    "url": "https://www.youtube.com/watch?v=w_UZ3CYwIQU",
    "durationSec": 1988,
    "category": "build_order",
    "primaryCivs": [
      "macedonian_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "So I Stronghold-Rushed My Opponent With Macedonians...",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "zoA922O-HQM",
    "title": "How To Play Macedonians Feudal Aggression | Build Order | AoE4",
    "url": "https://www.youtube.com/watch?v=zoA922O-HQM",
    "durationSec": 885,
    "category": "build_order",
    "primaryCivs": [
      "macedonian_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Macedonians Feudal Aggression | Build Order | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "_Q4DNUyE_y0",
    "title": "The RACECAR Build | Sengoku Daimyo Build Order | AoE4",
    "url": "https://www.youtube.com/watch?v=_Q4DNUyE_y0",
    "durationSec": 1638,
    "category": "build_order",
    "primaryCivs": [
      "sengoku_daimyo"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The RACECAR Build | Sengoku Daimyo Build Order | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "_Lx44T7l7yc",
    "title": "Don’t Get Baited by This New DLC Cheese! | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=_Lx44T7l7yc",
    "durationSec": 707,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Don’t Get Baited by This New DLC Cheese! | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "RVN1fTeb-cQ",
    "title": "Tughlaq Fast Castle | Build Order | AoE4",
    "url": "https://www.youtube.com/watch?v=RVN1fTeb-cQ",
    "durationSec": 1158,
    "category": "match_analysis",
    "primaryCivs": [
      "tughlaq_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Tughlaq Fast Castle | Build Order | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "kl25O2wsfME",
    "title": "Feudal Aggro Guide | Golden Horde | AoE4",
    "url": "https://www.youtube.com/watch?v=kl25O2wsfME",
    "durationSec": 1223,
    "category": "civ_guide",
    "primaryCivs": [
      "golden_horde"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Feudal Aggro Guide | Golden Horde | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "XQJgFtYSJ4o",
    "title": "Brand New Singleplayer Mode: The Crucible | Hardest Difficulty",
    "url": "https://www.youtube.com/watch?v=XQJgFtYSJ4o",
    "durationSec": 2939,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Brand New Singleplayer Mode: The Crucible | Hardest Difficulty",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "xEJ3DBjxu5A",
    "title": "🔴 PATCH: Lancaster Nerfed, China Buffed, Water Reworked??",
    "url": "https://www.youtube.com/watch?v=xEJ3DBjxu5A",
    "durationSec": 1698,
    "category": "match_analysis",
    "primaryCivs": [
      "chinese",
      "house_of_lancaster"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "🔴 PATCH: Lancaster Nerfed, China Buffed, Water Reworked??",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "8NCTsRjYvAk",
    "title": "A Guide To Feudal Fighting | AoE4",
    "url": "https://www.youtube.com/watch?v=8NCTsRjYvAk",
    "durationSec": 941,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "A Guide To Feudal Fighting | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "HKF3h-v3chY",
    "title": "Redbull Wololo Has Returned To AoE4!",
    "url": "https://www.youtube.com/watch?v=HKF3h-v3chY",
    "durationSec": 429,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Redbull Wololo Has Returned To AoE4!",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "oHTZKEavpXw",
    "title": "Wam01 UNLEASHES His Ottomans! | KillerPigeon's Midweek Muster",
    "url": "https://www.youtube.com/watch?v=oHTZKEavpXw",
    "durationSec": 1974,
    "category": "civ_guide",
    "primaryCivs": [
      "ottomans"
    ],
    "opponentCivs": [],
    "proPlayers": [
      "Wam01"
    ],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Wam01 UNLEASHES His Ottomans! | KillerPigeon's Midweek Muster",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "-p0j_MD5ST8",
    "title": "S-TIER JAPAN Strikes Back | KillerPigeon's Midweek Muster",
    "url": "https://www.youtube.com/watch?v=-p0j_MD5ST8",
    "durationSec": 1645,
    "category": "tier_list_meta",
    "primaryCivs": [
      "japanese"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "S-TIER JAPAN Strikes Back | KillerPigeon's Midweek Muster",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "NcIMSb0J_0E",
    "title": "The Mindgames Were NEXT LEVEL | KillerPigeon's Midweek Muster",
    "url": "https://www.youtube.com/watch?v=NcIMSb0J_0E",
    "durationSec": 1956,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The Mindgames Were NEXT LEVEL | KillerPigeon's Midweek Muster",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "T-JS5MFNhL0",
    "title": "How To Defend Vs Lancaster Lord + Hobelar ALL IN | AoE4",
    "url": "https://www.youtube.com/watch?v=T-JS5MFNhL0",
    "durationSec": 1037,
    "category": "match_analysis",
    "primaryCivs": [
      "house_of_lancaster"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "How To Defend Vs Lancaster Lord + Hobelar ALL IN | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "GqRj3NTfiEM",
    "title": "A Very Mechanical Matchup For The French | AoE4",
    "url": "https://www.youtube.com/watch?v=GqRj3NTfiEM",
    "durationSec": 978,
    "category": "mechanics_fundamentals",
    "primaryCivs": [
      "french"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "A Very Mechanical Matchup For The French | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "nfCVfJw2V-k",
    "title": "Devs Need To FIX This Map Bug | AoE4",
    "url": "https://www.youtube.com/watch?v=nfCVfJw2V-k",
    "durationSec": 2548,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Devs Need To FIX This Map Bug | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "mYJroRHJrlw",
    "title": "Deny Resources & Secure Victory | Think Like A Pro | AoE4",
    "url": "https://www.youtube.com/watch?v=mYJroRHJrlw",
    "durationSec": 832,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Deny Resources & Secure Victory | Think Like A Pro | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "BKw5Y6y3aIY",
    "title": "How To Win With Sacred Sites | Think Like A Pro | AoE4",
    "url": "https://www.youtube.com/watch?v=BKw5Y6y3aIY",
    "durationSec": 1114,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Win With Sacred Sites | Think Like A Pro | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "er-nOsjGDuM",
    "title": "I Started Thinking About Ottomans | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=er-nOsjGDuM",
    "durationSec": 886,
    "category": "civ_guide",
    "primaryCivs": [
      "ottomans"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "I Started Thinking About Ottomans | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "dxGDpuG1_7Y",
    "title": "English 2TC Build | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=dxGDpuG1_7Y",
    "durationSec": 1228,
    "category": "build_order",
    "primaryCivs": [
      "english"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "English 2TC Build | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "z1iMtSeXJiU",
    "title": "Lancaster Feudal Aggression Guide | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=z1iMtSeXJiU",
    "durationSec": 897,
    "category": "match_analysis",
    "primaryCivs": [
      "house_of_lancaster"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Lancaster Feudal Aggression Guide | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "0U418OxcQpo",
    "title": "The FINAL Complete AoE4 Tier List For 2025 (PRE-DLC)",
    "url": "https://www.youtube.com/watch?v=0U418OxcQpo",
    "durationSec": 1292,
    "category": "tier_list_meta",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The FINAL Complete AoE4 Tier List For 2025 (PRE-DLC)",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "qdvhDC4wfm0",
    "title": "Master The Delhi Sultanate | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=qdvhDC4wfm0",
    "durationSec": 2047,
    "category": "civ_guide",
    "primaryCivs": [
      "delhi_sultanate"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "Master The Delhi Sultanate | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "2b5KWeUSkjQ",
    "title": "Reaching Top 5 With Delhi – What I Learned",
    "url": "https://www.youtube.com/watch?v=2b5KWeUSkjQ",
    "durationSec": 817,
    "category": "civ_guide",
    "primaryCivs": [
      "delhi_sultanate"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Reaching Top 5 With Delhi – What I Learned",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "jBgIY3Gn29Y",
    "title": "Japanese Strategy Guide + MarineLorD Match",
    "url": "https://www.youtube.com/watch?v=jBgIY3Gn29Y",
    "durationSec": 2044,
    "category": "civ_guide",
    "primaryCivs": [
      "japanese"
    ],
    "opponentCivs": [],
    "proPlayers": [
      "MarineLorD"
    ],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Japanese Strategy Guide + MarineLorD Match",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "xcAQOg5uw7A",
    "title": "The EASIEST Way To Play HRE | Build Order Guide",
    "url": "https://www.youtube.com/watch?v=xcAQOg5uw7A",
    "durationSec": 1918,
    "category": "build_order",
    "primaryCivs": [
      "holy_roman_empire"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The EASIEST Way To Play HRE | Build Order Guide",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "94jhNWzaul0",
    "title": "Full Analysis Of My Qualifying Set Vs IamMagic (the goat)",
    "url": "https://www.youtube.com/watch?v=94jhNWzaul0",
    "durationSec": 3535,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "Full Analysis Of My Qualifying Set Vs IamMagic (the goat)",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "8i45L-vcaKo",
    "title": "I Am Going To The US ",
    "url": "https://www.youtube.com/watch?v=8i45L-vcaKo",
    "durationSec": 209,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "I Am Going To The US ",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "vh1lgs54I_0",
    "title": "A Behind The Scenes Look On Best-Of-3s | AoE4",
    "url": "https://www.youtube.com/watch?v=vh1lgs54I_0",
    "durationSec": 1534,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "A Behind The Scenes Look On Best-Of-3s | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "Fq3piMX2H_s",
    "title": "Is JD The BEST Feudal Civilization? | AoE4",
    "url": "https://www.youtube.com/watch?v=Fq3piMX2H_s",
    "durationSec": 1231,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Is JD The BEST Feudal Civilization? | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "q985fe_38rQ",
    "title": "The Golden Horde Is The New Zerg. Period.",
    "url": "https://www.youtube.com/watch?v=q985fe_38rQ",
    "durationSec": 887,
    "category": "civ_guide",
    "primaryCivs": [
      "golden_horde"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The Golden Horde Is The New Zerg. Period.",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "4VFx_I2EfuM",
    "title": "The Tughlaq Get Technologies INSTANTLY?",
    "url": "https://www.youtube.com/watch?v=4VFx_I2EfuM",
    "durationSec": 1081,
    "category": "civ_guide",
    "primaryCivs": [
      "tughlaq_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The Tughlaq Get Technologies INSTANTLY?",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "Jl-3iwLOorE",
    "title": "🔴GAMEPLAY REVEALED: Crucible & Golden Horde In More Detail!",
    "url": "https://www.youtube.com/watch?v=Jl-3iwLOorE",
    "durationSec": 1354,
    "category": "match_analysis",
    "primaryCivs": [
      "golden_horde"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "🔴GAMEPLAY REVEALED: Crucible & Golden Horde In More Detail!",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "TeVitUDOcAo",
    "title": "The Sengoku Daimyo Clan System Looks OP",
    "url": "https://www.youtube.com/watch?v=TeVitUDOcAo",
    "durationSec": 1463,
    "category": "civ_guide",
    "primaryCivs": [
      "sengoku_daimyo"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The Sengoku Daimyo Clan System Looks OP",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "p5RFUH5Gl0U",
    "title": "The Macedonian Dynasty Brings VIKINGS",
    "url": "https://www.youtube.com/watch?v=p5RFUH5Gl0U",
    "durationSec": 933,
    "category": "civ_guide",
    "primaryCivs": [
      "macedonian_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The Macedonian Dynasty Brings VIKINGS",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "6nBJ-TVNFWk",
    "title": "🔴NEW DLC: 4 New Civilizations, Crucible, 6 Biomes & 8 Maps & MORE",
    "url": "https://www.youtube.com/watch?v=6nBJ-TVNFWk",
    "durationSec": 1137,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "🔴NEW DLC: 4 New Civilizations, Crucible, 6 Biomes & 8 Maps & MORE",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "XBXtdLGhG6E",
    "title": "The Most TOXIC Mechanic In AoE4?",
    "url": "https://www.youtube.com/watch?v=XBXtdLGhG6E",
    "durationSec": 1260,
    "category": "mechanics_fundamentals",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The Most TOXIC Mechanic In AoE4?",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "50E31vVHkQc",
    "title": "This Rus Knight Strategy Is UNSTOPPABLE | AoE4",
    "url": "https://www.youtube.com/watch?v=50E31vVHkQc",
    "durationSec": 1073,
    "category": "civ_guide",
    "primaryCivs": [
      "rus"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "This Rus Knight Strategy Is UNSTOPPABLE | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "k52lOE0-ZjU",
    "title": "The Keep + Siege All In | AoE4",
    "url": "https://www.youtube.com/watch?v=k52lOE0-ZjU",
    "durationSec": 1089,
    "category": "build_order",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "The Keep + Siege All In | AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "SS_Vaz60ufw",
    "title": "Is Knights Templar The Most Fun Civ In AoE4?",
    "url": "https://www.youtube.com/watch?v=SS_Vaz60ufw",
    "durationSec": 1139,
    "category": "civ_guide",
    "primaryCivs": [
      "knights_templar"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Is Knights Templar The Most Fun Civ In AoE4?",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "oDm7Deb-W7Q",
    "title": "A Guide To Resource Denial & Army Movement",
    "url": "https://www.youtube.com/watch?v=oDm7Deb-W7Q",
    "durationSec": 1027,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "A Guide To Resource Denial & Army Movement",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "r7WipMnWv70",
    "title": "How I Think About Blacksmith Upgrades in AoE4",
    "url": "https://www.youtube.com/watch?v=r7WipMnWv70",
    "durationSec": 916,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How I Think About Blacksmith Upgrades in AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "3O6hEgcD6j0",
    "title": "Byzantines Are PEAKING Right Now",
    "url": "https://www.youtube.com/watch?v=3O6hEgcD6j0",
    "durationSec": 1451,
    "category": "civ_guide",
    "primaryCivs": [
      "byzantines"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Byzantines Are PEAKING Right Now",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "HykY_XEhN3E",
    "title": "This BUSTED Chinese Build Is Taking Over Ladder... | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=HykY_XEhN3E",
    "durationSec": 829,
    "category": "build_order",
    "primaryCivs": [
      "chinese"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "This BUSTED Chinese Build Is Taking Over Ladder... | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "7uSwrA01pX4",
    "title": "This Trip Changed Esport For Me",
    "url": "https://www.youtube.com/watch?v=7uSwrA01pX4",
    "durationSec": 609,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "This Trip Changed Esport For Me",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "60KgzjtsJjE",
    "title": "World Best LoueMT’s Malians Explained (with build order) | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=60KgzjtsJjE",
    "durationSec": 1306,
    "category": "build_order",
    "primaryCivs": [
      "malians"
    ],
    "opponentCivs": [],
    "proPlayers": [
      "LoueMT"
    ],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "World Best LoueMT’s Malians Explained (with build order) | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "MHE2snLFvJ0",
    "title": "Playstyle Guide: Aggressive | Think Like A Pro",
    "url": "https://www.youtube.com/watch?v=MHE2snLFvJ0",
    "durationSec": 1708,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Playstyle Guide: Aggressive | Think Like A Pro",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "H6ZzLknklA4",
    "title": "A Pro Guide To Scouting & Sheep | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=H6ZzLknklA4",
    "durationSec": 1123,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "A Pro Guide To Scouting & Sheep | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "dnZ-7XY7Vss",
    "title": "French Guide: Marinelord’s Pro Scout Build in EGC Semi-Finals",
    "url": "https://www.youtube.com/watch?v=dnZ-7XY7Vss",
    "durationSec": 1376,
    "category": "build_order",
    "primaryCivs": [
      "french"
    ],
    "opponentCivs": [],
    "proPlayers": [
      "MarineLorD"
    ],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "French Guide: Marinelord’s Pro Scout Build in EGC Semi-Finals",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "yJk8MgEDRUE",
    "title": "English Fast Castle: The Build No One Expected Would Return",
    "url": "https://www.youtube.com/watch?v=yJk8MgEDRUE",
    "durationSec": 1746,
    "category": "match_analysis",
    "primaryCivs": [
      "english"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "English Fast Castle: The Build No One Expected Would Return",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "mJAYYxsuDyI",
    "title": "Don't Make ThIs CRUCIAL Mistake | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=mJAYYxsuDyI",
    "durationSec": 768,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "Don't Make ThIs CRUCIAL Mistake | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "apUNQjG9wTs",
    "title": "You’re Playing HRE Wrong - Here’s the Fix",
    "url": "https://www.youtube.com/watch?v=apUNQjG9wTs",
    "durationSec": 1948,
    "category": "civ_guide",
    "primaryCivs": [
      "holy_roman_empire"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "You’re Playing HRE Wrong - Here’s the Fix",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "XAtJpkODSdc",
    "title": "The BEST Civs In Season 11 | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=XAtJpkODSdc",
    "durationSec": 1949,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The BEST Civs In Season 11 | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "fUg68vVhfm8",
    "title": "I Didn't Lose A Single Game In This Tournament",
    "url": "https://www.youtube.com/watch?v=fUg68vVhfm8",
    "durationSec": 1572,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "I Didn't Lose A Single Game In This Tournament",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "rhtprKmzTag",
    "title": "The New Deer Meta Explained – Everything You Need to Know",
    "url": "https://www.youtube.com/watch?v=rhtprKmzTag",
    "durationSec": 645,
    "category": "tier_list_meta",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The New Deer Meta Explained – Everything You Need to Know",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "zBSyAmfzNs8",
    "title": "The New 2TC Opener For Abbasid Dynasty | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=zBSyAmfzNs8",
    "durationSec": 958,
    "category": "build_order",
    "primaryCivs": [
      "abbasid_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The New 2TC Opener For Abbasid Dynasty | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "0RY_hXwa80s",
    "title": "Quick Guide To The 5 New Ranked Maps (Season 11)",
    "url": "https://www.youtube.com/watch?v=0RY_hXwa80s",
    "durationSec": 2237,
    "category": "tier_list_meta",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Quick Guide To The 5 New Ranked Maps (Season 11)",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "Dz7txyqukxU",
    "title": "How I Went 2-1 Against EL.CsOH | Full Analysis | EGC Masters Summer | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=Dz7txyqukxU",
    "durationSec": 2293,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "How I Went 2-1 Against EL.CsOH | Full Analysis | EGC Masters Summer | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "om1Mqx3EeYs",
    "title": "🔴PATCH: Deer Pushing DELETED, English Farms Buffed, HRE NERF & More..!",
    "url": "https://www.youtube.com/watch?v=om1Mqx3EeYs",
    "durationSec": 1534,
    "category": "tier_list_meta",
    "primaryCivs": [
      "english",
      "holy_roman_empire"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "🔴PATCH: Deer Pushing DELETED, English Farms Buffed, HRE NERF & More..!",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "2CafuCce0Ak",
    "title": "Templar Imperial Age Guide | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=2CafuCce0Ak",
    "durationSec": 541,
    "category": "civ_guide",
    "primaryCivs": [
      "knights_templar"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Templar Imperial Age Guide | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "ZKlTnl6SaA4",
    "title": "I Qualified For My Biggest Tournament Yet! – Full Set Analysis With @Don_Artie",
    "url": "https://www.youtube.com/watch?v=ZKlTnl6SaA4",
    "durationSec": 4825,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "I Qualified For My Biggest Tournament Yet! – Full Set Analysis With @Don_Artie",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "c04SZIs2aIM",
    "title": "The New Lancaster Meta | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=c04SZIs2aIM",
    "durationSec": 1557,
    "category": "match_analysis",
    "primaryCivs": [
      "house_of_lancaster"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The New Lancaster Meta | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "UxT7J9z7RsQ",
    "title": "How To Play Rus Feudal Aggression | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=UxT7J9z7RsQ",
    "durationSec": 1217,
    "category": "civ_guide",
    "primaryCivs": [
      "rus"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Rus Feudal Aggression | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "tBal-k9Lbu0",
    "title": "AoE4 Newsletter: EGC Summer, Community Tournaments, CPH LAN! | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=tBal-k9Lbu0",
    "durationSec": 668,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "AoE4 Newsletter: EGC Summer, Community Tournaments, CPH LAN! | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "abyG0TkgGZg",
    "title": "Controlling All 4 Ponds On Four Lakes | Vs Wam01 | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=abyG0TkgGZg",
    "durationSec": 1252,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [
      "Wam01"
    ],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Controlling All 4 Ponds On Four Lakes | Vs Wam01 | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "Mouf92faALA",
    "title": "6:30 Sacred Sites Capture With Full Units | Pro Build Order Guide | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=Mouf92faALA",
    "durationSec": 870,
    "category": "build_order",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "6:30 Sacred Sites Capture With Full Units | Pro Build Order Guide | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "D82S4eRC4dk",
    "title": "Byzantines Feudal All-In | Build Order Guide | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=D82S4eRC4dk",
    "durationSec": 831,
    "category": "build_order",
    "primaryCivs": [
      "byzantines"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Byzantines Feudal All-In | Build Order Guide | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "R5U4NtslYQ4",
    "title": "AoE4 Newsletter: Last MoS Qualifier, EGC Masters Summer & More!",
    "url": "https://www.youtube.com/watch?v=R5U4NtslYQ4",
    "durationSec": 520,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "AoE4 Newsletter: Last MoS Qualifier, EGC Masters Summer & More!",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "rekGkhnYaRA",
    "title": "The Story of Core’s Landsknechts | Unhinged Team Games | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=rekGkhnYaRA",
    "durationSec": 1797,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The Story of Core’s Landsknechts | Unhinged Team Games | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "aVCdd64JQWs",
    "title": "Chinese Pro Scouts | Pro Build Order Guide | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=aVCdd64JQWs",
    "durationSec": 1077,
    "category": "build_order",
    "primaryCivs": [
      "chinese"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "Chinese Pro Scouts | Pro Build Order Guide | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "Jwx68z5GhWg",
    "title": "Art Of War - Full Gold Playthrough | New Player Guides | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=Jwx68z5GhWg",
    "durationSec": 2039,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Art Of War - Full Gold Playthrough | New Player Guides | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "HvgzKgiAWtk",
    "title": "Playstyle Guide: Defensive 🐢 | Think Like A Pro | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=HvgzKgiAWtk",
    "durationSec": 1786,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Playstyle Guide: Defensive 🐢 | Think Like A Pro | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "4DXaCfXu7-I",
    "title": "Lancaster Castle Rush | Pro Build Order Guide | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=4DXaCfXu7-I",
    "durationSec": 696,
    "category": "match_analysis",
    "primaryCivs": [
      "house_of_lancaster"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "Lancaster Castle Rush | Pro Build Order Guide | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "84ulAJLWRu8",
    "title": "Basics Of Early-Game Base Building: English, HRE & French | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=84ulAJLWRu8",
    "durationSec": 1129,
    "category": "build_order",
    "primaryCivs": [
      "english",
      "french",
      "holy_roman_empire"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Basics Of Early-Game Base Building: English, HRE & French | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "BYMmfpgD-LE",
    "title": "How I Prepare A Student For A Tournament Match | Paid Membership Video",
    "url": "https://www.youtube.com/watch?v=BYMmfpgD-LE",
    "durationSec": 1535,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "How I Prepare A Student For A Tournament Match | Paid Membership Video",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "pErB2qhG3qs",
    "title": "The Secret Details Behind Baltune & EL.CsOH’s Wins | Pro Watch | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=pErB2qhG3qs",
    "durationSec": 978,
    "category": "mechanics_fundamentals",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The Secret Details Behind Baltune & EL.CsOH’s Wins | Pro Watch | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "urtZe9gj4VY",
    "title": "A Full Guide To Playing Enlightened Horizon in AoE4 | Paid Membership Video",
    "url": "https://www.youtube.com/watch?v=urtZe9gj4VY",
    "durationSec": 1249,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "A Full Guide To Playing Enlightened Horizon in AoE4 | Paid Membership Video",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "i4AvS7rUl0c",
    "title": "Quick Patch Rundown: Xbows Fixed, New Mappool and more! | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=i4AvS7rUl0c",
    "durationSec": 296,
    "category": "tier_list_meta",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Quick Patch Rundown: Xbows Fixed, New Mappool and more! | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "algLfHZ-MIw",
    "title": "Templar Castle Age-ups Guide | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=algLfHZ-MIw",
    "durationSec": 522,
    "category": "match_analysis",
    "primaryCivs": [
      "knights_templar"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Templar Castle Age-ups Guide | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "JWp58JlUwQ8",
    "title": "A Guide To The Deer Meta | Paid Membership Video",
    "url": "https://www.youtube.com/watch?v=JWp58JlUwQ8",
    "durationSec": 561,
    "category": "tier_list_meta",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "A Guide To The Deer Meta | Paid Membership Video",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "yqf-_YOFc8U",
    "title": "7 Tips & Tricks To Get Faster At AoE4",
    "url": "https://www.youtube.com/watch?v=yqf-_YOFc8U",
    "durationSec": 878,
    "category": "mechanics_fundamentals",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "7 Tips & Tricks To Get Faster At AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "KKO8DE9HcPU",
    "title": "I Am Serious About This",
    "url": "https://www.youtube.com/watch?v=KKO8DE9HcPU",
    "durationSec": 476,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "I Am Serious About This",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "xC0d-PBKNKU",
    "title": "A Guide To Trading Units & Tempo | Paid Membership Video",
    "url": "https://www.youtube.com/watch?v=xC0d-PBKNKU",
    "durationSec": 1545,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "members_only",
    "snippetsCount": 0,
    "summary": "A Guide To Trading Units & Tempo | Paid Membership Video",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "r7nk8M06w4E",
    "title": "5 SIMPLE Changes to Fix Your Macro | Think Like A Pro | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=r7nk8M06w4E",
    "durationSec": 1057,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "5 SIMPLE Changes to Fix Your Macro | Think Like A Pro | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "wQJYScB25zw",
    "title": "Best 1v1 Civilizations For Land Maps (Season 10) | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=wQJYScB25zw",
    "durationSec": 2101,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Best 1v1 Civilizations For Land Maps (Season 10) | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "Bh5l7wrmsMc",
    "title": "🔴NEW PATCH: House Of Lancaster F-tier now? Civ Changes, New Hotkeys, Balance Changes!",
    "url": "https://www.youtube.com/watch?v=Bh5l7wrmsMc",
    "durationSec": 1465,
    "category": "match_analysis",
    "primaryCivs": [
      "house_of_lancaster"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "🔴NEW PATCH: House Of Lancaster F-tier now? Civ Changes, New Hotkeys, Balance Changes!",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "NhdYvPdPYm0",
    "title": "Tips For Winning More Consistently | Think Like A Pro |  Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=NhdYvPdPYm0",
    "durationSec": 1412,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Tips For Winning More Consistently | Think Like A Pro |  Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "EXOEVvHhh14",
    "title": "How to Use Feudal Commanderies Like a Pro | Templar Guide AoE4",
    "url": "https://www.youtube.com/watch?v=EXOEVvHhh14",
    "durationSec": 462,
    "category": "civ_guide",
    "primaryCivs": [
      "knights_templar"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How to Use Feudal Commanderies Like a Pro | Templar Guide AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "lzRbefWfvd0",
    "title": "The New Opener For Byzantines | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=lzRbefWfvd0",
    "durationSec": 739,
    "category": "civ_guide",
    "primaryCivs": [
      "byzantines"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The New Opener For Byzantines | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "9X8gr4VWOYc",
    "title": "Emergency Hotfix For Lancasters! Is It Enough? - AoE4",
    "url": "https://www.youtube.com/watch?v=9X8gr4VWOYc",
    "durationSec": 636,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Emergency Hotfix For Lancasters! Is It Enough? - AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "Hk0EvBkJUAs",
    "title": "How To Play Templar Feudal Aggression | Build Order | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=Hk0EvBkJUAs",
    "durationSec": 990,
    "category": "build_order",
    "primaryCivs": [
      "knights_templar"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Templar Feudal Aggression | Build Order | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "KcC6PNT0C4s",
    "title": "The Demilancer Fast Castle Build Order Guide | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=KcC6PNT0C4s",
    "durationSec": 1324,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The Demilancer Fast Castle Build Order Guide | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "p7GbKY9ECZ4",
    "title": "A First Look At All New DLC Maps | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=p7GbKY9ECZ4",
    "durationSec": 1856,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "A First Look At All New DLC Maps | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "6p5skdQhYuo",
    "title": "The 7:00 3 Manor Fast Castle | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=6p5skdQhYuo",
    "durationSec": 1870,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The 7:00 3 Manor Fast Castle | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "8FR6tHUCmiU",
    "title": "New Templar Gameplay On Relic River! | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=8FR6tHUCmiU",
    "durationSec": 2264,
    "category": "match_analysis",
    "primaryCivs": [
      "knights_templar"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "New Templar Gameplay On Relic River! | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "BA6BXctUgec",
    "title": "The Knights Templar Have 27 Different Age-up Combinations! | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=BA6BXctUgec",
    "durationSec": 2180,
    "category": "civ_guide",
    "primaryCivs": [
      "knights_templar"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The Knights Templar Have 27 Different Age-up Combinations! | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "bk0yfisJxmw",
    "title": "The Ultimate Noob Civ? House of Lancaster Walkthrough | Age Of Empires 4",
    "url": "https://www.youtube.com/watch?v=bk0yfisJxmw",
    "durationSec": 2450,
    "category": "match_analysis",
    "primaryCivs": [
      "house_of_lancaster"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The Ultimate Noob Civ? House of Lancaster Walkthrough | Age Of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "cMR2LYr3zqc",
    "title": "🔴 New DLC Patch FINALLY Drops! Is The Game Perfect Now?",
    "url": "https://www.youtube.com/watch?v=cMR2LYr3zqc",
    "durationSec": 2463,
    "category": "tier_list_meta",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "🔴 New DLC Patch FINALLY Drops! Is The Game Perfect Now?",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "wG5vdvKNxns",
    "title": "Testing My Micro Skills in AoE4 | Micro Challenge 3.0 | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=wG5vdvKNxns",
    "durationSec": 842,
    "category": "mechanics_fundamentals",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Testing My Micro Skills in AoE4 | Micro Challenge 3.0 | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "DlK8Z0y_IDY",
    "title": "3 Ayyubids Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=DlK8Z0y_IDY",
    "durationSec": 1230,
    "category": "build_order",
    "primaryCivs": [
      "ayyubids"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "3 Ayyubids Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "f1kGeAb1SZo",
    "title": "Elazer Hates Siege (Spoiler: I Love Siege) | Conqueror Coaching | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=f1kGeAb1SZo",
    "durationSec": 2452,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Elazer Hates Siege (Spoiler: I Love Siege) | Conqueror Coaching | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "kuPpOiNBkA0",
    "title": "A Guide To Comebacks | Think Like A Pro | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=kuPpOiNBkA0",
    "durationSec": 1100,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "A Guide To Comebacks | Think Like A Pro | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "CgXiCxE7woo",
    "title": "Elazer's Burgrave MAA Spam Was Beautiful | Conqueror Coaching | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=CgXiCxE7woo",
    "durationSec": 1177,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Elazer's Burgrave MAA Spam Was Beautiful | Conqueror Coaching | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "AvVFb0z5I-c",
    "title": "3 Zhu Xi's Legacy Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=AvVFb0z5I-c",
    "durationSec": 1501,
    "category": "build_order",
    "primaryCivs": [
      "zhu_xis_legacy"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "3 Zhu Xi's Legacy Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "OVJGeMKOpdw",
    "title": "Teaching Elazer The Art Of The Spear Rush | Conqueror Coaching | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=OVJGeMKOpdw",
    "durationSec": 1252,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Teaching Elazer The Art Of The Spear Rush | Conqueror Coaching | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "iRtuEJtEnmw",
    "title": "Valdemar vs BOIIIIII | KPMM #18 Tournament | Bo3 | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=iRtuEJtEnmw",
    "durationSec": 2695,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Valdemar vs BOIIIIII | KPMM #18 Tournament | Bo3 | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "TGitIITj8Ds",
    "title": "Elazer’s First Fast Imperial Game | Conqueror Coaching | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=TGitIITj8Ds",
    "durationSec": 1307,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Elazer’s First Fast Imperial Game | Conqueror Coaching | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "8B1l5O4hfhw",
    "title": "3 Jeanne D'arc Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=8B1l5O4hfhw",
    "durationSec": 1983,
    "category": "build_order",
    "primaryCivs": [
      "jeanne_darc"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "3 Jeanne D'arc Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "ltcUg37JJaw",
    "title": "Getting Feudal All-inned By Rank 1 | S9 Gameplay | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=ltcUg37JJaw",
    "durationSec": 1134,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Getting Feudal All-inned By Rank 1 | S9 Gameplay | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "3w8Mx9KSA-w",
    "title": "What Happens After Pro Scouts? | Platinum Coaching | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=3w8Mx9KSA-w",
    "durationSec": 1847,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "What Happens After Pro Scouts? | Platinum Coaching | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "MseArepINkE",
    "title": "🔴NEW AOE4 DLC INFO: Templars, Variant Civs, Singleplayer!",
    "url": "https://www.youtube.com/watch?v=MseArepINkE",
    "durationSec": 685,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "🔴NEW AOE4 DLC INFO: Templars, Variant Civs, Singleplayer!",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "EJ8A15MUrlw",
    "title": "NONO, This Is How To Play Pro Scouts! | Platinum Coaching | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=EJ8A15MUrlw",
    "durationSec": 2820,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "NONO, This Is How To Play Pro Scouts! | Platinum Coaching | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "CH6d2PXg87g",
    "title": "3 OOTD Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=CH6d2PXg87g",
    "durationSec": 1514,
    "category": "build_order",
    "primaryCivs": [
      "order_of_the_dragon"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "3 OOTD Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "iCYblxemwVg",
    "title": "3 Byzantines Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=iCYblxemwVg",
    "durationSec": 1767,
    "category": "build_order",
    "primaryCivs": [
      "byzantines"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "3 Byzantines Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "Y9UZ5kOmLoE",
    "title": "3 Japanese Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=Y9UZ5kOmLoE",
    "durationSec": 1728,
    "category": "build_order",
    "primaryCivs": [
      "japanese"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "3 Japanese Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "vAED5WoOsQM",
    "title": "🔴NEW AOE4 LIVE PATCH - Rundown Of All Changes!",
    "url": "https://www.youtube.com/watch?v=vAED5WoOsQM",
    "durationSec": 1097,
    "category": "tier_list_meta",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "🔴NEW AOE4 LIVE PATCH - Rundown Of All Changes!",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "Y4uiY9s53yk",
    "title": "3 Malians Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=Y4uiY9s53yk",
    "durationSec": 1675,
    "category": "build_order",
    "primaryCivs": [
      "malians"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "3 Malians Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "tZWZVwb98cw",
    "title": "3 Ottomans Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=tZWZVwb98cw",
    "durationSec": 1746,
    "category": "build_order",
    "primaryCivs": [
      "ottomans"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "3 Ottomans Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "CXayKjqsblk",
    "title": "3 Delhi Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=CXayKjqsblk",
    "durationSec": 2589,
    "category": "build_order",
    "primaryCivs": [
      "delhi_sultanate"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "3 Delhi Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "VNQkjrJxVVY",
    "title": "3 French Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=VNQkjrJxVVY",
    "durationSec": 1682,
    "category": "build_order",
    "primaryCivs": [
      "french"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "3 French Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "a_vx9ko5BCw",
    "title": "3 Rus Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=a_vx9ko5BCw",
    "durationSec": 1763,
    "category": "build_order",
    "primaryCivs": [
      "rus"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "3 Rus Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "5hKniqiZaL4",
    "title": "3 Mongol Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=5hKniqiZaL4",
    "durationSec": 1622,
    "category": "build_order",
    "primaryCivs": [
      "mongols"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "3 Mongol Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "2hEeHjwWkow",
    "title": "3 Chinese Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=2hEeHjwWkow",
    "durationSec": 1521,
    "category": "build_order",
    "primaryCivs": [
      "chinese"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "3 Chinese Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "TWlaj7MsPpU",
    "title": "3 HRE Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=TWlaj7MsPpU",
    "durationSec": 1604,
    "category": "build_order",
    "primaryCivs": [
      "holy_roman_empire"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "3 HRE Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "NxUpmN3Fqdk",
    "title": "3 Abbasid Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=NxUpmN3Fqdk",
    "durationSec": 1406,
    "category": "build_order",
    "primaryCivs": [
      "abbasid_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "3 Abbasid Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "DK8KDAJQxf4",
    "title": "3 English Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=DK8KDAJQxf4",
    "durationSec": 1527,
    "category": "build_order",
    "primaryCivs": [
      "english"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "3 English Build Orders ALL Players Should Know | S9 Meta Builds | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "RSpGG4O9Wy8",
    "title": "Testing Out A New Byz Strategy | S9 Gameplay | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=RSpGG4O9Wy8",
    "durationSec": 1468,
    "category": "match_analysis",
    "primaryCivs": [
      "byzantines"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Testing Out A New Byz Strategy | S9 Gameplay | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "jV4N6IGHamE",
    "title": "This Is Why Conqueror 3 Is Hard To Achieve... | Pro Analysis | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=jV4N6IGHamE",
    "durationSec": 1896,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "This Is Why Conqueror 3 Is Hard To Achieve... | Pro Analysis | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "1pZK9JeQDXU",
    "title": "Are Cataphracts A Mistake? | S9 Gameplay | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=1pZK9JeQDXU",
    "durationSec": 1389,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Are Cataphracts A Mistake? | S9 Gameplay | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "cNyEnox9HzY",
    "title": "French Economy Is Insane... | S9 Gameplay | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=cNyEnox9HzY",
    "durationSec": 1125,
    "category": "match_analysis",
    "primaryCivs": [
      "french"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "French Economy Is Insane... | S9 Gameplay | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "Pl4yJhyoqHM",
    "title": "Is Malian Lategame Viable? | S9 Gameplay | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=Pl4yJhyoqHM",
    "durationSec": 1603,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Is Malian Lategame Viable? | S9 Gameplay | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "Z2mJ_2rUHP0",
    "title": "This Is Why Delhi Is S-Tier | S9 Gameplay | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=Z2mJ_2rUHP0",
    "durationSec": 1504,
    "category": "match_analysis",
    "primaryCivs": [
      "delhi_sultanate"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "This Is Why Delhi Is S-Tier | S9 Gameplay | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "ErWjntSJ9Fk",
    "title": "Delhi Fast Imperial | S9 Meta Builds | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=ErWjntSJ9Fk",
    "durationSec": 1109,
    "category": "build_order",
    "primaryCivs": [
      "delhi_sultanate"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Delhi Fast Imperial | S9 Meta Builds | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "XsQ0zrLl8yY",
    "title": "I Read Him Like A Book | S9 Gameplay | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=XsQ0zrLl8yY",
    "durationSec": 933,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "I Read Him Like A Book | S9 Gameplay | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "Ii3AcjWyH8M",
    "title": "Horse Archers Are Questionable... | S9 Gameplay | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=Ii3AcjWyH8M",
    "durationSec": 1430,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Horse Archers Are Questionable... | S9 Gameplay | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "wHJ0dfgwb0A",
    "title": "Rus FC Horse Archers | S9 Meta Builds | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=wHJ0dfgwb0A",
    "durationSec": 768,
    "category": "build_order",
    "primaryCivs": [
      "rus"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Rus FC Horse Archers | S9 Meta Builds | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "iaH7xDSecZA",
    "title": "My Old Coach Chose His Best Civ | S9 Gameplay | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=iaH7xDSecZA",
    "durationSec": 2351,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "My Old Coach Chose His Best Civ | S9 Gameplay | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "O9xMAGz9ai4",
    "title": "This Unit Needs To Be Nerfed (Again) | S9 Gameplay | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=O9xMAGz9ai4",
    "durationSec": 2407,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "This Unit Needs To Be Nerfed (Again) | S9 Gameplay | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "S9P3AbpAZ78",
    "title": "Decision-Making Guide | Think Like A Pro | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=S9P3AbpAZ78",
    "durationSec": 1180,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Decision-Making Guide | Think Like A Pro | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "79HHIqGlD34",
    "title": "How To Play Four Lakes | S9 Map Guide | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=79HHIqGlD34",
    "durationSec": 1672,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Four Lakes | S9 Map Guide | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "wk2Pzb4VkYY",
    "title": "This Tactic Still Works? | S9 Gameplay | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=wk2Pzb4VkYY",
    "durationSec": 2001,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "This Tactic Still Works? | S9 Gameplay | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "QlU0QS6DjIA",
    "title": "This Unit Has No Counter... | S9 Gameplay | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=QlU0QS6DjIA",
    "durationSec": 2201,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "This Unit Has No Counter... | S9 Gameplay | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "r6wqA2GW07A",
    "title": "How To Play Nagari | S9 Map Guide | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=r6wqA2GW07A",
    "durationSec": 785,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Nagari | S9 Map Guide | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "vWBTD4qMTnk",
    "title": "A New Late-Game Without Siege? | S9 Gameplay | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=vWBTD4qMTnk",
    "durationSec": 2043,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "A New Late-Game Without Siege? | S9 Gameplay | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "6vKafKBLcHw",
    "title": "A Guide To Winning VS Abbasid Dynasty | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=6vKafKBLcHw",
    "durationSec": 1233,
    "category": "match_analysis",
    "primaryCivs": [
      "abbasid_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "A Guide To Winning VS Abbasid Dynasty | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "yaCsijvYIWM",
    "title": "Delhi Dome Of Faith Tempo Build Order | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=yaCsijvYIWM",
    "durationSec": 1011,
    "category": "build_order",
    "primaryCivs": [
      "delhi_sultanate"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Delhi Dome Of Faith Tempo Build Order | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "i_6TdgX-USM",
    "title": "OOTD Dark Age Rush | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=i_6TdgX-USM",
    "durationSec": 1059,
    "category": "build_order",
    "primaryCivs": [
      "order_of_the_dragon"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "OOTD Dark Age Rush | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "0_DcTxTqB7I",
    "title": "Japanese Fast Castle (Optimized) | Build Order Guide | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=0_DcTxTqB7I",
    "durationSec": 1008,
    "category": "match_analysis",
    "primaryCivs": [
      "japanese"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Japanese Fast Castle (Optimized) | Build Order Guide | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "_Issj-iqg_U",
    "title": "5 Best Changes For Season 9 | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=_Issj-iqg_U",
    "durationSec": 391,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "5 Best Changes For Season 9 | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "fXUmrfc5Z64",
    "title": "The Chinese Feudal Tax All-In | Build Order | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=fXUmrfc5Z64",
    "durationSec": 789,
    "category": "build_order",
    "primaryCivs": [
      "chinese"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The Chinese Feudal Tax All-In | Build Order | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "s9JLcpQgZFM",
    "title": "This Meta-Change Is Everything | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=s9JLcpQgZFM",
    "durationSec": 756,
    "category": "tier_list_meta",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "This Meta-Change Is Everything | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "MUrrmmNPZu8",
    "title": "Beating RANK 1 with Live Keyboard POV! | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=MUrrmmNPZu8",
    "durationSec": 1082,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Beating RANK 1 with Live Keyboard POV! | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "42OQv5tSao4",
    "title": "ALL SETTINGS & HOTKEYS you will EVER need | Age of Empires 4",
    "url": "https://www.youtube.com/watch?v=42OQv5tSao4",
    "durationSec": 972,
    "category": "mechanics_fundamentals",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "ALL SETTINGS & HOTKEYS you will EVER need | Age of Empires 4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "eBUmflf51Tc",
    "title": "Let's Talk About Adaptation In AoE4 | Valdemar",
    "url": "https://www.youtube.com/watch?v=eBUmflf51Tc",
    "durationSec": 1398,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Let's Talk About Adaptation In AoE4 | Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "3s8aQkTCExQ",
    "title": "Top 5 Economy Tips You Might Not Know About | Valdemar",
    "url": "https://www.youtube.com/watch?v=3s8aQkTCExQ",
    "durationSec": 764,
    "category": "mechanics_fundamentals",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Top 5 Economy Tips You Might Not Know About | Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "JruHoQtljBo",
    "title": "Test Your AoE4 Skills | Pro Analysis W/ @Don_Artie | Valdemar",
    "url": "https://www.youtube.com/watch?v=JruHoQtljBo",
    "durationSec": 2032,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Test Your AoE4 Skills | Pro Analysis W/ @Don_Artie | Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "VuNkmanCX-k",
    "title": "Rus 1TC Aggression Guide | Build Order Guides | Valdemar",
    "url": "https://www.youtube.com/watch?v=VuNkmanCX-k",
    "durationSec": 1051,
    "category": "build_order",
    "primaryCivs": [
      "rus"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Rus 1TC Aggression Guide | Build Order Guides | Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "lsHZUK9CuD0",
    "title": "🔴PATCH OUT: Bounty Rework, New Units & more BIG CHANGES",
    "url": "https://www.youtube.com/watch?v=lsHZUK9CuD0",
    "durationSec": 2244,
    "category": "tier_list_meta",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "🔴PATCH OUT: Bounty Rework, New Units & more BIG CHANGES",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "YxAbNDqIY1Y",
    "title": "Rus Water Rush | Build Order Guides | Valdemar",
    "url": "https://www.youtube.com/watch?v=YxAbNDqIY1Y",
    "durationSec": 1029,
    "category": "build_order",
    "primaryCivs": [
      "rus"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Rus Water Rush | Build Order Guides | Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "B4PWqR3_Vhc",
    "title": "Why Gold Players Die To Early Aggression | Pro Analysis W/  @Don_Artie   | Valdemar",
    "url": "https://www.youtube.com/watch?v=B4PWqR3_Vhc",
    "durationSec": 1339,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Why Gold Players Die To Early Aggression | Pro Analysis W/  @Don_Artie   | Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "cjS4urKp5sA",
    "title": "How To Get Out Of Gold League | Pro Analysis W/ @Don Artie  | Valdemar",
    "url": "https://www.youtube.com/watch?v=cjS4urKp5sA",
    "durationSec": 1695,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Get Out Of Gold League | Pro Analysis W/ @Don Artie  | Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "y8cMf65zFZs",
    "title": "Counter Trade Effectively | Think Like A Pro | Valdemar",
    "url": "https://www.youtube.com/watch?v=y8cMf65zFZs",
    "durationSec": 933,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Counter Trade Effectively | Think Like A Pro | Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "-MyGSJ6fWjY",
    "title": "Pro Tips for an Efficient Feudal Age | Think Like A Pro | Valdemar",
    "url": "https://www.youtube.com/watch?v=-MyGSJ6fWjY",
    "durationSec": 1036,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Pro Tips for an Efficient Feudal Age | Think Like A Pro | Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "mBF05xCxxBo",
    "title": "S8 Tierlist: Tournament + Ladder w/Myriad | Season 8",
    "url": "https://www.youtube.com/watch?v=mBF05xCxxBo",
    "durationSec": 5910,
    "category": "tier_list_meta",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "S8 Tierlist: Tournament + Ladder w/Myriad | Season 8",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "keMLuRHVVgc",
    "title": "A Guide To Archers | Think Like A Pro",
    "url": "https://www.youtube.com/watch?v=keMLuRHVVgc",
    "durationSec": 884,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "A Guide To Archers | Think Like A Pro",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "jaDJBS5hk0Y",
    "title": "The Funniest Pro 4v4 You've Ever Seen | Baltune, Myriad, SAS & Valdemar",
    "url": "https://www.youtube.com/watch?v=jaDJBS5hk0Y",
    "durationSec": 1543,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "The Funniest Pro 4v4 You've Ever Seen | Baltune, Myriad, SAS & Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "jqS2yIDEeb4",
    "title": "🔴 Season 8 Reaction & Discussion w/ @KillerPigeon | Season 8 | Valdemar",
    "url": "https://www.youtube.com/watch?v=jqS2yIDEeb4",
    "durationSec": 4327,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "🔴 Season 8 Reaction & Discussion w/ @KillerPigeon | Season 8 | Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "IRiIM0uY4qA",
    "title": "Delhi Timing Attack | Build Order Guides | Valdemar",
    "url": "https://www.youtube.com/watch?v=IRiIM0uY4qA",
    "durationSec": 944,
    "category": "build_order",
    "primaryCivs": [
      "delhi_sultanate"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Delhi Timing Attack | Build Order Guides | Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "6SdhgUDbf1U",
    "title": "A Guide To Resource Denial | Think Like A Pro",
    "url": "https://www.youtube.com/watch?v=6SdhgUDbf1U",
    "durationSec": 1021,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "A Guide To Resource Denial | Think Like A Pro",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "uJtlR_bYR9Y",
    "title": "Coaching Discord, Norway Tournament, Exams & Much More! | Summer Update! | Valdemar_aoe",
    "url": "https://www.youtube.com/watch?v=uJtlR_bYR9Y",
    "durationSec": 214,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Coaching Discord, Norway Tournament, Exams & Much More! | Summer Update! | Valdemar_aoe",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "x9RBpZWPsFo",
    "title": "Rus Fast Stable Full Guide | Build Order Guides | Valdemar",
    "url": "https://www.youtube.com/watch?v=x9RBpZWPsFo",
    "durationSec": 1274,
    "category": "build_order",
    "primaryCivs": [
      "rus"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Rus Fast Stable Full Guide | Build Order Guides | Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "a97EbuWoqXM",
    "title": "Feudal All-In Meinwerk HRE | Build Order Guides | Valdemar",
    "url": "https://www.youtube.com/watch?v=a97EbuWoqXM",
    "durationSec": 854,
    "category": "build_order",
    "primaryCivs": [
      "holy_roman_empire"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Feudal All-In Meinwerk HRE | Build Order Guides | Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "bYkor1Jzh4I",
    "title": "Pro-Level Raiding Tactics | Think Like A Pro",
    "url": "https://www.youtube.com/watch?v=bYkor1Jzh4I",
    "durationSec": 1275,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Pro-Level Raiding Tactics | Think Like A Pro",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "xHVOlSkEfkA",
    "title": "A Guide To Clean Games | Think Like A Pro",
    "url": "https://www.youtube.com/watch?v=xHVOlSkEfkA",
    "durationSec": 1583,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "A Guide To Clean Games | Think Like A Pro",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "1qK1wElYUY8",
    "title": "Ayyubid Fast Castle | Build Order Guides | Valdemar",
    "url": "https://www.youtube.com/watch?v=1qK1wElYUY8",
    "durationSec": 1113,
    "category": "match_analysis",
    "primaryCivs": [
      "ayyubids"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Ayyubid Fast Castle | Build Order Guides | Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "edrthv6RgMo",
    "title": "Byzantines Winery Fast Castle | Build Order Guides | Valdemar",
    "url": "https://www.youtube.com/watch?v=edrthv6RgMo",
    "durationSec": 1442,
    "category": "match_analysis",
    "primaryCivs": [
      "byzantines"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Byzantines Winery Fast Castle | Build Order Guides | Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "zeIq5rd5d-0",
    "title": "How To Play Imperial Age | Think Like A Pro",
    "url": "https://www.youtube.com/watch?v=zeIq5rd5d-0",
    "durationSec": 1997,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To Play Imperial Age | Think Like A Pro",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "JMawuJ3aaDs",
    "title": "🔴PATCH NOTES: Crossplay, Nomad & FFA Queue + Ottomans & Rus NERFE",
    "url": "https://www.youtube.com/watch?v=JMawuJ3aaDs",
    "durationSec": 1571,
    "category": "tier_list_meta",
    "primaryCivs": [
      "ottomans",
      "rus"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "🔴PATCH NOTES: Crossplay, Nomad & FFA Queue + Ottomans & Rus NERFE",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "hDnXBOgXcCM",
    "title": "2v2 Communication & Strategy | Corvinus1 & Valdemar",
    "url": "https://www.youtube.com/watch?v=hDnXBOgXcCM",
    "durationSec": 941,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "2v2 Communication & Strategy | Corvinus1 & Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "etTCQdUzqfU",
    "title": "Byzantines 3:50 Feudal All-In | Build Order Guides | Valdemar",
    "url": "https://www.youtube.com/watch?v=etTCQdUzqfU",
    "durationSec": 1038,
    "category": "build_order",
    "primaryCivs": [
      "byzantines"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Byzantines 3:50 Feudal All-In | Build Order Guides | Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "I1Y5WylRooU",
    "title": "5:15 2nd TC + Military Wing Rush | Build Order Guides | Valdemar",
    "url": "https://www.youtube.com/watch?v=I1Y5WylRooU",
    "durationSec": 1064,
    "category": "build_order",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "5:15 2nd TC + Military Wing Rush | Build Order Guides | Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "RDykry9kADs",
    "title": "Mongol Tower Rush | Build Order Guides | Valdemar",
    "url": "https://www.youtube.com/watch?v=RDykry9kADs",
    "durationSec": 1084,
    "category": "build_order",
    "primaryCivs": [
      "mongols"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Mongol Tower Rush | Build Order Guides | Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "rJWuW9cGuKc",
    "title": "French 3:40 Feudal Aggression | Build Order Guides | Valdemar",
    "url": "https://www.youtube.com/watch?v=rJWuW9cGuKc",
    "durationSec": 1235,
    "category": "build_order",
    "primaryCivs": [
      "french"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "French 3:40 Feudal Aggression | Build Order Guides | Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "_SlKSgL3WjI",
    "title": "English Tempo Build | Build Order Guides | Valdemar",
    "url": "https://www.youtube.com/watch?v=_SlKSgL3WjI",
    "durationSec": 1108,
    "category": "build_order",
    "primaryCivs": [
      "english"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "English Tempo Build | Build Order Guides | Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "sbQI7Fa7HP0",
    "title": "LIVE PATCH NOTES: Zhu Xi & Jeanne D'arc Nerfed + MASSIVE SIEGE REWORK",
    "url": "https://www.youtube.com/watch?v=sbQI7Fa7HP0",
    "durationSec": 2205,
    "category": "tier_list_meta",
    "primaryCivs": [
      "jeanne_darc",
      "zhu_xis_legacy"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "LIVE PATCH NOTES: Zhu Xi & Jeanne D'arc Nerfed + MASSIVE SIEGE REWORK",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "FCGgJXzlY_c",
    "title": "How To ALL-IN In Feudal | Think Like A Pro",
    "url": "https://www.youtube.com/watch?v=FCGgJXzlY_c",
    "durationSec": 1142,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "How To ALL-IN In Feudal | Think Like A Pro",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "T-_GLjAcKOk",
    "title": "Raiding Under Pressure | Think Like A Pro",
    "url": "https://www.youtube.com/watch?v=T-_GLjAcKOk",
    "durationSec": 1458,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Raiding Under Pressure | Think Like A Pro",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "aQUA7atv7Io",
    "title": "Platinum Guy Thinks That English Rush Is Unbeatable",
    "url": "https://www.youtube.com/watch?v=aQUA7atv7Io",
    "durationSec": 1798,
    "category": "build_order",
    "primaryCivs": [
      "english"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Platinum Guy Thinks That English Rush Is Unbeatable",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "yoeaSLQ3uVg",
    "title": "Counter Fast Castle | Think Like A Pro",
    "url": "https://www.youtube.com/watch?v=yoeaSLQ3uVg",
    "durationSec": 1060,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Counter Fast Castle | Think Like A Pro",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "2CcRnCkKEbg",
    "title": "Timing Attack | Think Like A Pro",
    "url": "https://www.youtube.com/watch?v=2CcRnCkKEbg",
    "durationSec": 1005,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Timing Attack | Think Like A Pro",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "sdrHBFThkMg",
    "title": "Defend Tower Rush With ANY Civilisation | Strategy Guides",
    "url": "https://www.youtube.com/watch?v=sdrHBFThkMg",
    "durationSec": 824,
    "category": "build_order",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Defend Tower Rush With ANY Civilisation | Strategy Guides",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "eXVhclBqdzQ",
    "title": "Is Ayyubid Casino Unbeatable? | Game Highlight",
    "url": "https://www.youtube.com/watch?v=eXVhclBqdzQ",
    "durationSec": 2181,
    "category": "civ_guide",
    "primaryCivs": [
      "ayyubids"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Is Ayyubid Casino Unbeatable? | Game Highlight",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "uu82TOgbICg",
    "title": "Can I Beat My Old Coach? | Vs CrackedyHere | Game Highlight",
    "url": "https://www.youtube.com/watch?v=uu82TOgbICg",
    "durationSec": 1111,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Can I Beat My Old Coach? | Vs CrackedyHere | Game Highlight",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "2tSxRDvRoLs",
    "title": "OLD vs NEW CIV? | Vs Numudan (Draft of Empires) | Game Highlight",
    "url": "https://www.youtube.com/watch?v=2tSxRDvRoLs",
    "durationSec": 1264,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "OLD vs NEW CIV? | Vs Numudan (Draft of Empires) | Game Highlight",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "wiWCQeC6eQU",
    "title": "Mercenary 2TC Olive Build Byzantines | Build Order Guides",
    "url": "https://www.youtube.com/watch?v=wiWCQeC6eQU",
    "durationSec": 768,
    "category": "build_order",
    "primaryCivs": [
      "byzantines"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Mercenary 2TC Olive Build Byzantines | Build Order Guides",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "-jd-8yK44wQ",
    "title": "Byzantine LONGBOWS? | Vs LucifroN7 | Game Highlight",
    "url": "https://www.youtube.com/watch?v=-jd-8yK44wQ",
    "durationSec": 1440,
    "category": "match_analysis",
    "primaryCivs": [
      "byzantines"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Byzantine LONGBOWS? | Vs LucifroN7 | Game Highlight",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "4tPvYbswjlY",
    "title": "Jeanne D'arc Feudal Aggression | Build Order Guides",
    "url": "https://www.youtube.com/watch?v=4tPvYbswjlY",
    "durationSec": 526,
    "category": "build_order",
    "primaryCivs": [
      "jeanne_darc"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Jeanne D'arc Feudal Aggression | Build Order Guides",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "RpjDvJcDFyw",
    "title": "'Zhu Xi ZHUGE NU Rush' beats Japanese? | Vs Poo | Game Highlight",
    "url": "https://www.youtube.com/watch?v=RpjDvJcDFyw",
    "durationSec": 1309,
    "category": "match_analysis",
    "primaryCivs": [
      "japanese",
      "zhu_xis_legacy"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "'Zhu Xi ZHUGE NU Rush' beats Japanese? | Vs Poo | Game Highlight",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "qk8-MDVLXaI",
    "title": "Ayyubids 2TC Feudal | Build Order Guides",
    "url": "https://www.youtube.com/watch?v=qk8-MDVLXaI",
    "durationSec": 721,
    "category": "build_order",
    "primaryCivs": [
      "ayyubids"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Ayyubids 2TC Feudal | Build Order Guides",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "tP-tNn1CU1M",
    "title": "Japanese Feudal Rush | Build Order Guides",
    "url": "https://www.youtube.com/watch?v=tP-tNn1CU1M",
    "durationSec": 904,
    "category": "build_order",
    "primaryCivs": [
      "japanese"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Japanese Feudal Rush | Build Order Guides",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "A9InDnL8ztY",
    "title": "Is Japanese WEAK Or Misunderstood? | vs Beastyqt | Game Highlight",
    "url": "https://www.youtube.com/watch?v=A9InDnL8ztY",
    "durationSec": 1695,
    "category": "match_analysis",
    "primaryCivs": [
      "japanese"
    ],
    "opponentCivs": [],
    "proPlayers": [
      "Beastyqt"
    ],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Is Japanese WEAK Or Misunderstood? | vs Beastyqt | Game Highlight",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "NlLXhQvBzFM",
    "title": "Byzantine Oil Lategame Is INSANE | vs Beastyqt | Game Highlight",
    "url": "https://www.youtube.com/watch?v=NlLXhQvBzFM",
    "durationSec": 2712,
    "category": "match_analysis",
    "primaryCivs": [
      "byzantines"
    ],
    "opponentCivs": [],
    "proPlayers": [
      "Beastyqt"
    ],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Byzantine Oil Lategame Is INSANE | vs Beastyqt | Game Highlight",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "RKDwXaeXmW0",
    "title": "Master The ZHU XI LEGACY | Professional Mastering Series",
    "url": "https://www.youtube.com/watch?v=RKDwXaeXmW0",
    "durationSec": 891,
    "category": "civ_guide",
    "primaryCivs": [
      "zhu_xis_legacy"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Master The ZHU XI LEGACY | Professional Mastering Series",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "G5NUjv9l6n0",
    "title": "Master The ORDER OF THE DRAGON | Professional Mastering Series",
    "url": "https://www.youtube.com/watch?v=G5NUjv9l6n0",
    "durationSec": 674,
    "category": "civ_guide",
    "primaryCivs": [
      "order_of_the_dragon"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Master The ORDER OF THE DRAGON | Professional Mastering Series",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "YoouMSuHlrQ",
    "title": "Master The AYYUBIDS | Professional Mastering Series",
    "url": "https://www.youtube.com/watch?v=YoouMSuHlrQ",
    "durationSec": 995,
    "category": "civ_guide",
    "primaryCivs": [
      "ayyubids"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Master The AYYUBIDS | Professional Mastering Series",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "9vel73pemfc",
    "title": "Master JEANNE D'ARC | Professional Mastering Series",
    "url": "https://www.youtube.com/watch?v=9vel73pemfc",
    "durationSec": 765,
    "category": "civ_guide",
    "primaryCivs": [
      "jeanne_darc"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Master JEANNE D'ARC | Professional Mastering Series",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "S_tpfx6tFZA",
    "title": "Master The BYZANTINES | Professional Mastering Series",
    "url": "https://www.youtube.com/watch?v=S_tpfx6tFZA",
    "durationSec": 1195,
    "category": "civ_guide",
    "primaryCivs": [
      "byzantines"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Master The BYZANTINES | Professional Mastering Series",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "QOMooYrhuHI",
    "title": "Master The JAPANESE | Professional Mastering Series",
    "url": "https://www.youtube.com/watch?v=QOMooYrhuHI",
    "durationSec": 1287,
    "category": "civ_guide",
    "primaryCivs": [
      "japanese"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Master The JAPANESE | Professional Mastering Series",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "val32xAfFLA",
    "title": "Ottoman Feudal With Castle Timing | Build Order Guides | Valdemar",
    "url": "https://www.youtube.com/watch?v=val32xAfFLA",
    "durationSec": 1115,
    "category": "match_analysis",
    "primaryCivs": [
      "ottomans"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Ottoman Feudal With Castle Timing | Build Order Guides | Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "amSVlXvc0d0",
    "title": "Delhi Feudal Rush | Build Order Guides | Valdemar",
    "url": "https://www.youtube.com/watch?v=amSVlXvc0d0",
    "durationSec": 895,
    "category": "build_order",
    "primaryCivs": [
      "delhi_sultanate"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Delhi Feudal Rush | Build Order Guides | Valdemar",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "uUbOoa-oQVg",
    "title": "Who is Valdemar? | Valdemar AoE4",
    "url": "https://www.youtube.com/watch?v=uUbOoa-oQVg",
    "durationSec": 130,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "Who is Valdemar? | Valdemar AoE4",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "KnhHP7oJ-ks",
    "title": "3:58 Feudal Rush English | Build Order Guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=KnhHP7oJ-ks",
    "durationSec": 761,
    "category": "build_order",
    "primaryCivs": [
      "english"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "3:58 Feudal Rush English | Build Order Guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "Eig10H9Xj-A",
    "title": "BOOM GUIDE | The Playstyle Triangle | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=Eig10H9Xj-A",
    "durationSec": 959,
    "category": "build_order",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "BOOM GUIDE | The Playstyle Triangle | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "_Iw_uo407GQ",
    "title": "DEFENSIVE GUIDE | The Playstyle Triangle | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=_Iw_uo407GQ",
    "durationSec": 625,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "DEFENSIVE GUIDE | The Playstyle Triangle | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "2UGifMZksIo",
    "title": "AGGRESSION GUIDE | The Playstyle Triangle | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=2UGifMZksIo",
    "durationSec": 1017,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "AGGRESSION GUIDE | The Playstyle Triangle | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "vn52vRaBJnU",
    "title": "4:30 FEUDAL RUSH MONGOL GUIDE | Build Order Guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=vn52vRaBJnU",
    "durationSec": 830,
    "category": "build_order",
    "primaryCivs": [
      "mongols"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "4:30 FEUDAL RUSH MONGOL GUIDE | Build Order Guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "uZfp8_KshYM",
    "title": "HOTKEY GUIDE | Strategy Guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=uZfp8_KshYM",
    "durationSec": 810,
    "category": "mechanics_fundamentals",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "HOTKEY GUIDE | Strategy Guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "Z_QXUc961OI",
    "title": "SCOUTING GUIDE | Strategy Guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=Z_QXUc961OI",
    "durationSec": 745,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "SCOUTING GUIDE | Strategy Guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "JeWMM1BXLgw",
    "title": "MILITARY WING 2TC | Build Order Guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=JeWMM1BXLgw",
    "durationSec": 564,
    "category": "build_order",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "MILITARY WING 2TC | Build Order Guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "O3ydQ8ZzIE0",
    "title": "TOWER OF VICTORY 2-MOSQUE BUILD | Build Order Guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=O3ydQ8ZzIE0",
    "durationSec": 671,
    "category": "build_order",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "TOWER OF VICTORY 2-MOSQUE BUILD | Build Order Guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "ZCI6WhbmbWc",
    "title": "DEER STONES TRADE BUILD | Build Order Guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=ZCI6WhbmbWc",
    "durationSec": 830,
    "category": "build_order",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "DEER STONES TRADE BUILD | Build Order Guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "8Vj1L6JVffk",
    "title": "MALIAN COW BOOM | Build Order Guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=8Vj1L6JVffk",
    "durationSec": 738,
    "category": "build_order",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "MALIAN COW BOOM | Build Order Guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "kVtHlW05RWo",
    "title": "OTTOMAN FAST CASTLE | Build Order Guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=kVtHlW05RWo",
    "durationSec": 894,
    "category": "match_analysis",
    "primaryCivs": [
      "ottomans"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "OTTOMAN FAST CASTLE | Build Order Guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "qSkevXgcKRw",
    "title": "5:15 2TC  RUS GUIDE | Build Order Guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=qSkevXgcKRw",
    "durationSec": 719,
    "category": "build_order",
    "primaryCivs": [
      "rus"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "5:15 2TC  RUS GUIDE | Build Order Guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "Y9rqbS714L8",
    "title": "2TC 5:25 WITH 1 KNIGHT | Build Order Guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=Y9rqbS714L8",
    "durationSec": 496,
    "category": "build_order",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "2TC 5:25 WITH 1 KNIGHT | Build Order Guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "c_MzmVjwpC0",
    "title": "5:26 FAST CASTLE | Build Order Guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=c_MzmVjwpC0",
    "durationSec": 616,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "5:26 FAST CASTLE | Build Order Guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "Lqn4CAV0Hvg",
    "title": "FULL CHINESE GUIDE | Build Order Guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=Lqn4CAV0Hvg",
    "durationSec": 1097,
    "category": "build_order",
    "primaryCivs": [
      "chinese"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "FULL CHINESE GUIDE | Build Order Guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "XKOQwK4teQw",
    "title": "3TC IN 6 MINUTES ABBASID | Build Order Guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=XKOQwK4teQw",
    "durationSec": 483,
    "category": "build_order",
    "primaryCivs": [
      "abbasid_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "3TC IN 6 MINUTES ABBASID | Build Order Guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "j3RSvKxVUGI",
    "title": "MAP CONTROL GUIDE | Strategy Guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=j3RSvKxVUGI",
    "durationSec": 524,
    "category": "civ_guide",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "MAP CONTROL GUIDE | Strategy Guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "628SQ1kzVYI",
    "title": "TOP 5 MISTAKES IMPERIAL AGE (AGE IV) | Strategy Guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=628SQ1kzVYI",
    "durationSec": 607,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "TOP 5 MISTAKES IMPERIAL AGE (AGE IV) | Strategy Guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "qMcKgQvNGnw",
    "title": "TOP 5 MISTAKES CASTLE AGE (AGE III) | Strategy Guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=qMcKgQvNGnw",
    "durationSec": 772,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "TOP 5 MISTAKES CASTLE AGE (AGE III) | Strategy Guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "9wi-VwFHM7c",
    "title": "TOP 5 MISTAKES FEUDAL AGE (AGE II) | Strategy Guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=9wi-VwFHM7c",
    "durationSec": 920,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "TOP 5 MISTAKES FEUDAL AGE (AGE II) | Strategy Guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "6bpAREkLo-U",
    "title": "TOP 5 MISTAKES DARK AGE (AGE I) | Strategy Guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=6bpAREkLo-U",
    "durationSec": 466,
    "category": "match_analysis",
    "primaryCivs": [],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "TOP 5 MISTAKES DARK AGE (AGE I) | Strategy Guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "CFnz80yv47k",
    "title": "HOW TO DEFEAT THE ENGLISH | Strategy Guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=CFnz80yv47k",
    "durationSec": 1236,
    "category": "civ_guide",
    "primaryCivs": [
      "english"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "HOW TO DEFEAT THE ENGLISH | Strategy Guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "2vNyys4u1IU",
    "title": "EARLY CONTROL ABBA 2TC BUILD | Build order guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=2vNyys4u1IU",
    "durationSec": 769,
    "category": "build_order",
    "primaryCivs": [
      "abbasid_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "EARLY CONTROL ABBA 2TC BUILD | Build order guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "qgTED-U-TvE",
    "title": "CHINESE WATER GUIDE | Build order guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=qgTED-U-TvE",
    "durationSec": 733,
    "category": "build_order",
    "primaryCivs": [
      "chinese"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "CHINESE WATER GUIDE | Build order guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "eKd3cZ9MxkQ",
    "title": "DARK AGE RUSH ENGLISH | Build order guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=eKd3cZ9MxkQ",
    "durationSec": 703,
    "category": "build_order",
    "primaryCivs": [
      "english"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "DARK AGE RUSH ENGLISH | Build order guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  },
  {
    "id": "wdU2jm4Sau8",
    "title": "PERFECT ABBASID 2TC | Build order guides | Valdemar1902",
    "url": "https://www.youtube.com/watch?v=wdU2jm4Sau8",
    "durationSec": 739,
    "category": "build_order",
    "primaryCivs": [
      "abbasid_dynasty"
    ],
    "opponentCivs": [],
    "proPlayers": [],
    "transcriptStatus": "unavailable",
    "snippetsCount": 0,
    "summary": "PERFECT ABBASID 2TC | Build order guides | Valdemar1902",
    "keyTactics": [],
    "transcriptExcerpt": null
  }
];

export const VALDEMAR_VIDEOS_BY_ID: ReadonlyMap<string, ValdemarVideoEntry> = new Map(
  VALDEMAR_VIDEOS.map((v) => [v.id, v]),
);

export const VALDEMAR_VIDEOS_BY_CIV: Readonly<Record<string, readonly ValdemarVideoEntry[]>> = {
  'abbasid_dynasty': [
    VALDEMAR_VIDEOS_BY_ID.get('NAlDQ47uIqE')!,
    VALDEMAR_VIDEOS_BY_ID.get('WZeczqGf9EA')!,
    VALDEMAR_VIDEOS_BY_ID.get('B6x1S-yqLw0')!,
    VALDEMAR_VIDEOS_BY_ID.get('XivlYNuy5Sc')!,
    VALDEMAR_VIDEOS_BY_ID.get('zlFwOhCfX3M')!,
    VALDEMAR_VIDEOS_BY_ID.get('zBSyAmfzNs8')!,
    VALDEMAR_VIDEOS_BY_ID.get('NxUpmN3Fqdk')!,
    VALDEMAR_VIDEOS_BY_ID.get('6vKafKBLcHw')!,
    VALDEMAR_VIDEOS_BY_ID.get('XKOQwK4teQw')!,
    VALDEMAR_VIDEOS_BY_ID.get('2vNyys4u1IU')!,
    VALDEMAR_VIDEOS_BY_ID.get('wdU2jm4Sau8')!,
  ],
  'ayyubids': [
    VALDEMAR_VIDEOS_BY_ID.get('t2u-62wAKWU')!,
    VALDEMAR_VIDEOS_BY_ID.get('DlK8Z0y_IDY')!,
    VALDEMAR_VIDEOS_BY_ID.get('1qK1wElYUY8')!,
    VALDEMAR_VIDEOS_BY_ID.get('eXVhclBqdzQ')!,
    VALDEMAR_VIDEOS_BY_ID.get('qk8-MDVLXaI')!,
    VALDEMAR_VIDEOS_BY_ID.get('YoouMSuHlrQ')!,
  ],
  'byzantines': [
    VALDEMAR_VIDEOS_BY_ID.get('0pkvLN16f4o')!,
    VALDEMAR_VIDEOS_BY_ID.get('ydDt3gp56fQ')!,
    VALDEMAR_VIDEOS_BY_ID.get('s9TkSQV1Mhg')!,
    VALDEMAR_VIDEOS_BY_ID.get('yvaWvgufajk')!,
    VALDEMAR_VIDEOS_BY_ID.get('oqbBXshDUiY')!,
    VALDEMAR_VIDEOS_BY_ID.get('S20mpMMCCSk')!,
    VALDEMAR_VIDEOS_BY_ID.get('xNyOKJOb-qE')!,
    VALDEMAR_VIDEOS_BY_ID.get('3O6hEgcD6j0')!,
    VALDEMAR_VIDEOS_BY_ID.get('D82S4eRC4dk')!,
    VALDEMAR_VIDEOS_BY_ID.get('lzRbefWfvd0')!,
    VALDEMAR_VIDEOS_BY_ID.get('iCYblxemwVg')!,
    VALDEMAR_VIDEOS_BY_ID.get('RSpGG4O9Wy8')!,
    VALDEMAR_VIDEOS_BY_ID.get('edrthv6RgMo')!,
    VALDEMAR_VIDEOS_BY_ID.get('etTCQdUzqfU')!,
    VALDEMAR_VIDEOS_BY_ID.get('wiWCQeC6eQU')!,
    VALDEMAR_VIDEOS_BY_ID.get('-jd-8yK44wQ')!,
    VALDEMAR_VIDEOS_BY_ID.get('NlLXhQvBzFM')!,
    VALDEMAR_VIDEOS_BY_ID.get('S_tpfx6tFZA')!,
  ],
  'chinese': [
    VALDEMAR_VIDEOS_BY_ID.get('nv-SU1cfWM0')!,
    VALDEMAR_VIDEOS_BY_ID.get('Kx0LubVSxZA')!,
    VALDEMAR_VIDEOS_BY_ID.get('bBMj9QfNKX0')!,
    VALDEMAR_VIDEOS_BY_ID.get('C2AXvACcmjM')!,
    VALDEMAR_VIDEOS_BY_ID.get('EKnex4_ESkU')!,
    VALDEMAR_VIDEOS_BY_ID.get('xEJ3DBjxu5A')!,
    VALDEMAR_VIDEOS_BY_ID.get('HykY_XEhN3E')!,
    VALDEMAR_VIDEOS_BY_ID.get('aVCdd64JQWs')!,
    VALDEMAR_VIDEOS_BY_ID.get('2hEeHjwWkow')!,
    VALDEMAR_VIDEOS_BY_ID.get('fXUmrfc5Z64')!,
    VALDEMAR_VIDEOS_BY_ID.get('Lqn4CAV0Hvg')!,
    VALDEMAR_VIDEOS_BY_ID.get('qgTED-U-TvE')!,
  ],
  'delhi_sultanate': [
    VALDEMAR_VIDEOS_BY_ID.get('zNPvIkw1ZuM')!,
    VALDEMAR_VIDEOS_BY_ID.get('wJDKYnv1trU')!,
    VALDEMAR_VIDEOS_BY_ID.get('cCJ5Rw2GTSc')!,
    VALDEMAR_VIDEOS_BY_ID.get('YMKgy9jRxq0')!,
    VALDEMAR_VIDEOS_BY_ID.get('dRvmG-HSfz4')!,
    VALDEMAR_VIDEOS_BY_ID.get('qdvhDC4wfm0')!,
    VALDEMAR_VIDEOS_BY_ID.get('2b5KWeUSkjQ')!,
    VALDEMAR_VIDEOS_BY_ID.get('CXayKjqsblk')!,
    VALDEMAR_VIDEOS_BY_ID.get('Z2mJ_2rUHP0')!,
    VALDEMAR_VIDEOS_BY_ID.get('ErWjntSJ9Fk')!,
    VALDEMAR_VIDEOS_BY_ID.get('yaCsijvYIWM')!,
    VALDEMAR_VIDEOS_BY_ID.get('IRiIM0uY4qA')!,
    VALDEMAR_VIDEOS_BY_ID.get('amSVlXvc0d0')!,
  ],
  'english': [
    VALDEMAR_VIDEOS_BY_ID.get('pT5qRqOlNLY')!,
    VALDEMAR_VIDEOS_BY_ID.get('KNqi3OeKRbA')!,
    VALDEMAR_VIDEOS_BY_ID.get('aTmT53_-pew')!,
    VALDEMAR_VIDEOS_BY_ID.get('XmqZZ7yShYU')!,
    VALDEMAR_VIDEOS_BY_ID.get('gQDVpDom6mU')!,
    VALDEMAR_VIDEOS_BY_ID.get('aRkeTDdkd4I')!,
    VALDEMAR_VIDEOS_BY_ID.get('dxGDpuG1_7Y')!,
    VALDEMAR_VIDEOS_BY_ID.get('yJk8MgEDRUE')!,
    VALDEMAR_VIDEOS_BY_ID.get('om1Mqx3EeYs')!,
    VALDEMAR_VIDEOS_BY_ID.get('84ulAJLWRu8')!,
    VALDEMAR_VIDEOS_BY_ID.get('DK8KDAJQxf4')!,
    VALDEMAR_VIDEOS_BY_ID.get('_SlKSgL3WjI')!,
    VALDEMAR_VIDEOS_BY_ID.get('aQUA7atv7Io')!,
    VALDEMAR_VIDEOS_BY_ID.get('KnhHP7oJ-ks')!,
    VALDEMAR_VIDEOS_BY_ID.get('CFnz80yv47k')!,
    VALDEMAR_VIDEOS_BY_ID.get('eKd3cZ9MxkQ')!,
  ],
  'french': [
    VALDEMAR_VIDEOS_BY_ID.get('uaAFYPM01qo')!,
    VALDEMAR_VIDEOS_BY_ID.get('YMKgy9jRxq0')!,
    VALDEMAR_VIDEOS_BY_ID.get('gQDVpDom6mU')!,
    VALDEMAR_VIDEOS_BY_ID.get('ZHSegmY5rsM')!,
    VALDEMAR_VIDEOS_BY_ID.get('ZzZICnaDBsQ')!,
    VALDEMAR_VIDEOS_BY_ID.get('GqRj3NTfiEM')!,
    VALDEMAR_VIDEOS_BY_ID.get('dnZ-7XY7Vss')!,
    VALDEMAR_VIDEOS_BY_ID.get('84ulAJLWRu8')!,
    VALDEMAR_VIDEOS_BY_ID.get('VNQkjrJxVVY')!,
    VALDEMAR_VIDEOS_BY_ID.get('cNyEnox9HzY')!,
    VALDEMAR_VIDEOS_BY_ID.get('rJWuW9cGuKc')!,
  ],
  'golden_horde': [
    VALDEMAR_VIDEOS_BY_ID.get('KogVd0c1zFw')!,
    VALDEMAR_VIDEOS_BY_ID.get('KNqi3OeKRbA')!,
    VALDEMAR_VIDEOS_BY_ID.get('NIaH6n_JMJk')!,
    VALDEMAR_VIDEOS_BY_ID.get('7_c9_X0tK_E')!,
    VALDEMAR_VIDEOS_BY_ID.get('YMKgy9jRxq0')!,
    VALDEMAR_VIDEOS_BY_ID.get('hxxmbmr9a3M')!,
    VALDEMAR_VIDEOS_BY_ID.get('JKpWYtxsr6s')!,
    VALDEMAR_VIDEOS_BY_ID.get('kl25O2wsfME')!,
    VALDEMAR_VIDEOS_BY_ID.get('q985fe_38rQ')!,
    VALDEMAR_VIDEOS_BY_ID.get('Jl-3iwLOorE')!,
  ],
  'holy_roman_empire': [
    VALDEMAR_VIDEOS_BY_ID.get('ApTpn3yKFv4')!,
    VALDEMAR_VIDEOS_BY_ID.get('M961c97ctU4')!,
    VALDEMAR_VIDEOS_BY_ID.get('xcAQOg5uw7A')!,
    VALDEMAR_VIDEOS_BY_ID.get('apUNQjG9wTs')!,
    VALDEMAR_VIDEOS_BY_ID.get('om1Mqx3EeYs')!,
    VALDEMAR_VIDEOS_BY_ID.get('84ulAJLWRu8')!,
    VALDEMAR_VIDEOS_BY_ID.get('TWlaj7MsPpU')!,
    VALDEMAR_VIDEOS_BY_ID.get('a97EbuWoqXM')!,
  ],
  'house_of_lancaster': [
    VALDEMAR_VIDEOS_BY_ID.get('Xkn4xxJg8GY')!,
    VALDEMAR_VIDEOS_BY_ID.get('s9TkSQV1Mhg')!,
    VALDEMAR_VIDEOS_BY_ID.get('XWHfruGPIrM')!,
    VALDEMAR_VIDEOS_BY_ID.get('xEJ3DBjxu5A')!,
    VALDEMAR_VIDEOS_BY_ID.get('T-JS5MFNhL0')!,
    VALDEMAR_VIDEOS_BY_ID.get('z1iMtSeXJiU')!,
    VALDEMAR_VIDEOS_BY_ID.get('c04SZIs2aIM')!,
    VALDEMAR_VIDEOS_BY_ID.get('4DXaCfXu7-I')!,
    VALDEMAR_VIDEOS_BY_ID.get('Bh5l7wrmsMc')!,
    VALDEMAR_VIDEOS_BY_ID.get('bk0yfisJxmw')!,
  ],
  'japanese': [
    VALDEMAR_VIDEOS_BY_ID.get('-PPntvN34sE')!,
    VALDEMAR_VIDEOS_BY_ID.get('YMKgy9jRxq0')!,
    VALDEMAR_VIDEOS_BY_ID.get('MOhYn-gXPjE')!,
    VALDEMAR_VIDEOS_BY_ID.get('-p0j_MD5ST8')!,
    VALDEMAR_VIDEOS_BY_ID.get('jBgIY3Gn29Y')!,
    VALDEMAR_VIDEOS_BY_ID.get('Y9UZ5kOmLoE')!,
    VALDEMAR_VIDEOS_BY_ID.get('0_DcTxTqB7I')!,
    VALDEMAR_VIDEOS_BY_ID.get('RpjDvJcDFyw')!,
    VALDEMAR_VIDEOS_BY_ID.get('tP-tNn1CU1M')!,
    VALDEMAR_VIDEOS_BY_ID.get('A9InDnL8ztY')!,
    VALDEMAR_VIDEOS_BY_ID.get('QOMooYrhuHI')!,
  ],
  'jeanne_darc': [
    VALDEMAR_VIDEOS_BY_ID.get('eHln0ZOY9v8')!,
    VALDEMAR_VIDEOS_BY_ID.get('8B1l5O4hfhw')!,
    VALDEMAR_VIDEOS_BY_ID.get('sbQI7Fa7HP0')!,
    VALDEMAR_VIDEOS_BY_ID.get('4tPvYbswjlY')!,
    VALDEMAR_VIDEOS_BY_ID.get('9vel73pemfc')!,
  ],
  'jin_dynasty': [
    VALDEMAR_VIDEOS_BY_ID.get('I54KtEakRsQ')!,
    VALDEMAR_VIDEOS_BY_ID.get('AEGIGZXbSuA')!,
    VALDEMAR_VIDEOS_BY_ID.get('OARzI0pzMe0')!,
    VALDEMAR_VIDEOS_BY_ID.get('YkSMCs_b9C4')!,
    VALDEMAR_VIDEOS_BY_ID.get('d_vP08tT3NY')!,
    VALDEMAR_VIDEOS_BY_ID.get('4A0w4Fctg3U')!,
  ],
  'knights_templar': [
    VALDEMAR_VIDEOS_BY_ID.get('KBmcjUzUioI')!,
    VALDEMAR_VIDEOS_BY_ID.get('3Rkix0K9WVI')!,
    VALDEMAR_VIDEOS_BY_ID.get('IFUNfAxEhas')!,
    VALDEMAR_VIDEOS_BY_ID.get('-_1IlcQBJZk')!,
    VALDEMAR_VIDEOS_BY_ID.get('3WnJ5ywG8GY')!,
    VALDEMAR_VIDEOS_BY_ID.get('SS_Vaz60ufw')!,
    VALDEMAR_VIDEOS_BY_ID.get('2CafuCce0Ak')!,
    VALDEMAR_VIDEOS_BY_ID.get('algLfHZ-MIw')!,
    VALDEMAR_VIDEOS_BY_ID.get('EXOEVvHhh14')!,
    VALDEMAR_VIDEOS_BY_ID.get('Hk0EvBkJUAs')!,
    VALDEMAR_VIDEOS_BY_ID.get('8FR6tHUCmiU')!,
    VALDEMAR_VIDEOS_BY_ID.get('BA6BXctUgec')!,
  ],
  'macedonian_dynasty': [
    VALDEMAR_VIDEOS_BY_ID.get('LKH4uwXd24E')!,
    VALDEMAR_VIDEOS_BY_ID.get('w_UZ3CYwIQU')!,
    VALDEMAR_VIDEOS_BY_ID.get('zoA922O-HQM')!,
    VALDEMAR_VIDEOS_BY_ID.get('p5RFUH5Gl0U')!,
  ],
  'malians': [
    VALDEMAR_VIDEOS_BY_ID.get('ydDt3gp56fQ')!,
    VALDEMAR_VIDEOS_BY_ID.get('bBMj9QfNKX0')!,
    VALDEMAR_VIDEOS_BY_ID.get('ApuGahvKpf0')!,
    VALDEMAR_VIDEOS_BY_ID.get('60KgzjtsJjE')!,
    VALDEMAR_VIDEOS_BY_ID.get('Y4uiY9s53yk')!,
  ],
  'mongols': [
    VALDEMAR_VIDEOS_BY_ID.get('hgUTsttQwWA')!,
    VALDEMAR_VIDEOS_BY_ID.get('YMKgy9jRxq0')!,
    VALDEMAR_VIDEOS_BY_ID.get('CyNUh2bApoE')!,
    VALDEMAR_VIDEOS_BY_ID.get('Fgiv2WXO5gw')!,
    VALDEMAR_VIDEOS_BY_ID.get('5hKniqiZaL4')!,
    VALDEMAR_VIDEOS_BY_ID.get('RDykry9kADs')!,
    VALDEMAR_VIDEOS_BY_ID.get('vn52vRaBJnU')!,
  ],
  'order_of_the_dragon': [
    VALDEMAR_VIDEOS_BY_ID.get('fnGBUeVP_54')!,
    VALDEMAR_VIDEOS_BY_ID.get('oFfv5cHry68')!,
    VALDEMAR_VIDEOS_BY_ID.get('YPRL2C_pSoM')!,
    VALDEMAR_VIDEOS_BY_ID.get('CH6d2PXg87g')!,
    VALDEMAR_VIDEOS_BY_ID.get('i_6TdgX-USM')!,
    VALDEMAR_VIDEOS_BY_ID.get('G5NUjv9l6n0')!,
  ],
  'ottomans': [
    VALDEMAR_VIDEOS_BY_ID.get('-PPntvN34sE')!,
    VALDEMAR_VIDEOS_BY_ID.get('8wJW0U38Vgc')!,
    VALDEMAR_VIDEOS_BY_ID.get('oFfv5cHry68')!,
    VALDEMAR_VIDEOS_BY_ID.get('lpTy4BX7qLE')!,
    VALDEMAR_VIDEOS_BY_ID.get('HdlqFpLRkOk')!,
    VALDEMAR_VIDEOS_BY_ID.get('gg6QpqtAGng')!,
    VALDEMAR_VIDEOS_BY_ID.get('oHTZKEavpXw')!,
    VALDEMAR_VIDEOS_BY_ID.get('er-nOsjGDuM')!,
    VALDEMAR_VIDEOS_BY_ID.get('tZWZVwb98cw')!,
    VALDEMAR_VIDEOS_BY_ID.get('JMawuJ3aaDs')!,
    VALDEMAR_VIDEOS_BY_ID.get('val32xAfFLA')!,
    VALDEMAR_VIDEOS_BY_ID.get('kVtHlW05RWo')!,
  ],
  'rus': [
    VALDEMAR_VIDEOS_BY_ID.get('_1LWItYaLsk')!,
    VALDEMAR_VIDEOS_BY_ID.get('YMKgy9jRxq0')!,
    VALDEMAR_VIDEOS_BY_ID.get('NnO7k4AvazU')!,
    VALDEMAR_VIDEOS_BY_ID.get('Lku9kFlDULc')!,
    VALDEMAR_VIDEOS_BY_ID.get('TvAOLixs7ik')!,
    VALDEMAR_VIDEOS_BY_ID.get('9Y5hsGP00fc')!,
    VALDEMAR_VIDEOS_BY_ID.get('JKpWYtxsr6s')!,
    VALDEMAR_VIDEOS_BY_ID.get('50E31vVHkQc')!,
    VALDEMAR_VIDEOS_BY_ID.get('UxT7J9z7RsQ')!,
    VALDEMAR_VIDEOS_BY_ID.get('a_vx9ko5BCw')!,
    VALDEMAR_VIDEOS_BY_ID.get('wHJ0dfgwb0A')!,
    VALDEMAR_VIDEOS_BY_ID.get('VuNkmanCX-k')!,
    VALDEMAR_VIDEOS_BY_ID.get('YxAbNDqIY1Y')!,
    VALDEMAR_VIDEOS_BY_ID.get('x9RBpZWPsFo')!,
    VALDEMAR_VIDEOS_BY_ID.get('JMawuJ3aaDs')!,
    VALDEMAR_VIDEOS_BY_ID.get('qSkevXgcKRw')!,
  ],
  'sengoku_daimyo': [
    VALDEMAR_VIDEOS_BY_ID.get('Y2Aild_Z2R8')!,
    VALDEMAR_VIDEOS_BY_ID.get('tJWbi1Qqz0A')!,
    VALDEMAR_VIDEOS_BY_ID.get('ZHSegmY5rsM')!,
    VALDEMAR_VIDEOS_BY_ID.get('s2LUxq_E7pE')!,
    VALDEMAR_VIDEOS_BY_ID.get('Jn620aobMRQ')!,
    VALDEMAR_VIDEOS_BY_ID.get('_Q4DNUyE_y0')!,
    VALDEMAR_VIDEOS_BY_ID.get('TeVitUDOcAo')!,
  ],
  'tughlaq_dynasty': [
    VALDEMAR_VIDEOS_BY_ID.get('QE9fU360ZJU')!,
    VALDEMAR_VIDEOS_BY_ID.get('hWkeU9U6Jjk')!,
    VALDEMAR_VIDEOS_BY_ID.get('RVN1fTeb-cQ')!,
    VALDEMAR_VIDEOS_BY_ID.get('4VFx_I2EfuM')!,
  ],
  'zhu_xis_legacy': [
    VALDEMAR_VIDEOS_BY_ID.get('CS3IWSLSMPQ')!,
    VALDEMAR_VIDEOS_BY_ID.get('gN6nVOjCOgM')!,
    VALDEMAR_VIDEOS_BY_ID.get('m-VnMi2QnAM')!,
    VALDEMAR_VIDEOS_BY_ID.get('UnHyHX9YQ9Y')!,
    VALDEMAR_VIDEOS_BY_ID.get('AvVFb0z5I-c')!,
    VALDEMAR_VIDEOS_BY_ID.get('sbQI7Fa7HP0')!,
    VALDEMAR_VIDEOS_BY_ID.get('RpjDvJcDFyw')!,
    VALDEMAR_VIDEOS_BY_ID.get('RKDwXaeXmW0')!,
  ],
};

export const VALDEMAR_MATCH_ANALYSES: readonly ValdemarVideoEntry[] = VALDEMAR_VIDEOS.filter(
  (v) => v.category === 'match_analysis',
);

export const VALDEMAR_BUILD_ORDERS: readonly ValdemarVideoEntry[] = VALDEMAR_VIDEOS.filter(
  (v) => v.category === 'build_order',
);

export const VALDEMAR_CIV_GUIDES: readonly ValdemarVideoEntry[] = VALDEMAR_VIDEOS.filter(
  (v) => v.category === 'civ_guide',
);

export const VALDEMAR_FUNDAMENTALS: readonly ValdemarVideoEntry[] = VALDEMAR_VIDEOS.filter(
  (v) => v.category === 'mechanics_fundamentals' || v.category === 'tier_list_meta',
);
