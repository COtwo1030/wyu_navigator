<template>
	<view class="content">
		<!-- 顶部面板：包含Tab切换和输入区域 -->
		<view class="top-panel">
			<view class="nav-bar">
				<view class="nav-center">
					<button class="btn" @click="toggleSearchPanel">搜索</button>
					<button class="btn" @click="toSummary">地点汇总</button>
				</view>
				<view class="nav-right">
					<button class="btn login-btn" @click="toLogin">{{ username || '登录' }}</button>
				</view>
			</view>
			<view class="route-box" v-if="showRoutePanel">
				<view class="input-row">
					<text class="label start">起</text>
					<input class="input" v-model="startKeyword" placeholder="我的位置" />
				</view>
				<view class="input-row">
					<text class="label end">终</text>
					<input class="input" v-model="endKeyword" placeholder="输入终点" />
				</view>
				<button class="btn route-btn" @click="handleRoutePlan">开始导航</button>
			</view>
		</view>

		<view id="container" class="map-container"></view>
		
		
	</view>
</template>

<script>
	let mapInst = null;
	let markersInst = null;
	let poiMarkersInst = null;
	let routeLayerInst = null;
	export default {
		data() {
			return {
				map: null,
				keyword: '',
				results: [],
				
				startKeyword: '',
				endKeyword: '',
				
				searchService: null,
				markers: null,
				routeLayer: null,
				username: '',
				showRoutePanel: false
			}
		},
		onShow() {
			const name = uni.getStorageSync('username');
			this.username = name || '';
		},
		onReady() {
			// 检查 TMap 库是否已加载
			if (typeof TMap !== 'undefined') {
				this.initMap();
			} else {
				// 如果未加载，轮询检查直到加载完成
				const interval = setInterval(() => {
					if (typeof TMap !== 'undefined') {
						clearInterval(interval);
						this.initMap();
					}
				}, 500);
			}
		},
		methods: {
			initMap() {
				// 初始化地图中心点 (五邑大学附近)
				const center = new TMap.LatLng(22.595546, 113.086064);
				
				// 定义五邑大学区域边界 (大概范围)
				// 西南角: 22.5878, 113.0780
				// 东北角: 22.6030, 113.0950
				const boundary = new TMap.LatLngBounds(
					new TMap.LatLng(22.581284,113.064394),
					new TMap.LatLng(22.612047,113.108468)
				);

				mapInst = new TMap.Map('container', {
					center: center,
					zoom: 16,
					boundary: boundary,
					baseMap: { features: ['base', 'building3d'] }
				});



				// 创建个性化图层
				TMap.ImageTileLayer.createCustomLayer({
					layerId: '693674ac4012',
					map: mapInst
				}).then((customLayer) => {
					console.log('个性化图层创建成功');
				}).catch(err => {
					console.error('个性化图层加载错误:', err);
				});

				// 初始化点标记图层 (用于显示搜索结果)
				markersInst = new TMap.MultiMarker({
					map: mapInst
				});
				
				uni.request({
					url: 'http://127.0.0.1:8080/point/list',
					method: 'GET',
					success: (res) => {
						const points = (res.data && res.data.points) || [];
						const geometries = [];
						for (let i = 0; i < points.length; i++) {
							const p = points[i];
							if (typeof p.x === 'number' && typeof p.y === 'number' && p.y >= -90 && p.y <= 90 && p.x >= -180 && p.x <= 180) {
								geometries.push({
									id: String(p.id),
									position: new TMap.LatLng(p.y, p.x),
									content: p.name
								});
							}
						}
						markersInst.setGeometries(geometries);
						if (geometries.length) {
							const bounds = new TMap.LatLngBounds();
							geometries.forEach(g => bounds.extend(g.position));
							mapInst.fitBounds(bounds);
						}
					},
					fail: () => {
						uni.showToast({ title: '地点加载失败', icon: 'none' });
					}
				});
			},
			search() {
				if (!this.keyword) return;
				
				this.results = [];
				
				// 检查搜索服务是否可用
				if (typeof TMap.service !== 'undefined' && TMap.service.Search) {
					const search = new TMap.service.Search({
						pageSize: 10
					});
					
					// 执行搜索 (优先搜索当前城市)
					search.searchRegion({
						keyword: this.keyword,
						cityName: '江门市', // 修改为江门市以匹配五邑大学
					}).then((result) => {
						this.results = result.data;
						this.displayMarkers(result.data);
					}).catch((error) => {
						console.error('搜索错误:', error);
						uni.showToast({
							title: '搜索失败',
							icon: 'none'
						});
					});
				} else {
					console.error('搜索服务不可用');
					uni.showToast({
						title: '服务不可用',
						icon: 'none'
					});
				}
			},
			displayMarkers(data) {
				// 将搜索结果转换为标记点数据
				const geometries = data.map((item) => ({
					id: String(item.id),
					position: item.location,
					properties: {
						title: item.title
					}
				}));
				
				markersInst.setGeometries(geometries);
				
				// 自动调整地图视野以显示所有标记
					if (data.length > 0) {
						const bounds = new TMap.LatLngBounds();
						data.forEach(item => bounds.extend(item.location));
						mapInst.fitBounds(bounds);
					}
			},
			selectLocation(item) {
				// 点击列表项，移动地图中心到该位置
				mapInst.setCenter(item.location);
			},
			startNavigation(item) {
				// 从搜索结果切换到导航模式，并预填终点
				this.endKeyword = item.title;
				this.startKeyword = ''; // 默认为空，代表"我的位置"
				
				// 立即触发路线规划
				this.handleRoutePlan();
			},
			toLogin() {
				uni.navigateTo({ url: '/pages/login/login' });
			},
			toSummary() {
				uni.showToast({ title: '地点汇总开发中', icon: 'none' });
			},
			toggleSearchPanel() {
				this.showRoutePanel = !this.showRoutePanel;
			},
			async handleRoutePlan() {
				uni.showLoading({ title: '准备路线中...' });
				
				try {
					// 1. 解析起点
					let startLocation = null;
					if (!this.startKeyword || this.startKeyword.trim() === '' || this.startKeyword === '我的位置') {
						startLocation = await this.getCurrentLocation();
					} else {
						startLocation = await this.getCoordsByKeyword(this.startKeyword);
					}
					
					// 2. 解析终点
					let endLocation = null;
					if (!this.endKeyword) {
						uni.hideLoading();
						uni.showToast({ title: '请输入终点', icon: 'none' });
						return;
					}
					endLocation = await this.getCoordsByKeyword(this.endKeyword);
					
					// 3. 规划路线
					if (startLocation && endLocation) {
						this.planRoute(startLocation, endLocation);
					}
				} catch (e) {
					uni.hideLoading();
					console.error(e);
					uni.showToast({ title: '地址解析失败', icon: 'none' });
				}
			},
			getCurrentLocation() {
				return new Promise((resolve, reject) => {
					uni.getLocation({
						type: 'gcj02',
						success: (res) => {
							resolve(new TMap.LatLng(res.latitude, res.longitude));
						},
						fail: (err) => {
							// PC端开发调试时的备用坐标 (五邑大学)
							// resolve(new TMap.LatLng(22.595546, 113.086064)); 
							reject(err);
						}
					});
				});
			},
			getCoordsByKeyword(keyword) {
				return new Promise((resolve, reject) => {
					if (typeof TMap.service !== 'undefined' && TMap.service.Search) {
						const search = new TMap.service.Search({ pageSize: 1 });
						search.searchRegion({
							keyword: keyword,
							cityName: '江门市', // 限制在江门市搜索
						}).then((result) => {
							if (result.data && result.data.length > 0) {
								resolve(result.data[0].location);
							} else {
								reject('未找到该地点');
							}
						}).catch(reject);
					} else {
						reject('搜索服务不可用');
					}
				});
			},
			planRoute(start, end) {
				if (!TMap.service || !TMap.service.Driving) {
					uni.hideLoading();
					uni.showToast({ title: '导航服务不可用', icon: 'none' });
					return;
				}

				const driving = new TMap.service.Driving({
					mp: false, // 不返回多方案
					policy: 'PICKUP,NAV_POINT_FIRST' // 路线策略
				});

				driving.search({ from: start, to: end }).then((result) => {
					uni.hideLoading();
					if (result.result && result.result.routes && result.result.routes.length > 0) {
						const route = result.result.routes[0];
						this.drawRoute(route.polyline);
						
						// 调整视野以展示整条路线
						const bounds = new TMap.LatLngBounds();
						route.polyline.forEach(point => bounds.extend(point));
						mapInst.fitBounds(bounds, { padding: 80 });
						
						// 隐藏结果列表以清晰显示地图
						this.results = [];
					} else {
						uni.showToast({ title: '未找到路线', icon: 'none' });
					}
				}).catch((error) => {
					uni.hideLoading();
					console.error('路线规划错误:', error);
					uni.showToast({ title: '路线规划失败', icon: 'none' });
				});
			},
			drawRoute(path) {
					if (routeLayerInst) {
						routeLayerInst.setGeometries([]);
						routeLayerInst.destroy();
					}
					routeLayerInst = new TMap.MultiPolyline({
						id: 'route-layer',
						map: mapInst,
						styles: {
							'route': new TMap.PolylineStyle({ color: '#3777FF', width: 6, borderWidth: 2, borderColor: '#FFF', lineCap: 'round' })
						},
						geometries: [{ id: 'route', styleId: 'route', paths: path }]
					});
				}
		},
		onUnload() {
			// 页面卸载时销毁地图实例，防止内存泄漏
			if (mapInst) {
				mapInst.destroy();
				mapInst = null;
			}
		}
	}
</script>

<style>
	page {
		height: 100%;
		overflow: hidden;
	}

	.content {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100%;
		position: relative;
		overflow: hidden;
		background-color: #f8f8f8;
	}

	.top-panel {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		z-index: 999;
		background: #fff;
		padding: 10px;
		box-shadow: 0 2px 10px rgba(0,0,0,0.05);
	}
	.nav-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
	}
	.nav-center {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.nav-right {
		display: flex;
		align-items: center;
	}
	.login-btn {
		background-color: #34c759;
	}
	
	.search-box {
		display: flex;
		align-items: center;
	}

	.input {
		flex: 1;
		border: 1px solid #eee;
		padding: 0 12px;
		margin-right: 10px;
		border-radius: 20px;
		height: 36px;
		background-color: #f9f9f9;
		font-size: 14px;
	}
	
	.btn {
		height: 36px;
		line-height: 36px;
		font-size: 14px;
		background-color: #007aff;
		color: #fff;
		border-radius: 18px;
		padding: 0 20px;
		border: none;
	}

	.tab-header {
		display: flex;
		margin-bottom: 12px;
		justify-content: center;
	}
	
	.tab-item {
		padding: 6px 24px;
		font-size: 14px;
		color: #666;
		border-radius: 20px;
		background: #f5f5f5;
		margin: 0 10px;
		transition: all 0.3s;
	}
	
	.tab-item.active {
		background: #007aff;
		color: #fff;
		box-shadow: 0 2px 6px rgba(0,122,255,0.3);
	}

	.map-container {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		width: 100%;
		height: 100%;
		z-index: 1; /* Ensure map is behind the top panel */
	}

	.result-list {
		position: absolute;
		top: 10px;
		left: 10px;
		right: 10px;
		background: #fff;
		max-height: 40vh;
		overflow-y: auto;
		z-index: 200;
		box-shadow: 0 4px 15px rgba(0,0,0,0.1);
		border-radius: 8px;
	}
	
	/* Route Mode Styles */
	.route-box {
		display: flex;
		flex-direction: column;
	}
	
	.input-row {
		display: flex;
		align-items: center;
		margin-bottom: 10px;
		background: #f9f9f9;
		padding: 4px 8px;
		border-radius: 4px;
	}
	
	.label {
		width: 24px;
		height: 24px;
		line-height: 24px;
		text-align: center;
		font-size: 12px;
		color: #fff;
		border-radius: 4px;
		margin-right: 10px;
		flex-shrink: 0;
	}
	
	.label.start {
		background: #34c759;
	}
	
	.label.end {
		background: #ff3b30;
	}
	
	.route-btn {
		margin-top: 5px;
		background: #007aff;
		width: 100%;
		border-radius: 20px;
		font-size: 16px;
	}

	.result-item {
		padding: 12px;
		border-bottom: 1px solid #f0f0f0;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.item-info {
		flex: 1;
	}
	
	.nav-btn {
		margin-left: 10px;
		font-size: 12px;
		background-color: #4cd964;
		color: #fff;
		padding: 0 15px;
		height: 30px;
		line-height: 30px;
		border-radius: 15px;
	}
	
	.result-item:last-child {
		border-bottom: none;
	}

	.item-title {
		font-weight: bold;
		font-size: 14px;
		display: block;
		margin-bottom: 4px;
	}

	.item-address {
		font-size: 12px;
		color: #999;
	}
</style>
