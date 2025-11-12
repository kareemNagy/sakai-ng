import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    email: string;
    fullName: string;
    title: string;
  };
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Load user from localStorage on init
    const storedUser = localStorage.getItem('current_user');
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser));
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    // IMPORTANT: Auth endpoints don't exist in backend yet!
    // For now, using mock authentication for development
    
    // TODO: Backend needs to implement auth routes
    // return this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, { email, password })
    
    // TEMPORARY MOCK IMPLEMENTATION:
    return new Observable(observer => {
      setTimeout(() => {
        // Mock successful login
        const token = 'mock-jwt-token-' + Date.now();
        const user = {
          id: 1,
          email: email,
          fullName: 'Demo User',
          title: 'Developer'
        };
        
        const mockResponse: LoginResponse = {
          success: true,
          token: token,
          user: user
        };
        
        localStorage.setItem('auth_token', token);
        localStorage.setItem('current_user', JSON.stringify(user));
        this.currentUserSubject.next(user);
        
        observer.next(mockResponse);
        observer.complete();
      }, 500);
    });
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

  register(userData: any): Observable<any> {
    // IMPORTANT: Auth endpoints don't exist in backend yet!
    console.warn('Register: Backend endpoint not implemented yet');
    return this.http.post(`${this.API_URL}/auth/register`, userData);
  }
}

