# Face Analysis

基于 [InsightFace](https://github.com/deepinsight/insightface) 的人脸分析服务，包含 FastAPI 后端与 React 前端。

## 功能

- **检测**：bbox + 5 点关键点
- **分析**：年龄、性别、512 维特征向量
- **识别**：1:1 比对、1:N 搜索、注册/查询/删除已知人脸
- **换脸**：基于 `inswapper_128.onnx`（需自行下载）

## 环境

- Python ≥ 3.11（由 uv 自动管理）
- Node.js ≥ 18
- NVIDIA GPU + 驱动（默认启用 CUDA）

## 快速开始

### 1. 安装 uv

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. 启动后端

```bash
cd backend
uv sync                                           # 创建 .venv 并安装全部依赖
FACE_GPU_ID=0 uv run uvicorn app.main:app --port 8000 --reload
```

首次启动会自动下载 `buffalo_l` 模型包（≈280MB）到 `~/.insightface/models/`。

### 3. （可选）启用换脸

从 HuggingFace/镜像下载 `inswapper_128.onnx` 到 `backend/data/models/` 后重启后端。

### 4. 启动前端

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `FACE_GPU_ID` | `0` | 使用的 GPU 索引，`-1` 强制 CPU |
| `FACE_DET_SIZE` | `640` | 检测输入尺寸（正方形边长） |
| `FACE_MODEL_PACK` | `buffalo_l` | InsightFace 模型包名 |
| `FACE_SIM_THRESHOLD` | `0.35` | 1:1 比对判同阈值（余弦相似度） |
| `FACE_DB_PATH` | `data/face_db.json` | 向量库 JSON 持久化路径 |
| `FACE_SWAPPER_PATH` | `data/models/inswapper_128.onnx` | 换脸模型路径 |

## 健康检查

```bash
curl http://localhost:8000/api/health
# {"detector":true,"swapper":true,"provider":"CUDAExecutionProvider","device_id":0}
```

## 迁移到新机器

```bash
git clone <repo>
cd face_analysis/backend && uv sync
cd ../frontend && npm ci
```

`uv.lock` + `package-lock.json` 保证依赖完全一致。
