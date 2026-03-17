#!/usr/bin/env python3
"""
验证泊松比分概率实现（含低比分轻量修正、OU 盘口锚定）的健全性。

注意：核心参数已集中在 config/poisson_params.json，避免 SKILL/脚本口径漂移。
"""

from pathlib import Path

from poisson_lib import anchor_lambda_tot, load_params, poisson_pmf, score_probs


def main() -> None:
    params = load_params(Path(__file__).resolve().parents[1] / "config" / "poisson_params.json")
    L1, L2 = 1.35, 0.92

    # === 基础泊松（无修正）===
    scores_raw = []
    for i in range(params.max_goals):
        for j in range(params.max_goals):
            scores_raw.append((f"{i}:{j}", poisson_pmf(L1, i) * poisson_pmf(L2, j)))
    scores_raw.sort(key=lambda x: -x[1])
    total_raw = sum(pr for _, pr in scores_raw)
    assert 0.99 <= total_raw <= 1.0, f"基础泊松概率和应在 [0.99,1]，实际 {total_raw}"
    print(f"✓ 基础泊松 64 格概率和 = {total_raw:.4f}")

    # === 轻量修正（与 SKILL 一致）===
    scores_corr = score_probs(L1, L2, params=params, apply_low_score_factors=True)
    total_corr = sum(pr for _, pr in scores_corr)
    assert 0.99 <= total_corr <= 1.01, f"轻量修正后概率和应接近 1，实际 {total_corr}"
    print(f"✓ 轻量修正后概率和 = {total_corr:.4f}")

    # 修正后 0:0、1:0、0:1、1:1 概率应高于基础泊松（系数 >1 再归一化）
    for key in ["0:0", "1:0", "0:1", "1:1"]:
        raw_pr = next(pr for s, pr in scores_raw if s == key)
        corr_pr = next(pr for (i, j), pr in scores_corr if f"{i}:{j}" == key)
        assert corr_pr > raw_pr, f"轻量修正应提升 {key} 概率"
        print(f"✓ {key} 概率提升: {raw_pr*100:.2f}% → {corr_pr*100:.2f}% (+{(corr_pr-raw_pr)*100:.2f}%)")

    # Top 4 展示口径
    top4 = [f"{i}:{j}" for (i, j), _ in scores_corr[:4]]
    print(f"✓ 轻量修正后 Top 4 比分: {top4}")

    # 与 SKILL 内嵌公式结果一致（同一 λ 时 Top 1 应为 1:0）
    assert top4[0] == "1:0", f"L1={L1}, L2={L2} 时 Top 1 应为 1:0，实际 {top4[0]}"

    # λ 边界测试
    for la, lb in [(0.4, 0.4), (3.5, 2.0), (2.5, 1.8)]:
        s = score_probs(la, lb, params=params, apply_low_score_factors=True)
        t = sum(pr for _, pr in s)
        assert t > 0 and t <= 1.01, f"λ=({la},{lb}) 时概率和 {t} 异常"
    print("✓ λ 边界 0.4–3.5 下轻量修正正常")

    # === A 方案：OU 盘口锚定（基础健全性检查）===
    # 例：盘口 2.75 近似为 3.0，取 p_over=0.50，则 λ_mkt 应接近 3 附近的常见水平（~3.0 左右）。
    L1a, L2a, tot_raw, tot_anch = anchor_lambda_tot(L1, L2, line=2.75, params=params)
    assert abs((L1a + L2a) - tot_anch) < 1e-9
    assert tot_anch > 0
    print(f"✓ OU 锚定：λtot {tot_raw:.2f} → {tot_anch:.2f}（line 2.75≈3.0, w={params.ou_anchor.w}, p_over={params.ou_anchor.p_over}）")

    # 所有概率非负
    for la, lb in [(0.4, 0.4), (1.35, 0.92), (3.5, 2.0)]:
        s = score_probs(la, lb, params=params, apply_low_score_factors=True)
        assert all(pr >= 0 for _, pr in s), f"λ=({la},{lb}) 存在负概率"
    print("✓ 所有概率非负")

    print("\n全部验证通过，泊松脚本（含低比分轻量修正）与 SKILL 一致。")


if __name__ == "__main__":
    main()
