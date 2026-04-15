import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  timeout: 60000,
});

export interface BBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DetectedFace {
  bbox: BBox;
  kps: number[][];
  det_score: number;
}

export interface AnalyzedFace extends DetectedFace {
  age: number | null;
  gender: string | null;
  embedding: number[] | null;
}

export interface DetectResponse {
  faces: DetectedFace[];
  width: number;
  height: number;
}

export interface AnalyzeResponse {
  faces: AnalyzedFace[];
  width: number;
  height: number;
}

export interface FaceRecordOut {
  id: string;
  name: string;
  created_at: number;
}

export interface SearchHit {
  id: string;
  name: string;
  similarity: number;
}

export interface HealthResponse {
  detector: boolean;
  swapper: boolean;
  swapper_error: string | null;
  provider: string;
  device_id: number;
  model_pack: string;
  det_size: number;
  db_count: number;
}

export async function getHealth(): Promise<HealthResponse> {
  const r = await api.get<HealthResponse>("/health");
  return r.data;
}

export async function detectFaces(file: File): Promise<DetectResponse> {
  const form = new FormData();
  form.append("image", file);
  const r = await api.post<DetectResponse>("/detect", form);
  return r.data;
}

export async function analyzeFaces(
  file: File,
  includeEmbedding = false
): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append("image", file);
  form.append("include_embedding", includeEmbedding ? "true" : "false");
  const r = await api.post<AnalyzeResponse>("/analyze", form);
  return r.data;
}

export async function enrollFace(
  file: File,
  name: string
): Promise<FaceRecordOut> {
  const form = new FormData();
  form.append("image", file);
  form.append("name", name);
  const r = await api.post<FaceRecordOut>("/recognize/enroll", form);
  return r.data;
}

export interface SearchFaceResult {
  bbox: BBox;
  kps: number[][];
  det_score: number;
  hits: SearchHit[];
}

export interface SearchResponse {
  faces: SearchFaceResult[];
  width: number;
  height: number;
  threshold: number;
}

export async function searchFace(file: File, topK = 3): Promise<SearchResponse> {
  const form = new FormData();
  form.append("image", file);
  form.append("top_k", String(topK));
  const r = await api.post<SearchResponse>("/recognize/search", form);
  return r.data;
}

export interface StreamHit {
  id: string | null;
  name: string | null;
  similarity: number;
}

export interface StreamFace {
  bbox: BBox;
  kps: number[][];
  det_score: number;
  hit: StreamHit | null;
}

export interface StreamResponse {
  faces: StreamFace[];
  width: number;
  height: number;
  threshold: number;
}

export async function recognizeStream(frame: Blob): Promise<StreamResponse> {
  const form = new FormData();
  form.append("image", frame, "frame.jpg");
  const r = await api.post<StreamResponse>("/recognize/stream", form, { timeout: 15000 });
  return r.data;
}

export async function compareFaces(
  image1: File,
  image2: File
): Promise<{ similarity: number; is_same: boolean; threshold: number }> {
  const form = new FormData();
  form.append("image1", image1);
  form.append("image2", image2);
  const r = await api.post("/recognize/compare", form);
  return r.data;
}

export async function listFaces(): Promise<{ records: FaceRecordOut[]; count: number }> {
  const r = await api.get("/recognize/list");
  return r.data;
}

export async function deleteFace(id: string): Promise<void> {
  await api.delete(`/recognize/${id}`);
}
