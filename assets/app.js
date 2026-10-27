(function () {
  'use strict'

  const SLUG = 'sususu'
  const API_BASE = 'https://www.quantacenter.com/open/pages/' + SLUG
  const PAGE_SIZE = 20
  const identity = {
    name: '苏秉铂',
    initial: '苏',
    role: 'Java 后端开发',
    email: '21235386625@qq.com',
  }

  const md = window.markdownit
    ? window.markdownit({ html: false, linkify: true })
    : null

  function formatDate(value) {
    return value ? String(value).slice(0, 10) : ''
  }

  function displayName(comment) {
    return (comment.authorNickname || '塔员').trim() || '塔员'
  }

  function requestErrorMessage(status, payload) {
    if (status === 429) return '请求过于频繁，请稍后再试'
    if (status >= 500) return '内容服务暂时不可用，请稍后再试'
    if (payload && payload.msg) return payload.msg
    return '请求失败（HTTP ' + status + '）'
  }

  async function fetchApi(path) {
    let response
    try {
      response = await fetch(API_BASE + path, { credentials: 'omit' })
    } catch (error) {
      throw new Error('网络连接失败，请检查连接后重试')
    }
    let payload = null
    try {
      payload = await response.json()
    } catch (error) {
      payload = null
    }
    if (!response.ok) {
      const failure = new Error(requestErrorMessage(response.status, payload))
      failure.status = response.status
      throw failure
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

  function letterAvatar(name, className) {
    const fallback = document.createElement('span')
    fallback.className = className + ' avatar--letter'
    fallback.textContent = Array.from(name || identity.initial)[0] || identity.initial
    fallback.setAttribute('aria-hidden', 'true')
    return fallback
  }

  function createCommentAvatar(comment) {
    const name = displayName(comment)
    if (!comment.authorAvatar) return letterAvatar(name, 'comment__avatar')
    const image = document.createElement('img')
    image.className = 'comment__avatar'
    image.src = comment.authorAvatar
    image.alt = name
    image.loading = 'lazy'
    image.addEventListener('error', function () {
      image.replaceWith(letterAvatar(name, 'comment__avatar'))
    })
    return image
  }

  async function initProfileAvatar() {
    const slots = document.querySelectorAll('[data-profile-avatar]')
    if (!slots.length) return
    function showFallback() {
      slots.forEach(function (slot) {
        slot.replaceChildren(letterAvatar(identity.name, 'profile-avatar'))
      })
    }
    showFallback()
    try {
      const profile = await fetchApi('/profile')
      if (!profile || !profile.avatar) return
      slots.forEach(function (slot) {
        const image = document.createElement('img')
        image.className = 'profile-avatar'
        image.src = profile.avatar
        image.alt = identity.name
        image.loading = 'eager'
        image.addEventListener('error', function () {
          image.replaceWith(letterAvatar(identity.name, 'profile-avatar'))
        })
        slot.replaceChildren(image)
      })
    } catch (error) {
      // 头像是增强内容；资料接口失败时保留姓名首字，不影响文章和作品。
    }
  }

  function categoryLabel(category) {
    return { TECH: '技术', PROJECT: '项目', LIFE: '生活' }[category] || category || '文章'
  }

  function articleUrl(postId) {
    return 'article.html?id=' + encodeURIComponent(postId)
  }

  function projectUrl(projectId) {
    return 'project.html?id=' + encodeURIComponent(projectId)
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
    comments.textContent = (post.commentCount || 0) + ' 条留言'
    meta.append(category, date, comments)
    const title = document.createElement('h3')
    title.textContent = post.title
    const excerpt = document.createElement('p')
    excerpt.textContent = post.excerpt || ''
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
    excerpt.textContent = post.excerpt || ''
    body.append(title, excerpt)
    row.append(time, body)
    return row
  }

  function renderProjectCard(project) {
    const card = document.createElement('article')
    card.className = 'project-card'
    const top = document.createElement('div')
    top.className = 'project-card__top'
    const category = document.createElement('span')
    category.className = 'eyebrow'
    category.textContent = project.category
    const role = document.createElement('span')
    role.className = 'project-card__role'
    role.textContent = project.role
    top.append(category, role)
    const title = document.createElement('h3')
    const link = document.createElement('a')
    link.href = projectUrl(project.id)
    link.textContent = project.title
    title.appendChild(link)
    const summary = document.createElement('p')
    summary.className = 'project-card__summary'
    summary.textContent = project.summary
    const stack = document.createElement('ul')
    stack.className = 'chip-list'
    project.stack.slice(0, 5).forEach(function (name) {
      const item = document.createElement('li')
      item.className = 'chip'
      item.textContent = name
      stack.appendChild(item)
    })
    const proof = document.createElement('div')
    proof.className = 'project-card__proof'
    const proofValue = document.createElement('strong')
    proofValue.textContent = project.proof[0].value
    const proofLabel = document.createElement('span')
    proofLabel.textContent = project.proof[0].label
    const detail = document.createElement('a')
    detail.href = projectUrl(project.id)
    detail.textContent = '查看项目 →'
    proof.append(proofValue, proofLabel, detail)
    card.append(top, title, summary, stack, proof)
    return card
  }

  function renderProjectList(target, projects) {
    if (!target) return
    target.replaceChildren()
    projects.forEach(function (project) {
      target.appendChild(renderProjectCard(project))
    })
  }

  function initFeaturedProjects() {
    const target = document.getElementById('featured-projects')
    if (!target || !window.PortfolioData) return
    renderProjectList(target, window.PortfolioData.all)
  }

  function initProjects() {
    const target = document.getElementById('project-list')
    if (!target || !window.PortfolioData) return
    renderProjectList(target, window.PortfolioData.all)
  }

  function renderProofStrip(project) {
    const strip = document.createElement('div')
    strip.className = 'proof-strip'
    project.proof.forEach(function (item) {
      const cell = document.createElement('div')
      cell.className = 'proof-strip__item'
      const value = document.createElement('strong')
      value.textContent = item.value
      const label = document.createElement('span')
      label.textContent = item.label
      cell.append(value, label)
      strip.appendChild(cell)
    })
    return strip
  }

  function renderProjectDetail(target, project) {
    target.replaceChildren()
    if (!project) {
      const empty = document.createElement('section')
      empty.className = 'not-found'
      const eyebrow = document.createElement('p')
      eyebrow.className = 'eyebrow'
      eyebrow.textContent = 'PROJECT NOT FOUND'
      const title = document.createElement('h1')
      title.textContent = '没有找到这个作品'
      const message = document.createElement('p')
      message.textContent = '链接可能已失效，请返回作品列表重新选择。'
      const back = document.createElement('a')
      back.className = 'button button--primary'
      back.href = 'projects.html'
      back.textContent = '返回作品列表'
      empty.append(eyebrow, title, message, back)
      target.appendChild(empty)
      return
    }
    document.title = project.title + ' · 苏秉铂的作品'
    const hero = document.createElement('header')
    hero.className = 'project-hero'
    const eyebrow = document.createElement('p')
    eyebrow.className = 'eyebrow'
    eyebrow.textContent = project.category
    const title = document.createElement('h1')
    title.textContent = project.title
    const tagline = document.createElement('p')
    tagline.className = 'project-hero__tagline'
    tagline.textContent = project.tagline
    const role = document.createElement('p')
    role.className = 'project-hero__role'
    role.textContent = project.role
    hero.append(eyebrow, title, tagline, role)
    const actions = document.createElement('div')
    actions.className = 'actions'
    if (project.sourceUrl) {
      const source = document.createElement('a')
      source.className = 'button button--primary'
      source.href = project.sourceUrl
      source.target = '_blank'
      source.rel = 'noopener noreferrer'
      source.textContent = '查看源码 ↗'
      actions.appendChild(source)
    }
    const all = document.createElement('a')
    all.className = 'button button--ghost'
    all.href = 'projects.html'
    all.textContent = '全部作品'
    actions.appendChild(all)
    hero.appendChild(actions)
    const overview = document.createElement('section')
    overview.className = 'project-section'
    const overviewTitle = document.createElement('h2')
    overviewTitle.textContent = '项目概览'
    const overviewText = document.createElement('p')
    overviewText.textContent = project.overview
    const stack = document.createElement('ul')
    stack.className = 'chip-list'
    project.stack.forEach(function (name) {
      const item = document.createElement('li')
      item.className = 'chip'
      item.textContent = name
      stack.appendChild(item)
    })
    overview.append(overviewTitle, overviewText, stack)
    target.append(hero, renderProofStrip(project), overview)
    project.sections.forEach(function (section) {
      const block = document.createElement('section')
      block.className = 'project-section'
      const heading = document.createElement('h2')
      heading.textContent = section.title
      const body = document.createElement('p')
      body.textContent = section.body
      block.append(heading, body)
      target.appendChild(block)
    })
    Object.keys(project.evidence).forEach(function (key) {
      const note = document.createElement('aside')
      note.className = 'evidence-note'
      const label = document.createElement('strong')
      label.textContent = key === 'modelEvaluation' ? '真实模型评测' : key === 'offlineVerification' ? '后续离线验证' : '工程证据'
      const body = document.createElement('p')
      body.textContent = project.evidence[key]
      note.append(label, body)
      target.appendChild(note)
    })
    if (project.gallery.length) {
      const gallery = document.createElement('section')
      gallery.className = 'project-section'
      const heading = document.createElement('h2')
      heading.textContent = '项目画面'
      const grid = document.createElement('div')
      grid.className = 'project-gallery'
      project.gallery.forEach(function (entry) {
        const figure = document.createElement('figure')
        const image = document.createElement('img')
        image.src = entry.src
        image.alt = entry.alt
        image.loading = 'lazy'
        const caption = document.createElement('figcaption')
        caption.textContent = entry.caption
        figure.append(image, caption)
        grid.appendChild(figure)
      })
      gallery.append(heading, grid)
      target.appendChild(gallery)
    }
  }

  function initProjectDetail() {
    const target = document.getElementById('project-detail')
    if (!target) return
    const id = new URLSearchParams(location.search).get('id')
    const project = window.PortfolioData ? window.PortfolioData.get(id) : null
    renderProjectDetail(target, project)
  }

  function markActiveNav() {
    const current = location.pathname.split('/').pop() || 'index.html'
    document.querySelectorAll('[data-nav]').forEach(function (link) {
      const nav = link.getAttribute('data-nav')
      const active = (nav === 'home' && current === 'index.html')
        || (nav === 'blog' && (current === 'blog.html' || current === 'article.html'))
        || (nav === 'projects' && (current === 'projects.html' || current === 'project.html'))
        || (nav === 'about' && current === 'about.html')
      link.classList.toggle('is-active', active)
    })
  }

  async function initIndex() {
    const container = document.getElementById('latest')
    if (!container) return
    try {
      const page = await fetchApi('/posts?pageNum=1&pageSize=6')
      container.replaceChildren()
      if (!page || !page.items || !page.items.length) {
        showStatus(container, '还没有公开文章')
        return
      }
      page.items.forEach(function (post) {
        container.appendChild(renderPostCard(post))
      })
    } catch (error) {
      container.replaceChildren()
      showStatus(container, error.message, true)
    }
  }

  async function fetchAllPosts() {
    const all = []
    for (let pageNum = 1; pageNum <= 20; pageNum += 1) {
      const page = await fetchApi('/posts?pageNum=' + pageNum + '&pageSize=50')
      const items = page && page.items ? page.items : []
      all.push.apply(all, items)
      if (!items.length || all.length >= (page.total || 0)) break
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
      list.replaceChildren()
      const visiblePosts = state.filtered.slice(0, state.visible)
      visiblePosts.forEach(function (post) {
        list.appendChild(renderPostRow(post))
      })
      if (!visiblePosts.length) showStatus(list, '这个分类下还没有文章')
      showStatus(status, '共 ' + state.filtered.length + ' 篇文章')
      if (more) more.hidden = state.visible >= state.filtered.length
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

  function renderComment(comment) {
    const name = displayName(comment)
    const item = document.createElement('div')
    item.className = 'comment'
    const content = document.createElement('div')
    content.className = 'comment__body'
    const meta = document.createElement('div')
    meta.className = 'comment__meta'
    meta.textContent = name + (comment.replyToNickname ? ' 回复 ' + comment.replyToNickname : '') + ' · ' + formatDate(comment.createdAt)
    const body = document.createElement('p')
    body.textContent = comment.content
    content.append(meta, body)
    item.append(createCommentAvatar(comment), content)
    return item
  }

  async function loadComments(postId, commentsEl) {
    if (!commentsEl) return
    try {
      const page = await fetchApi('/posts/' + postId + '/comments?pageNum=1&pageSize=50')
      commentsEl.replaceChildren()
      if (!page || !page.items || !page.items.length) {
        showStatus(commentsEl, '还没有留言')
        return
      }
      page.items.forEach(function (comment) {
        commentsEl.appendChild(renderComment(comment))
      })
    } catch (error) {
      commentsEl.replaceChildren()
      showStatus(commentsEl, '留言加载失败：' + error.message, true)
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
      if (commentsEl) commentsEl.replaceChildren()
      return
    }
    try {
      const post = await fetchApi('/posts/' + id)
      document.title = post.title + ' · 苏秉铂的个人网站'
      if (titleEl) titleEl.textContent = post.title
      if (metaEl) {
        metaEl.replaceChildren()
        const category = document.createElement('span')
        category.className = 'chip chip--orange'
        category.textContent = categoryLabel(post.category)
        const date = document.createElement('span')
        date.textContent = formatDate(post.createdAt)
        const count = document.createElement('span')
        count.textContent = (post.commentCount || 0) + ' 条留言'
        metaEl.append(category, date, count)
      }
      content.innerHTML = renderMarkdown(post.content)
      showStatus(status, '')
      await loadComments(id, commentsEl)
    } catch (error) {
      if (titleEl) titleEl.textContent = '文章不存在'
      content.replaceChildren()
      if (commentsEl) commentsEl.replaceChildren()
      showStatus(status, error.status === 404 ? '文章不存在或未公开' : error.message, true)
    }
  }

  window.QuantaSite = {
    identity,
    requestErrorMessage,
    fetchApi,
    projectUrl,
    articleUrl,
    formatDate,
    categoryLabel,
    renderProjectDetail,
  }

  document.addEventListener('DOMContentLoaded', function () {
    markActiveNav()
    initProfileAvatar()
    initFeaturedProjects()
    initProjects()
    initProjectDetail()
    initIndex()
    initBlog()
    initArticle()
  })
})()
