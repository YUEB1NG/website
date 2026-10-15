# Wabi · Web

以 quattro4maggi 的 Wabi 为主界面，接入 imdaryl.com 的蓝图开屏与 ped.ro 的字体和点击去模糊效果。

当前为 YUEB1NG 定制版：底部棱镜升起后变为 Three.js Q 版星球；点击回到透明圈，再次进入切换下一颗行星，循环八大行星。按设备当地时间 07:00–18:59 显示日间主题，其他时间显示夜间主题。英文姓名在点击后才与圆形细边框头像＋“悦饼”慢速交替显示。文字悬停改为蓝色，末句为 “I like to Learn / Build / Share everything.”，页脚链接为 `https://x.com/yueb1ng`。

## 启动

```powershell
npm install
npm run dev
```

打开终端显示的本地地址。生产构建：`npm run build`；预览构建：`npm run preview`。

## 交互

- 等待蓝图画完并向下擦除，或按 Escape 跳过开屏。
- 上拖底部圆球、点击「Swipe Up To Start」、点击圆球，或按 Enter / ↑ 进入。
- 点击模糊的姓名或 Learn / Build / Share，显示文字并开始慢速轮换；再次点击恢复模糊并停止轮换。文字区域宽度固定。
- 下拖圆球、按 Escape / ↓ 或点击左上返回箭头，回到起始状态。
- 起始状态点击左上箭头，重播蓝图开屏。
- 长按星球 550ms，将现有粒子聚成轨道；再长按恢复漂浮。键盘 O 也可切换。拖拽不会误触长按。真实 X 关注头像接入后沿用这个互动。
- 滚轮向下进入，向上返回。Tab 可访问按钮和链接。
- 系统开启「减少动态效果」时，跳过开屏、粒子和翻字，保留操作。

## 实现

| 文件 | 用途 |
| --- | --- |
| `src/main.ts` | 手势、原版弹簧、文字循环、交互状态 |
| `src/scene.ts` | WebGL 星空、46 张原版粒子、两遍渲染 |
| `src/prism.ts` | 原 BShader 的 GLSL 移植 |
| `src/planets.ts` | Three.js 八大行星、物理光照、Q 版表情与光环 |
| `src/theme.ts` | 当地时间昼夜切换与 Safari 背景同步 |
| `src/blueprint.ts` | 测量真实 DOM 布局、绘制蓝图、擦除转场 |
| `src/style.css` | 原版布局、ped.ro 字体与模糊交互 |
| `SOURCES.md` | 原始参考、沿用参数及平台差异 |

验证截图与检查结果在 `artifacts/`。部署站点：https://yueb1ng-wabi.fluffy-coot-8524.chatgpt.site 。X 关注头像由用户明确延后提供列表，当前保留原版粒子。Safari 修复有代码与模拟浏览器检查，仍需真实 iPhone 验证。
