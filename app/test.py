import requests

# 1) 获取 PUT 预签名链接
api = "http://127.0.0.1:8000/storage/upload_url"
params = {"key": "Wuyi_University_Logo.png"}
resp = requests.get(api, params=params, timeout=10)
print(resp.json() if resp.ok else resp.text)
if not resp.ok:
    raise SystemExit("获取预签名失败")
put_url = resp.json().get("url")
if not put_url:
    raise SystemExit("返回中缺少 url 字段")

# 2) 读取本地文件并上传（仅新增 Content-Disposition 头）
file_path = r"C:\Users\COtwo\Pictures\Camera Roll\Wuyi_University_Logo.png"
# 关键修改：在headers里加 Content-Disposition: inline
headers = {
    "Content-Type": "image/png",
    "Content-Disposition": "inline"  # 新增这1行，指定图片内联预览
}
with open(file_path, "rb") as f:
    up = requests.put(put_url, data=f, headers=headers, timeout=30)
print("PUT status:", up.status_code)
print("上传成功" if up.ok else up.text[:200])