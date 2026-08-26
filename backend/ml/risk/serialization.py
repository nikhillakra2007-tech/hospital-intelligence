"""Serialization helpers shared between training and inference."""

from typing import Any

CANONICAL_LEVELS = ["Low", "Moderate", "High"]


def export_tree(tree: Any, class_order: list[str], canonical_levels: list[str]) -> dict[str, Any]:
    """Convert a sklearn tree_ into a JSON-safe structure.

    Leaf `value` arrays arrive in sklearn's internal class order; they are
    reordered into the canonical Low/Moderate/High order and normalised to
    probabilities so the pure-python engine matches sklearn's predict_proba.
    """
    idx = [class_order.index(c) for c in canonical_levels]
    feature = [int(v) for v in tree.feature]
    threshold = [float(v) for v in tree.threshold]
    children_left = [int(v) for v in tree.children_left]
    children_right = [int(v) for v in tree.children_right]

    proba: list[list[float]] = []
    for node_value in tree.value:
        counts = node_value[0]
        total = float(sum(counts))
        vec = [float(counts[i]) / total for i in idx] if total > 0 else [0.0] * len(idx)
        proba.append(vec)

    return {
        "feature": feature,
        "threshold": threshold,
        "children_left": children_left,
        "children_right": children_right,
        "proba": proba,
    }


def tree_predict_proba(tree_json: dict[str, Any], x: list[float]) -> list[float]:
    node = 0
    while True:
        left = tree_json["children_left"][node]
        right = tree_json["children_right"][node]
        if left == -1 and right == -1:
            return tree_json["proba"][node]
        feature_index = tree_json["feature"][node]
        threshold = tree_json["threshold"][node]
        go_left = x[feature_index] <= threshold
        node = left if go_left else right
        if node == -1:
            raise ValueError("Malformed tree traversal")


def forest_predict_proba(
    trees: list[dict[str, Any]], x: list[float], levels: list[str]
) -> tuple[float, str, dict[str, float]]:
    """Average tree probabilities (sklearn RandomForest semantics)."""
    n = len(levels)
    acc = [0.0] * n
    for tree_json in trees:
        proba = tree_predict_proba(tree_json, x)
        for i in range(n):
            acc[i] += proba[i]
    averaged = [v / len(trees) for v in acc]
    distribution = {level: round(averaged[i], 4) for i, level in enumerate(levels)}
    best_index = max(range(n), key=lambda i: averaged[i])
    return averaged[best_index], levels[best_index], distribution
