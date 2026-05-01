import {Notice, requestUrl, RequestUrlParam} from "obsidian";
import {
	ApiError,
	CaptureRequest,
	CaptureResponse,
	SimilarityRequest,
	SimilarityResponse,
	VectorStoreDeleteRequest,
	VectorStoreDeleteResponse,
	VectorStoreSyncRequest,
	VectorStoreSyncResponse,
} from "./types";

export class AiApiClient {
	baseUrl: string;
	authToken: string;
	aiEnabled: boolean;

	constructor(baseUrl: string, authToken: string, aiEnabled: boolean) {
		this.baseUrl = baseUrl;
		this.authToken = authToken;
		this.aiEnabled = aiEnabled;
	}

	isConfigured(): boolean {
		return this.aiEnabled && !!this.baseUrl && !!this.authToken;
	}

	private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T | null> {
		if (!this.isConfigured()) {
			return null;
		}

		const url = `${this.baseUrl}${endpoint}`;
		const params: RequestUrlParam = {
			url,
			method,
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${this.authToken}`,
				"Origin": this.baseUrl,
			},
		};

		if (body !== undefined) {
			params.body = JSON.stringify(body);
		}

		try {
			const response = await requestUrl(params);
			return response.json as T;
		} catch (error: unknown) {
			const err = error as { status?: number; message?: string };
			if (err.status !== undefined) {
				if (err.status === 401) {
					new Notice("Authentication failed. Please sign in again.");
				} else {
					new Notice(`API error: ${err.message ?? "unknown"}`);
				}
				throw new ApiError(err.message ?? "unknown", err.status);
			}
			new Notice(`Network error: ${err.message ?? "unknown"}`);
			return null;
		}
	}

	async capture(content: string): Promise<CaptureResponse | null> {
		try {
			const payload: CaptureRequest = {content};
			return await this.request<CaptureResponse>("POST", "/api/capture", payload);
		} catch {
			return null;
		}
	}

	async similarity(content: string): Promise<SimilarityResponse | null> {
		try {
			const payload: SimilarityRequest = {content};
			return await this.request<SimilarityResponse>("POST", "/api/similarity", payload);
		} catch {
			return null;
		}
	}

	async syncNotes(notes: VectorStoreSyncRequest): Promise<VectorStoreSyncResponse | null> {
		try {
			return await this.request<VectorStoreSyncResponse>("POST", "/api/vector-store/sync", notes);
		} catch {
			return null;
		}
	}

	async deleteNote(id: string): Promise<VectorStoreDeleteResponse | null> {
		try {
			const payload: VectorStoreDeleteRequest = {id};
			return await this.request<VectorStoreDeleteResponse>("DELETE", "/api/vector-store/note", payload);
		} catch {
			return null;
		}
	}
}
