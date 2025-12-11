import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { User, AuthResponse, LoginUrlResponse, TokenRefreshResponse, SessionInfo } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'current_user';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadUserFromStorage();
  }

  /**
   * Load user from localStorage on initialization
   */
  private loadUserFromStorage(): void {
    const token = this.getToken();
    const storedUser = localStorage.getItem(this.USER_KEY);
    
    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        this.clearStorage();
      }
    }
  }

  /**
   * Get Azure AD login URL
   */
  getLoginUrl(): Observable<LoginUrlResponse> {
    return this.http.get<LoginUrlResponse>(`${this.API_URL}/login`);
  }

  /**
   * Initiate Azure AD login (redirects to Microsoft)
   */
  initiateLogin(): void {
    this.getLoginUrl().subscribe({
      next: (response) => {
        if (response.success && response.loginUrl) {
          // Redirect to Azure AD login page
          window.location.href = response.loginUrl;
        } else {
          console.error('Failed to get login URL:', response.error);
        }
      },
      error: (error) => {
        console.error('Error getting login URL:', error);
      }
    });
  }

  /**
   * Handle OAuth callback (called after Azure AD redirects back)
   */
  handleCallback(code: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/callback`, { code })
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.saveAuthData(response.data);
          }
        }),
        catchError(error => {
          console.error('Callback error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Save authentication data to storage
   */
  private saveAuthData(data: AuthResponse['data']): void {
    if (!data) return;

    localStorage.setItem(this.TOKEN_KEY, data.token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, data.refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
    this.currentUserSubject.next(data.user);
  }

  /**
   * Get current access token
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(): Observable<TokenRefreshResponse> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<TokenRefreshResponse>(`${this.API_URL}/refresh`, { refreshToken })
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            localStorage.setItem(this.TOKEN_KEY, response.data.token);
          }
        }),
        catchError(error => {
          // If refresh fails, logout user
          this.logout();
          return throwError(() => error);
        })
      );
  }

  /**
   * Logout user
   */
  logout(): Observable<any> {
    const token = this.getToken();
    
    if (token) {
      // Call backend logout endpoint
      return this.http.post(`${this.API_URL}/logout`, {}).pipe(
        tap(() => this.clearStorage()),
        catchError(error => {
          // Even if backend call fails, clear local storage
          this.clearStorage();
          return throwError(() => error);
        })
      );
    } else {
      this.clearStorage();
      return new Observable(observer => {
        observer.next({ success: true, message: 'Logged out locally' });
        observer.complete();
      });
    }
  }

  /**
   * Clear all auth data from storage
   */
  private clearStorage(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get current user from API (refresh user data)
   */
  refreshCurrentUser(): Observable<User> {
    return this.http.get<{ success: boolean; data: User }>(`${this.API_URL}/me`)
      .pipe(
        map(response => response.data),
        tap(user => {
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
          this.currentUserSubject.next(user);
        })
      );
  }

  /**
   * Update user profile
   */
  updateProfile(updates: Partial<User>): Observable<User> {
    return this.http.put<{ success: boolean; data: User }>(`${this.API_URL}/profile`, updates)
      .pipe(
        map(response => response.data),
        tap(user => {
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
          this.currentUserSubject.next(user);
        })
      );
  }

  /**
   * Store DevOps PAT for current user
   */
  storeDevOpsPAT(pat: string, expiresAt?: string): Observable<any> {
    return this.http.put(`${this.API_URL}/devops-pat`, { pat, expiresAt });
  }

  /**
   * Revoke DevOps PAT
   */
  revokeDevOpsPAT(): Observable<any> {
    return this.http.delete(`${this.API_URL}/devops-pat`);
  }

  /**
   * Get all active sessions
   */
  getSessions(): Observable<SessionInfo[]> {
    return this.http.get<{ success: boolean; data: SessionInfo[] }>(`${this.API_URL}/sessions`)
      .pipe(map(response => response.data));
  }

  /**
   * Invalidate all sessions (logout everywhere)
   */
  invalidateAllSessions(): Observable<any> {
    return this.http.delete(`${this.API_URL}/sessions`).pipe(
      tap(() => this.clearStorage())
    );
  }

  /**
   * Check authentication service health
   */
  checkHealth(): Observable<any> {
    return this.http.get(`${this.API_URL}/health`);
  }
}

