# Backend

FastAPI + InsightFace 人脸分析服务。

## 开发

```bash
uv sync                                # 首次创建环境
FACE_GPU_ID=0 uv run uvicorn app.main:app --reload --port 8000
```

接口文档：http://localhost:8000/docs

## 模型

- **buffalo_l**：自动下载到 `~/.insightface/models/`（≈280MB）
- **inswapper_128.onnx**：手动下载到 `data/models/`（≈530MB，换脸功能依赖）
  - 官方已下架，社区镜像：`huggingface.co/ezioruan/inswapper_128.onnx`

## 目录

```
app/
├── main.py          # FastAPI 入口
├── config.py        # 环境变量配置
├── models.py        # Pydantic schema
├── face_engine.py   # InsightFace 单例（含 GPU provider 选择）
├── face_db.py       # 内存向量库 + JSON 持久化
└── routers/
    ├── detect.py
    ├── analyze.py
    ├── recognize.py
    └── swap.py
```
