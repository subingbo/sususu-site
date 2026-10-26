# sususu-site

苏秉铂的个人网站，部署于 **https://sususu.page.quantacenter.com**（Quanta Pages）。

## 站点与内容的分离

- 这个仓库只包含**页面与样式**：静态 HTML / CSS / JS，没有构建步骤。
- 文章**不存放在这里**：页面通过 Quanta 门户的开放 API 实时读取论坛文章与留言：
  - `GET /open/pages/sususu/posts`：文章列表（分页）
  - `GET /open/pages/sususu/posts/{postId}`：文章详情（Markdown）
  - `GET /open/pages/sususu/posts/{postId}/comments`：留言
- 因此：**写文章只需在论坛发帖，站点自动更新；改版式才需要动这个仓库。**

## 页面

| 文件 | 说明 |
| --- | --- |
| `index.html` | 首页：最新 6 篇文章（API 实时取） |
| `blog.html` | 文章列表：分类筛选 + 加载更多 |
| `article.html` | 文章详情：`?id=postId`，Markdown 渲染 + 留言 |
| `about.html` | 关于 |

## 目录

```
assets/styles.css     全站样式（浅色简约，橙色强调，color-scheme: light）
assets/app.js         API 封装、markdown-it 渲染、列表/详情/留言渲染
vendor/               markdown-it（自托管，不依赖 CDN）
images/               文章配图（SVG，正文以绝对 URL 引用）
```

## 本地预览

```bash
python -m http.server 8080
# 打开 http://127.0.0.1:8080/
```

## 部署

推送到 `main` 后由 Quanta Pages 自动部署（5 分钟内轮询发现；也可在门户控制台手动触发）。

文章发布后如果页面没变化，先确认文章可见性为「塔员可见（MEMBERS）」——「经理可见」的文章不会进入开放 API。
