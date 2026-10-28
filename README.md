# 人体解剖 3D 图谱 (personbody)

面向医学学习的移动端 H5。可以在 3D 人体上旋转、缩放、点选结构，查看拉丁文 / 英文 / 中文术语、功能和临床要点，并支持搜索、测验、中英切换和 PWA 离线。

仅供学习参考，不能作为诊断或治疗依据。

## 功能

- 3D 查看：单指旋转，双指缩放平移，点选高亮，从搜索结果或信息面板的「定位」按钮飞到结构，前后左右上视角
- 图层：11 个系统独立开关和透明度，选中时淡化其他结构
- 操作：隐藏、单独显示、撤销，矢状 / 冠状 / 水平三种剖面
- 内容：68 个结构，三语术语、概述、结构、功能、临床要点，起止点 / 神经支配 / 血供可点击跳转
- 搜索：中文、英文、拉丁文、同义词、拼音全拼和首字母
- 测验：点选、识图、术语互译三种题型，可按系统出题，错题本和最高分存在 IndexedDB
- 界面中英切换，可添加到主屏幕

## 技术栈

Vue 3 + Vite + TypeScript，Pinia，Vue Router（hash 模式，任意静态主机可部署），vue-i18n，Three.js，camera-controls，three-mesh-bvh（点选加速），Fuse.js + pinyin-pro（搜索），zod（内容校验），idb-keyval，vite-plugin-pwa。依赖版本均锁定为精确版本。

## 快速开始

开发环境为 Node 25.8、pnpm 10.32。`pipeline/tools` 下的脚本直接用 `node` 运行 `.ts` 文件，依赖 Node 原生的 TypeScript 支持，较旧的 Node 版本可能跑不了。

```bash
pnpm install
pnpm dev          # 开发服务器 http://localhost:5173
pnpm build        # 类型检查 + 生产构建
pnpm preview      # 预览构建结果
pnpm test         # 单元测试 (Vitest)
pnpm typecheck
pnpm exec playwright test   # 浏览器冒烟测试，使用本机已装的 Chrome
```

手机预览：`pnpm dev --host`，同一 Wi-Fi 下访问终端打印的局域网地址。该模式监听所有网卡且无认证，不要在不受信任的网络里使用。

## 目录结构

```
src/
  content/       解剖内容：schema.ts（zod 校验）和 structures/*.json（按系统分文件）
  viewer/        AnatomyViewer（Three.js 封装）、loadModels、visibility、占位几何
  stores/        Pinia：viewer（选择、图层、剖面）、settings（语言）
  search/ quiz/  搜索索引；出题逻辑和本地存储
  views/ components/  Explore、Quiz、About 与面板组件
  i18n/          界面文案 zh / en
pipeline/
  structure_map.json  内容 id 到源模型节点的映射
  tools/              convert.ts、extract.ts、nodeFilter.ts、bounds.mjs
public/models/        生成的 glb 与 manifest.json（已提交，约 5.6 MB）
tests/                unit（Vitest）与 e2e（Playwright）
```

坐标约定：单位米，+y 向上，人体面朝 +z，人体右侧在 -x。

## 3D 模型来源与重新生成

模型来自 Z-Anatomy（`LluisV/Z-Anatomy`，`PC-Version` 分支），几何数据主要源自 BodyParts3D。仓库里已提交处理好的 `public/models/*.glb`，日常开发不需要重新生成。

重新生成的步骤：

1. 把 `Resources/Models/FBX` 下的 9 个 FBX（共约 230 MB）下载到 `pipeline/source/fbx/`（已被 `.gitignore` 排除）：`SkeletalSystem100`、`MuscularSystem100`、`CardioVascular41`、`NervousSystem100`、`VisceralSystem100`、`LymphoidOrgans100`、`Joints100`、`References100`、`Regions of human body100`。大文件可能被连接重置，可用 `curl -C -` 断点续传。
2. `pnpm models:convert`：用 FBX2glTF 转成 glb，输出到 `pipeline/build/glb/`。
3. `pnpm models:extract [系统名]`：按 `structure_map.json` 抽取、减面、压缩，输出 `public/models/*.glb` 并更新 `manifest.json`。

节点命名约定（见 `nodeFilter.ts`）：`.r` / `.l` 是左右实体，无后缀是中线结构，`.g` 是分组，`.j .t .s .i` 是标注锚点，`.o* .e*` 是画在骨上的肌肉起止点，后几类会被丢弃。映射表里名字前加 `=` 表示只取该节点自身网格，不带子节点（用于主动脉等挂着许多分支的节点）。

抽取时只保留位置和法线，材质由查看器统一指定。meshopt 压缩不量化顶点，因为点选用的 BVH 需要 float32 位置。

## 新增或修改内容

在 `src/content/structures/<系统>.json` 里加条目，字段见 `src/content/schema.ts`。`id` 必须与 `structure_map.json` 里的键一致，才能匹配到 3D 模型；没有对应模型时会使用 `placeholderBody.ts` 里的简化几何（需要在那里补一个构建函数）。`pnpm test` 会校验 schema、id 唯一和关联引用是否存在。

## 许可与署名

- 模型：Z-Anatomy，CC BY-SA 4.0；几何源自 BodyParts3D（DBCLS），CC BY-SA 2.1 JP。衍生作品须署名并以相同许可分发。
- 部分参考模型有额外条款：脑神经与孔道（Univ. of Dundee，CC BY 4.0）、内耳（CC BY-NC-SA 4.0）、肾脏（Lissie Cowley，CC BY-NC 4.0）。后两者仅限非商业使用。
- 中文术语应以《人体解剖学名词》为准。
- 本项目为个人学习用途，未用于商业。若要公开发布或商用，请先核对上述许可，并剔除非商用模型。

## 已知限制

- 子宫、卵巢、膈神经在源模型里没有，显示为简化占位，位置可能与真实骨骼对不齐。源模型为男性，默认性别设为男性。
- 皮肤由体表分区拼成，未验证是否为闭合外壳。
- 各系统的减面比例是估计值，个别细小结构可能被压得过狠。
- 68 条内容为初稿，没有经医学专业人员审校，也没有 FMA 编号。
- 渲染效果的自动化验证只覆盖「画布存在、模型加载成功、无报错」，缺口、穿模等视觉问题需要人工检查。
- 尚未实现：按系统下载离线包的设置页、iOS 主屏幕用的 PNG 图标。
