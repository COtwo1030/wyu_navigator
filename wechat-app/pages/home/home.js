const config = require('../../config.js')
Page({
  onShow() {
    const i = 4
    const r = Math.floor(Math.random() * 4) + 1
    wx.setTabBarItem({
      index: i,
      iconPath: '/images/tabbar/home.png',
      selectedIconPath: `/images/tabbar/home-active${r}.png`
    })
  },
  navToLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },
  navToPost() {
    wx.navigateTo({ url: '/pages/post/post' })
  }
})
