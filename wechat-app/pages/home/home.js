const config = require('../../config.js')
Page({
  onShow() {
    const i = 3
    const r = Math.floor(Math.random() * 4) + 1
    wx.setTabBarItem({
      index: i,
      iconPath: '/images/tabbar/home.png',
      selectedIconPath: `/images/tabbar/home-active${r}.png`
    })
  }
})
