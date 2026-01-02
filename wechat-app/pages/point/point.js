const config = require('../../config.js')
Page({
  data: {
    nav: { title: '地点', back: false, animated: false },
    categories: [],
    items: [],
    selectedCategory: '',
    displayItems: [],
    showModal: false,
    modalItem: null,
    headerIcon: ''
  },
  onLoad() {
    this.fetchPoints()
  },
  onShow() {
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
        const counts = {}
        const items = points.map(p => ({
          id: p.id,
          name: p.name || '',
          category: p.category || '其他',
          img: this.normalizeImg(p.img),
          icon: this.normalizeIcon(p.icon),
          latitude: Number(p.y),
          longitude: Number(p.x),
          desc: String(p.description || '')
        }))
        items.forEach(it => { counts[it.category] = (counts[it.category] || 0) + 1 })
        const cats = Object.keys(counts).sort((a, b) => {
          const diff = counts[b] - counts[a]
          if (diff !== 0) return diff
          return String(a).localeCompare(String(b), 'zh-Hans')
        })
        const sel = cats[0] || ''
        const firstSel = items.find(it => it.category === sel)
        this.setData({
          categories: cats,
          items,
          selectedCategory: sel,
          displayItems: items.filter(it => it.category === sel),
          headerIcon: (firstSel && firstSel.icon) || ''
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
    const str = String(s || '').replace(/[`'\"]/g, '').trim()
    const urls = str.match(/https?:\/\/[^\s]+/g)
    if (urls && urls.length) return urls[urls.length - 1]
    return ''
  },
  normalizeIcon(s) {
    const str = String(s || '').replace(/[`'\"]/g, '').trim()
    if (!str) return ''
    if (str.startsWith('/')) return str
    const withExt = /\.\w+$/.test(str) ? str : `${str}.png`
    if (str.includes('/')) return `/images/${withExt}`
    return `/images/tabbar/${withExt}`
  },
  onPickCategory(e) {
    const cat = e.currentTarget.dataset.cat
    if (!cat) return
    const list = (this.data.items || []).filter(it => it.category === cat)
    const firstSel = list[0]
    this.setData({ 
      selectedCategory: cat, 
      displayItems: list,
      headerIcon: (firstSel && firstSel.icon) || ''
    })
  },
  onPreviewImage() {
    const url = (this.data.modalItem && this.data.modalItem.img) || ''
    if (!url) return
    wx.previewImage({ current: url, urls: [url] })
  },
  noop() {},
  onTapItem(e) {
    const idx = e.currentTarget.dataset.index
    const list = this.data.displayItems || []
    const it = list[idx]
    if (!it) return
    this.setData({ showModal: true, modalItem: it })
  },
  onCloseModal() {
    this.setData({ showModal: false, modalItem: null })
  },
  onSetAsTo() {
    const it = this.data.modalItem
    if (!it) return
    try {
      wx.setStorageSync('pendingTo', {
        toLabel: it.name,
        latitude: it.latitude,
        longitude: it.longitude,
        autoRoute: false
      })
    } catch (e) {}
    wx.switchTab({ url: '/pages/map/map' })
  },
  onNavNow() {
    const it = this.data.modalItem
    if (!it) return
    try {
      wx.setStorageSync('pendingTo', {
        toLabel: it.name,
        latitude: it.latitude,
        longitude: it.longitude,
        autoRoute: true
      })
    } catch (e) {}
    wx.switchTab({ url: '/pages/map/map' })
  }
})
