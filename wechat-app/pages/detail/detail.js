Page({
  onLoad(options) {
    const id = options?.id ? `?id=${options.id}` : ''
    wx.redirectTo({ url: `/pages/article/detail${id}` })
  }
})
