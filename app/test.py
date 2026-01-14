import asyncio
import aiohttp
import time
import random
from datetime import datetime, timedelta

# ===================== 核心配置 =====================
BASE_URL = "http://203.195.240.87"
CONCURRENT_USERS = 500    # 总并发用户
TEST_DURATION_MINUTES = 10 # 测试时长
MAX_RPS = 200              # 每秒最大请求数
USER_THINK_TIME = (0.2, 0.8) # 用户思考时间
MAX_ARTICLE_PAGE = 20
MONITOR_INTERVAL = 10      # 每10秒打印一次统计

# ===================== 全局统计（仅保留核心） =====================
stats = {
    "total": 0,
    "success": 0,
    "fail": 0,
    "total_rt": 0.0,
    "max_rt": 0.0,
    "min_rt": float("inf")
}
semaphore = asyncio.Semaphore(MAX_RPS) # 流量控制
stop_event = asyncio.Event()

# ===================== 核心请求函数（无日志） =====================
async def request_article(session):
    """单个文章请求（极简逻辑）"""
    page = random.randint(1, MAX_ARTICLE_PAGE)
    url = f"{BASE_URL}/article/page?page={page}"
    start = time.time()
    try:
        async with semaphore: # 流量控制
            async with session.get(
                url,
                headers={"accept": "application/json"},
                timeout=aiohttp.ClientTimeout(total=5)
            ) as resp:
                rt = time.time() - start
                if resp.status == 200:
                    return ("success", rt)
                return ("fail", rt)
    except:
        return ("fail", time.time() - start)

# ===================== 用户行为（无日志） =====================
async def user_task(session):
    """单个用户的请求循环（无任何打印）"""
    while not stop_event.is_set():
        status, rt = await request_article(session)
        # 更新全局统计
        stats["total"] += 1
        if status == "success":
            stats["success"] += 1
            stats["total_rt"] += rt
            stats["max_rt"] = max(stats["max_rt"], rt)
            stats["min_rt"] = min(stats["min_rt"], rt)
        else:
            stats["fail"] += 1
        # 模拟思考时间
        await asyncio.sleep(random.uniform(*USER_THINK_TIME))

# ===================== 监控函数（只打印统计） =====================
async def monitor():
    """每10秒打印一次统计（无其他日志）"""
    start_time = datetime.now()
    while not stop_event.is_set():
        await asyncio.sleep(MONITOR_INTERVAL)
        elapsed = (datetime.now() - start_time).total_seconds()
        qps = stats["total"] / elapsed if elapsed > 0 else 0
        avg_rt = stats["total_rt"] / stats["success"] if stats["success"] > 0 else 0
        # 只打印核心统计
        print(f"\n[ {datetime.now().strftime('%H:%M:%S')} ]")
        print(f"已运行：{elapsed:.0f}秒 | 总请求：{stats['total']}")
        print(f"成功：{stats['success']} | 失败：{stats['fail']} | 错误率：{stats['fail']/max(1, stats['total'])*100:.1f}%")
        print(f"QPS：{qps:.1f} | 平均响应：{avg_rt:.3f}秒 | 最大响应：{stats['max_rt']:.3f}秒")

# ===================== 主函数（分批启动用户） =====================
async def main():
    print(f"===== 2000人并发测试（{TEST_DURATION_MINUTES}分钟） =====")
    print(f"开始时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"流量限制：{MAX_RPS}请求/秒\n")

    # 创建会话（无连接限制）
    connector = aiohttp.TCPConnector(limit=0)
    async with aiohttp.ClientSession(connector=connector) as session:
        # 启动监控
        asyncio.create_task(monitor())
        
        # 分批启动用户（避免阻塞，无日志）
        tasks = []
        for _ in range(CONCURRENT_USERS):
            tasks.append(asyncio.create_task(user_task(session)))
            # 每100个用户休眠0.1秒（平滑启动）
            if len(tasks) % 100 == 0:
                await asyncio.sleep(0.1)
        
        # 运行指定时长后停止
        await asyncio.sleep(TEST_DURATION_MINUTES * 60)
        stop_event.set()
        # 等待所有用户任务结束
        await asyncio.gather(*tasks, return_exceptions=True)

    # 最终报告
    print("\n" + "="*50)
    print("===== 测试结束 =====")
    total_elapsed = (datetime.now() - datetime.strptime(
        stats["start_time"], "%Y-%m-%d %H:%M:%S"
    )).total_seconds()
    qps = stats["total"] / total_elapsed if total_elapsed > 0 else 0
    avg_rt = stats["total_rt"] / stats["success"] if stats["success"] > 0 else 0
    print(f"总耗时：{total_elapsed:.0f}秒 | 总请求：{stats['total']}")
    print(f"成功：{stats['success']} | 失败：{stats['fail']} | 错误率：{stats['fail']/max(1, stats['total'])*100:.1f}%")
    print(f"平均QPS：{qps:.1f} | 平均响应：{avg_rt:.3f}秒")
    print("="*50)

if __name__ == "__main__":
    asyncio.run(main())