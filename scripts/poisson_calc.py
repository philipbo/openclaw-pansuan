#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

from poisson_lib import anchor_lambda_tot, format_top, load_params, score_probs


def main() -> None:
    p = argparse.ArgumentParser(
        description="Poisson score probability calculator (with optional low-score correction and optional OU anchoring)."
    )
    p.add_argument("--l1", type=float, required=True, help="Home team expected goals (lambda1)")
    p.add_argument("--l2", type=float, required=True, help="Away team expected goals (lambda2)")
    p.add_argument(
        "--params",
        type=str,
        default=str(Path(__file__).resolve().parents[1] / "config" / "poisson_params.json"),
        help="Path to poisson params JSON (default: config/poisson_params.json)",
    )
    p.add_argument("--no-low-score-correction", action="store_true", help="Disable low-score correction factors")
    p.add_argument("--top", type=int, default=6, help="How many top scores to print (default: 6)")
    p.add_argument("--ou-line", type=float, default=None, help="Optional O/U line to anchor total lambda (e.g. 2.75)")

    args = p.parse_args()
    params = load_params(args.params)

    L1, L2 = float(args.l1), float(args.l2)
    if args.ou_line is not None and params.ou_anchor.enabled:
        L1, L2, tot_raw, tot_anch = anchor_lambda_tot(L1, L2, line=float(args.ou_line), params=params)
        print(f"OU anchor enabled: λtot {tot_raw:.2f} -> {tot_anch:.2f} (line={args.ou_line}, w={params.ou_anchor.w})")
        print(f"Anchored lambdas: L1={L1:.3f}, L2={L2:.3f}")
        print()
    elif args.ou_line is not None and not params.ou_anchor.enabled:
        print("OU anchor is disabled in params (ou_anchor.enabled=false). Ignoring --ou-line.\n")

    scores = score_probs(L1, L2, params=params, apply_low_score_factors=not args.no_low_score_correction)
    top = format_top(scores, int(args.top))

    print(f"λ1={L1:.3f}, λ2={L2:.3f} (max_goals={params.max_goals})")
    if args.no_low_score_correction:
        print("low-score correction: DISABLED")
    else:
        print("low-score correction: ENABLED")
    print()
    for idx, (s, pr) in enumerate(top, start=1):
        fair = 1.0 / pr if pr > 0 else float("inf")
        print(f"{idx:>2}. {s:>3}  {pr*100:>6.2f}%   fair_odds={fair:>.2f}")


if __name__ == "__main__":
    main()

