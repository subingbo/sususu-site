(function () {
  'use strict'

  // 站点标识：内容全部来自 Quanta 门户的开放 API（匿名只读）
  const SLUG = 'sususu'
  const API_BASE = 'https://www.quantacenter.com/open/pages/' + SLUG
  const PAGE_SIZE = 20

  const md = window.markdownit
    ? window.markdownit({ html: false, linkify: true })
    : null

  function formatDate(value) {
    return value ? String(value).slice(0, 10) : ''
  }

  function displayName(comment) {
    return (comment.authorNickname || '塔员').trim() || '塔员'
  }

  function letterAvatar(name) {
    const fallback = document.createElement('span')
    fallback.className = 'comment__avatar comment__avatar--letter'
    fallback.textContent = Array.from(name)[0] || '塔'
    fallback.setAttribute('aria-hidden', 'true')
    return fallback
  }

  function createAvatar(comment) {
    const name = displayName(comment)
    if (!comment.authorAvatar) return letterAvatar(name)
    const image = document.createElement('img')
    image.className = 'comment__avatar'
    image.src = comment.authorAvatar
    image.alt = name
    image.loading = 'lazy'
    image.addEventListener('error', function () {
      image.replaceWith(letterAvatar(name))
    })
    return image
  }

  function categoryLabel(category) {
    if (!category) return '文章'
    return category
  }

  async function fetchApi(path) {
    // 只允许请求本 API 基址（路径由调用方拼接，不接受外部 URL）
    const url = API_BASE + path
    let response
    try {
      response = await fetch(url, { credentials: 'omit' })
    } catch (error) {
      throw new Error('网络连接失败，请稍后重试')
    }
    let payload = null
    try {
      payload = await response.json()
    } catch (error) {
      payload = null
    }
    if (!response.ok) {
      const message = payload && payload.msg ? payload.msg : '请求失败（HTTP ' + response.status + '）'
      const error = new Error(message)
      error.status = response.status
      throw error
    }
    return payload ? payload.data : null
  }

  function showStatus(target, message, isError) {
    if (!target) return
    target.textContent = message
    target.classList.toggle('status--error', Boolean(isError))
  }

  function renderMarkdown(source) {
    if (md) return md.render(source || '')
    const pre = document.createElement('pre')
    pre.textContent = source || ''
    return pre.outerHTML
  }

  function articleUrl(postId) {
    return 'article.html?id=' + encodeURIComponent(postId)
  }

  function renderPostCard(post) {
    const card = document.createElement('a')
    card.className = 'post-card'
    card.href = articleUrl(post.postId)

    const meta = document.createElement('div')
    meta.className = 'post-card__meta'
    const category = document.createElement('span')
    category.className = 'post-card__category'
    category.textContent = categoryLabel(post.category)
    const date = document.createElement('span')
    date.textContent = formatDate(post.createdAt)
    const comments = document.createElement('span')
    comments.textContent = post.commentCount + ' 条留言'
    meta.append(category, date, comments)

    const title = document.createElement('h3')
    title.textContent = post.title
    const excerpt = document.createElement('p')
    excerpt.textContent = post.excerpt

    card.append(meta, title, excerpt)
    return card
  }

  function renderPostRow(post) {
    const row = document.createElement('a')
    row.className = 'post-row'
    row.href = articleUrl(post.postId)

    const time = document.createElement('time')
    time.dateTime = post.createdAt
    time.textContent = formatDate(post.createdAt)

    const body = document.createElement('div')
    const title = document.createElement('h3')
    title.textContent = post.title
    const excerpt = document.createElement('p')
    excerpt.textContent = post.excerpt
    body.append(title, excerpt)

    row.append(time, body)
    return row
  }

  function markActiveNav() {
    const current = location.pathname.split('/').pop() || 'index.html'
    document.querySelectorAll('[data-nav]').forEach(function (link) {
      const nav = link.getAttribute('data-nav')
      const active = (nav === 'home' && current === 'index.html')
        || (nav === 'blog' && current === 'blog.html')
        || (nav === 'about' && current === 'about.html')
      link.classList.toggle('is-active', active)
    })
  }

  async function initIndex() {
    const container = document.getElementById('latest')
    if (!container) return
    try {
      const page = await fetchApi('/posts?pageNum=1&pageSize=6')
      container.innerHTML = ''
      if (!page.items || !page.items.length) {
        container.innerHTML = '<div class="empty">还没有公开文章</div>'
        return
      }
      page.items.forEach(function (post) {
        container.appendChild(renderPostCard(post))
      })
    } catch (error) {
      container.innerHTML = ''
      showStatus(container, error.message, true)
    }
  }

  async function fetchAllPosts() {
    const all = []
    let pageNum = 1
    for (;;) {
      const page = await fetchApi('/posts?pageNum=' + pageNum + '&pageSize=50')
      const items = page.items || []
      all.push.apply(all, items)
      if (!items.length || all.length >= (page.total || 0) || pageNum >= 20) break
      pageNum += 1
    }
    return all
  }

  async function initBlog() {
    const list = document.getElementById('post-list')
    const status = document.getElementById('list-status')
    const more = document.getElementById('load-more')
    const filters = document.getElementById('category-filters')
    if (!list) return

    const state = { all: [], filtered: [], visible: PAGE_SIZE, category: '' }

    function render() {
      list.innerHTML = ''
      const slice = state.filtered.slice(0, state.visible)
      slice.forEach(function (post) {
        list.appendChild(renderPostRow(post))
      })
      if (!slice.length) {
        list.innerHTML = '<div class="empty">这个分类下还没有文章</div>'
      }
      showStatus(status, '共 ' + state.filtered.length + ' 篇文章')
      if (more) {
        more.hidden = state.filtered.length <= state.visible
      }
    }

    function applyFilter() {
      state.filtered = state.category
        ? state.all.filter(function (post) { return post.category === state.category })
        : state.all.slice()
      state.visible = PAGE_SIZE
      render()
    }

    try {
      showStatus(status, '加载中…')
      state.all = await fetchAllPosts()
      applyFilter()
    } catch (error) {
      showStatus(status, error.message, true)
      if (more) more.hidden = true
      return
    }

    if (filters) {
      filters.addEventListener('click', function (event) {
        const button = event.target.closest('button[data-category]')
        if (!button) return
        filters.querySelectorAll('button').forEach(function (item) {
          item.classList.toggle('is-active', item === button)
        })
        state.category = button.getAttribute('data-category') || ''
        applyFilter()
      })
    }
    if (more) {
      more.addEventListener('click', function () {
        state.visible += PAGE_SIZE
        render()
      })
    }
  }

  async function initArticle() {
    const content = document.getElementById('article-content')
    if (!content) return
    const titleEl = document.getElementById('article-title')
    const metaEl = document.getElementById('article-meta')
    const commentsEl = document.getElementById('comments-list')
    const status = document.getElementById('article-status')

    const id = new URLSearchParams(location.search).get('id')
    if (!id || !/^\d+$/.test(id)) {
      showStatus(status, '文章不存在或未公开', true)
      if (titleEl) titleEl.textContent = '文章不存在'
      return
    }

    try {
      const post = await fetchApi('/posts/' + id)
      document.title = post.title + ' · 苏秉铂的个人网站'
      if (titleEl) titleEl.textContent = post.title
      if (metaEl) {
        metaEl.innerHTML = ''
        const category = document.createElement('span')
        category.className = 'chip chip--orange'
        category.textContent = categoryLabel(post.category)
        const date = document.createElement('span')
        date.textContent = formatDate(post.createdAt)
        const count = document.createElement('span')
        count.textContent = post.commentCount + ' 条留言'
        metaEl.append(category, date, count)
      }
      content.innerHTML = renderMarkdown(post.content)
      showStatus(status, '')

      if (commentsEl) {
        const page = await fetchApi('/posts/' + id + '/comments?pageNum=1&pageSize=50')
        commentsEl.innerHTML = ''
        if (!page.items || !page.items.length) {
          commentsEl.innerHTML = '<div class="empty">还没有留言</div>'
        } else {
          page.items.forEach(function (comment) {
            const name = displayName(comment)
            const item = document.createElement('div')
            item.className = 'comment'
            const content = document.createElement('div')
            content.className = 'comment__body'
            const meta = document.createElement('div')
            meta.className = 'comment__meta'
            meta.textContent = name + ' · ' + formatDate(comment.createdAt)
            const body = document.createElement('p')
            body.textContent = comment.content
            content.append(meta, body)
            item.append(createAvatar(comment), content)
            commentsEl.appendChild(item)
          })
        }
      }
    } catch (error) {
      if (titleEl) titleEl.textContent = '文章不存在'
      content.innerHTML = ''
      showStatus(status, error.status === 404 ? '文章不存在或未公开' : error.message, true)
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    markActiveNav()
    initIndex()
    initBlog()
    initArticle()
  })
})()
