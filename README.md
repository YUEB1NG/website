# YUEB1NG · Wabi Web

保留 quattro4maggi Wabi 主界面、imdaryl 蓝图开屏和 ped.ro 点击去模糊文字。公网地址：https://yueb1ng-wabi.fluffy-coot-8524.chatgpt.site 。

## 启动与构建

```powershell
npm install
npm run dev
npm run build
```

## 交互

- 上拖底部透明圈、点击 Start / 圆圈，或 Enter / ↑ 进入。点击星体回到透明圈，再次点击依次探索八大行星、月球和太阳。
- 全部星体以 0.045 rad/s 缓慢自转。长按 550ms 或按 O，将同一组头像连续移入倾斜轨道；再次长按释放。头像有前后遮挡，原生星环入轨时退场。
- 点击模糊姓名显示头像和悦饼。头像切换白天／动态星空，保存当前选择。点击悦饼切换正常的花边月饼，2.2秒后姓名恢复为英文。
- 点击 like，当前球体散成1500颗表面采色粒子，再于约2.15秒内重组为下一款历届世界杯球形足球：1930–2026 每届代表款及1930两种决赛用球，共24款，起始为2022 Al Rihla。它们是参照实物的原创风格化模型，并非官方纹理或精确工业模型。
- 点击 There 显示旋转奖杯，玻璃展柜、底座和 Argentina / MESSI 背景保持固定。
- everything 保持普通文字，无点击特效。
- 点击漂浮或入轨的小图标，会弹出足球、国旗、奖杯钥匙扣及短暂彩带。键盘可通过 Celebrate 按钮操作。
- Learn 点击前静止；点击1秒后开始第一次变化，后续等待7.5秒，淡出／淡入各0.3秒。整词固定宽度，不拆字。
- 下拖时 X 链接随手势提前淡出，避免被三行文字覆盖。全页禁用长按文字复制菜单。
- 系统减少动态效果会停下旋转和循环、跳过足球粒子过渡，保留点击操作。

## 当前素材边界

- @YUEB1NG 的真实 X 关注列表由用户延后提供；普通模式保留20张原版 Wabi 粒子。
- 指定小红书笔记短链接连接失败，未读取或复制其中的头衔图标。Google 世界杯决赛 Doodle 已作视觉参考，新增图标是原创矢量素材。

## 文件与验证

`src/main.ts` 管理手势和文字；`scene.ts` 保留星空／棱镜并计算漂浮路径；`planets.ts` 在同一个 Three.js 场景渲染星体和头像；`football.ts`、`football-transition.ts`、`keepsakes.ts`、`charms.ts` 分别提供足球、粒子重组、展品和徽章。透明圈与星体共用球心和半径，通过材质渐变衔接。

`python -X utf8 tests/browser-smoke.py` 执行当前完整交互检查（需先连接 agent-browser）；`tests/orbit-smoke.py` 检查长按与拖拽手势。截图和验证记录放在忽略目录 `artifacts/`。真实 iPhone Safari 尚未实机验证。
