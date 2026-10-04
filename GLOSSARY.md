# Little Cuppers

A cute single-player 3D browser game in which the player cups coffees alongside NPC characters, scores them, and is rewarded for scoring close to the expert reference.

## Places and rounds

**Lab**:
A cupping room with a cupping table where Cupping Sessions take place.
_Avoid_: Room, level, stage

**Cupping Session**:
A fixed, hand-authored set of Blind Cups in a Lab, cupped together and ending with the Reveal; each Lab has several.
_Avoid_: Session (alone), round, match, level

**Attempt**:
One play-through of a Cupping Session by the Player. A Cupping Session can be attempted many times.
_Avoid_: Run, try, game

**Submit**:
The single action that locks in all of the Player's Score Cards for an Attempt and triggers the Reveal.
_Avoid_: Finish, confirm

**Leave Lab**:
The Player exiting a Lab back to the menu or map; leaving mid-Attempt discards the Attempt.
_Avoid_: Quit lab

**Cupping Step**:
One stage of cupping a coffee, in order: Dry Fragrance, Pour, Break the Crust, Skim, Slurp. Dry Fragrance is optional but only possible before Pour; Slurp may be repeated as the cup cools.
_Avoid_: Phase, action

**Cup Temperature**:
How hot a coffee is at a given moment of the Cupping Session; it falls over time and changes which Tasting Cues a Slurp gives.
_Avoid_: Heat, warmth

**Blind Cup**:
A coffee presented only by a letter (Cup A, Cup B, …) with its origin hidden until the Reveal.
_Avoid_: Mystery coffee, unknown sample

**Reveal**:
The end of a Cupping Session, showing each coffee's origin, its Reference Score, and every Cupper's Score Card side by side.
_Avoid_: Results screen, summary

## People

**Player**:
The human playing the game, represented by their own Cupper at the table.
_Avoid_: User

**Cupper**:
Any character seated at the cupping table who cups and scores coffees, whether the Player or an NPC.
_Avoid_: Taster, judge

**NPC Cupper**:
A Cupper controlled by the game rather than the Player.
_Avoid_: Bot, AI player

**Personality Bias**:
An NPC Cupper's consistent tendency to over- or under-rate particular Attributes, which colours both their Score Cards and their remarks.
_Avoid_: Quirk, trait, mood

**Seat**:
A place at a Lab's cupping table that the Player fills with one of their unlocked NPC Cuppers; each Lab has 2–4.
_Avoid_: Slot, position

**Lineup**:
The choice of which unlocked NPC Cuppers fill a Lab's Seats, made before each Attempt; Seats may be left empty.
_Avoid_: Team, party, roster

**Cupper Journal**:
The Player's record of each NPC Cupper, starting with a vague hint about their Personality Bias and filling in as Reveals expose it.
_Avoid_: Profile, bestiary, codex

## Scoring

**Attribute**:
One quality a coffee is scored on: Aroma, Flavor, Acidity, Body, or Sweetness, each rated 1–5 cups.
_Avoid_: Category, criterion, trait

**Score Card**:
One Cupper's set of Attribute ratings for one Blind Cup in an Attempt; the Player's stay editable until Submit.
_Avoid_: Score sheet, form

**Reference Score**:
The hand-authored expert rating of each Attribute for a coffee; the answer the Player calibrates against.
_Avoid_: True score, correct answer, expert score

**Calibration**:
How closely the Player's Score Card matches the Reference Score for a coffee; the core skill the game rewards.
_Avoid_: Accuracy

**Tasting Cue**:
A piece of evidence about a coffee's Attributes given to the Player during cupping: a tasting note, a visual or sensory effect, or an NPC Cupper's remark.
_Avoid_: Clue, hint, flavor text

**Cue Log**:
The record of every Tasting Cue the Player has received about one Blind Cup during an Attempt, oldest first.
_Avoid_: Cue history, notes, journal

**Accuracy Window**:
The Cup Temperature range in which a Slurp gives accurate Tasting Cues for a given Attribute; outside it, cues are vague or skewed.
_Avoid_: Sweet spot, optimal range

## Progression

**Star**:
The reward of 1–3 earned for Calibration in a Cupping Session; only the best result per Cupping Session counts, and Star totals unlock new Labs and NPC Cuppers.
_Avoid_: Point, coin, XP

**Calibration Points**:
Points earned per Attribute by comparing the Player's Score Card to the Reference Score: 3 for an exact match, 1 for off by one, 0 otherwise. Their share of the maximum sets the Stars.
_Avoid_: Score (alone), accuracy points
