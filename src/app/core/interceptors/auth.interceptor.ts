import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Get auth token from localStorage
  const token = localStorage.getItem('auth_token');
  
  if (token) {
    // Clone the request and add authorization header
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedRequest);
  }
  
  return next(req);
};

