const config = require('../../config.js')
Page({
  data: {
    content: '',
    tag: ''
  },
  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },
  onPickTag() {
    wx.showActionSheet({
      itemList: ['求助','闲置','跑腿'],
      success: (res) => {
        const idx = res.tapIndex
        if (typeof idx === 'number' && idx >= 0 && idx <= 2) {
          const map = ['求助','闲置','跑腿']
          this.setData({ tag: map[idx] })
        }
      }
    })
  },
  onSubmit() {
    const content = (this.data.content || '').trim()
    const tag = (this.data.tag || '').trim()
    if (!content) return wx.showToast({ title: '请填写内容', icon: 'none' })
    const payload = { content }
    if (tag) payload.tag = tag
    const token = wx.getStorageSync('token')
    if (!token) { wx.showToast({ title: '请先登录', icon: 'none' }); return wx.navigateTo({ url: '/pages/login/login' }) }
    wx.showLoading({ title: '提交中...' })
    wx.request({
      url: config.api.article.create,
      method: 'POST',
      header: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      data: payload,
      timeout: 10000,
      success: (res) => {
        wx.hideLoading()
        if (res.statusCode === 200 || res.statusCode === 201) {
          wx.showToast({ title: '发表成功', icon: 'success' })
          setTimeout(() => { wx.navigateBack() }, 800)
        } else if (res.statusCode === 401) {
          wx.showToast({ title: '请先登录', icon: 'none' })
          setTimeout(() => wx.navigateTo({ url: '/pages/login/login' }), 300)
        } else {
          wx.showToast({ title: '发表失败', icon: 'none' })
        }
      },
      fail: () => { wx.hideLoading(); wx.showToast({ title: '网络异常', icon: 'none' }) }
    })
  }
})