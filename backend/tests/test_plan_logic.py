"""
Regression tests for plan generation logic.

WHY THIS FILE EXISTS
--------------------
Every check in here corresponds to a bug that actually shipped. They were found
one at a time by reading generated plans, and several were caused by the fix for
the previous one:

  - Fixing umbrella exercise names caused the mobile layout to overflow.
  - Fixing "World's Greatest Stretch" (grea-TEST-retch) with word boundaries
    caused "Pogo Hops" to stop matching, because \bhop\b misses the plural.
  - Adding the deload caused "Bodyweight — hold last week's weight" on planks.

Each of those was a regression in code written days earlier, and each one reached
a real plan because the test that would have caught it had been thrown away.
Anything checked here should stay checked.

HOW TO RUN
----------
    python backend/tests/test_plan_logic.py

No pytest, no network, no database. server.py cannot be imported directly (it
opens Mongo and Stripe connections at import time), so the pure functions are
lifted out of the source with ast instead. That means these run anywhere, in a
second, against whatever server.py currently says.
"""

import ast
import json
import os
import re
import sys

SERVER = os.path.join(os.path.dirname(__file__), "..", "server.py")

# The pure, side-effect-free functions under test.
WANTED = [
    "BLOCK_WEEKS", "DELOAD_EXPERIENCE", "PROGRESSION_GROWTH_CAP", "MEASURED_TERMS",
    "_growth_ceiling",
    "EQUIPMENT_FORBIDDEN", "FACILITY_TERMS", "COMMITMENT_DAY_TERMS", "PARTNER_TERMS",
    "EXPECTED_DAY_ORDER",
    "_is_measured", "_bump_numbers", "_bump_reps", "_is_timed_hold", "_cut_sets",
    "_progression_note", "_sanitise_progression", "_progress_exercise",
    "_hold_duplicate_movements", "_count_prescribed_sessions", "expand_template",
    "_is_commitment_day", "_forbidden_equipment_terms", "_forbidden_facility_terms",
    "_parse_minutes", "_parse_bodyweight_kg", "_estimate_session_minutes",
    "validate_plan", "validate_plan_semantics", "_repair_json",
    "_close_truncated_json", "_json_from_message", "autofix_workout_fields",
    "_summarise_logs_for_prompt",
]


def load():
    """Lift the pure functions out of server.py without importing it."""
    src = open(SERVER).read()
    ns = {"re": re, "json": json, "logger": _QuietLogger()}
    exec("from typing import List, Optional, Dict, Any", ns)
    for node in ast.parse(src).body:
        name = getattr(node, "name", None)
        if isinstance(node, ast.Assign):
            name = getattr(node.targets[0], "id", None)
        if name in WANTED:
            exec(compile(ast.Module([node], []), "<server>", "exec"), ns)
    missing = [n for n in WANTED if n not in ns]
    if missing:
        raise SystemExit(f"Not found in server.py (renamed or removed?): {missing}")
    return ns


class _QuietLogger:
    def warning(self, *a, **k):
        pass

    def info(self, *a, **k):
        pass


S = load()
DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]


# ---------------------------------------------------------------- helpers

def ex(name, sets, load="Moderate", ptype="none", increment=None, unit=""):
    prog = {"type": ptype}
    if increment is not None:
        prog["increment"] = increment
    if unit:
        prog["unit"] = unit
    return {
        "name": name, "sets": sets, "load": load, "rest": "90s", "demo": "d",
        "reason": "why", "cues": "how", "mistake": "watch",
        "easier": "easier", "harder": "harder", "progression": prog,
    }


def week(session_days, session_rows, other=None):
    """Build a 7-day template. `other` maps day -> (label, rows)."""
    other = other or {}
    days = []
    for d in DAYS:
        if d in session_days:
            days.append({"day": d, "label": "Gym Session", "focus": "Strength",
                         "workouts": [ex(*r) for r in session_rows]})
        elif d in other:
            label, rows = other[d]
            days.append({"day": d, "label": label, "focus": label,
                         "workouts": [ex(*r) for r in rows]})
        else:
            days.append({"day": d, "label": "Rest", "focus": "Recovery",
                         "workouts": [ex(f"Walk {d}", "30min", "Easy")]})
    return {"days": days}


def build(template, answers, notes=None):
    plan = {
        "template": json.loads(json.dumps(template)),
        "weekNotes": notes or ["Week 1 note.", "b", "c", "d"],
        "nutrition": {"meals": ["x"], "calories": 2500, "protein": 180},
        "recovery": {"protocols": ["x"]},
        "morningRoutine": [{"name": "Cat-Cow", "sets": "1x10", "load": "Bodyweight",
                            "rest": "—", "reason": "y", "progression": {}}],
    }
    S["expand_template"](plan, answers)
    return plan


def sets_across(plan, day_index, ex_index):
    return [plan["weeks"][w]["days"][day_index]["workouts"][ex_index]["sets"] for w in range(4)]


# ---------------------------------------------------------------- tests

def test_timed_hold_progresses_five_seconds_not_by_increment():
    """Copenhagen plank ran 20s, 45s, 70s: increment 5 was read as 5 REPS and
    multiplied by five again. A 70 second Copenhagen plank reached a real plan."""
    t = week(["Mon"], [("Copenhagen Plank", "3x20s each side", "Bodyweight", "reps", 5)])
    p = build(t, {"experience": "5+ years", "days": "1"})
    assert sets_across(p, 1, 0) == [
        "3x20s each side", "3x25s each side", "3x30s each side", "2x30s each side"
    ], sets_across(p, 1, 0)


def test_deload_holds_reps_and_cuts_sets():
    """Reps used to reset to the week 1 template AND sets were cut on top, so a
    calf raise went 3x19 -> 2x15: a 47% cut against a note promising a third."""
    t = week(["Mon"], [("Calf Raise", "3x15", "Bodyweight", "reps", 2)])
    p = build(t, {"experience": "5+ years", "days": "1"})
    assert sets_across(p, 1, 0) == ["3x15", "3x17", "3x19", "2x19"], sets_across(p, 1, 0)


def test_hold_last_weeks_weight_only_on_loaded_lifts():
    """"Bodyweight — hold last week's weight" appeared on planks and calf raises,
    and "Hard, RPE 7 — hold last week's weight" on a rowing interval."""
    t = week(["Mon"], [
        ("Trap Bar Deadlift", "4x5", "Moderate", "load", 5, "kg"),
        ("Nordic Hamstring Curl", "3x6", "Bodyweight", "reps", 1),
        ("Rowing Intervals", "6x2min", "Hard, RPE 7", "rounds", 1),
    ])
    p = build(t, {"experience": "5+ years", "days": "1"})
    loads = [w["load"] for w in p["weeks"][3]["days"][1]["workouts"]]
    assert "hold last week's weight" in loads[0], loads[0]
    assert loads[1] == "Bodyweight", loads[1]
    assert loads[2] == "Hard, RPE 7", loads[2]


def test_measured_movements_hold_volume_every_week():
    """Sprints were being given "add a set next week", taking 6x30m to 9x30m —
    a 50% jump in max-effort sprint volume on top of matches."""
    t = week(["Mon"], [("RSA Shuttle Sprints", "6x30m", "Max effort", "rounds", 1)])
    p = build(t, {"experience": "5+ years", "days": "1"})
    assert sets_across(p, 1, 0) == ["6x30m"] * 4, sets_across(p, 1, 0)


def test_measured_terms_match_singular_and_plural():
    """Word boundaries fixed "World's Greatest Stretch" but broke plurals:
    \bhop\b does not match "hops", so Pogo Hops escaped the guard entirely."""
    measured = [
        "Pogo Hops", "Ankle Hops", "Box Jumps", "Med Ball Throws", "Lateral Bounds",
        "Sprints", "Repeated Sprint Sets", "Broad Jump", "Lateral Hop to Stick",
        "Drop and Stick Landing", "45-Degree Cut Deceleration", "Y-Balance Reach",
    ]
    not_measured = [
        "World's Greatest Stretch", "Contest Prep Squat", "Trap Bar Deadlift",
        "Bench Press", "Nordic Hamstring Curl", "Copenhagen Plank", "Cat-Cow Stretch",
        "Bulgarian Split Squat", "Pallof Press", "Foam Rolling Full Body",
    ]
    for n in measured:
        assert S["_is_measured"](n), f"{n} should be measured"
    for n in not_measured:
        assert not S["_is_measured"](n), f"{n} should NOT be measured"


def test_bodyweight_never_gets_a_load_increment():
    """"Copenhagen Plank, Bodyweight — Add 1kg next week" reached a real plan."""
    out = S["_sanitise_progression"](
        ex("Copenhagen Plank", "3x20s each side", "Bodyweight", "load", 1, "kg")
    )
    assert out["progression"]["type"] != "load", out["progression"]


def test_time_progression_rejected_on_sets_format():
    """"3x20s each side" typed as time +5 would bump the SET count to 8x20s."""
    out = S["_sanitise_progression"](
        ex("Copenhagen Plank", "3x20s each side", "Bodyweight", "time", 5)
    )
    assert out["progression"]["type"] == "none", out["progression"]


def test_endurance_growth_is_capped_relative_to_the_start():
    """A fixed 45-minute ceiling froze a 5k/10k plan's long run: it STARTED at
    45, so every increment was clamped away while the row still said "add 4
    minutes next week". The cap is now relative to where the session began."""
    t = week(["Mon"], [("Long Run", "45min", "Conversational", "time", 4)])
    p = build(t, {"experience": "<1 year", "days": "1"})
    assert sets_across(p, 1, 0)[:3] == ["45min", "49min", "53min"], sets_across(p, 1, 0)

    # ...but it still cannot run away: 75% growth over the block is the ceiling.
    t2 = week(["Mon"], [("Easy Run", "20min", "Easy", "time", 20)])
    p2 = build(t2, {"experience": "<1 year", "days": "1"})
    assert sets_across(p2, 1, 0) == ["20min", "35min", "35min", "35min"], sets_across(p2, 1, 0)


def test_endurance_deloads_by_duration_not_sets():
    """A continuous run has no sets to cut, so _cut_sets left it alone and week
    4 simply repeated week 3: 30, 33, 36, 36 in a block themed Deload."""
    t = week(["Mon"], [("Easy Run", "30min", "Easy", "time", 3)])
    p = build(t, {"experience": "5+ years", "days": "1"})
    assert sets_across(p, 1, 0) == ["30min", "33min", "36min", "30min"], sets_across(p, 1, 0)


def test_duplicate_movement_progresses_once():
    """Nordic curls on Monday AND Wednesday both climbing meant the weekly total
    rose at twice the rate either row showed."""
    t = week([], [], other={
        "Mon": ("Lower", [("Nordic Hamstring Curl", "3x6", "Bodyweight", "reps", 1),
                          ("Back Squat", "4x6", "Moderate", "load", 5, "kg")]),
        "Wed": ("Lower", [("Nordic Hamstring Curl", "3x5", "Bodyweight", "reps", 1),
                          ("Back Squat", "4x6", "Moderate", "load", 5, "kg")]),
    })
    p = build(t, {"experience": "<1 year", "days": "2"})
    mon = sets_across(p, 1, 0)
    wed = sets_across(p, 3, 0)
    assert len(set(mon)) > 1, f"heavier instance should progress: {mon}"
    assert len(set(wed)) == 1, f"lighter instance should hold: {wed}"


def test_deload_only_for_experienced():
    """A beginner deloading in week 4 wastes a quarter of the block, and week 4
    is where beginners lose momentum and stop."""
    t = week(["Mon"], [("Back Squat", "4x6", "Moderate", "load", 5, "kg")])
    beginner = build(t, {"experience": "<1 year", "days": "1"})
    advanced = build(t, {"experience": "5+ years", "days": "1"})
    assert beginner["weeks"][3]["theme"] != "Deload"
    assert advanced["weeks"][3]["theme"] == "Deload"
    assert "deload" not in beginner["weeks"][3]["note"].lower(), beginner["weeks"][3]["note"]


def test_final_week_note_never_written_by_the_model():
    """The model wrote "Week 4: deload — sets and intensity drop back" onto a
    beginner's block where the reps actually went UP."""
    t = week(["Mon"], [("Back Squat", "4x6", "Moderate", "load", 5, "kg")])
    p = build(t, {"experience": "<1 year", "days": "1"},
              notes=["a", "b", "c", "Week 4: deload - sets and intensity drop back."])
    assert "deload" not in p["weeks"][3]["note"].lower(), p["weeks"][3]["note"]


def test_match_prep_counts_as_a_session_but_match_day_does_not():
    """Bare "match" matched "Light Match Prep", so a football week counted one
    fewer prescribed session than it actually had."""
    assert not S["_is_commitment_day"]({"label": "Light Match Prep", "focus": "", "day": "Fri"}, [])
    assert not S["_is_commitment_day"]({"label": "Pre-Match Activation", "focus": "", "day": "Fri"}, [])
    assert S["_is_commitment_day"]({"label": "Match Day", "focus": "", "day": "Sat"}, [])
    assert S["_is_commitment_day"]({"label": "Club Training", "focus": "", "day": "Tue"}, [])


def test_session_count_excludes_commitments_and_recovery():
    t = week(["Mon", "Tue", "Wed"], [("Back Squat", "4x6", "Moderate", "load", 5, "kg"),
                                     ("Bench Press", "4x6", "Moderate", "load", 2.5, "kg")],
             other={
                 "Thu": ("Club Training", [("Club Session", "Coach-led", "As directed")]),
                 "Fri": ("Movement Prep", [("High Knee Skip", "2x20m", "Easy"),
                                           ("Leg Swings", "1x10 each leg", "Bodyweight")]),
                 "Sat": ("Match Day", [("Warm-up Jog", "10min", "Easy")]),
                 "Sun": ("Active Recovery", [("Bike", "15min", "Easy")]),
             })
    n = S["_count_prescribed_sessions"](t["days"], ["Thu"])
    assert n == 4, f"expected Mon/Tue/Wed/Fri = 4, got {n}"


def test_shortfall_sentence_uses_the_real_count():
    """Asked to write this itself, the model said "four well-placed sessions" on
    a plan containing three."""
    t = week(["Mon", "Wed"], [("Back Squat", "4x6", "Moderate", "load", 5, "kg"),
                              ("Bench Press", "4x6", "Moderate", "load", 2.5, "kg")])
    p = build(t, {"experience": "5+ years", "days": "5"})
    note = p["weeks"][0]["note"]
    assert "two well-placed sessions" in note, note
    assert "You asked for five" in note, note

    # And no sentence at all when it delivered what was asked.
    p2 = build(t, {"experience": "5+ years", "days": "2"})
    assert "You asked for" not in p2["weeks"][0]["note"], p2["weeks"][0]["note"]


def test_redundant_rep_unit_stripped_everywhere():
    """"1x10 reps" survived in the morning routine because the strip only ran
    inside the measured branch."""
    out = S["_sanitise_progression"](ex("Cat-Cow", "1x10 reps", "Bodyweight", "none"))
    assert out["sets"] == "1x10", out["sets"]


def test_morning_routine_never_progresses_or_logs():
    """The model typed World's Greatest Stretch as a measured test, which would
    put a log button and "chase a better number" on a morning stretch."""
    t = week(["Mon"], [("Back Squat", "4x6", "Moderate", "load", 5, "kg")])
    plan = {
        "template": json.loads(json.dumps(t)),
        "weekNotes": ["a", "b", "c", "d"],
        "nutrition": {"meals": ["x"]}, "recovery": {"protocols": ["x"]},
        "morningRoutine": [
            {"name": "World's Greatest Stretch", "sets": "1x5 each side",
             "load": "Bodyweight", "rest": "—", "reason": "y",
             "progression": {"type": "measure"}},
        ],
    }
    S["expand_template"](plan, {"experience": "5+ years", "days": "1"})
    assert plan["morningRoutine"][0]["progression"] == {"type": "none"}


def test_bodyweight_parsing_rejects_nonsense():
    """A real answer was "85cm". The model assumed 85kg and was right by luck;
    "12" meaning stone would have produced a target for a toddler."""
    p = S["_parse_bodyweight_kg"]
    assert p("82kg") == 82
    assert p("82") == 82
    assert p("about 80kg") == 80
    assert 82 < p("13 stone") < 83
    assert 81 < p("180lbs") < 82
    for bad in ["85cm", "180cm", "5'11\"", "12", "300", ""]:
        assert p(bad) is None, f"{bad!r} should be rejected"


def test_json_repair_handles_every_malformation_seen():
    """All four came out of Railway logs. The missing-quote one is the exact
    text from 19 Aug: the model dropped both the closing quote and the comma."""
    broken = [
        '{"demo": "light jogging warm "reason": "Raises core temp."}',
        '{"name": "Step-up to 20" box", "sets": "3x8"}',
        '{"load": "75%" "rest": "90s", "x": 1}',
        '{"days":[{"a":1} {"b":2}]}',
        '{"a": 1, "b": 2,}',
    ]
    for raw in broken:
        json.loads(S["_repair_json"](raw))  # raises if still broken


def test_json_repair_leaves_valid_json_untouched():
    """A repair pass that corrupts good plans would be worse than the problem."""
    valid = [
        '{"a":1,"b":[{"c":"d, e: f"}],"g":"h"}',
        '{"a":"he said \\"hi\\" loudly"}',
        '{"name":"Farmer\'s Walk"}',
        '{"demo":"https://x.com/a?b=1"}',
        '{"reason":"Note: keep it light today"}',
    ]
    for raw in valid:
        assert json.loads(S["_repair_json"](raw)) == json.loads(raw), raw


def test_truncated_response_is_salvaged_not_discarded():
    """A 4-minute generation was binned for want of closing brackets."""
    full = json.dumps({
        "brand": "T", "nutrition": {"protein": 180}, "recovery": {"sleepTarget": "8h"},
        "morningRoutine": [{"name": "Cat-Cow"}],
        "template": {"days": [{"day": d, "label": "L", "workouts": [
            {"name": "Squat", "sets": "4x6"}]} for d in DAYS]},
    }, indent=2)
    for pct in range(55, 100, 5):
        out = S["_close_truncated_json"](full[:int(len(full) * pct / 100)])
        if out:
            plan = json.loads(out)  # must be valid JSON
            assert plan.get("nutrition", {}).get("protein") == 180, pct


def test_workout_field_repair():
    """Rows shipped with the movements in "sets" and nothing in "name", and with
    "As programmed by coach" squeezing the name to "A..". """
    plan = {"weeks": [{"days": [{"workouts": [
        {"name": "", "sets": "2x15m A-skip, 2x15m high knees", "reason": ""},
        {"name": "Club Session", "sets": "As programmed by coach", "reason": ""},
        {"name": "Back Squat", "sets": "4x6", "reason": "Main lift."},
    ]}]}]}
    S["autofix_workout_fields"](plan)
    rows = plan["weeks"][0]["days"][0]["workouts"]
    assert rows[0]["name"], "empty name should be repaired"
    assert rows[1]["sets"] == "Coach-led", rows[1]["sets"]
    assert rows[2]["sets"] == "4x6", "normal rows must be untouched"


def test_full_football_week_validates():
    """The whole pipeline on the hardest real case: club days, match day,
    measured drills, a deload and a shortfall sentence."""
    t = week(["Mon", "Wed"], [
        ("Trap Bar Deadlift", "4x5", "Moderate", "load", 2.5, "kg"),
        ("Nordic Hamstring Curl", "3x6", "Bodyweight", "reps", 1),
        ("Copenhagen Plank", "3x20s each side", "Bodyweight", "reps", 1),
        ("Repeated Sprint Sets", "6x30m", "Max effort", "measure"),
    ], other={
        "Tue": ("Club Training", [("Club Session", "Coach-led", "As directed")]),
        "Thu": ("Club Training", [("Club Session", "Coach-led", "As directed")]),
        "Sat": ("Match Day", [("Warm-up Jog", "10min", "Easy")]),
        "Sun": ("Active Recovery", [("Bike", "15min", "Easy")]),
    })
    answers = {"experience": "5+ years", "days": "3", "equipment": "Full gym",
               "session": "60 min", "training_with": "On my own",
               "club_days": ["Tue", "Thu"], "match_day": "Saturday"}
    p = build(t, answers)
    S["validate_plan"](p)
    S["validate_plan_semantics"](p, answers)
    assert len(p["weeks"]) == 4
    assert all(len(w["days"]) == 7 for w in p["weeks"])
    assert [d["day"] for d in p["weeks"][0]["days"]] == DAYS


def test_equipment_and_solo_rules_still_apply_off_commitment_days():
    """The commitment-day exemption must not become a hole: a partner drill on a
    normal gym day should still be caught."""
    t = week(["Mon"], [("Small-sided game", "1x20min", "Bodyweight")])
    answers = {"experience": "5+ years", "days": "1", "equipment": "Full gym",
               "session": "60 min", "training_with": "On my own"}
    p = build(t, answers)
    try:
        S["validate_plan_semantics"](p, answers)
        raise AssertionError("partner drill on a solo gym day should be flagged")
    except ValueError:
        pass


def test_log_summary_gives_the_next_block_real_evidence():
    """Block two is only worth paying for if it starts from what they actually
    lifted. Raw rows would bloat the prompt, so this is the per-exercise picture
    a coach would look at: where it ended, whether it moved, how it felt."""
    logs = []
    for wk, w in enumerate([100, 102.5, 105, 105], start=1):
        logs.append({"exercise_name": "Bench Press", "week_number": wk,
                     "value": f"{w}kg x 6", "rpe": "right", "logged_at": f"2026-08-0{wk}"})
    for wk in range(1, 5):
        logs.append({"exercise_name": "Trap Bar Deadlift", "week_number": wk,
                     "value": "140kg x 5", "rpe": "hard", "logged_at": f"2026-08-0{wk}"})
    out = S["_summarise_logs_for_prompt"](logs)

    assert "last 105kg" in out and "up 5kg" in out, out          # the lift that moved
    assert "no change across the block" in out, out               # the one that stalled
    assert "mostly felt 'hard'" in out, out                       # and how it felt
    assert S["_summarise_logs_for_prompt"]([]) == ""              # nothing logged, say nothing


# ---------------------------------------------------------------- runner

def main():
    tests = [(n, f) for n, f in sorted(globals().items())
             if n.startswith("test_") and callable(f)]
    failures = []
    for name, fn in tests:
        try:
            fn()
            print(f"  PASS  {name}")
        except Exception as exc:
            failures.append((name, exc))
            print(f"  FAIL  {name}\n          {exc}")
    print(f"\n{len(tests) - len(failures)}/{len(tests)} passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
