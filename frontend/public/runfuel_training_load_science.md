# RunFuel Training Load & Fatigue Logic

## Purpose

This document explains the scientific reasoning and product logic behind RunFuel's fatigue conflict detector and hybrid-athlete training load engine.

The goal is **not** to predict injury or tell the user that hard training is bad. The goal is to help a hybrid athlete train hard more intelligently by detecting when hard stress is being stacked in ways that may reduce adaptation, recovery, or performance.

RunFuel should use language such as:

- fatigue warning
- workload spike
- recovery conflict
- training-load flag
- planning risk

RunFuel should avoid language such as:

- injury prediction
- guaranteed risk
- unsafe workout
- medical risk score

The algorithm should assume that hard training is necessary. It should only flag a high-risk situation when hard training is combined with poor recovery spacing, sudden workload spikes, repeated high-load days, or a missed rest structure.

---

## Key training idea

A useful hybrid plan is not a plan that avoids hard days. It is a plan that places hard days deliberately.

For a hybrid athlete lifting four days, running two days, and resting one day, the app should not panic when it sees:

- intervals
- tempo runs
- leg day
- long runs
- back-to-back training days

Those are normal parts of training.

The app should become concerned when multiple stressors stack together without enough recovery context.

Examples:

- quality run + heavy leg day on the same day
- quality run immediately before or after leg day repeatedly
- large mileage increase plus intervals
- rest day replaced by a Strava run
- three to five days of accumulated high load
- actual runs exceed planned runs while mileage also spikes

The app should treat **stress as productive**, but **unplanned or poorly spaced stress as a warning**.

---

## Scientific concepts used

### 1. Fitness-fatigue model

Training produces both positive adaptation and short-term fatigue. Performance improves when the athlete accumulates enough training stress but also recovers enough to express adaptation.

This idea comes from fitness-fatigue / impulse-response models. These models describe training as producing a positive fitness component and a negative fatigue component that decay over time.

Practical translation for RunFuel:

- Fatigue from a hard session does not disappear the next day.
- Recent sessions should affect today's readiness more than older sessions.
- A rolling decay model is more realistic than only checking yesterday.

Source:
- https://pmc.ncbi.nlm.nih.gov/articles/PMC8799698/
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12880663/

---

### 2. Acute vs chronic workload

Training-load monitoring often compares recent workload with longer-term baseline workload.

A common version is the acute:chronic workload ratio, where short-term load is compared with longer-term average load. ACWR is debated and should not be treated as a perfect injury predictor, but the broad idea is useful: sudden spikes above the user's normal baseline deserve attention.

Practical translation for RunFuel:

- Compare this week's running volume with last week.
- Compare the last 7 days with the previous 28-day average.
- Use these as workload-spike flags, not as medical injury predictions.

Source:
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12487117/
- https://arxiv.org/abs/1907.05326

---

### 3. Running progression and session spikes

Traditional running advice often mentions gradual progression. The simple 10% weekly rule is not perfect and should not be treated as law. More recent work suggests that sudden increases in single-session distance compared with a runner's recent longest run may also matter.

Practical translation for RunFuel:

- Do not automatically mark every 15% mileage increase as high risk.
- A moderate increase can be acceptable if the week is otherwise easy.
- A large increase becomes more concerning when paired with quality work, no rest day, or heavy leg training.
- Compare long-run distance against recent long-run baseline, not only weekly mileage.

Source:
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12421110/

---

### 4. Training intensity distribution

Endurance athletes generally benefit from a large base of low-intensity work plus a smaller amount of harder work. Polarized and pyramidal models differ in details, but both support the general idea that not every run should be hard.

Practical translation for RunFuel:

- Two weekly runs for a hybrid athlete should usually not both be maximal-quality sessions.
- If the athlete only runs twice weekly, one easy aerobic run and one quality or tempo session is a reasonable default.
- A tempo or interval session should not be treated as automatically bad; it is often the point of the plan.
- The warning should appear when hard running is added on top of heavy lower-body fatigue or a workload spike.

Source:
- https://pmc.ncbi.nlm.nih.gov/articles/PMC11329428/
- https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2025.1657892/full

---

### 5. Concurrent training and interference

Hybrid athletes combine resistance training and endurance training. Literature on concurrent training shows that strength and endurance can be trained together, but the arrangement matters. Running has more lower-body eccentric loading than cycling and may interfere more with lower-body strength/hypertrophy if poorly timed or excessive.

Practical translation for RunFuel:

- Do not tell the athlete to avoid running near lifting entirely.
- Instead, flag the highest-interference cases:
  - hard run on leg day
  - hard run immediately before heavy legs
  - long run immediately after heavy legs
  - multiple lower-body stress days stacked together
- Upper-body training should not heavily restrict running placement.

Source:
- https://pubmed.ncbi.nlm.nih.gov/22002517/
- https://pmc.ncbi.nlm.nih.gov/articles/PMC11688070/
- https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2023.1072679/full

---

## Better algorithm philosophy

The first beginner version of the detector was too conservative because it treated too many hard things as high risk.

The improved version should use a **risk escalation model**.

A single hard workout is usually not high risk.

A hard workout becomes more concerning when combined with:

1. poor spacing
2. recent accumulated fatigue
3. workload spike
4. no true rest day
5. mismatch between plan and actual activity
6. lower-body overlap

This makes the app more realistic for someone who actually wants to get stronger, faster, and fitter.

---

## Proposed risk levels

### Low

Normal training stress. No warning or only an informational note.

Examples:

- easy run after push day
- intervals two days away from leg day
- planned two runs and completed two runs
- small mileage increase with a rest day

### Moderate

Worth noticing, but not automatically bad.

Examples:

- tempo run one day before legs
- mileage up 15-30% but no other major issues
- long run the day after legs
- extra unplanned easy run
- two moderately demanding days back-to-back

### High

Likely needs adjustment because several stressors are stacked.

Examples:

- quality run on the same day as legs
- quality run the day before legs plus rolling fatigue already high
- mileage increase above 30% plus no true rest day
- ACWR above threshold plus hard run classified from Strava
- rest day replaced by a run and no other rest day exists

---

## Activity load scoring

Because the app removed manual intensity, the system should infer load from workout type and actual running data.

### Base load scores

| Activity | Score | Reason |
|---|---:|---|
| Rest | 0 | Recovery day |
| Easy run | 2 | Aerobic stress, low intensity |
| Long run | 4 | Higher musculoskeletal and aerobic load |
| Tempo run | 4 | Moderate-to-hard metabolic stress |
| Quality / intervals | 5 | High neuromuscular and metabolic stress |
| Push | 2 | Upper-body dominant |
| Pull | 2 | Mostly upper/posterior chain, but lower fatigue usually limited |
| Upper | 2 | Upper-body dominant |
| Legs | 5 | High lower-body fatigue |
| Full body | 4 | Systemic and lower-body involvement |

### Mixed-day load

If an actual run from Strava occurs on a gym day, add both scores but cap the day at 7.

Examples:

| Combination | Score |
|---|---:|
| Push + easy run | 4 |
| Pull + tempo | 6 |
| Legs + easy run | 7 |
| Legs + quality run | 7 |
| Full body + long run | 7 |

The cap prevents one day from dominating too much, while still marking same-day stacking as meaningful.

---

## Rolling fatigue model

Instead of checking only yesterday, use a five-day decay model.

Weights:

| Day | Weight |
|---|---:|
| Today | 1.00 |
| Yesterday | 0.75 |
| 2 days ago | 0.55 |
| 3 days ago | 0.35 |
| 4 days ago | 0.20 |

Formula:

```js
rollingScore =
  todayLoad * 1.00 +
  yesterdayLoad * 0.75 +
  twoDaysAgoLoad * 0.55 +
  threeDaysAgoLoad * 0.35 +
  fourDaysAgoLoad * 0.20
```

### Classification

| Rolling score | Classification |
|---:|---|
| < 7 | Low |
| 7-11 | Moderate |
| > 11 | High |

These thresholds are heuristic and should be tuned after real use. The point is not perfect physiology; the point is explainable accumulated load.

---

## Strava run classification logic

Use Strava data to classify actual runs. This prevents the app from relying only on planned schedule.

Inputs:

- easyPaceSecPerKm from settings
- run pace from Strava
- run distance from Strava
- recent average run distance
- recent longest run

### Pace-based classification

Let `easyPace` be the user's easy pace.

| Condition | Classification |
|---|---|
| pace <= easyPace * 0.88 | Quality |
| pace <= easyPace * 0.93 | Tempo |
| otherwise | Easy |

Example:

If easy pace is 8:00/km:

- 7:30/km = still likely easy/moderate
- 7:05/km = tempo-ish
- 6:55/km = quality-ish

This should be adjusted if heart rate data exists later.

### Distance-based classification

Use recent baseline.

| Condition | Classification |
|---|---|
| distance >= averageRecentDistance * 1.4 | Long |
| distance > recentLongestRun * 1.10 | Long-run spike flag |

Distance classification should not override a very fast quality run automatically. If a run is both long and fast, classify it as quality-long or keep primary type as quality with an extra long-run-load note.

Recommended priority:

1. quality-long, if both very fast and unusually long
2. quality
3. tempo
4. long
5. easy

---

## Weekly workload logic

Calculate:

- currentWeekKm
- previousWeekKm
- last28DayKm
- currentWeekRuns
- plannedRunsThisWeek
- mileageIncreasePercent
- ACWR-style ratio

### Mileage spike thresholds

Do not make all spikes high risk.

| Condition | Base severity |
|---|---|
| +15% to +30% weekly mileage | Low/moderate |
| > +30% weekly mileage | Moderate |
| > +30% plus quality run/no rest/high rolling fatigue | High |
| ACWR > 1.3 | Moderate |
| ACWR > 1.5 | High only if paired with another stressor |

Reasoning:

For a hybrid athlete running only two days, percentages can look large because the base is small. Going from 8 km to 11 km is a 37.5% increase, but it may not be truly alarming if both runs are easy and gym stress is controlled. Therefore, the algorithm should use context.

---

## Planning logic for a 4 gym / 2 run / 1 rest hybrid athlete

Default weekly template:

| Day | Session |
|---|---|
| Monday | Push / Upper |
| Tuesday | Easy run |
| Wednesday | Pull / Upper |
| Thursday | Quality run |
| Friday | Legs |
| Saturday | Upper / Full body |
| Sunday | Rest |

This structure is reasonable because:

- easy run is placed after upper-body work
- quality run is separated from leg day by at least one night, but still close enough to train hard
- rest day follows the densest part of the week
- running frequency stays realistic for a lifter

However, if Thursday quality and Friday legs create repeated fatigue issues, the planner can suggest:

- move quality to Tuesday
- make Thursday tempo instead of intervals
- move legs away from quality if possible
- keep Tuesday easy and Thursday controlled tempo

The app should not automatically label Thursday quality + Friday legs as high risk. It should become high risk only if one or more of these are true:

- the Strava run was classified as quality-long
- rolling fatigue before Thursday was already high
- mileage spiked this week
- no true rest day exists
- Friday leg day plus Saturday full body stacks lower-body/systemic fatigue

---

## Conflict rules with better nuance

### 1. Quality run near leg day

Do not always mark as high.

| Situation | Severity |
|---|---|
| tempo one day before legs | Moderate |
| quality one day before legs | Moderate |
| quality before legs + high rolling fatigue | High |
| quality before legs + mileage spike | High |
| quality on same day as legs | High |

Message:

> Quality work is close to leg day. This can be acceptable, but because your recent load is elevated, consider reducing either the run intensity or lower-body volume.

---

### 2. Long run after leg day

| Situation | Severity |
|---|---|
| easy run after legs | Low / note only |
| long run after legs | Moderate |
| long run after legs + longest-run spike | High |
| long run after legs + no rest day | High |

Message:

> Long running after leg day adds lower-body fatigue. This is not automatically bad, but it may compromise recovery if volume is also increasing.

---

### 3. Mileage spike

| Situation | Severity |
|---|---|
| +15-30%, easy week, rest day present | Low note |
| +15-30% plus quality run | Moderate |
| >30% plus quality run/no rest/high rolling fatigue | High |

Message:

> Your mileage increased this week. That can be productive, but avoid combining a large volume jump with extra intensity.

---

### 4. Extra or missed runs

This is important because Strava can show what actually happened.

| Situation | Severity |
|---|---|
| planned 2, completed 2 | No warning |
| planned 2, completed 1 | Low note |
| planned 2, completed 3 easy runs | Low/moderate |
| planned 2, completed 3 with one quality run | Moderate |
| planned 2, completed 4+ | High if mileage also spikes |

Message:

> You ran more than planned. Extra easy running can be fine, but next week's plan should not automatically progress volume again.

---

### 5. No true rest day

A true rest day means:

- scheduled as rest
- no Strava run
- no gym workout

| Situation | Severity |
|---|---|
| no rest day, but low total load | Moderate |
| no rest day + high rolling fatigue | High |
| scheduled rest day replaced by easy run, another rest exists | Low/moderate |
| scheduled rest day replaced by run, no other rest exists | High |

Message:

> No true rest day was detected. This may be acceptable for a short block, but it should not become the default structure.

---

### 6. Back-to-back demanding days

Back-to-back hard days are not always bad. Many programs intentionally use high-low sequencing. The issue is repeated stacking.

| Situation | Severity |
|---|---|
| two demanding days followed by rest/easy | Low/moderate |
| three demanding days in a row | Moderate/high |
| two demanding days plus mileage spike | Moderate/high |
| quality + legs + full body over three days | High |

Message:

> You have several demanding sessions clustered together. This can work in a planned overload block, but the following day should be easy or rest.

---

## Overall risk calculation

The overall risk should not simply become high because one high-ish event exists.

Use weighted scoring.

### Conflict weights

| Severity | Points |
|---|---:|
| Low | 1 |
| Moderate | 2 |
| High | 4 |

### Risk level

| Total points | Risk |
|---:|---|
| 0-2 | Low |
| 3-5 | Moderate |
| 6+ | High |

Override to high only when:

- same-day legs + quality run
- no true rest day + high rolling fatigue
- mileage spike + high rolling fatigue + quality run
- extreme planned/actual mismatch

This avoids the beginner mistake where every hard session turns the system red.

---

## Coach-note style

Coach notes should be explanatory, not fearful.

Good examples:

> This week includes productive hard work, but the main load is clustered around Thursday-Friday. Keep the easy run genuinely easy or reduce leg-day volume slightly.

> Your Strava data shows one run was much faster than your easy pace, so the app treated it as a quality session.

> You completed more runs than planned. That may be fine, but the next plan should not increase distance again automatically.

Bad examples:

> This plan is dangerous.

> You are likely to get injured.

> Do not run before legs.

---

## Suggested product explanation

Use this in the interview:

> RunFuel uses Strava as the source of truth for completed running. It classifies each run using pace relative to the user's easy pace and distance relative to recent history. Then it combines those runs with the user's planned gym schedule to estimate rolling fatigue over several days. The detector does not punish hard training; it flags poor combinations like sudden mileage spikes, no true rest day, quality running stacked with leg day, or actual runs exceeding the plan. The goal is not injury prediction, but smarter hybrid-athlete planning.

---

## Implementation summary

The backend service should expose:

```js
analyzeTrainingLoad({
  userSettings,
  gymSchedule,
  stravaRuns,
  generatedPlan
})
```

It should return:

```js
{
  riskLevel: "low" | "moderate" | "high",
  weeklyRunStats: {
    currentWeekKm,
    previousWeekKm,
    last28DayKm,
    currentWeekRuns,
    plannedRunsThisWeek,
    mileageIncreasePercent,
    acwr
  },
  rollingFatigue: {
    todayScore,
    classification,
    scoresByDay
  },
  runClassifications: [],
  conflicts: [],
  coachNotes: []
}
```

---

## Limitations

This model is intentionally simple.

It does not include:

- sleep
- HRV
- resting heart rate
- soreness
- nutrition compliance
- injury history
- exercise-level gym volume
- heart-rate zones
- elevation gain
- surface type
- running power

Future versions can improve accuracy by adding:

- Apple Health / Garmin recovery data
- subjective readiness score
- RPE
- leg-day exercise detection
- heart-rate-based run classification
- deload week logic
- block periodization

For the interview demo, the current version is strong because it is:

- explainable
- deterministic
- grounded in real training principles
- useful for a real hybrid athlete
- scoped realistically for a small project

