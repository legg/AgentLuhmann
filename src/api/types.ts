export interface SignUpRequest {
	email: string;
	password: string;
	name: string;
}

export interface AuthResponse {
	token: string;
	user: {
		id: string;
		name: string;
		email: string;
	};
}

export interface SignInRequest {
	email: string;
	password: string;
}

export interface CreateApiKeyRequest {
	name: string;
	expiresIn?: number;
}

export interface CreateApiKeyResponse {
	id: string;
	name: string;
	key: string;
	expiresAt: string | null;
}

export interface CaptureRequest {
	content: string;
}

export interface SimilarNote {
	id: string;
	path: string;
	score: number;
}

export interface CaptureResponse {
	rewrittenContent: string;
	title: string;
	keywords: string[];
	similarityScore: number;
	similarNotes: SimilarNote[];
}

export interface SimilarityRequest {
	content: string;
}

export interface SimilarityResponse {
	maxScore: number;
	avgScore: number;
	count: number;
	topNotes: SimilarNote[];
}

export interface VectorStoreSyncNote {
	id: string;
	path: string;
	content: string;
}

export interface VectorStoreSyncRequest {
	notes: VectorStoreSyncNote[];
}

export interface VectorStoreSyncResponse {
	synced: number;
	removed: number;
}

export interface VectorStoreDeleteRequest {
	id: string;
}

export interface VectorStoreDeleteResponse {
	success: boolean;
}

export class ApiError extends Error {
	status: number;

	constructor(message: string, status: number) {
		super(message);
		this.status = status;
	}
}
