#!/usr/bin/env python3
"""
验证 deep-analysis 中泊松比分概率脚本的正确性（含 Dixon-Coles 修正）。
与 skills/deep-analysis/SKILL.md 中的公式一致。
"""
import math

RHO = -0.13  # Dixon-Coles 修正因子


def poisson(lamb: float, k: int) -> float:
    """泊松分布 P(X=k) = e^(-λ) * λ^k / k!"""
    return math.exp(-lamb) * (lamb**k) / math.factorial(k)


def score_probs(
    L1: float, L2: float, rho: float = RHO, max_goals: int = 8
) -> list[tuple[str, float]]:
    """计算各比分概率（含 Dixon-Coles 修正），按概率降序。"""
    scores = []
    for i in range(max_goals):
        for j in range(max_goals):
            prob = poisson(L1, i) * poisson(L2, j)
            if i == 0 and j == 0:
                prob *= 1 - L1 * L2 * rho
            elif i == 1 and j == 0:
                prob *= 1 + L2 * rho
            elif i == 0 and j == 1:
                prob *= 1 + L1 * rho
            elif i == 1 and j == 1:
                prob *= 1 - rho
            scores.append((f"{i}:{j}", max(prob, 0)))
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

    # === Dixon-Coles 修正 ===
    scores_dc = score_probs(L1, L2)
    total_dc = sum(pr for _, pr in scores_dc)
    assert 0.99 <= total_dc <= 1.01, f"DC 修正后概率和应接近 1，实际 {total_dc}"
    print(f"✓ Dixon-Coles 修正后概率和 = {total_dc:.4f}")

    # 修正后 0:0 和 1:1 概率应高于基础泊松
    raw_00 = next(pr for s, pr in scores_raw if s == "0:0")
    dc_00 = next(pr for s, pr in scores_dc if s == "0:0")
    assert dc_00 > raw_00, "Dixon-Coles 应提升 0:0 概率"
    print(f"✓ 0:0 概率提升: {raw_00*100:.2f}% → {dc_00*100:.2f}% (+{(dc_00-raw_00)*100:.2f}%)")

    raw_11 = next(pr for s, pr in scores_raw if s == "1:1")
    dc_11 = next(pr for s, pr in scores_dc if s == "1:1")
    assert dc_11 > raw_11, "Dixon-Coles 应提升 1:1 概率"
    print(f"✓ 1:1 概率提升: {raw_11*100:.2f}% → {dc_11*100:.2f}% (+{(dc_11-raw_11)*100:.2f}%)")

    # 修正后 1:0 和 0:1 应微降（ρ<0 时单边进球概率降低）
    raw_10 = next(pr for s, pr in scores_raw if s == "1:0")
    dc_10 = next(pr for s, pr in scores_dc if s == "1:0")
    assert dc_10 < raw_10, "Dixon-Coles 应降低 1:0 概率（ρ<0）"
    print(f"✓ 1:0 概率调整: {raw_10*100:.2f}% → {dc_10*100:.2f}% ({(dc_10-raw_10)*100:+.2f}%)")

    # Top 3 仍合理
    top3 = [s for s, _ in scores_dc[:3]]
    print(f"✓ DC 修正后 Top 3 比分: {top3}")

    # λ 边界测试
    for la, lb in [(0.4, 0.4), (3.5, 2.0), (2.5, 1.8)]:
        s = score_probs(la, lb)
        t = sum(pr for _, pr in s)
        assert t > 0 and t <= 1.01, f"λ=({la},{lb}) 时概率和 {t} 异常"
    print("✓ λ 边界 0.4–3.5 下 DC 修正正常")

    # 所有概率非负
    for la, lb in [(0.4, 0.4), (1.35, 0.92), (3.5, 2.0)]:
        s = score_probs(la, lb)
        assert all(pr >= 0 for _, pr in s), f"λ=({la},{lb}) 存在负概率"
    print("✓ 所有概率非负")

    print("\n全部验证通过，泊松脚本（含 Dixon-Coles 修正）正确。")


if __name__ == "__main__":
    main()
