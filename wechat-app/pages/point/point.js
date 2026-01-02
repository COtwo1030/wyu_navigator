const config = require('../../config.js')
Page({
  data: {
    categories: [],
    items: [],
    selectedCategory: '',
    displayItems: []
  },
  onLoad() {
    this.fetchPoints()
  },
  fetchPoints() {
    const url = config.api && config.api.pointList
    if (!url) return
    wx.request({
      url,
      method: 'GET',
      timeout: 10000,
      success: (res) => {
        const points = (res.data && res.data.points) || []
        const cats = []
        const seen = {}
        const items = points.map(p => ({
          id: p.id,
          name: p.name || '',
          category: p.category || '其他',
          img: this.normalizeImg(p.img)
        }))
        items.forEach(it => {
          const c = it.category
          if (!seen[c]) { seen[c] = 1; cats.push(c) }
        })
        const sel = cats[0] || ''
        this.setData({
          categories: cats,
          items,
          selectedCategory: sel,
          displayItems: items.filter(it => it.category === sel)
        })
      },
      fail: () => {
        this.setData({
          categories: [],
          items: [],
          selectedCategory: '',
          displayItems: []
        })
      }
    })
  },
  normalizeImg(s) {
    const str = String(s || '').replace(/[`'"]/g, '').trim()
    const urls = str.match(/https?:\/\/[^\s]+/g)
    if (urls && urls.length) return urls[urls.length - 1]
    return '/static/Wuyi_University_Logo.png'
  },
  onPickCategory(e) {
    const cat = e.currentTarget.dataset.cat
    if (!cat) return
    const list = (this.data.items || []).filter(it => it.category === cat)
    this.setData({ selectedCategory: cat, displayItems: list })
  }
})
