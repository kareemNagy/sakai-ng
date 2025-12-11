import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-auth-callback',
    standalone: true,
    imports: [CommonModule, ProgressSpinnerModule, ToastModule],
    providers: [MessageService],
    template: `
        <p-toast></p-toast>
        <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-screen overflow-hidden">
            <div class="flex flex-col items-center justify-center">
                <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                    <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px; min-width: 400px">
                        <div class="text-center">
                            <p-progressSpinner styleClass="w-16 h-16"></p-progressSpinner>
                            
                            <div class="mt-6">
                                <h2 class="text-surface-900 dark:text-surface-0 text-2xl font-medium mb-2">
                                    {{ statusMessage }}
                                </h2>
                                <p class="text-muted-color">
                                    {{ detailMessage }}
                                </p>
                            </div>

                            <div *ngIf="error" class="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                <p class="text-red-600 dark:text-red-400 text-sm">
                                    <i class="pi pi-exclamation-triangle mr-2"></i>
                                    {{ error }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class AuthCallbackComponent implements OnInit {
    statusMessage = 'Completing authentication...';
    detailMessage = 'Please wait while we sign you in';
    error: string | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private authService: AuthService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        // Get authorization code from URL
        this.route.queryParams.subscribe(params => {
            const code = params['code'];
            const error = params['error'];
            const errorDescription = params['error_description'];

            if (error) {
                // Azure AD returned an error
                this.handleError(errorDescription || error);
                return;
            }

            if (!code) {
                // No authorization code found
                this.handleError('No authorization code received from Microsoft');
                return;
            }

            // Complete authentication
            this.completeAuthentication(code);
        });
    }

    private completeAuthentication(code: string): void {
        this.statusMessage = 'Authenticating...';
        this.detailMessage = 'Verifying your credentials with Microsoft';

        this.authService.handleCallback(code).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.statusMessage = 'Success!';
                    this.detailMessage = `Welcome back, ${response.data.user.displayName}`;
                    
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Login Successful',
                        detail: `Welcome, ${response.data.user.displayName}!`,
                        life: 3000
                    });

                    // Redirect to dashboard after short delay
                    setTimeout(() => {
                        this.router.navigate(['/dashboard']);
                    }, 1000);
                } else {
                    this.handleError(response.message || 'Authentication failed');
                }
            },
            error: (error) => {
                console.error('Authentication error:', error);
                const errorMessage = error.error?.message || error.error?.details || 'Authentication failed. Please try again.';
                this.handleError(errorMessage);
            }
        });
    }

    private handleError(message: string): void {
        this.statusMessage = 'Authentication Failed';
        this.detailMessage = 'We couldn\'t complete your sign-in';
        this.error = message;

        this.messageService.add({
            severity: 'error',
            summary: 'Authentication Failed',
            detail: message,
            life: 5000
        });

        // Redirect to login after delay
        setTimeout(() => {
            this.router.navigate(['/auth/login']);
        }, 5000);
    }
}

