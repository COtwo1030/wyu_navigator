Component({
  options: {
    multipleSlots: true // 在组件定义时的选项中启用多slot支持
  },
  /**
   * 组件的属性列表
   */
  properties: {
    extClass: {
      type: String,
      value: ''
    },
    title: {
      type: String,
      value: ''
    },
    background: {
      type: String,
      value: ''
    },
    color: {
      type: String,
      value: ''
    },
    back: {
      type: Boolean,
      value: true
    },
    loading: {
      type: Boolean,
      value: false
    },
    homeButton: {
      type: Boolean,
      value: false,
    },
    animated: {
      // 显示隐藏的时候opacity动画效果
      type: Boolean,
      value: true
    },
    show: {
      // 显示隐藏导航，隐藏的时候navigation-bar的高度占位还在
      type: Boolean,
      value: true,
      observer: '_showChange'
    },
    // back为true的时候，返回的页面深度
    delta: {
      type: Number,
      value: 1
    },
  },
  /**
   * 组件的初始数据
   */
  data: {
    displayStyle: ''
  },
  lifetimes: {
    attached() {
      const rect = wx.getMenuButtonBoundingClientRect()
      const win = wx.getWindowInfo()
      const base = wx.getAppBaseInfo ? wx.getAppBaseInfo() : {}
      const dev = wx.getDeviceInfo ? wx.getDeviceInfo() : {}
      const platform = base.platform || dev.platform || ''
      const system = dev.system || ''
      const isAndroid = platform === 'android' || /Android/i.test(system)
      const isDevtools = platform === 'devtools'
      this.setData({
        ios: !isAndroid,
        innerPaddingRight: `padding-right: ${win.windowWidth - rect.left}px`,
        leftWidth: `width: ${win.windowWidth - rect.left }px`,
        safeAreaTop: isDevtools || isAndroid ? `height: calc(var(--height) + ${win.safeArea.top}px); padding-top: ${win.safeArea.top}px` : ``
      })
    },
  },
  /**
   * 组件的方法列表
   */
  methods: {
    _showChange(show) {
      const animated = this.data.animated
      let displayStyle = ''
      if (animated) {
        displayStyle = `opacity: ${
          show ? '1' : '0'
        };transition:opacity 0.5s;`
      } else {
        displayStyle = `display: ${show ? '' : 'none'}`
      }
      this.setData({
        displayStyle
      })
    },
    back() {
      const data = this.data
      const d = data.delta || 1
      wx.navigateBack({
        delta: d,
        success: () => {
          this.triggerEvent('back', { delta: d }, {})
        },
        fail: () => {
          this.triggerEvent('back', { delta: d }, {})
          const pages = getCurrentPages()
          if (!pages || pages.length <= 1) {
            if (wx.switchTab) {
              wx.switchTab({ url: '/pages/index/index' })
            } else {
              wx.navigateTo({ url: '/pages/index/index' })
            }
          }
        }
      })
    }
  },
})
