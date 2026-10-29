# 开发过程统计 / Development record

![ASCII + Dither 开发统计海报](conversation-stats-20261029.png)

本记录公开项目开发的汇总数据，不公开原始对话、工具输入输出或登录信息。统计快照固定于 **2026-10-29 03:18（北京时间）**，后续制作图片、更新文档产生的用量不计入这一版。

- 项目：[YUEB1NG/website](https://github.com/YUEB1NG/website)
- 网站：[yueb1ng.com](https://yueb1ng.com/)
- 数据：[机器可读 JSON](conversation-stats-20261029.json)
- 复用：[后续开源项目记录模板](TEMPLATE.md)
- 图片：[PNG 原图](conversation-stats-20261029.png) · [制作说明与提示词](ARTWORK.md)

## Token 与活动

| 项目 | 数值 | 范围 |
| --- | ---: | --- |
| 累计 token | 290,441,085 | 主对话与关联子任务合计 |
| 输入 | 289,634,258 | 包含缓存输入 |
| 缓存输入 | 281,047,936 | 占输入 97.04% |
| 非缓存输入 | 8,586,322 | 输入减缓存输入 |
| 输出 | 806,827 | 包含推理输出 |
| 推理输出 | 238,026 | 输出的子集，不重复相加 |
| 对话轮数 | 105 | 主对话，按日志轮次定义 |
| 工具调用 | 1,915 | 主对话 |
| 标记失败的工具调用 | 148 | 不等于网站上线缺陷数 |
| 上下文压缩 | 14 | 主对话 |

累计 token 包括每次调用重复读取的历史上下文，**不是生成了 2.90 亿个新的文字 token**。缓存占输入的比例不等于实际费用折扣；本记录不将估算成本当作账单。

## 起止与时间分布

- 首次开始：**2026-10-14 20:10:24**，Asia/Shanghai。
- 截止记录：**2026-10-29 03:18:43**，Asia/Shanghai。
- 对话跨度：**14 天 7 小时 8 分钟**，包含离线、等待和暂停。
- 有计时覆盖：**100 / 105 轮**；另外 5 轮缺少完整计时。
- 可计时活动合计：**78 小时 14 分钟**，不等于人工工时。

| 活动类别 | 四舍五入到分钟 | 占比 |
| --- | ---: | ---: |
| 本地与工具执行 | 41 小时 26 分钟 | 52.96% |
| 模型相关时间 | 7 小时 18 分钟 | 9.33% |
| 无法归类 | 29 小时 30 分钟 | 37.71% |

模型相关时间包含网络、排队与响应等待，不能解释为纯 token 生成时间。其中已记录时间为 5,777,557 ms，估算时间为 20,501,222 ms。无法归类的时间不能归入模型时间。并行工具时间只计一次，活动统计排除轮次之间的间隔。

## 数据来源与局限

数据来自本地 Codex Trajectory 汇总读取，时间与 token 分别取样，相差数秒。仅导出明确允许公开的数字、时间和口径；没有上传原始日志、会话标识、本机路径或账号会话数据。

日志报告了轮次交叠和事件归属不一致，轮数及耗时应视为工具按日志重建的结果。工具计时无缺失或无效条目；有 95 次调用短于毫秒精度。完整毫秒值及计算字段保存在 JSON。

这是一份历史快照，不会在浏览器或 GitHub 中自动读取本机数据，也不增加网站运行依赖。更新时新增带日期的快照，不覆盖历史数字。

## English summary

This is a fixed, sanitized process snapshot at 2026-10-29 03:18 China Standard Time. Tokens include the main conversation and related agents; turns, tool calls and timing cover the main conversation only. Repeated context and cached input are included. Reasoning output is already included in output. Timing covers 100 of 105 turns, contains reconstruction warnings and includes estimated network/queueing waits. It is neither unique authored text, pure generation time, human working hours nor an actual bill.

The image is an AI-generated ASCII/dither-style illustration, visually checked against the JSON. It is not a website screenshot or the output of a deterministic ASCII renderer.
