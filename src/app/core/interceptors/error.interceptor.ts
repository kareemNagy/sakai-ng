import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error) => {
      let errorMessage = 'An error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Server-side error - check both 'error' and 'message' fields from API response
        errorMessage = error.error?.error || error.error?.message || error.message || `Error Code: ${error.status}`;
        
        // Handle specific HTTP status codes (only if we don't have a detailed message)
        if (error.status === 401) {
          // Unauthorized - redirect to login
          localStorage.removeItem('auth_token');
          router.navigate(['/auth/login']);
          errorMessage = 'Session expired. Please login again.';
        } else if (error.status === 403 && !error.error?.error) {
          errorMessage = 'Access denied.';
        } else if (error.status === 404 && !error.error?.error) {
          errorMessage = 'Resource not found.';
        } else if (error.status === 500 && !error.error?.error) {
          errorMessage = 'Server error. Please try again later.';
        }
      }

      // Show error notification
      notificationService.error(errorMessage);

      return throwError(() => new Error(errorMessage));
    })
  );
};

