const API_BASE_URL = "http://localhost:5000/api/v1";

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  authenticated?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: unknown;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = "GET",
    body,
    authenticated = true
  } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json"
  };

  if (authenticated) {
    const token =
      localStorage.getItem("accessToken");

    if (token) {
      headers["Authorization"] =
        `Bearer ${token}`;
    }
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      method,
      headers,
      body:
        body !== undefined
          ? JSON.stringify(body)
          : undefined
    }
  );

  let result: ApiResponse<T>;

  try {
    result =
      await response.json();
  } catch {
    throw new Error(
      `Server returned invalid JSON (${response.status})`
    );
  }

  if (!response.ok) {
    if (
      response.status === 401
    ) {
      localStorage.removeItem(
        "accessToken"
      );

      localStorage.removeItem(
        "refreshToken"
      );

      localStorage.removeItem(
        "currentUser"
      );
    }

    throw new Error(
      result.message ||
      `Request failed with status ${response.status}`
    );
  }

  return result;
}

export {
  API_BASE_URL
};