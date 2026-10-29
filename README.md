# sususu-site

苏秉铂的个人网站，部署于 **https://sususu.page.quantacenter.com**（Quanta Pages）。站点采用纸感文字风格（paper），集中展示后端项目、个人经历与技术文章。

## 站点与内容的分离

- 这个仓库只包含**页面与样式**：静态 HTML / CSS / JS，没有构建步骤。
- 文章**不存放在这里**：页面通过 Quanta 门户的开放 API 实时读取论坛文章与留言：
  - `GET /open/pages/sususu/posts`：文章列表（分页）
  - `GET /open/pages/sususu/posts/{postId}`：文章详情（Markdown）
  - `GET /open/pages/sususu/posts/{postId}/comments`：留言
- 因此：**写文章只需在论坛发帖，站点自动更新；改版式才需要动这个仓库。**

## 内容数据

- 首页资料、关于页与作品数据存放在两个公开 JSON 文件里，作为唯一数据源：
  - `content/site.json`：个人资料、技术标签、联系方式、教育、实习与能力。
  - `content/projects.json`：项目状态（published / draft / archived）、排序、文案、链接、封面与媒体列表。
- 页面用 `fetch(..., { cache: "no-cache" })` 同源读取；读取失败时保留 HTML / `assets/projects.js` 中的内置备份，并在页头显示提示。
- 头像优先使用 `profile.avatar` 指向的本地文件（`media/profile/avatar.webp`，由工作台上传）；留空时回退到 Quanta 资料头像，加载失败再显示姓名首字。
- 作品媒体统一放在 `media/projects/<project-slug>/`：图片为 WebP（最长边 1920px、≤2 MiB），视频为 H.264/AAC MP4（≤1080p、≤12 秒、≤18 MiB，附 WebP 封面）。
- 这些文件由本地内容工作台维护（编辑、上传、发布），也可以手动修改后提交。

## 文档

- 给同学的接入教程（从零到上线，含可复制示例）：[docs/open-api-guide.md](docs/open-api-guide.md)

## 页面

| 文件 | 说明 |
| --- | --- |
| `index.html` | 首页：最新 6 篇文章（API 实时取） |
| `blog.html` | 文章列表：分类筛选 + 加载更多 |
| `article.html` | 文章详情：`?id=postId`，Markdown 渲染 + 留言 |
| `projects.html` | 作品列表 |
| `project.html` | 作品详情：`?id=quanta-portal` 或 `?id=campus-map` |
| `about.html` | 教育、实习、能力与联系方式 |

## 目录

```
assets/styles.css     全站样式（米白纸底、衬线正文、细线分隔、砖红强调，color-scheme: light）
assets/app.js         API 封装、内容 JSON 加载、列表/详情/留言渲染
assets/projects.js    作品数据内置快照（内容 JSON 读取失败时兜底）
content/              site.json / projects.json 公开内容数据
media/                作品图片与视频（按项目 slug 分目录）
vendor/               markdown-it（自托管，不依赖 CDN）
images/               文章配图
tests/                零依赖 Node 验收测试
```

## 本地预览

```bash
python -m http.server 8080
# 打开 http://127.0.0.1:8080/
```

开放 API 只允许 Quanta Pages 子域访问，因此本地预览主要用于检查静态布局。运行自动化检查：

```bash
npm test
```

## 部署

推送到 `main` 后由 Quanta Pages 自动部署（5 分钟内轮询发现；也可在门户控制台手动触发）。

文章发布后如果页面没变化，先确认文章可见性为「塔员可见（MEMBERS）」——「经理可见」的文章不会进入开放 API。
