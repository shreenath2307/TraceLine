import numpy as np

from traceline_model.geometry import los_blocked, path_crowd_density, point_in_polygon

WALL = np.array([[5.0, -5.0, 5.0, 5.0]])  # vertical wall at x=5


def test_crossing_is_blocked():
    assert los_blocked(np.array([[0.0, 0.0]]), np.array([[10.0, 0.0]]), WALL)[0, 0]


def test_same_side_not_blocked():
    assert not los_blocked(np.array([[0.0, 0.0]]), np.array([[4.0, 3.0]]), WALL)[0, 0]


def test_parallel_not_blocked():
    assert not los_blocked(np.array([[6.0, -3.0]]), np.array([[6.0, 3.0]]), WALL)[0, 0]


def test_endpoint_touching_wall_is_not_blocked():
    # anchor sits exactly on the wall; the segment only touches at its endpoint
    assert not los_blocked(np.array([[0.0, 0.0]]), np.array([[5.0, 0.0]]), WALL)[0, 0]


def test_segment_ending_beyond_wall_end_not_blocked():
    assert not los_blocked(np.array([[0.0, 7.0]]), np.array([[10.0, 7.0]]), WALL)[0, 0]


def test_point_in_polygon_and_crowd():
    poly = np.array([[0, 0], [4, 0], [4, 4], [0, 4]], float)
    assert point_in_polygon(np.array([[2.0, 2.0], [5.0, 2.0]]), poly).tolist() == [True, False]
    d = path_crowd_density(np.array([[2.0, 2.0]]), np.array([[2.0, 3.0]]), [poly], np.array([[2.0]]))
    assert abs(d[0, 0] - 2.0) < 1e-9  # whole path inside a 2 people/m^2 zone
