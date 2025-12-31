<template>
	<view class="content">
		<!-- 顶部面板：包含Tab切换和输入区域 -->
		<view class="top-panel">
			<view class="nav-bar">
				<view class="nav-left">
					<image class="logo" src="/static/wyu_logo.png" mode="heightFix"></image>
				</view>
				<view class="nav-center">
					<text class="link" @click="toggleSearchPanel">交通导航</text>
					<text class="link" @click="toSummary">地点汇总</text>
				</view>
				<view class="nav-right">
					<view class="login-wrap" @mouseenter="onLoginMouseEnter" @mouseleave="onLoginMouseLeave">
						<text class="link" @click.stop="onLoginClick">{{ username || '登录' }}</text>
						<view class="login-dropdown" v-if="username && dropdownOpen" @mouseenter="onLoginMouseEnter" @mouseleave="onLoginMouseLeave">
							<view class="dropdown-item" @click="logout">退出登录</view>
						</view>
					</view>
				</view>
			</view>
			<view class="route-box" v-if="showRoutePanel" :style="{ left: routeBoxLeft + 'px', top: routeBoxTop + 'px' }" @touchstart="onRouteBoxTouchStart" @touchmove.stop.prevent="onRouteBoxTouchMove" @touchend="onRouteBoxTouchEnd" @mousedown="onRouteBoxMouseDown">
				<view class="route-title">
					<text>交通导航</text>
					<text class="route-close" @click="closePanel">×</text>
				</view>
				<view class="route-tabs">
					<text class="tab" :class="{active: routeMode==='walking'}" @click="changeMode('walking')">步行</text>
					<text class="tab" :class="{active: routeMode==='driving'}" @click="changeMode('driving')">驾车</text>
					<text class="tab" :class="{active: routeMode==='bicycling'}" @click="changeMode('bicycling')">骑行</text>
				</view>
				<view class="route-rows">
					<view class="swap-col" @click="swapPoints"><text class="arrow">↑</text><text class="arrow">↓</text></view>
					<view class="rows-col">
						<view class="route-row">
							<text class="dot green"></text>
							<input class="route-input" v-model="startKeyword" placeholder="输入起点" @input="onStartInput" @focus="focusedField='start'" @blur="onStartBlur" />
							<text class="row-clear" @click="clearStart">×</text>
							<view class="suggest-list" v-if="focusedField==='start' && startSuggestions.length">
								<view class="suggest-item" v-for="s in startSuggestions" :key="s.id" @click="selectStartSuggestion(s)">
									<text class="suggest-icon">📍</text>
									<text class="suggest-title">{{ s.name }}</text>
								</view>
							</view>
						</view>
						<view class="route-row">
							<text class="dot blue"></text>
							<input class="route-input" v-model="endKeyword" placeholder="输入终点" @input="onEndInput" @focus="focusedField='end'" @blur="onEndBlur" />
							<text class="row-clear" @click="clearEnd">×</text>
							<view class="suggest-list" v-if="focusedField==='end' && endSuggestions.length">
								<view class="suggest-item" v-for="s in endSuggestions" :key="s.id" @click="selectEndSuggestion(s)">
									<text class="suggest-icon">📍</text>
									<text class="suggest-title">{{ s.name }}</text>
								</view>
							</view>
						</view>
					</view>
				</view>
				<view class="route-actions">
					<button class="primary" @click="handleRoutePlan">开始导航</button>
					<button class="outline" @click="clearRoute">清除路线</button>
				</view>

			</view>
		</view>

		<view class="summary-box" v-if="showSummaryPanel" :style="{ left: summaryBoxLeft + 'px', top: summaryBoxTop + 'px' }" @touchstart="onSummaryTouchStart" @touchmove.stop.prevent="onSummaryTouchMove" @touchend="onSummaryTouchEnd" @mousedown="onSummaryMouseDown">
			<view class="summary-title">
				<text>地点汇总</text>
				<text class="route-close" @click="closeSummary">×</text>
			</view>
			<view class="summary-tabs">
				<text v-for="c in summaryCategories" :key="c" class="tab" :class="{active: selectedCategory===c}" @click="selectCategory(c)">{{ c }}</text>
			</view>
			<scroll-view class="summary-scroll" scroll-y="true">
				<view class="summary-grid">
					<view class="grid-item" v-for="p in summaryPoints" :key="p.id" @click="openPointCard(p)">
						<image class="grid-img" :src="p.img" mode="aspectFit"></image>
						<text class="grid-name">{{ p.name }}</text>
					</view>
				</view>
			</scroll-view>
		</view>

		<view class="point-card" v-if="pointCardVisible" :style="{ left: pointCardLeft + 'px', top: pointCardTop + 'px' }" @touchstart="onPointCardTouchStart" @touchmove.stop.prevent="onPointCardTouchMove" @touchend="onPointCardTouchEnd" @mousedown="onPointCardMouseDown">
			<view class="point-card-title">
				<text>{{ pointCard.name }}</text>
				<text class="route-close" @click="closePointCard">×</text>
			</view>
			<image class="point-card-img" :src="pointCard.img" mode="aspectFit" @click="previewImage(pointCard.img)"></image>
			<view class="point-card-desc">{{ pointCard.description }}</view>
			<view class="point-card-actions">
				<button class="primary" @click="startNavToPoint">开始导航</button>
				<button class="outline" @click="setAsEnd">设为终点</button>
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
	let seMarkersInst = null;
	let seLabelsInst = null;
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
				showRoutePanel: false,
				routeMode: 'walking',
				routeBoxLeft: 0,
				routeBoxTop: 80,
				dragging: false,
				dragMode: '',
				dragStart: { x: 0, y: 0 },
				boxStart: { left: 0, top: 0 },
				startSuggestions: [],
				endSuggestions: [],
				startTimer: null,
				endTimer: null,
				startBlurTimer: null,
				endBlurTimer: null,
				focusedField: '',
				dropdownOpen: false,
				dropdownCloseTimer: null,
				showSummaryPanel: false,
				summaryCategories: [],
				selectedCategory: '',
				summaryPoints: [],
				_allSummaryPoints: [],
				pointCardVisible: false,
				pointCard: null,
				pointCardLeft: 100,
				pointCardTop: 120,
				pcDragging: false,
				pcDragMode: '',
				pcDragStart: { x: 0, y: 0 },
				pcBoxStart: { left: 0, top: 0 },
				summaryBoxLeft: 0,
				summaryBoxTop: 80,
				sDragging: false,
				sDragMode: '',
				sDragStart: { x: 0, y: 0 },
				sBoxStart: { left: 0, top: 0 }
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
				const center = new TMap.LatLng(22.596002,113.086019);
				
				// 定义五邑大学区域边界 (大概范围)
				// 西南角: 22.5878, 113.0780
				// 东北角: 22.6030, 113.0950
				const boundary = new TMap.LatLngBounds(
					new TMap.LatLng(22.581284,113.064394),
					new TMap.LatLng(22.612047,113.108468)
				);

				mapInst = new TMap.Map('container', {
					center: center,
					zoom: 16.2,
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

				// 起终点标记图层
				seMarkersInst = new TMap.MultiMarker({
					map: mapInst,
					styles: {
						start: new TMap.MarkerStyle({ width: 25, height: 35, anchor: { x: 16, y: 32 }, src: 'https://mapapi.qq.com/web/lbs/javascriptGL/demo/img/start.png' }),
						end: new TMap.MarkerStyle({ width: 25, height: 35, anchor: { x: 16, y: 32 }, src: 'https://mapapi.qq.com/web/lbs/javascriptGL/demo/img/end.png' })
					}
				});
				// 起终点文字标签图层
				seLabelsInst = new TMap.MultiLabel({
					map: mapInst,
					styles: {
						startLabel: new TMap.LabelStyle({ color: '#2E7D32', size: 14, offset: { x: 0, y: -40 } }),
						endLabel: new TMap.LabelStyle({ color: '#1565C0', size: 14, offset: { x: 0, y: -40 } })
					}
				});

				// 初始化点标记
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
			clearRoute() {
				if (routeLayerInst) { routeLayerInst.setGeometries([]); routeLayerInst.destroy(); routeLayerInst = null; }
				if (seMarkersInst) { seMarkersInst.setGeometries([]); }
				if (seLabelsInst) { seLabelsInst.setGeometries([]); }
				uni.request({
					url: 'http://127.0.0.1:8080/point/list',
					method: 'GET',
					success: (res) => {
						const points = (res.data && res.data.points) || [];
						const geometries = [];
						for (let i = 0; i < points.length; i++) {
							const p = points[i];
							if (typeof p.x === 'number' && typeof p.y === 'number' && p.y >= -90 && p.y <= 90 && p.x >= -180 && p.x <= 180) {
								geometries.push({ id: String(p.id), position: new TMap.LatLng(p.y, p.x), content: p.name });
							}
						}
						if (markersInst) { markersInst.setGeometries(geometries); }
					},
					fail: () => { uni.showToast({ title: '地点加载失败', icon: 'none' }); }
				});
			},
			clearStart() { this.startKeyword = ''; },
			clearEnd() { this.endKeyword = ''; },
			closePanel() { this.showRoutePanel = false; this.clearRoute(); },
			changeMode(mode) { this.routeMode = mode; if (this.endKeyword) { this.handleRoutePlan(); } },
			swapPoints() {
				const s = this.startKeyword;
				this.startKeyword = this.endKeyword;
				this.endKeyword = s;
				if (seMarkersInst) { seMarkersInst.setGeometries([]); }
				if (this.endKeyword) { this.handleRoutePlan(); }
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
			onLoginClick() {
						if (!this.username) {
							uni.navigateTo({ url: '/pages/login/login' });
						}
					},
					onLoginMouseEnter() {
						if (this.dropdownCloseTimer) clearTimeout(this.dropdownCloseTimer);
						if (this.username) this.dropdownOpen = true;
					},
					onLoginMouseLeave() {
						if (this.dropdownCloseTimer) clearTimeout(this.dropdownCloseTimer);
						this.dropdownCloseTimer = setTimeout(() => { this.dropdownOpen = false; }, 2000);
					},
					logout() {
						if (this.dropdownCloseTimer) clearTimeout(this.dropdownCloseTimer);
						this.dropdownOpen = false;
						uni.removeStorageSync('username');
						this.username = '';
						uni.showToast({ title: '已退出', icon: 'none' });
					},
				toSummary() {
					this.showSummaryPanel = !this.showSummaryPanel;
					if (this.showSummaryPanel) {
						this.fetchSummaryPoints();
					} else {
						this.loadAllMarkers();
					}
				},
				fetchSummaryPoints() {
					uni.request({
						url: 'http://127.0.0.1:8080/point/list',
						method: 'GET',
						success: (res) => {
							const points = (res.data && res.data.points) || [];
							this._allSummaryPoints = points;
							const seen = {}; const cats = [];
							for (let i = 0; i < points.length; i++) { const c = points[i].category || '其他'; if (!seen[c]) { seen[c] = 1; cats.push(c); } }
							this.summaryCategories = cats;
							this.selectedCategory = cats[0] || '';
							this.summaryPoints = this.selectedCategory ? points.filter(p => (p.category || '其他') === this.selectedCategory) : points;
							this.applySummaryMarkers();
						},
						fail: () => { uni.showToast({ title: '地点加载失败', icon: 'none' }); }
					});
				},
				selectCategory(c) { this.selectedCategory = c; const list = (this._allSummaryPoints || []).filter(p => (p.category || '其他') === c); this.summaryPoints = list; this.applySummaryMarkers(); },
				applySummaryMarkers() {
					if (!markersInst) return;
					const list = this.summaryPoints || [];
					const geos = [];
					for (let i = 0; i < list.length; i++) { const p = list[i]; if (typeof p.x === 'number' && typeof p.y === 'number') { geos.push({ id: String(p.id), position: new TMap.LatLng(p.y, p.x), styleId: 'poi', content: p.name }); } }
					markersInst.setGeometries(geos);
				},
				closeSummary() { this.showSummaryPanel = false; this.loadAllMarkers(); },
				openPointCard(p) {
					this.pointCard = p;
					this.pointCardVisible = true;
					const w = 560, h = 520;
					uni.getSystemInfo({
						success: (info) => {
							const left = Math.max(10, Math.floor((info.windowWidth - w) / 2));
							const top = Math.max(60, Math.floor((info.windowHeight - h) / 2));
							this.pointCardLeft = left;
							this.pointCardTop = top;
						}
					});
				},
				closePointCard() { this.pointCardVisible = false; this.pointCard = null; },
				startNavToPoint() { if (!this.pointCard) return; this.endKeyword = this.pointCard.name || ''; this.pointCardVisible = false; this.showSummaryPanel = false; if (markersInst) { markersInst.setGeometries([]); } this.handleRoutePlan(); },
				setAsEnd() { if (!this.pointCard) return; this.endKeyword = this.pointCard.name || ''; this.pointCardVisible = false; this.showSummaryPanel = false; if (markersInst) { markersInst.setGeometries([]); } },
				previewImage(src) { if (!src) return; const urls = Array.isArray(src) ? src : [src]; uni.previewImage({ current: urls[0], urls }); },
				onPointCardTouchStart(e) { const t = (e.touches && e.touches[0]) || null; this.pcDragging = true; this.pcDragMode = 'touch'; this.pcDragStart = t ? { x: t.clientX || t.pageX, y: t.clientY || t.pageY } : { x: 0, y: 0 }; this.pcBoxStart = { left: this.pointCardLeft, top: this.pointCardTop }; },
				onPointCardTouchMove(e) { if (!this.pcDragging || this.pcDragMode !== 'touch') return; const t = (e.touches && e.touches[0]) || null; if (!t) return; const dx = (t.clientX || t.pageX) - this.pcDragStart.x; const dy = (t.clientY || t.pageY) - this.pcDragStart.y; this.pointCardLeft = this.pcBoxStart.left + dx; this.pointCardTop = this.pcBoxStart.top + dy; },
				onPointCardTouchEnd() { this.pcDragging = false; this.pcDragMode = ''; },
				onPointCardMouseDown(e) { this.pcDragging = true; this.pcDragMode = 'mouse'; this.pcDragStart = { x: e.clientX, y: e.clientY }; this.pcBoxStart = { left: this.pointCardLeft, top: this.pointCardTop }; if (typeof document !== 'undefined') { document.addEventListener('mousemove', this.onPointCardMouseMove); document.addEventListener('mouseup', this.onPointCardMouseUp); } },
				onPointCardMouseMove(e) { if (!this.pcDragging || this.pcDragMode !== 'mouse') return; const dx = e.clientX - this.pcDragStart.x; const dy = e.clientY - this.pcDragStart.y; this.pointCardLeft = this.pcBoxStart.left + dx; this.pointCardTop = this.pcBoxStart.top + dy; },
				onPointCardMouseUp() { this.pcDragging = false; this.pcDragMode = ''; if (typeof document !== 'undefined') { document.removeEventListener('mousemove', this.onPointCardMouseMove); document.removeEventListener('mouseup', this.onPointCardMouseUp); } },
				onSummaryTouchStart(e) {
					const t = (e.touches && e.touches[0]) || null;
					this.sDragging = true;
					this.sDragMode = 'touch';
					if (t) { this.sDragStart = { x: t.clientX || t.pageX, y: t.clientY || t.pageY }; } else { this.sDragStart = { x: 0, y: 0 }; }
					this.sBoxStart = { left: this.summaryBoxLeft, top: this.summaryBoxTop };
				},
				onSummaryTouchMove(e) {
					if (!this.sDragging || this.sDragMode !== 'touch') return;
					const t = (e.touches && e.touches[0]) || null;
					if (!t) return;
					const dx = (t.clientX || t.pageX) - this.sDragStart.x;
					const dy = (t.clientY || t.pageY) - this.sDragStart.y;
					this.summaryBoxLeft = this.sBoxStart.left + dx;
					this.summaryBoxTop = this.sBoxStart.top + dy;
				},
				onSummaryTouchEnd() {
					this.sDragging = false;
					this.sDragMode = '';
				},
				onSummaryMouseDown(e) {
					this.sDragging = true;
					this.sDragMode = 'mouse';
					this.sDragStart = { x: e.clientX, y: e.clientY };
					this.sBoxStart = { left: this.summaryBoxLeft, top: this.summaryBoxTop };
					if (typeof document !== 'undefined') {
						document.addEventListener('mousemove', this.onSummaryMouseMove);
						document.addEventListener('mouseup', this.onSummaryMouseUp);
					}
				},
				onSummaryMouseMove(e) {
					if (!this.sDragging || this.sDragMode !== 'mouse') return;
					const dx = e.clientX - this.sDragStart.x;
					const dy = e.clientY - this.sDragStart.y;
					this.summaryBoxLeft = this.sBoxStart.left + dx;
					this.summaryBoxTop = this.sBoxStart.top + dy;
				},
				onSummaryMouseUp() {
					this.sDragging = false;
					this.sDragMode = '';
					if (typeof document !== 'undefined') {
						document.removeEventListener('mousemove', this.onSummaryMouseMove);
						document.removeEventListener('mouseup', this.onSummaryMouseUp);
					}
				},
				loadAllMarkers() {
					uni.request({
						url: 'http://127.0.0.1:8080/point/list',
						method: 'GET',
						success: (res) => {
							const points = (res.data && res.data.points) || [];
							const geometries = [];
							for (let i = 0; i < points.length; i++) { const p = points[i]; if (typeof p.x === 'number' && typeof p.y === 'number') { geometries.push({ id: String(p.id), position: new TMap.LatLng(p.y, p.x), styleId: 'poi', content: p.name }); } }
							if (markersInst) { markersInst.setGeometries(geometries); }
						},
						fail: () => {}
					});
				},
				toggleSearchPanel() {
					this.showRoutePanel = !this.showRoutePanel;
				},
			async handleRoutePlan() {
					uni.showLoading({ title: '准备路线中...' });
					if (markersInst) { markersInst.setGeometries([]); }
					this.results = [];
				
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
				return new Promise((resolve) => {
					uni.getLocation({
						type: 'gcj02',
						isHighAccuracy: true,
						highAccuracyExpireTime: 5000,
						timeout: 8000,
						success: (res) => {
							resolve(new TMap.LatLng(res.latitude, res.longitude));
						},
						fail: () => {
							resolve(new TMap.LatLng(22.595546, 113.086064));
						}
					});
				});
			},
			getCoordsByKeyword(keyword) {
				return new Promise((resolve, reject) => {
					uni.request({
						url: 'http://127.0.0.1:8080/point/list',
						method: 'GET',
						success: (res) => {
							const points = (res.data && res.data.points) || [];
							const k = String(keyword).trim();
							let p = points.find(it => it && typeof it.name === 'string' && it.name === k);
							if (!p) p = points.find(it => it && typeof it.name === 'string' && it.name.includes(k));
							if (p && typeof p.x === 'number' && typeof p.y === 'number') {
								resolve(new TMap.LatLng(p.y, p.x));
							} else {
								reject('未找到该地点');
							}
						},
						fail: reject
					});
				});
			},
			async planRoute(start, end) {
					const slat = start.getLat ? start.getLat() : start.lat;
					const slng = start.getLng ? start.getLng() : start.lng;
					const elat = end.getLat ? end.getLat() : end.lat;
					const elng = end.getLng ? end.getLng() : end.lng;
					const from = `${slat},${slng}`;
					const to = `${elat},${elng}`;
					const mode = this.routeMode || 'driving';
					uni.request({
						url: `/qqmap/ws/direction/v1/${mode}`,
						method: 'GET',
						data: { from, to, key: 'SWABZ-BCY64-WIHUL-KCDGA-OMFUV-JWFS5' },
						success: (res) => {
							uni.hideLoading();
							const route = res.data && res.data.result && res.data.result.routes && res.data.result.routes[0];
							if (!route || !route.polyline) { uni.showToast({ title: '未找到路线', icon: 'none' }); return; }
							const pl = route.polyline.slice();
						for (let i = 2; i < pl.length; i++) pl[i] = pl[i-2] + pl[i] / 1000000;
						const path = [];
						for (let i = 0; i < pl.length; i += 2) path.push(new TMap.LatLng(pl[i], pl[i+1]));
						this.drawRoute(path);
						seMarkersInst && seMarkersInst.setGeometries([
							{ id: 'start', styleId: 'start', position: new TMap.LatLng(slat, slng) },
							{ id: 'end', styleId: 'end', position: new TMap.LatLng(elat, elng) }
						]);
						const startName = (!this.startKeyword || this.startKeyword.trim() === '' || this.startKeyword === '我的位置') ? '我的位置' : this.startKeyword;
						const endName = this.endKeyword;
						seLabelsInst && seLabelsInst.setGeometries([
							{ id: 'startLabel', styleId: 'startLabel', position: new TMap.LatLng(slat, slng), content: startName },
							{ id: 'endLabel', styleId: 'endLabel', position: new TMap.LatLng(elat, elng), content: endName }
						]);
						const bounds = new TMap.LatLngBounds();
						path.forEach(pt => bounds.extend(pt));
						mapInst.fitBounds(bounds, { padding: 80 });
						this.results = [];
						},
						fail: () => { uni.hideLoading(); uni.showToast({ title: '路线规划失败', icon: 'none' }); }
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
				},
				onRouteBoxTouchStart(e) {
					const t = (e.touches && e.touches[0]) || null;
					this.dragging = true;
					this.dragMode = 'touch';
					if (t) { this.dragStart = { x: t.clientX || t.pageX, y: t.clientY || t.pageY }; } else { this.dragStart = { x: 0, y: 0 }; }
					this.boxStart = { left: this.routeBoxLeft, top: this.routeBoxTop };
				},
				onRouteBoxTouchMove(e) {
					if (!this.dragging || this.dragMode !== 'touch') return;
					const t = (e.touches && e.touches[0]) || null;
					if (!t) return;
					const dx = (t.clientX || t.pageX) - this.dragStart.x;
					const dy = (t.clientY || t.pageY) - this.dragStart.y;
					this.routeBoxLeft = this.boxStart.left + dx;
					this.routeBoxTop = this.boxStart.top + dy;
				},
				onRouteBoxTouchEnd() {
					this.dragging = false;
					this.dragMode = '';
				},
				onRouteBoxMouseDown(e) {
					this.dragging = true;
					this.dragMode = 'mouse';
					this.dragStart = { x: e.clientX, y: e.clientY };
					this.boxStart = { left: this.routeBoxLeft, top: this.routeBoxTop };
					if (typeof document !== 'undefined') {
						document.addEventListener('mousemove', this.onRouteBoxMouseMove);
						document.addEventListener('mouseup', this.onRouteBoxMouseUp);
					}
				},
				onRouteBoxMouseMove(e) {
					if (!this.dragging || this.dragMode !== 'mouse') return;
					const dx = e.clientX - this.dragStart.x;
					const dy = e.clientY - this.dragStart.y;
					this.routeBoxLeft = this.boxStart.left + dx;
					this.routeBoxTop = this.boxStart.top + dy;
				},
				onRouteBoxMouseUp() {
					this.dragging = false;
					this.dragMode = '';
					if (typeof document !== 'undefined') {
						document.removeEventListener('mousemove', this.onRouteBoxMouseMove);
						document.removeEventListener('mouseup', this.onRouteBoxMouseUp);
					}
				},
				onStartInput(e) {
					this.focusedField = 'start';
					const v = e && e.detail ? e.detail.value : this.startKeyword;
					this.startKeyword = v;
					if (this.startTimer) clearTimeout(this.startTimer);
					this.startTimer = setTimeout(() => { this.fetchSuggestions('start', v); }, 200);
				},
				onEndInput(e) {
					this.focusedField = 'end';
					const v = e && e.detail ? e.detail.value : this.endKeyword;
					this.endKeyword = v;
					if (this.endTimer) clearTimeout(this.endTimer);
					this.endTimer = setTimeout(() => { this.fetchSuggestions('end', v); }, 200);
				},
				fetchSuggestions(field, keyword) {
					const k = String(keyword || '').trim();
					if (!k) { this.startSuggestions = []; this.endSuggestions = []; return; }
					uni.request({
						url: 'http://127.0.0.1:8080/point/list',
						method: 'GET',
						success: (res) => {
							const points = (res.data && res.data.points) || [];
							const list = points.filter(it => it && typeof it.name === 'string' && it.name.includes(k)).slice(0, 10).map(it => ({ id: String(it.id), name: it.name, x: it.x, y: it.y }));
							if (field === 'start') this.startSuggestions = list; else this.endSuggestions = list;
						},
						fail: () => { if (field === 'start') this.startSuggestions = []; else this.endSuggestions = []; }
					});
				},
				selectStartSuggestion(s) {
					this.startKeyword = s && s.name ? s.name : this.startKeyword;
					this.startSuggestions = [];
					this.focusedField = '';
				},
				selectEndSuggestion(s) {
					this.endKeyword = s && s.name ? s.name : this.endKeyword;
					this.endSuggestions = [];
					this.focusedField = '';
				},
				onStartBlur() {
					if (this.startBlurTimer) clearTimeout(this.startBlurTimer);
					this.startBlurTimer = setTimeout(() => {
						if (this.focusedField === 'start') { this.focusedField = ''; this.startSuggestions = []; }
					}, 150);
				},
				onEndBlur() {
					if (this.endBlurTimer) clearTimeout(this.endBlurTimer);
					this.endBlurTimer = setTimeout(() => {
						if (this.focusedField === 'end') { this.focusedField = ''; this.endSuggestions = []; }
					}, 150);
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
		background: transparent;
		padding: 0;
		box-shadow: none;
	}
	.nav-bar {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin: 0;
			background: #8B0000;
			padding: 20px 20px;
			border-radius: 0;
			color: #fff;
			width: 100%;
		}
	.nav-center {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		flex: 1;
	}
	.nav-right { display:flex; align-items:center; position:relative; margin-right: 32px; }
	.login-wrap { position:relative; }
	.login-dropdown { position:absolute; top:calc(100% + 6px); right:0; background:#fff; border:1px solid #eee; border-radius:6px; box-shadow:0 6px 16px rgba(0,0,0,0.12); z-index:1000; min-width:120px; }
	.login-dropdown .dropdown-item { padding:8px 12px; color:#333; }
	.login-dropdown .dropdown-item:hover { background:#f5f7fa; }
	.nav-left {
		display: flex;
		align-items: center;
	}
	.logo {
		height: 40px;
		width: auto;
	}
	.link {
		color: #fff;
		font-size: 14px;
		padding: 0 12px;
		line-height: 40px;
		cursor: pointer;
	}
	.link:hover { opacity: 0.85; }
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
			position: absolute;
			width: 300px;
			display: flex;
			flex-direction: column;
			padding: 0px;
			background: rgba(255,255,255,0.96);
			border-radius: 10px;
			box-shadow: 0 6px 20px rgba(0,0,0,0.12);
			backdrop-filter: saturate(180%) blur(4px);
			z-index: 998;
			user-select: none;
			cursor: move;
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
	
	.route-title { display:flex; align-items:center; justify-content:space-between; background:#0D6EFD; color:#fff; font-size:16px; font-weight:600; padding:10px 12px; border-radius:6px; }
		.route-close { font-size:18px; padding:0 6px; cursor:pointer; }
		.route-tabs { display:flex; gap:20px; padding:12px 12px; border-bottom:1px solid #eee; }
		.tab { color:#666; padding:6px 0; border-bottom:2px solid transparent; }
		.tab.active { color:#0D6EFD; border-bottom-color:#0D6EFD; }
		.route-rows { display:flex; gap:10px; padding:12px; }
		.rows-col { flex:1; display:flex; flex-direction:column; gap:10px; }
		.swap-col { display:flex; flex-direction:row; align-items:center; justify-content:center; gap:10px; padding:8px 10px; background:#f6f6f6; border-radius:6px; cursor:pointer; }
		.arrow { color:#0D6EFD; font-weight:600; font-size:20px; line-height:20px; }
		.route-row { display:flex; align-items:center; gap:8px; padding:8px 10px; border-bottom:1px solid #eee; position: relative; overflow: visible; }
		.dot { width:8px; height:8px; border-radius:50%; display:inline-block; }
		.green { background:#34c759; }
		.blue { background:#0D6EFD; }
		.scope { color:#0D6EFD; font-size:12px; }
		.route-input { flex:1; height:36px; border:1px solid #eee; border-radius:20px; padding:0 12px; background:#fff; }
		.row-clear { color:#999; cursor:pointer; padding:0 6px; }
		.route-actions { display:flex; gap:12px; padding:12px; }
		.primary { flex:1; background:#0D6EFD; color:#fff; border-radius:6px; height:40px; line-height:40px; }
		.outline { flex:1; background:#fff; color:#0D6EFD; border:1px solid #0D6EFD; border-radius:6px; height:40px; line-height:40px; }
				.suggest-list { position:absolute; top:calc(100% + 6px); left:40px; right:10px; background:#fff; border:1px solid #eee; border-radius:6px; box-shadow:0 6px 16px rgba(0,0,0,0.12); max-height:220px; overflow-y:auto; z-index: 1000; }
				.suggest-item { display:flex; align-items:center; gap:8px; padding:8px 10px; border-bottom:1px solid #f4f4f4; }
				.suggest-item:last-child { border-bottom:none; }
				.suggest-icon { color:#0D6EFD; }
				.suggest-title { font-size:14px; color:#333; }
				.summary-box { position:absolute; width:500px; height:500px; background: rgba(255,255,255,0.96); border-radius:10px; box-shadow: 0 6px 20px rgba(0,0,0,0.12); z-index:998; user-select:none; cursor:move; overflow:hidden; display:flex; flex-direction:column; }
				.summary-title { display:flex; align-items:center; justify-content:space-between; background:#0D6EFD; color:#fff; font-size:16px; font-weight:600; padding:10px 12px; border-radius:6px; }
				.summary-tabs { display:flex; flex-wrap:wrap; gap:8px; padding:12px; }
				.summary-tabs .tab { padding:6px 10px; background:#f6f6f6; border-radius:6px; color:#666; }
				.summary-tabs .tab.active { background:#0D6EFD; color:#fff; }
				.summary-scroll { width:100%; box-sizing:border-box; height:calc(100% - 120px); overflow-y:auto; padding:8px 12px; display:flex; justify-content:center; }
				.summary-grid { display:grid; grid-template-columns: repeat(3, 140px); gap: 12px; justify-content: center; }
				.grid-item { box-sizing:border-box; display:flex; flex-direction:column; align-items:center; }
				.grid-img { display:block; width:100%; aspect-ratio: 1 / 1; height:auto; margin:0 auto; border-radius:8px; background:#f9f9f9; object-fit:contain; }
				.grid-name { margin-top:6px; font-size:12px; color:#333; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
				.point-card { position:absolute; width:560px; max-width:95vw; background:#fff; border-radius:10px; box-shadow:0 10px 24px rgba(0,0,0,0.16); z-index:999; overflow:hidden; user-select:none; cursor:move; }
				.point-card-title { display:flex; align-items:center; justify-content:space-between; background:#0D6EFD; color:#fff; font-size:16px; font-weight:600; padding:10px 12px; }
				.point-card-img { display:block; width:100%; height:320px; object-fit:contain; background:#f7f7f7; }
				.point-card-desc { padding:12px; color:#555; font-size:13px; line-height:1.6; }
				.point-card-actions { display:flex; gap:12px; padding:12px; }


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
