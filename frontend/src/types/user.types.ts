export interface User {
  id: string
  username: string
  email: string
  avatarUrl?: string
  createdAt?: string
  updatedAt?: string
}

export interface AuthResponse {
  user: User
  token: string
  refreshToken: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  username: string
  email: string
  password: string
}