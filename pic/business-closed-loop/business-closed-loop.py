# -*- coding: utf-8 -*-
"""WMS 业务闭环图（主链路 + 反馈回路）
输出: business-closed-loop.png / business-closed-loop.svg
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

plt.rcParams["font.sans-serif"] = ["Microsoft YaHei", "SimHei", "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False

output_dir = os.path.dirname(os.path.abspath(__file__))

fig, ax = plt.subplots(figsize=(16, 9))
ax.set_xlim(0, 100)
ax.set_ylim(0, 100)
ax.axis("off")

def box(x, y, w, h, text, fc="white", fontsize=10.5, bold=False, ec="#455A64"):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.25,rounding_size=1",
                                facecolor=fc, edgecolor=ec, linewidth=1.4))
    ax.text(x + w / 2, y + h / 2, text, fontsize=fontsize, ha="center", va="center",
            fontweight="bold" if bold else "normal", color="#263238")

def arrow(x1, y1, x2, y2, lw=2.6, color="#2E7D32", ls="solid", rad=0.0):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle="-|>", mutation_scale=18,
                                 linewidth=lw, color=color, linestyle=ls,
                                 connectionstyle=f"arc3,rad={rad}", shrinkA=3, shrinkB=3))

# ---------- 主链路（五环，顺时针） ----------
MAIN = "#C8E6C9"
box(38, 82, 24, 12, "① 批次建档\n入库（6 种方式）\n批号+生产日期+有效期", fc=MAIN, bold=True)
box(74, 56, 24, 12, "② 库存监控\n批次余量 / 效期三色\n预警阈值监视", fc=MAIN, bold=True)
box(52, 26, 24, 12, "③ 销售等出库\n近效期 FIFO 逐批扣减\n超量拦截 + 出库单交付", fc=MAIN, bold=True)
box(8, 26, 24, 12, "④ 盘点复盘\n盘盈 PANDIAN- 批号入库\n盘亏近效期 FIFO 出库", fc=MAIN, bold=True)
box(2, 56, 24, 12, "⑤ 差异过账\n双账本事务同步\n库存状态刷新", fc=MAIN, bold=True)

# 主链路箭头（粗绿）
arrow(62, 86, 78, 68, lw=3.4)                    # ① → ②
arrow(86, 56, 72, 38, lw=3.4)                    # ② → ③
arrow(52, 30, 32, 30, lw=3.4)                    # ③ → ④（出库后触发周期盘点）
arrow(16, 38, 16, 56, lw=3.4)                    # ④ → ⑤
arrow(26, 64, 42, 82, lw=3.4)                    # ⑤ → ①（回流主链路）

# ---------- 反馈回路（虚线） ----------
box(38, 56, 22, 10, "对账校验任务（每日）\n批次余量合计 vs 总库存", fc="#FFCC80", bold=True, ec="#E65100")
box(38, 6, 24, 10, "效期预警回路\n临期批次优先出库", fc="#FFF9C4", ec="#F9A825")
box(70, 6, 26, 10, "KPI 看板 / 运营决策\n补货策略 · 周转分析", fc="#BBDEFB", ec="#1565C0")
box(4, 6, 26, 10, "质量回归回路（CI）\nv2 回归 77 例 + UI 冒烟", fc="#E1BEE7", ec="#6A1B9A")

arrow(49, 66, 49, 82, lw=1.8, color="#E65100", ls=(0, (4, 3)))            # 对账 → 建档链路监视
arrow(59, 61, 74, 61, lw=1.8, color="#E65100", ls=(0, (4, 3)))            # 对账 → 监控（漂移告警）
arrow(50, 16, 56, 26, lw=1.8, color="#F9A825", ls=(0, (4, 3)))            # 效期预警 → 出库
arrow(83, 16, 80, 26, lw=1.8, color="#1565C0", ls=(0, (4, 3)))            # 看板 → 出库策略
arrow(90, 16, 94, 56, lw=1.8, color="#1565C0", ls=(0, (4, 3)), rad=-0.25) # 看板 → 监控
arrow(14, 16, 12, 26, lw=1.8, color="#6A1B9A", ls=(0, (4, 3)))            # 回归 → 盘点/全链路质量

# 图例
ax.plot([4, 10], [97, 97], color="#2E7D32", lw=3.4)
ax.text(11.5, 97, "业务主链路", fontsize=10, va="center")
ax.plot([34, 40], [97, 97], color="#546E7A", lw=1.8, linestyle=(0, (4, 3)))
ax.text(41.5, 97, "反馈回路（对账 / 预警 / 看板 / 质量）", fontsize=10, va="center")

ax.set_title("WMS 仓库进销存管理系统 · 业务闭环图", fontsize=16, fontweight="bold", pad=12)
plt.tight_layout()
plt.savefig(os.path.join(output_dir, "business-closed-loop.png"), dpi=150, bbox_inches="tight", facecolor="white")
plt.savefig(os.path.join(output_dir, "business-closed-loop.svg"), bbox_inches="tight", facecolor="white")
plt.close()
print("OK:", os.path.join(output_dir, "business-closed-loop.png"))
