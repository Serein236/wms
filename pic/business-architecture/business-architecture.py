# -*- coding: utf-8 -*-
"""WMS 三层业务架构图（接入层 → 业务能力层 → 基础能力层）
输出: business-architecture.png / business-architecture.svg
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

plt.rcParams["font.sans-serif"] = ["Microsoft YaHei", "SimHei", "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False

output_dir = os.path.dirname(os.path.abspath(__file__))

fig, ax = plt.subplots(figsize=(16, 10))
ax.set_xlim(0, 100)
ax.set_ylim(0, 100)
ax.axis("off")

LAYER_COLORS = {"access": "#E3F2FD", "biz": "#E8F5E9", "base": "#FFF3E0"}
BOX_EDGE = "#455A64"

def band(y, h, color, label):
    ax.add_patch(FancyBboxPatch((1, y), 98, h, boxstyle="round,pad=0.3,rounding_size=1.2",
                                facecolor=color, edgecolor="#90A4AE", linewidth=1.2))
    ax.text(2.5, y + h - 3.2, label, fontsize=13, fontweight="bold", color="#37474F", va="top")

def box(x, y, w, h, text, fc="white", fontsize=10, bold=False):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.2,rounding_size=0.8",
                                facecolor=fc, edgecolor=BOX_EDGE, linewidth=1.2))
    ax.text(x + w / 2, y + h / 2, text, fontsize=fontsize, ha="center", va="center",
            fontweight="bold" if bold else "normal", color="#263238")

def arrow(x1, y1, x2, y2, style="-", lw=1.4, color="#546E7A", ls="solid"):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle=style, mutation_scale=14,
                                 linewidth=lw, color=color, linestyle=ls,
                                 shrinkA=2, shrinkB=2))

# ---------- 三层背景 ----------
band(74, 25, LAYER_COLORS["access"], "接入层（用户 / 触点）")
band(38, 34, LAYER_COLORS["biz"], "业务能力层（核心业务模块）")
band(1, 35, LAYER_COLORS["base"], "基础能力层（底座 / 数据）")

# ---------- 接入层 ----------
box(6, 78, 24, 14, "仓库管理员 admin\nWeb SPA 作业端", fontsize=11, bold=True)
box(38, 78, 24, 14, "仓库操作员 user\nWeb SPA 查询端", fontsize=11, bold=True)
box(70, 78, 26, 14, "扫码枪 / Excel·CSV 文件\n批量录入通道", fontsize=11, bold=True)

# ---------- 业务能力层（两行） ----------
row1, row2 = 56, 42
w, h = 20, 10
box(3, row1, w, h, "商品中心\n商品/条码/预警阈值")
box(27, row1, w, h, "入库中心\n6 种入库方式", fc="#C8E6C9", bold=True)
box(51, row1, w, h, "出库中心\n近效期 FIFO", fc="#C8E6C9", bold=True)
box(75, row1, w, h, "批次库存中心\n批次余量/效期状态")
box(3, row2, w, h, "盘点中心\n差异过账闭环", fc="#C8E6C9", bold=True)
box(27, row2, w, h, "往来单位中心\n供应商/客户")
box(51, row2, w, h, "数据看板\nKPI/趋势/TOP10")
box(75, row2, w, h, "批量导入导出\n销售出库单")

# ---------- 基础能力层 ----------
brow1, brow2 = 20, 5
box(3, brow1, 28, 11, "认证与权限\nSession / requireAdmin / 限流", fc="#FFE0B2")
box(35, brow1, 30, 11, "库存账本与对账\nbatch_stock + stock_inventory\n事务同步 + 每日对账校验", fc="#FFCC80", bold=True)
box(69, brow1, 28, 11, "系统设置\n出入库方式/公司信息/参数", fc="#FFE0B2")
box(3, brow2, 28, 11, "备份恢复\n手动/自动/清理前自动", fc="#FFE0B2")
box(35, brow2, 30, 11, "数据存储\nMySQL 8.0 · 14 张表", fc="#FFECB3", bold=True)
box(69, brow2, 28, 11, "日志与文档\n操作/错误/访问日志 · Swagger", fc="#FFE0B2")

# ---------- 连接（粗线 = 主链路，虚线 = 异步/定时） ----------
# 接入层 → 业务能力层
arrow(18, 78, 37, row1 + h, lw=3.2, color="#2E7D32")          # admin → 入库（主链路）
arrow(22, 78, 61, row1 + h, lw=3.2, color="#2E7D32")          # admin → 出库（主链路）
arrow(14, 78, 13, row2 + h, lw=3.2, color="#2E7D32")          # admin → 盘点（主链路）
arrow(50, 78, 85, row1 + h)                                    # user → 批次库存
arrow(54, 78, 61, row2 + h)                                    # user → 看板
arrow(83, 78, 85, row2 + h)                                    # 批量通道 → 导入导出

# 业务能力层 → 基础能力层（主链路：库存写）
arrow(37, row1, 45, brow1 + 11, lw=3.2, color="#E65100")       # 入库 → 账本
arrow(61, row1, 55, brow1 + 11, lw=3.2, color="#E65100")       # 出库 → 账本
arrow(13, row2, 40, brow1 + 11, lw=3.2, color="#E65100")       # 盘点 → 账本
arrow(37, row1 + 2, 40, row2 + 6, ls=(0, (4, 3)))              # 入库 -.同步.-> 往来单位
arrow(61, row1 + 2, 47, row2 + 6, ls=(0, (4, 3)))              # 出库 -.同步.-> 往来单位
arrow(85, row1, 65, row2 + h)                                  # 批次库存 → 看板
arrow(61, brow1 + 11, 61, row2, ls=(0, (4, 3)), color="#C62828")  # 账本 -.对账告警.-> 看板
arrow(50, brow1, 50, brow2 + 11)                               # 账本 → 数据存储
arrow(17, brow1, 17, brow2 + 11)                               # 认证 → 存储
arrow(85, brow1, 85, brow2 + 11)                               # 设置 → 日志

# 图例
ax.plot([6, 12], [97.5, 97.5], color="#2E7D32", lw=3.2)
ax.text(13, 97.5, "主链路（库存核心作业）", fontsize=9, va="center")
ax.plot([40, 46], [97.5, 97.5], color="#546E7A", lw=1.4)
ax.text(47, 97.5, "同步调用", fontsize=9, va="center")
ax.plot([60, 66], [97.5, 97.5], color="#546E7A", lw=1.4, linestyle=(0, (4, 3)))
ax.text(67, 97.5, "异步 / 定时事件", fontsize=9, va="center")

ax.set_title("WMS 仓库进销存管理系统 · 三层业务架构图", fontsize=16, fontweight="bold", pad=12)
plt.tight_layout()
plt.savefig(os.path.join(output_dir, "business-architecture.png"), dpi=150, bbox_inches="tight", facecolor="white")
plt.savefig(os.path.join(output_dir, "business-architecture.svg"), bbox_inches="tight", facecolor="white")
plt.close()
print("OK:", os.path.join(output_dir, "business-architecture.png"))
