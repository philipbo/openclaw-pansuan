#!/usr/bin/env python3
"""
验证 deep-analysis 中泊松比分概率脚本的正确性。
与 skills/deep-analysis/SKILL.md 中的公式一致：P(比分 i:j) = P(主队进 i 球) × P(客队进 j 球)。
"""
import math


def poisson(lamb: float, k: int) -> float:
    """泊松分布 P(X=k) = e^(-λ) * λ^k / k!"""
    return math.exp(-lamb) * (lamb**k) / math.factorial(k)


def score_probs(L1: float, L2: float, max_goals: int = 8) -> list[tuple[str, float]]:
    """计算 0:0 到 (max_goals-1):(max_goals-1) 各比分概率，按概率降序。"""
    scores = [
        (f"{i}:{j}", poisson(L1, i) * poisson(L2, j))
        for i in range(max_goals)
        for j in range(max_goals)
    ]
    return sorted(scores, key=lambda x: -x[1])


def main() -> None:
    # 与 SKILL 中示例一致
    L1, L2 = 1.35, 0.92
    scores = score_probs(L1, L2)
    total = sum(pr for _, pr in scores)

    # 1. 64 个比分概率之和应在 [0.99, 1]（截断在 7 球，8+ 球概率极小）
    assert 0.99 <= total <= 1.0, f"64 格概率之和应在 [0.99,1]，实际 {total}"
    print(f"✓ 64 个比分概率之和 = {total:.4f}（截断 0–7 球，合理）")

    # 2. 手算校验 1:0：P(主1)*P(客0)
    expect_10 = poisson(L1, 1) * poisson(L2, 0)
    got_10 = next(pr for s, pr in scores if s == "1:0")
    assert abs(expect_10 - got_10) < 1e-9, "泊松公式与手算 1:0 不一致"
    print(f"✓ 1:0 概率手算与脚本一致: {got_10*100:.2f}%")

    # 3. Top 3 与 SKILL 描述一致（主队略强、客队略弱 → 1:0 最高）
    top3 = [s for s, _ in scores[:3]]
    assert top3 == ["1:0", "1:1", "0:0"], f"Top 3 应为 1:0, 1:1, 0:0，实际 {top3}"
    print(f"✓ Top 3 比分: {top3}")

    # 4. λ 边界值（SKILL 中 λ ∈ [0.4, 3.5]）不报错；range(8) 后高 λ 概率和也应 > 0.97
    for la, lb in [(0.4, 0.4), (3.5, 2.0), (2.5, 1.8)]:
        s = score_probs(la, lb)
        t = sum(pr for _, pr in s)
        assert 0.97 <= t <= 1.0, f"λ=({la},{lb}) 时概率和 {t} 偏低"
    print("✓ λ 边界 0.4–3.5 下概率和均 > 97%")

    print("\n全部验证通过，泊松脚本正确。")
    return


if __name__ == "__main__":
    main()
