import {requestUrl, RequestUrlParam} from "obsidian";
import {
	ApiError,
	AuthResponse,
	CreateApiKeyRequest,
	CreateApiKeyResponse,
	SignInRequest,
	SignUpRequest,
} from "./types";

export async function signUp(baseUrl: string, email: string, password: string, name: string): Promise<AuthResponse> {
	const url = `${baseUrl}/api/auth/sign-up/email`;
	const payload: SignUpRequest = {email, password, name};
	const params: RequestUrlParam = {
		url,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Origin": baseUrl,
		},
		body: JSON.stringify(payload),
	};

	try {
		const response = await requestUrl(params);
		return response.json as AuthResponse;
	} catch (error: unknown) {
		const err = error as { status?: number; message?: string; text?: string };
		console.error("Sign-up error:", JSON.stringify(err, null, 2));
		const status = err.status ?? 0;
		const body = err.text ?? err.message ?? "unknown error";
		throw new ApiError(`Sign-up failed (${status}): ${body}`, status);
	}
}

export async function signIn(baseUrl: string, email: string, password: string): Promise<AuthResponse> {
	const url = `${baseUrl}/api/auth/sign-in/email`;
	const payload: SignInRequest = {email, password};
	const params: RequestUrlParam = {
		url,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Origin": baseUrl,
		},
		body: JSON.stringify(payload),
	};

	try {
		const response = await requestUrl(params);
		return response.json as AuthResponse;
	} catch (error: unknown) {
		const err = error as { status?: number; message?: string; text?: string };
		console.error("Sign-in error:", JSON.stringify(err, null, 2));
		const status = err.status ?? 0;
		const body = err.text ?? err.message ?? "unknown error";
		throw new ApiError(`Sign-in failed (${status}): ${body}`, status);
	}
}

export async function createApiKey(baseUrl: string, sessionToken: string, name: string): Promise<CreateApiKeyResponse> {
	const url = `${baseUrl}/api/auth/api-key/create`;
	const payload: CreateApiKeyRequest = {name};
	const params: RequestUrlParam = {
		url,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Authorization": `Bearer ${sessionToken}`,
			"Origin": baseUrl,
		},
		body: JSON.stringify(payload),
	};

	try {
		const response = await requestUrl(params);
		return response.json as CreateApiKeyResponse;
	} catch (error: unknown) {
		const err = error as { status?: number; message?: string; text?: string };
		const status = err.status ?? 0;
		const body = err.text ?? err.message ?? "unknown error";
		throw new ApiError(`API key creation failed (${status}): ${body}`, status);
	}
}
