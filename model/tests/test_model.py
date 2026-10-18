import numpy as np
import torch

from traceline_model.nn_model import DEFAULT_CFG, TracelineNet

NORM = torch.tensor([[25.0, 18.0], [12.0, 8.0], [20.0, 12.0], [-63.0, 7.0], [0.3, 0.5]])


def make(cfg=None):
    torch.manual_seed(0)
    return TracelineNet(cfg, NORM).eval()


def inputs(B=2, n_valid=5):
    torch.manual_seed(1)
    slots = torch.zeros(B, 8, 6)
    slots[..., 0] = torch.rand(B, 8) * 40
    slots[..., 1] = torch.rand(B, 8) * 20
    slots[..., 2] = torch.rand(B, 8) * 30 + 2
    slots[..., 3] = -50 - torch.rand(B, 8) * 30
    slots[:, :n_valid, 4] = 1.0
    return slots, torch.zeros(B, 2), torch.zeros(B, 1), torch.full((B, 1), 0.5), torch.zeros(B, 64)


def test_shapes_and_finite():
    o = make()(*inputs())
    assert o["position"].shape == (2, 2) and o["sigma"].shape == (2, 1)
    assert o["nlos_prob"].shape == (2, 8) and o["forecast"].shape == (2, 10, 2) and o["state_out"].shape == (2, 64)
    assert all(torch.isfinite(v).all() for v in o.values())
    assert (o["sigma"] > 0).all()


def test_invalid_slots_cannot_influence_output():
    m = make()
    a = inputs()
    b = [t.clone() for t in a]
    b[0][:, 5:, 2] = 999.0  # garbage in invalid slots
    b[0][:, 5:, 3] = 5.0
    oa, ob = m(*a), m(*b)
    assert torch.allclose(oa["position"], ob["position"], atol=1e-5)
    assert torch.allclose(oa["state_out"], ob["state_out"], atol=1e-5)
    assert (oa["nlos_prob"][:, 5:] == 0).all()


def test_all_invalid_is_finite_and_uses_previous_position():
    m = make()
    slots, prev, pv, dt, st = inputs(n_valid=0)
    prev = torch.tensor([[10.0, 5.0], [20.0, 9.0]])
    o = m(slots, prev, torch.ones(2, 1), dt, st)
    assert torch.isfinite(o["position"]).all()
    assert (o["position"] - prev).abs().max() < DEFAULT_CFG["delta_max_m"] + 1e-3  # coasts near the prior


def test_closed_form_fix_recovers_exact_ranges():
    m = make()
    pts = torch.tensor([[2.0, 2.0], [30.0, 2.0], [2.0, 18.0], [30.0, 18.0], [16.0, 10.0]])
    truth = torch.tensor([12.0, 7.0])
    slots = torch.zeros(1, 8, 6)
    slots[0, :5, 0:2] = pts
    slots[0, :5, 2] = (pts - truth).norm(dim=1)
    slots[0, :5, 3] = -60.0
    slots[0, :5, 4] = 1.0
    o = m(slots, torch.zeros(1, 2), torch.zeros(1, 1), torch.full((1, 1), 0.5), torch.zeros(1, 64))
    assert (o["p_ls"][0] - truth).norm() < 0.5


def test_state_depends_on_history_and_ablations_run():
    m = make()
    s, p, pv, dt, st = inputs()
    o1 = m(s, p, pv, dt, st)
    o2 = m(s, o1["position"], torch.ones(2, 1), dt, o1["state_out"])
    assert not torch.allclose(o1["state_out"], o2["state_out"])
    for cfg in ({"use_nlos": False}, {"use_temporal": False}, {"use_prediction": False}, {"use_crowd": True}):
        o = make(cfg)(s, p, pv, dt, st)
        assert all(torch.isfinite(v).all() for v in o.values())
    nt = make({"use_temporal": False})
    a = nt(s, p, pv, dt, st)["position"]
    b = nt(s, p + 7.0, torch.ones(2, 1), dt, st + 3.0)["position"]
    assert torch.allclose(a, b, atol=1e-6), "no_temporal ablation must ignore history"
