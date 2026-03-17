#!/usr/bin/env python3
from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class LambdaBounds:
    min: float
    max: float


@dataclass(frozen=True)
class OUSearch:
    lo: float
    hi: float
    iters: int


@dataclass(frozen=True)
class OUAnchor:
    enabled: bool
    w: float
    p_over: float
    search: OUSearch
    quarter_line_mapping: dict[float, float]


@dataclass(frozen=True)
class PoissonParams:
    version: int
    low_score_factors: dict[tuple[int, int], float]
    max_goals: int
    lambda_bounds: LambdaBounds
    ou_anchor: OUAnchor


def _parse_score_key(key: str) -> tuple[int, int]:
    a, b = key.split(":")
    return int(a), int(b)


def load_params(path: str | Path) -> PoissonParams:
    raw = json.loads(Path(path).read_text(encoding="utf-8"))

    low_raw: dict[str, float] = raw.get("low_score_factors", {})
    low: dict[tuple[int, int], float] = {_parse_score_key(k): float(v) for k, v in low_raw.items()}

    lb = raw.get("lambda_bounds", {})
    lambda_bounds = LambdaBounds(min=float(lb.get("min", 0.4)), max=float(lb.get("max", 3.5)))

    ou = raw.get("ou_anchor", {})
    qmap_raw: dict[str, float] = ou.get("quarter_line_mapping", {}) or {}
    qmap: dict[float, float] = {float(k): float(v) for k, v in qmap_raw.items()}
    s = ou.get("search", {}) or {}
    ou_search = OUSearch(lo=float(s.get("lo", 0.2)), hi=float(s.get("hi", 6.0)), iters=int(s.get("iters", 20)))
    ou_anchor = OUAnchor(
        enabled=bool(ou.get("enabled", False)),
        w=float(ou.get("w", 0.25)),
        p_over=float(ou.get("p_over", 0.5)),
        search=ou_search,
        quarter_line_mapping=qmap,
    )

    return PoissonParams(
        version=int(raw.get("version", 1)),
        low_score_factors=low,
        max_goals=int(raw.get("max_goals", 8)),
        lambda_bounds=lambda_bounds,
        ou_anchor=ou_anchor,
    )


def clamp_lambda(lamb: float, bounds: LambdaBounds) -> float:
    return max(bounds.min, min(bounds.max, lamb))


def poisson_pmf(lamb: float, k: int) -> float:
    return math.exp(-lamb) * (lamb**k) / math.factorial(k)


def score_probs(
    L1: float,
    L2: float,
    *,
    params: PoissonParams,
    apply_low_score_factors: bool = True,
) -> list[tuple[tuple[int, int], float]]:
    max_goals = int(params.max_goals)
    low = params.low_score_factors if apply_low_score_factors else {}

    scores: list[tuple[tuple[int, int], float]] = []
    for i in range(max_goals):
        for j in range(max_goals):
            pr = poisson_pmf(L1, i) * poisson_pmf(L2, j)
            pr *= float(low.get((i, j), 1.0))
            scores.append(((i, j), pr))

    total = sum(pr for _, pr in scores)
    if total <= 0:
        raise ValueError("total probability is non-positive; check lambdas")
    normed = [((i, j), pr / total) for (i, j), pr in scores]
    normed.sort(key=lambda x: -x[1])
    return normed


def poisson_cdf_leq(lamb: float, k: int) -> float:
    """P(T<=k). Use recurrence to avoid factorial in a loop."""
    if k < 0:
        return 0.0
    p0 = math.exp(-lamb)
    s = p0
    p = p0
    for t in range(1, k + 1):
        p = p * lamb / t
        s += p
    return s


def implied_line_half(line: float, *, quarter_line_mapping: dict[float, float]) -> float:
    """
    Map quarter lines to nearest half-line.
    Default mapping is configured in params. For example: 2.25 -> 2.5, 2.75 -> 3.0.
    """
    # Use exact mapping first (most explicit & safe)
    if line in quarter_line_mapping:
        return quarter_line_mapping[line]

    # Fallback: preserve original if not mapped
    return float(line)


def solve_lambda_for_over_prob(
    line_half: float,
    p_over: float,
    *,
    lo: float,
    hi: float,
    iters: int,
) -> float:
    """
    Solve λ s.t. P(T > line_half) ≈ p_over, where T ~ Poisson(λ).
    For half line 2.5/3.0/3.5, let k=floor(line), over=P(T>=k+1)=1-P(T<=k).
    """
    k = int(math.floor(line_half))
    l, r = float(lo), float(hi)
    for _ in range(int(iters)):
        mid = (l + r) / 2.0
        over = 1.0 - poisson_cdf_leq(mid, k)
        if over > p_over:
            r = mid
        else:
            l = mid
    return (l + r) / 2.0


def anchor_lambda_tot(
    L1: float,
    L2: float,
    *,
    line: float,
    params: PoissonParams,
) -> tuple[float, float, float, float]:
    """
    Light OU anchor. Returns (L1', L2', lambda_tot_raw, lambda_tot_anchored).
    """
    lam_tot = L1 + L2
    if lam_tot <= 0:
        raise ValueError("lambda_tot must be positive")

    ou = params.ou_anchor
    line_half = implied_line_half(float(line), quarter_line_mapping=ou.quarter_line_mapping)
    lam_mkt = solve_lambda_for_over_prob(
        line_half,
        float(ou.p_over),
        lo=float(ou.search.lo),
        hi=float(ou.search.hi),
        iters=int(ou.search.iters),
    )
    lam_tot2 = (1 - float(ou.w)) * lam_tot + float(ou.w) * lam_mkt
    L1p = lam_tot2 * (L1 / lam_tot)
    L2p = lam_tot2 * (L2 / lam_tot)
    return L1p, L2p, lam_tot, lam_tot2


def format_top(scores: Iterable[tuple[tuple[int, int], float]], n: int) -> list[tuple[str, float]]:
    out: list[tuple[str, float]] = []
    for (i, j), pr in list(scores)[:n]:
        out.append((f"{i}:{j}", pr))
    return out

