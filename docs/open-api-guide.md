# 个人网站接入 Quanta 开放数据 API：从零到「文章 + 留言」上线

> 面向对象：已经在 Quanta 门户开通「个人网站」的塔员
> 读完你会得到：一个显示你自己论坛文章列表、文章详情和留言的静态网站页面
> 不需要后端、不需要数据库、不需要 Token，只需要 HTML + 一点 JavaScript

参考实现：<https://sususu.page.quantacenter.com>（源码 <https://github.com/subingbo/sususu-site>）

---

## 1. 先理解这套东西怎么工作

你的个人网站是托管在 `https://{你的标识}.page.quantacenter.com` 的**纯静态页面**。文章不存放在网站仓库里，而是在每次打开页面时，由浏览器向门户的开放 API 请求：

```
浏览器（你的页面 JS）
   │  GET https://www.quantacenter.com/open/pages/{slug}/posts
   ▼
Quanta 门户开放 API（匿名只读，无需登录）
   │  查询论坛数据库：只取「站点主人 + 塔员可见」的文章
   ▼
返回 JSON（标题、摘要、Markdown 正文、留言）
   │
   ▼
你的页面用 JS 渲染成任意版式
```

由此得到两个重要结论：

1. **写文章不用改代码**：在论坛发一篇「塔员可见」的文章，刷新网站就能看到；改文章、删文章、别人留言同理。
2. **换版式不用碰文章**：文章内容永远来自 API，页面只负责展示。不要把文章复制进 HTML。

---

## 2. 前置条件

- 有 Quanta 账号，且已在门户「个人网站」创建站点（能打开 `https://{slug}.page.quantacenter.com`）
- 网站源码在一个 **GitHub 公开仓库**，并已配置为站点源（Pages 只接受公开仓库）
- 你的论坛文章可见性是 **「塔员可见 / MEMBERS」**（「经理可见 / MANAGERS」的文章不会出现在开放 API 中）

---

## 3. 找到你的接口地址

登录 `https://www.quantacenter.com` → 塔员门户 → **个人网站**，页面下方的「站点数据 API」区块会列出带你自己 slug 的三条地址。

假设你的站点标识是 `sususu`，接口就是：

```
GET https://www.quantacenter.com/open/pages/sususu/posts
GET https://www.quantacenter.com/open/pages/sususu/posts/{postId}
GET https://www.quantacenter.com/open/pages/sususu/posts/{postId}/comments
```

> 不需要任何密钥或登录。用浏览器直接打开第一条地址，就能看到 JSON。

---

## 4. 接口速查

### 4.1 文章列表

```
GET /open/pages/{slug}/posts?pageNum=1&pageSize=20
```

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `pageNum` | 否 | 页码，默认 1 |
| `pageSize` | 否 | 每页条数，默认 20，**最大 50** |

按发布时间倒序（最新的在前）。返回示例：

```json
{
  "msg": "操作成功",
  "code": 200,
  "data": {
    "items": [
      {
        "postId": 18,
        "title": "CPU Cache 原理、伪共享与缓存淘汰机制",
        "category": "TECH",
        "excerpt": "CPU Cache 是位于 CPU 与主存之间的高速缓存……",
        "commentCount": 0,
        "createdAt": "2026-10-26 15:02:11"
      }
    ],
    "total": 6,
    "pageNum": 1,
    "pageSize": 20
  }
}
```

- `category`：`TECH` / `PROJECT` / `LIFE`
- `excerpt`：已剥离 Markdown 语法的纯文本摘要（约 160 字）
- 只返回**站主本人**的文章，别人的不会混进来

### 4.2 文章详情

```
GET /open/pages/{slug}/posts/{postId}
```

```json
{
  "msg": "操作成功",
  "code": 200,
  "data": {
    "postId": 18,
    "title": "CPU Cache 原理、伪共享与缓存淘汰机制",
    "category": "TECH",
    "content": "# 标题\n\n正文的 Markdown 原文……",
    "commentCount": 0,
    "createdAt": "2026-10-26 15:02:11",
    "authorNickname": "苏秉铂"
  }
}
```

- `content` 是 **Markdown 原文**，由你的页面决定怎么渲染
- `authorNickname` 是站主的社区昵称，未设置时为空字符串

### 4.3 文章留言

```
GET /open/pages/{slug}/posts/{postId}/comments?pageNum=1&pageSize=20
```

```json
{
  "msg": "操作成功",
  "code": 200,
  "data": {
    "items": [
      {
        "commentId": 29,
        "parentId": null,
        "content": "写得好",
        "authorNickname": "小鹿",
        "replyToNickname": "",
        "createdAt": "2026-10-25 13:44:38"
      }
    ],
    "total": 1,
    "pageNum": 1,
    "pageSize": 20
  }
}
```

- 留言作者**只暴露社区昵称**（可能为空，建议前端显示为「塔员」），不会返回真实姓名、部门、头像或用户 ID
- 回复关系用 `parentId` / `replyToNickname` 表示

### 4.4 状态码与错误处理

这个 API 的错误使用**真实 HTTP 状态码**（不是「HTTP 200 + body 里 code 非 200」）：

| HTTP | 含义 | 建议处理 |
| --- | --- | --- |
| 200 | 成功 | 正常渲染 |
| 400 | 参数不合法（如 `pageNum=abc`） | 检查参数，不要重试 |
| 404 | 站点不存在 / 文章不属于你 / 文章非塔员可见 / 功能未开启 | 显示「暂无内容」 |
| 429 | 请求过于频繁（每 IP 每接口 60 秒 120 次） | 等待后重试，降低轮询频率 |
| 500 | 服务端异常 | 稍后重试 |

> 注意：错误响应体里也有 `code` 和 `msg`，但**请用 `response.ok` / `response.status` 判断成功与否**。

---

## 5. 十分钟上手：一个可用的单页示例

在仓库里新建 `posts.html`（文件名随意），把下面的内容整段复制进去，只改第一行的 `SLUG`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>我的文章</title>
  <!-- Markdown 渲染器；也可以下载到本地 vendor/ 自托管 -->
  <script src="https://cdn.jsdelivr.net/npm/markdown-it@14/dist/markdown-it.min.js"></script>
  <style>
    body { max-width: 720px; margin: 0 auto; padding: 32px 20px 80px;
           font: 16px/1.75 system-ui, -apple-system, "Segoe UI", sans-serif; color: #242529; background: #fff; }
    h1 { font-size: 28px; margin-bottom: 24px; }
    .post { padding: 16px 0; border-bottom: 1px solid #ececef; }
    .post button { all: unset; cursor: pointer; font-size: 18px; font-weight: 600; color: #242529; }
    .post button:hover { color: #f97316; }
    .meta { margin-top: 6px; font-size: 13px; color: #8a8a92; }
    .tag { display: inline-block; padding: 1px 8px; margin-right: 8px; border-radius: 999px;
           background: #fff3e8; color: #f97316; font-size: 12px; }
    #status { color: #8a8a92; }
    #detail { margin-top: 40px; }
    #detail img { max-width: 100%; }
    #detail pre { overflow: auto; padding: 14px; background: #f6f6f7; border-radius: 8px; }
    #detail blockquote { margin: 16px 0; padding: 8px 16px; border-left: 3px solid #f97316; background: #fafafa; }
    #comments { margin-top: 40px; }
    .comment { padding: 12px 0; border-bottom: 1px solid #f0f0f2; }
    .comment small { color: #8a8a92; }
    .comment p { margin: 6px 0 0; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>我的文章</h1>
  <div id="status">加载中…</div>
  <div id="list"></div>
  <div id="detail"></div>

  <script>
    // ===== 只改这一行：换成你自己的站点标识 =====
    const SLUG = 'sususu'
    const BASE = `https://www.quantacenter.com/open/pages/${SLUG}`
    const md = window.markdownit({ html: false, linkify: true })

    const statusEl = document.getElementById('status')
    const listEl = document.getElementById('list')
    const detailEl = document.getElementById('detail')

    async function request(path) {
      const response = await fetch(BASE + path)
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.msg || `请求失败（HTTP ${response.status}）`)
      }
      return body.data
    }

    function categoryLabel(category) {
      return { TECH: '技术', PROJECT: '项目', LIFE: '生活' }[category] || category || ''
    }

    async function showList() {
      const data = await request('/posts?pageNum=1&pageSize=20')
      if (!data.items.length) {
        statusEl.textContent = '还没有公开的文章'
        return
      }
      statusEl.textContent = `共 ${data.total} 篇`
      listEl.innerHTML = ''
      for (const post of data.items) {
        const item = document.createElement('div')
        item.className = 'post'
        const button = document.createElement('button')
        button.textContent = post.title
        button.addEventListener('click', () => showPost(post.postId))
        const meta = document.createElement('div')
        meta.className = 'meta'
        meta.textContent = `${post.createdAt} · ${post.commentCount} 条留言`
        const tag = document.createElement('span')
        tag.className = 'tag'
        tag.textContent = categoryLabel(post.category)
        item.append(tag, button, meta)
        listEl.appendChild(item)
      }
    }

    async function showPost(postId) {
      detailEl.innerHTML = '<p id="status">加载中…</p>'
      try {
        const post = await request(`/posts/${postId}`)
        const comments = await request(`/posts/${postId}/comments?pageNum=1&pageSize=50`)
        renderPost(post, comments)
        detailEl.scrollIntoView({ behavior: 'smooth' })
      } catch (error) {
        detailEl.innerHTML = ''
        detailEl.textContent = error.message
      }
    }

    function renderPost(post, comments) {
      detailEl.innerHTML = `
        <article>
          <h2></h2>
          <div class="meta"></div>
          <div class="content"></div>
        </article>
        <section id="comments">
          <h3>留言（${comments.total}）</h3>
          <div id="comment-list"></div>
        </section>`
      detailEl.querySelector('h2').textContent = post.title
      detailEl.querySelector('.meta').textContent =
        `${post.createdAt} · ${categoryLabel(post.category)}`
      // Markdown 渲染；html:false 可避免正文里的原始 HTML 被执行
      detailEl.querySelector('.content').innerHTML = md.render(post.content || '')

      const list = detailEl.querySelector('#comment-list')
      if (!comments.items.length) {
        list.innerHTML = '<p class="meta">还没有留言</p>'
        return
      }
      for (const comment of comments.items) {
        const wrapper = document.createElement('div')
        wrapper.className = 'comment'
        const meta = document.createElement('small')
        meta.textContent = `${comment.authorNickname || '塔员'} · ${comment.createdAt}`
        const text = document.createElement('p')
        text.textContent = comment.content
        wrapper.append(meta, text)
        list.appendChild(wrapper)
      }
    }

    showList().catch((error) => {
      statusEl.textContent = error.message
    })
  </script>
</body>
</html>
```

### 怎么验证

1. 把文件提交到你的网站仓库并推送。
2. 等 Pages 部署完成（自动轮询新提交，通常几分钟；门户控制台也能手动触发）。
3. 打开 `https://{你的标识}.page.quantacenter.com/posts.html`。

### 为什么不能本地直接双击打开测试

开放 API 的 CORS 白名单只放行 `https://{slug}.page.quantacenter.com` 这类 Pages 子域。用 `file://` 或 `http://localhost` 打开页面时，浏览器会拦截跨域请求（控制台报 CORS 错误）。这不代表接口坏了。

本地验证接口本身可以用浏览器直接打开 API 地址，或者：

```bash
curl "https://www.quantacenter.com/open/pages/sususu/posts?pageNum=1&pageSize=5"
```

---

## 6. 接进你现有的网站

上面的示例是独立页面。如果你已经有首页/列表页/详情页，按需拆分即可。

### 6.1 首页只显示最新 N 篇

```js
const data = await request('/posts?pageNum=1&pageSize=3')
```

拿到 `data.items` 后渲染成卡片即可，不需要请求详情。

### 6.2 列表页要「加载更多」

```js
let pageNum = 1
async function loadMore() {
  const data = await request(`/posts?pageNum=${pageNum}&pageSize=20`)
  // 追加 data.items
  pageNum += 1
}
```

判断是否还有更多：已加载条数 < `data.total`。

### 6.3 详情页用 `?id=` 取文章

```js
const postId = new URLSearchParams(location.search).get('id')
const post = await request(`/posts/${postId}`)
document.querySelector('#content').innerHTML = md.render(post.content)
```

### 6.4 Vue / React 项目

接口就是普通 GET JSON，和调用其他后端没有区别。注意构建产物是静态部署，**不要**在构建时抓取文章（那样文章就又被固定进产物了），应在组件挂载后用 `fetch` 请求。

```js
// Vue 3
const posts = ref([])
onMounted(async () => {
  const data = await request('/posts?pageNum=1&pageSize=20')
  posts.value = data.items
})
```

---

## 7. 常见坑（基本都是这几条）

### 7.1 文章在论坛里，但网站上没有

按顺序检查：

1. **作者是不是站主本人**：站点绑定的是你的账号，别人写的文章不会出现。
2. **可见性是不是「塔员可见」**：选「经理可见」的文章永远不返回。
3. 列表分页：首页只取前 N 篇时，新文章会在最前面，但旧文章可能不在第一页。
4. 页面缓存：强制刷新一次（`Ctrl/Cmd + Shift + R`）。

### 7.2 论坛里上传的图片在个人网站不显示

论坛上传的图片是**登录保护资源**，公网匿名页面无法加载。正确做法：

- 把图片放进你的网站仓库（如 `images/`），在 Markdown 里用可公开访问的地址引用；
- 或使用你自己的图床/对象存储公开链接。

### 7.3 请求报 CORS 错误

只在 Pages 子域下可用，且必须用 `https`。以下场景会被浏览器拦截：

- `file://` 本地双击打开
- `http://localhost:8080`
- 绑定到其他自定义域名的站点

### 7.4 429 请求过于频繁

每个 IP 对每个接口限制 **60 秒 120 次**。正常阅读页面远低于这个量；如果你写了定时轮询或自动翻页循环，请降低频率（例如 30 秒一次），并处理 429 后重试。

### 7.5 404 不一定代表接口挂了

以下情况都会返回 404：

- slug 拼错
- 文章 ID 不属于该站点主人
- 文章是「经理可见」
- Pages 开放 API 功能未开启

### 7.6 不要把文章正文直接拼进 `innerHTML`

文章正文是 Markdown，推荐用 `markdown-it` 且设置 `html: false`（与论坛渲染策略一致）。留言内容是纯文本，用 `textContent` 渲染，不要用 `innerHTML`。

### 7.7 为什么没有点赞数

当前开放 API 只提供文章（标题/摘要/正文/分类/时间/留言数）和留言，不包含点赞、收藏、浏览量。需要这些字段可以后续在门户侧扩展。

### 7.8 数据是实时的吗，有缓存吗

没有缓存。每次页面加载都会实时查库，所以新发/修改/删除文章、新留言，刷新页面即可看到。页面本身不会自动轮询，需要你自己刷新或加轮询。

---

## 8. 上线前自查清单

- [ ] `SLUG` 换成了自己的站点标识
- [ ] 页面通过 `https://{slug}.page.quantacenter.com/...` 访问，而不是本地文件
- [ ] 文章可见性为「塔员可见」
- [ ] 文章配图使用可公开访问的地址（不是论坛上传图）
- [ ] 用 `response.ok` 判断成功，404/429 有友好提示
- [ ] Markdown 渲染关闭原始 HTML（`html: false`），留言用 `textContent`
- [ ] 页面源码里没有硬编码的文章标题或正文
- [ ] 手机宽度下排版正常

---

## 9. 参考实现

- 站点：<https://sususu.page.quantacenter.com>
- 源码：<https://github.com/subingbo/sususu-site>

它的结构可以直接拿来改：

```
index.html      首页（最新 6 篇）
blog.html       列表（分类筛选 + 加载更多）
article.html    详情（?id=postId + 留言）
about.html      关于
assets/app.js   API 封装、Markdown 渲染、列表/详情/留言渲染
vendor/         markdown-it 自托管
images/         文章配图
```

遇到文档没覆盖的问题，先在浏览器开发者工具的 Network 面板看请求的**状态码和响应体**，再对照第 4.4 节排查。
