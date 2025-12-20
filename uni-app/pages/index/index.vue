<template>
  <div class="app-wrapper">
    <!-- 导航栏：仅保留标题和登录按钮 -->
    <header class="navbar">
      <div class="navbar-title">五邑大学校园地图</div>
      <!-- 右侧登录按钮：绑定点击事件跳转登录页 -->
      <button class="login-btn" @click="toLoginPage">登录</button>
    </header>
    <!-- 地图容器 -->
    <div ref="mapRef" class="map-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';

const mapRef = ref(null);
let mapInstance = null; // 保存地图实例，便于后续操作

// 跳转到登录页面（小程序API）
const toLoginPage = () => {
  // 小程序跳转至pages/login/login页面
  uni.navigateTo({
    url: '/pages/login/login'
  });
};

const init = async () => {
  // 等待Vue的DOM渲染完成，确保容器尺寸稳定
  await nextTick();

  if (!mapRef.value) return;

  // 初始化地图时，强制指定容器的尺寸（避免尺寸异常）
  const container = mapRef.value;
  container.style.width = '100%';
  container.style.height = `${window.innerHeight - 100}px`; // 手动计算高度：视口高度 - 导航栏高度

  mapInstance = new window.TMap.Map(container, {
    zoom: 16,
    center: new window.TMap.LatLng(22.595327, 113.085775),
	pitch: 20,
	//baseMap: {
	//        type: "satellite", // 直接使用卫星底图
	//        features: ["base", "terrain", "building3d"],
	//    },
    // 禁用地图的自动适应容器尺寸变化（防止误触发）
    resizeEnable: false 
  });

  // 创建个性化图层
  window.TMap.ImageTileLayer.createCustomLayer({
    layerId: '693674ac4012',
    map: mapInstance
  }).then(customLayer => {
    customLayer ? console.log('图层创建成功') : console.log('图层创建失败');
  });

  // 监听窗口大小变化，手动调整地图尺寸（如需响应式）
  window.addEventListener('resize', () => {
    if (mapInstance) {
      container.style.height = `${window.innerHeight - 100}px`;
      mapInstance.resize(); // 手动触发地图尺寸重置
    }
  });
};

onMounted(() => {
  // 动态加载腾讯地图API
  const script = document.createElement('script');
  script.src = 'https://map.qq.com/api/gljs?v=1.exp&key=SWABZ-BCY64-WIHUL-KCDGA-OMFUV-JWFS5';
  script.onload = init;
  // 将script插入到head，避免body加载顺序问题
  document.head.appendChild(script); 
});
</script>

<style scoped>
/* 1. 重置全局样式，消除默认边距/内边距 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 2. 外层容器：占满视口，溢出隐藏 */
.app-wrapper {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 防止内容溢出导致滚动 */
}

/* 3. 导航栏：固定高度，布局调整为两端对齐 */
.navbar {
  height: 100px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between; /* 标题左，登录按钮右 */
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
  position: relative;
}

.navbar-title {
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
}

/* 登录按钮样式 */
.login-btn {
  padding: 8px 16px;
  border: 1px solid #1677ff;
  border-radius: 4px;
  background-color: #fff;
  color: #1677ff;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.login-btn:hover {
  background-color: #1677ff;
  color: #fff;
}

/* 4. 地图容器：初始高度设为0，后续由JS手动计算 */
.map-container {
  width: 100%;
  flex: 1; /* 配合外层flex，兜底高度 */
}
</style>