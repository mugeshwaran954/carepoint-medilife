const API_BASE_URL = "http://localhost:5000/api/v1";

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(
    message: string,
    status: number,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem("accessToken");

  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`
    );
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers
    }
  );

  let body: ApiResponse<T>;

  try {
    body = await response.json();
  } catch {
    throw new ApiError(
      "Invalid response from server",
      response.status
    );
  }

  if (!response.ok || !body.success) {
    throw new ApiError(
      body.message || "Request failed",
      response.status,
      body.errors
    );
  }

  return body;
}

export async function get<T = unknown>(
  endpoint: string
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: "GET"
  });
}

export async function post<T = unknown>(
  endpoint: string,
  data?: unknown
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: "POST",
    body:
      data !== undefined
        ? JSON.stringify(data)
        : undefined
  });
}

export async function patch<T = unknown>(
  endpoint: string,
  data?: unknown
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: "PATCH",
    body:
      data !== undefined
        ? JSON.stringify(data)
        : undefined
  });
}

export async function put<T = unknown>(
  endpoint: string,
  data?: unknown
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: "PUT",
    body:
      data !== undefined
        ? JSON.stringify(data)
        : undefined
  });
}

export async function del<T = unknown>(
  endpoint: string
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: "DELETE"
  });
}