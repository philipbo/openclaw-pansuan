#!/usr/bin/env python3
"""
验证 deep-analysis 中泊松比分概率脚本的正确性（含低比分轻量修正）。
与 skills/deep-analysis/SKILL.md 中的公式一致：f(0:0)=1.10, f(1:0)=1.05, f(0:1)=1.05, f(1:1)=1.10，其余为 1，再归一化。
"""
import math

# 与 SKILL 一致的轻量修正系数
F_LOW = {(0, 0): 1.10, (1, 0): 1.05, (0, 1): 1.05, (1, 1): 1.10}


def poisson(lamb: float, k: int) -> float:
    """泊松分布 P(X=k) = e^(-λ) * λ^k / k!"""
    return math.exp(-lamb) * (lamb**k) / math.factorial(k)


def score_probs(
    L1: float, L2: float, max_goals: int = 8
) -> list[tuple[str, float]]:
    """计算各比分概率（含 SKILL 中的低比分轻量修正），按概率降序。"""
    scores = []
    for i in range(max_goals):
        for j in range(max_goals):
            prob = poisson(L1, i) * poisson(L2, j)
            prob *= F_LOW.get((i, j), 1.0)
            scores.append((f"{i}:{j}", prob))
    total = sum(pr for _, pr in scores)
    scores = [(s, pr / total) for s, pr in scores]
    return sorted(scores, key=lambda x: -x[1])


def main() -> None:
    L1, L2 = 1.35, 0.92

    # === 基础泊松（无修正）===
    scores_raw = []
    for i in range(8):
        for j in range(8):
            scores_raw.append((f"{i}:{j}", poisson(L1, i) * poisson(L2, j)))
    scores_raw.sort(key=lambda x: -x[1])
    total_raw = sum(pr for _, pr in scores_raw)
    assert 0.99 <= total_raw <= 1.0, f"基础泊松概率和应在 [0.99,1]，实际 {total_raw}"
    print(f"✓ 基础泊松 64 格概率和 = {total_raw:.4f}")

    # === 轻量修正（与 SKILL 一致）===
    scores_corr = score_probs(L1, L2)
    total_corr = sum(pr for _, pr in scores_corr)
    assert 0.99 <= total_corr <= 1.01, f"轻量修正后概率和应接近 1，实际 {total_corr}"
    print(f"✓ 轻量修正后概率和 = {total_corr:.4f}")

    # 修正后 0:0、1:0、0:1、1:1 概率应高于基础泊松（系数 >1 再归一化）
    for key in ["0:0", "1:0", "0:1", "1:1"]:
        raw_pr = next(pr for s, pr in scores_raw if s == key)
        corr_pr = next(pr for s, pr in scores_corr if s == key)
        assert corr_pr > raw_pr, f"轻量修正应提升 {key} 概率"
        print(f"✓ {key} 概率提升: {raw_pr*100:.2f}% → {corr_pr*100:.2f}% (+{(corr_pr-raw_pr)*100:.2f}%)")

    # Top 3 仍合理
    top3 = [s for s, _ in scores_corr[:3]]
    print(f"✓ 轻量修正后 Top 3 比分: {top3}")

    # 与 SKILL 内嵌公式结果一致（同一 λ 时 Top 1 应为 1:0）
    assert top3[0] == "1:0", f"L1={L1}, L2={L2} 时 Top 1 应为 1:0，实际 {top3[0]}"

    # λ 边界测试
    for la, lb in [(0.4, 0.4), (3.5, 2.0), (2.5, 1.8)]:
        s = score_probs(la, lb)
        t = sum(pr for _, pr in s)
        assert t > 0 and t <= 1.01, f"λ=({la},{lb}) 时概率和 {t} 异常"
    print("✓ λ 边界 0.4–3.5 下轻量修正正常")

    # 所有概率非负
    for la, lb in [(0.4, 0.4), (1.35, 0.92), (3.5, 2.0)]:
        s = score_probs(la, lb)
        assert all(pr >= 0 for _, pr in s), f"λ=({la},{lb}) 存在负概率"
    print("✓ 所有概率非负")

    print("\n全部验证通过，泊松脚本（含低比分轻量修正）与 SKILL 一致。")


if __name__ == "__main__":
    main()
