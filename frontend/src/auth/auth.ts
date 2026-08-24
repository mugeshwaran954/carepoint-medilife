import {
  get,
  post
} from "../api/api";

import type {
  LoginResponse,
  User
} from "../types";

export async function login(
  email: string,
  password: string
): Promise<User> {
  const response =
    await post<LoginResponse>(
      "/auth/login",
      {
        email,
        password
      }
    );

  const accessToken =
    response.data?.accessToken;

  if (!accessToken) {
    throw new Error(
      "Login succeeded but no access token was returned"
    );
  }

  localStorage.setItem(
    "accessToken",
    accessToken
  );

  if (response.data?.refreshToken) {
    localStorage.setItem(
      "refreshToken",
      response.data.refreshToken
    );
  }

  const user =
    await getCurrentUser();

  return user;
}

export async function getCurrentUser(): Promise<User> {
  const response =
    await get<User>("/users/me");

  if (!response.data) {
    throw new Error(
      "User information was not returned"
    );
  }

  localStorage.setItem(
    "currentUser",
    JSON.stringify(response.data)
  );

  return response.data;
}

export function getStoredUser(): User | null {
  const stored =
    localStorage.getItem("currentUser");

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as User;
  } catch {
    localStorage.removeItem(
      "currentUser"
    );

    return null;
  }
}

export function isAuthenticated(): boolean {
  return Boolean(
    localStorage.getItem("accessToken")
  );
}

export function logout(): void {
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