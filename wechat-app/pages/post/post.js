const config = require('../../config.js')
Page({
  data: {
    content: '',
    tag: '',
    images: []
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
    const imgs = (this.data.images || [])
    if (imgs.length > 0) payload.img = imgs.join(',')
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
          setTimeout(() => {
            if (wx.switchTab) {
              wx.switchTab({ url: '/pages/index/index' })
            } else {
              wx.navigateTo({ url: '/pages/index/index' })
            }
          }, 800)
        } else if (res.statusCode === 401) {
          wx.showToast({ title: '请先登录', icon: 'none' })
          setTimeout(() => wx.navigateTo({ url: '/pages/login/login' }), 300)
        } else {
          wx.showToast({ title: '发表失败', icon: 'none' })
        }
      },
      fail: () => { wx.hideLoading(); wx.showToast({ title: '网络异常', icon: 'none' }) }
    })
  },
  onUploadTap() {
    const token = wx.getStorageSync('token') || ''
    if (!token) { wx.showToast({ title: '请先登录', icon: 'none' }); wx.navigateTo({ url: '/pages/login/login' }); return }
    wx.chooseImage({
      count: 9,
      sizeType: ['compressed'],
      sourceType: ['album','camera'],
      success: async (sel) => {
        const paths = sel.tempFilePaths || []
        if (!paths.length) return
        wx.showLoading({ title: '上传中...' })
        try {
          for (let i = 0; i < paths.length; i++) {
            const filePath = paths[i]
            const ext = (filePath.match(/\.(jpg|jpeg|png)$/i) || [])[0] || '.jpg'
            const ct = (/\.png$/i.test(ext)) ? 'image/png' : 'image/jpeg'
            const key = `${Date.now()}_${Math.floor(Math.random()*100000)}${ext}`
            // 获取上传URL
            const uploadUrl = await this.getUploadUrl(key, ct)
            // 读取文件为二进制
            const fs = wx.getFileSystemManager()
            const data = await new Promise((resolve, reject) => {
              fs.readFile({
                filePath,
                success: (res) => resolve(res.data),
                fail: reject
              })
            })
            // PUT 上传到 S3
            await new Promise((resolve, reject) => {
              wx.request({
                url: uploadUrl,
                method: 'PUT',
                header: { 'Content-Type': ct },
                data,
                success: (r) => {
                  const code = r.statusCode
                  if (code >= 200 && code < 300) resolve()
                  else reject(new Error(`上传失败(${code})`))
                },
                fail: reject
              })
            })
            // 拼接可访问链接
            const link = `https://wuyu.s3.bitiful.net/${key}`
            const imgs = (this.data.images || []).slice()
            imgs.push(link)
            this.setData({ images: imgs })
          }
          wx.hideLoading()
          wx.showToast({ title: '上传成功', icon: 'success' })
        } catch (e) {
          wx.hideLoading()
          wx.showToast({ title: '上传失败', icon: 'none' })
        }
      }
    })
  },
  getUploadUrl(key, contentType) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${config.api.storage.uploadUrl}?key=${encodeURIComponent(key)}&content_type=${encodeURIComponent(contentType)}`,
        method: 'GET',
        timeout: 10000,
        success: (res) => {
          const ok = res.statusCode === 200
          const url = ok && res.data && res.data.url
          if (!url) return reject(new Error('缺少上传URL'))
          resolve(url)
        },
        fail: reject
      })
    })
  }
})
