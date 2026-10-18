from traceline_model.explain import explain

IDS = [0, 1, 2, 3, None, None, None, None]


def base(**kw):
    a = dict(anchor_ids=IDS, valid=[True, True, True, True, False, False, False, False], nlos_prob=[0.1] * 8,
             weights=[0.9] * 8, range_m=[5.0, 5.0, 5.0, 5.0, 0, 0, 0, 0], anchor_xy=[[3, 4], [3, -4], [-3, 4], [-3, -4]] + [[0, 0]] * 4,
             position=(0.0, 0.0), sigma_m=0.5)
    a.update(kw)
    return a


def test_normal_case():
    e = explain(**base())
    assert e["used_anchor_ids"] == [0, 1, 2, 3] and e["downweighted_anchor_ids"] == [] and e["reason_codes"] == ["NORMAL"]


def test_blocked_anchor_is_traceable():
    p = [0.1] * 8
    p[2] = 0.9
    r = [5.0, 5.0, 7.5, 5.0] + [0] * 4
    e = explain(**base(nlos_prob=p, range_m=r))
    assert e["downweighted_anchor_ids"] == [2] and "NLOS_SUSPECTED:2" in e["reason_codes"]
    assert "Anchor 2 down-weighted, likely obstructed" in e["reason_text"] and "2.5 m longer" in e["reason_text"]


def test_missing_few_dead_reckoning_and_bounds():
    e = explain(**base(valid=[True, False, False, False] + [False] * 4, position=(60.0, 1.0), sigma_m=3.0), bounds=(50.0, 30.0))
    assert {"MISSING_READING:1", "FEW_ANCHORS", "HIGH_UNCERTAINTY", "OUT_OF_BOUNDS"} <= set(e["reason_codes"])
    e = explain(**base(valid=[False] * 8))
    assert "DEAD_RECKONING" in e["reason_codes"]
