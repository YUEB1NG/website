# 参与贡献 / Contributing

请先复现问题并搜索已有 Issue。较大的视觉或交互改动先说明具体元素、触发动作和预期结果。保留已认可的星体、轨道、足球重组、封面数量、文字节奏与主题行为。

Reproduce the issue and search existing reports first. Discuss substantial interaction changes using a specific element, trigger and expected result. Preserve approved behaviour outside the requested scope.

## Checks

```sh
npm ci
npm run build
node --test tests/playlist.test.mjs tests/football-handoff.test.mjs tests/cover-picker.test.mjs tests/entrance.test.mjs
```

浏览器回归应同时记录视口、浏览器版本、日夜主题、减少动态效果和具体操作。现有 Python smoke 脚本依赖本机 agent-browser；并非上述 Node 单元测试的前置条件。手机视口不等于真实手机验收。

For browser regression, record viewport, browser, theme, reduced motion and the action sequence. Existing Python smoke scripts use agent-browser, separately from the Node suite. Mobile viewports are not physical-device tests.

## Pull requests

说明触发条件、修改后的行为和实际执行的检查。README 的中英文版本保持一致，第三方版权与来源保留。凭据、Cookie、令牌、私有日志与本机运行数据不进入 Git 或 Issue。

Describe the trigger, resulting behaviour and checks performed. Keep language variants aligned and preserve upstream notices. Keep credentials, Cookies, tokens, private logs and local runtime data out of Git and issues.

## 开源交付记录 / Public delivery records

每次开源交付使用 [记录模板](docs/development/TEMPLATE.md)，在 [开发记录](docs/development/README.md) 保存可核实的汇总统计、验证与部署状态。未知项写明未记录；历史快照不覆盖。密码、Key、Token、Cookie、原始日志及其他隐私不得提交，配置仅提供变量名与占位符。

For every open-source delivery, publish a dated, sanitized process record with known usage, timing, validation and release evidence. State missing data and scope. Keep all secret values and private logs out of the repository.
