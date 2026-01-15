/**
 * 小程序全局配置文件
 * 说明：
 * - api：后端接口与腾讯地图 Key/端点配置
 * - navigationBar：自定义导航栏外观
 * - map.settings：地图交互能力（缩放、指南针、定位）
 * - map.initial：初始视野与3D/俯视/倾斜角度
 * - map.groundOverlay：地面叠加层（校园底图），关闭则不加载
 * - map.marker/icon：默认点位图标，仅在后端未提供 item.icon 时回退使用
 * - map.markerSize：普通点位图标的显示尺寸（px）
 * - map.routeIcons/routeIconSize：路线起点/终点高亮图标与尺寸
 * - map.behavior.fitAllPointsOnLoad：是否在进入页面时自动缩放以包含全部点位
 */
const BASE = 'http://127.0.0.1:8000'
//const BASE = 'http://203.195.240.87:80'
const config = {
  // 后端接口配置
  api: {
    // 获取地图点位列表接口
    pointList: `${BASE}/point/list`,
    //pointList: 'http://10.40.130.240:8080/point/list',
    auth: {
      code: `${BASE}/auth/code`,
      pswlogin: `${BASE}/auth/pswlogin`,
      emaillogin: `${BASE}/auth/emaillogin`,
      register: `${BASE}/auth/register`,
      resetPassword: `${BASE}/auth/reset-password`,
    },
    // 文章服务接口
    article: {
      create: `${BASE}/article/create`,
      page: `${BASE}/article/page`,
      view: `${BASE}/article/view`,
      comments: `${BASE}/article/comments`,
      commentPath: (id) => `${BASE}/article/${id}/comments`,
      commentDelete: `${BASE}/article/comment/delete`,
      delete: `${BASE}/article/delete`,
      like: `${BASE}/article/like`,
      commentLike: `${BASE}/article/comment/like`,
      commentedArticleList: `${BASE}/article/comment/articlelist`,
      likedList: `${BASE}/article/user/likelist`,
      likeIdList: `${BASE}/article/likeidlist`,
      commentLikedList: `${BASE}/article/comment/likelist`,
      user: `${BASE}/article/user`,
      userCommentList: `${BASE}/article/user/commentlist`,
    },
    // 用户接口
    user: {
      info: `${BASE}/user/info`,
      detail: `${BASE}/user/detail`,
      avatar: `${BASE}/user/avatar`,
      notifyCounts: `${BASE}/user/notify-counts`,
      notifySeen: `${BASE}/user/notify-seen`,
      notifications: `${BASE}/user/notifications`,
      interacts: (id) => `${BASE}/user/${id}/interacts`,
      interactsUnreadCount: (id) => `${BASE}/user/${id}/interacts/unread_count`,
      interactsStatus: (id) => `${BASE}/user/${id}/interacts/status`,
    },
    // 腾讯地图服务配置
    tencent: {
      key: 'SWABZ-BCY64-WIHUL-KCDGA-OMFUV-JWFS5',
      directionUrl: 'https://apis.map.qq.com/ws/direction/v1/walking',
    },
    // 存储服务接口
    storage: {
      uploadUrl: `${BASE}/storage/upload_url`,
    },
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
      scale: 17,             // 缩放级别 (3-20)
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
    },
    markerSize: { width: 24, height: 24 }, // 普通点位图标显示尺寸（px）

    behavior: {
      // 进入页面是否自动缩放以包含所有点位：true自动缩放；false保持 initial.scale
      fitAllPointsOnLoad: false
    },
    routeIconSize: { width: 24, height: 24 } // 路线起点/终点高亮图标显示尺寸（px）
  },

}

module.exports = config
