const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

const root = path.resolve(__dirname, '..')

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function loadScript(relativePath, additions = {}) {
  const listeners = {}
  const document = {
    addEventListener(type, listener) {
      listeners[type] = listener
    },
    getElementById() {
      return null
    },
    querySelectorAll() {
      return []
    },
    createElement() {
      return {
        className: '',
        textContent: '',
        hidden: false,
        classList: { add() {}, toggle() {} },
        append() {},
        appendChild() {},
        addEventListener() {},
        replaceChildren() {},
        setAttribute() {},
      }
    },
  }
  const window = { document, markdownit: null }
  const context = {
    URLSearchParams,
    console,
    document,
    fetch: async () => {
      throw new Error('unexpected fetch')
    },
    location: { pathname: '/index.html', search: '' },
    window,
    ...additions,
  }
  window.window = window
  vm.runInNewContext(read(relativePath), context, { filename: relativePath })
  return { context, document, listeners, window }
}

test('portfolio data exposes the two planned projects and only Quanta has a source link', () => {
  const { window } = loadScript('assets/projects.js')
  const projects = window.PortfolioData.all
  assert.deepEqual(Array.from(projects, (project) => project.id), ['quanta-portal', 'campus-map'])
  assert.equal(window.PortfolioData.get('missing'), null)
  assert.equal(projects[0].sourceUrl, 'https://github.com/mememoremore/quanta-portal')
  assert.ok(projects[0].sections.some((section) => section.title === '静态网站托管与安全发布'))
  assert.ok(projects[0].sections.some((section) => section.title === '缓存一致性'))
  assert.equal(projects[1].sourceUrl, '')
})

test('campus evidence separates the 24-run model evaluation from the later 293 offline tests', () => {
  const { window } = loadScript('assets/projects.js')
  const project = window.PortfolioData.get('campus-map')
  assert.match(project.evidence.modelEvaluation, /24 次内部配对测试/)
  assert.match(project.evidence.modelEvaluation, /0\/12/)
  assert.match(project.evidence.modelEvaluation, /8\/12/)
  assert.match(project.evidence.modelEvaluation, /31\.79%/)
  assert.match(project.evidence.offlineVerification, /293 项离线测试/)
  assert.match(project.evidence.offlineVerification, /没有追加真实模型运行/)
  assert.match(project.evidence.offlineVerification, /不把离线修复计入/)
  for (const entry of project.gallery) {
    assert.equal(fs.existsSync(path.join(root, entry.src)), true, entry.src + ' must be published')
  }
})

test('application helpers use fixed professional identity and explicit request errors', () => {
  const { window } = loadScript('assets/app.js')
  assert.equal(window.QuantaSite.identity.name, '苏秉铂')
  assert.equal(window.QuantaSite.identity.email, '21235386625@qq.com')
  assert.equal(window.QuantaSite.requestErrorMessage(429), '请求过于频繁，请稍后再试')
  assert.equal(window.QuantaSite.requestErrorMessage(503), '内容服务暂时不可用，请稍后再试')
})

test('API requests stay on the sususu endpoint and omit credentials', async () => {
  let request = null
  const { window } = loadScript('assets/app.js', {
    fetch: async (url, options) => {
      request = { url, options }
      return {
        ok: true,
        status: 200,
        json: async () => ({ code: 200, data: { items: [] } }),
      }
    },
  })
  const data = await window.QuantaSite.fetchApi('/posts?pageNum=1&pageSize=6')
  assert.equal(data.items.length, 0)
  assert.equal(request.url, 'https://www.quantacenter.com/open/pages/sususu/posts?pageNum=1&pageSize=6')
  assert.equal(request.options.credentials, 'omit')
})

test('every public page uses the four-item navigation and omits private identifiers', () => {
  const pages = ['index.html', 'blog.html', 'article.html', 'projects.html', 'project.html', 'about.html']
  const combined = pages.map(read).join('\n')
  for (const page of pages) {
    const html = read(page)
    for (const label of ['首页', '文章', '作品', '关于']) {
      assert.match(html, new RegExp('>' + label + '<'), page + ' is missing ' + label)
    }
  }
  assert.doesNotMatch(combined, /1[3-9]\d{9}/)
  assert.doesNotMatch(combined, /学号/)
  assert.doesNotMatch(combined, /\b20\d{9}\b/)
  assert.doesNotMatch(combined, /\.docx/i)
})

test('project and article routes keep distinct query parameters and existing image paths', () => {
  const app = read('assets/app.js')
  const article = read('article.html')
  assert.match(app, /project\.html\?id=/)
  assert.match(app, /article\.html\?id=/)
  assert.match(article, /vendor\/markdown-it\.min\.js/)
  for (const image of [
    'cpu-cache-mesi.svg',
    'dominator-tree.svg',
    'hashmap-resize.svg',
    'jvm-heap-flow.svg',
    'jwt-flow.svg',
    'mat-workflow.svg',
    'threadlocal-map.svg',
  ]) {
    assert.equal(fs.existsSync(path.join(root, 'images', image)), true, image + ' must remain available')
  }
})

test('hidden controls remain hidden after component display styles apply', () => {
  const css = read('assets/styles.css')
  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/)
})
