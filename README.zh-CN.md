<div align="center">

# Gold Market Analytics

**AI 驱动的贵金属市场实时分析仪表盘**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](#许可证)

[English](README.md) | [简体中文](README.zh-CN.md)

</div>

---

Gold Market Analytics 将实时市场数据、多因子信号引擎与 AI 分析报告相结合，帮助你一目了然地掌握贵金属市场动态。

## 功能特性

- **实时行情** — 通过 Yahoo Finance 获取黄金、白银、VIX、美元指数实时价格
- **复合信号引擎** — 基于 6 个加权因子计算看涨 / 看跌 / 中性信号及置信度评分
- **AI 市场报告** — 每日分析报告，包含市场展望与风险评估
- **多 AI 供应商支持** — 通过环境变量灵活切换 OpenAI、Anthropic Claude 和 Google Gemini
- **交互式图表** — K 线图支持 6 个时间周期（1 天 → 5 年）
- **深色 / 浅色主题** — 自动检测系统偏好，支持手动切换
- **自动刷新** — 仪表盘每 60 秒自动更新，显示最后更新时间

https://gold.ai-webapp.com/

<img width="1256" height="750" alt="Screenshot 2026-03-09 at 11 51 56 PM" src="https://github.com/user-attachments/assets/4464ca58-4265-466b-88f0-0a224bccf45a" />
<img width="1242" height="641" alt="Screenshot 2026-03-09 at 11 52 08 PM" src="https://github.com/user-attachments/assets/8b46f89c-760e-4225-9d68-cea3e691fe40" />

## 快速开始

### 前置要求

- Node.js 18+
- [FRED API 密钥](https://fred.stlouisfed.org/docs/api/api_key.html)（免费申请）
- AI 供应商 API 密钥（OpenAI、Anthropic 或 Google Gemini）

### 安装

```bash
git clone https://github.com/vincentyangch/gold-market-analytics.git
cd gold-market-analytics
npm install
```

### 配置

复制示例环境变量文件并填入密钥：

```bash
cp .env.example .env.local
```

```env
FRED_API_KEY=your_fred_api_key
AI_PROVIDER=openai              # openai | anthropic | gemini
AI_API_KEY=your_api_key
AI_BASE_URL=https://api.openai.com   # 可选，用于代理
AI_MODEL=gpt-4o                 # 供应商对应的模型名称
CRON_SECRET=your_secret
```

**各供应商默认模型：**

| 供应商 | 默认模型 | SDK |
|--------|---------|-----|
| `openai` | `gpt-4o` | 原生 fetch（Chat Completions API） |
| `anthropic` | `claude-sonnet-4-6` | @anthropic-ai/sdk |
| `gemini` | `gemini-2.0-flash` | 原生 fetch（Gemini REST API） |

### 运行

```bash
npm run dev          # 开发服务器 http://localhost:3000
npm run build        # 生产构建
npm start            # 启动生产服务器
npm run lint         # ESLint 代码检查
npx vitest           # 运行测试
```

## 系统架构

### 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 15（App Router） |
| 语言 | TypeScript 5、React 19 |
| 样式 | Tailwind CSS 3、next-themes |
| 图表 | lightweight-charts（TradingView） |
| 数据获取 | SWR（客户端）、fetch + unstable_cache（服务端） |
| 行情数据 | yahoo-finance2 |
| 宏观数据 | FRED API |
| AI | OpenAI / Anthropic / Gemini（可插拔） |
| 测试 | Vitest、Testing Library |

### 项目结构

```
app/
├── api/
│   ├── factors/route.ts              # 复合信号接口
│   ├── market/quotes/route.ts        # 实时报价
│   ├── market/history/route.ts       # OHLCV 历史数据
│   ├── reports/latest/route.ts       # 最新 AI 报告
│   └── cron/generate-report/route.ts # 报告生成触发器
├── layout.tsx                        # 根布局 + 主题供应商
└── page.tsx                          # 仪表盘页面

components/
├── dashboard/
│   ├── PriceCard.tsx                 # 价格展示卡片
│   ├── PriceChart.tsx                # K 线图
│   ├── TrendSignal.tsx               # 信号方向展示
│   ├── FactorBreakdown.tsx           # 因子评分侧边栏
│   ├── FactorCard.tsx                # 单个因子可视化
│   └── ReportCard.tsx                # AI 报告卡片（可展开）
└── layout/
    ├── Header.tsx                    # 导航栏、刷新、主题切换
    └── ThemeProvider.tsx             # next-themes 包装器

lib/
├── types.ts                          # 共享 TypeScript 接口
├── hooks/useMarketData.ts            # SWR hooks
├── ai/
│   ├── types.ts                      # AiProvider 接口
│   ├── factory.ts                    # 供应商工厂
│   └── providers/                    # OpenAI、Anthropic、Gemini
├── factors/                          # 6 个市场分析因子
├── data/                             # Yahoo Finance + FRED 集成
└── reports/                          # 报告生成 + 存储
```

### 因子引擎

复合信号由 6 个独立评分的因子计算得出，每个因子评分范围为 -1（看跌）到 +1（看涨）：

| 因子 | 权重 | 数据来源 | 逻辑 |
|------|------|----------|------|
| 实际利率 | 25% | FRED | 负实际利率利好黄金 |
| 技术指标 | 20% | Yahoo Finance | SMA 50/200 交叉、RSI 14 |
| VIX 波动率 | 15% | Yahoo Finance | 恐慌情绪升高 → 避险需求 |
| ETF 资金流 | 15% | Yahoo Finance (GLD) | 价格变动 × 成交量乘数 |
| 美元强弱 | 15% | Yahoo Finance (DXY) | 美元走强 = 黄金逆风 |
| 金银比 | 10% | Yahoo Finance | 偏离 1 年均值的程度 |

**信号阈值：** 看涨（评分 > 0.15）、看跌（评分 < -0.15）、中性（介于两者之间）

### API 接口

| 方法 | 端点 | 描述 | 缓存 |
|------|------|------|------|
| GET | `/api/market/quotes` | 实时报价（黄金、白银、VIX、DXY、GLD） | 1 分钟 |
| GET | `/api/market/history?symbol=GC=F&timeframe=1M` | OHLCV K 线数据 | 10 分钟 |
| GET | `/api/factors` | 复合信号 + 因子详情 | 2 分钟 |
| GET | `/api/reports/latest` | 最新 AI 生成报告 | 30 分钟 |
| GET | `/api/cron/generate-report` | 触发报告生成（需认证） | — |

### AI 报告生成

系统将市场数据和因子分析发送给配置的 AI 供应商，AI 返回结构化 JSON：

```json
{
  "summary": "2-3 句话的执行摘要",
  "factorAnalysis": "逐因子详细分析",
  "outlook": "1-2 周市场展望",
  "keyRisks": ["风险 1", "风险 2", "风险 3"]
}
```

报告以本地文件形式存储在 `.data/reports/{YYYY-MM-DD}.json`。

手动触发报告生成：

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/generate-report
```

#### 定时生成每日报告

可以设置定时任务，在美股收盘后自动调用接口生成报告。以下是几种方案：

**系统 crontab（Linux/macOS）：**

```bash
# 工作日每天北京时间上午 6 点执行（对应美东时间下午 6 点）
0 6 * * 2-6 curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/generate-report
```

**GitHub Actions：**

```yaml
# .github/workflows/daily-report.yml
name: Daily Market Report
on:
  schedule:
    - cron: '0 22 * * 1-5'   # UTC 22:00，根据时区调整
jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -s -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-domain.com/api/cron/generate-report
```

**其他方案：**
- [cron-job.org](https://cron-job.org) — 免费托管定时任务服务，无需服务器
- 云调度服务（AWS EventBridge、Google Cloud Scheduler）
- PM2：通过 `pm2 start cron.js` 运行定时调用脚本

> **提示：** 建议在美股收盘后执行（美东时间下午 4 点 / UTC 22:00），以获取最完整的当日数据。避免在周末执行 —— 期货市场交易时间有限，数据可能不够及时。

## 许可证

MIT
