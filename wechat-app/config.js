/**
 * 小程序全局配置文件
 * 集中管理API接口、地图默认参数、图层配置等
 */
const config = {
  // 后端接口配置
  api: {
    // 获取地图点位列表接口
    pointList: 'http://10.40.130.240:8080/point/list',
    // 腾讯地图服务配置（请将 key 替换为你自己的密钥）
    tencent: {
      key: 'SWABZ-BCY64-WIHUL-KCDGA-OMFUV-JWFS5',
      directionUrl: 'https://apis.map.qq.com/ws/direction/v1/walking'
    }
  },
  
  // 导航栏配置
  navigationBar: {
    title: '校园导航',     // 标题文字
    back: false,         // 是否显示返回按钮
    color: 'black',      // 字体颜色
    background: '#FFF',  // 背景颜色
    animated: false      // 标题栏动画
  },

  // 地图相关配置
  map: {
    // 地图基础设置
    settings: {
      enableZoom: true,   // 允许缩放
      showCompass: true,  // 显示指南针
      showLocation: true, // 显示当前位置
    },

    // 地图初始状态设置
    initial: {
      longitude: 113.085985, // 初始中心经度
      latitude: 22.595361,   // 初始中心纬度
      scale: 16,             // 缩放级别 (3-20)
      enable3D: true,        // 开启3D效果
      enableOverlooking: true, // 开启俯视
      skew: 30,              // 倾斜角度 (0-40)
    },
    
    // 自定义图片图层 (GroundOverlay) 配置
    groundOverlay: {
      enable: false, // 是否开启自定义图层
      id: 101, // 图层唯一ID
      src: 'https://cotwo.qzz.io/wyu_map.png', // 图片地址
      // 图片覆盖的四个角坐标：左上, 右上, 左下, 右下
      points: [
        { longitude: 113.076665, latitude: 22.600946 }, 
        { longitude: 113.076665, latitude: 22.600946 }, 
        { longitude: 113.076971, latitude: 22.587906 }, 
        { longitude: 113.091221, latitude: 22.588552 }
      ],
      opacity: 0.7, // 透明度
      zIndex: 1     // 层级
    },
    
    // 地图标记配置
    marker: {
      // 默认图标路径
      iconPath: 'https://cotwo.qzz.io/mark.png'
    },
    routeIcons: {
      origin: 'https://cotwo.qzz.io/origin.png',
      destination: 'https://cotwo.qzz.io/destination.png'
    }
  }
}

module.exports = config
