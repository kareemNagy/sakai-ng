import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [ButtonModule, RouterModule, ToastModule, ProgressSpinnerModule, CommonModule],
    providers: [MessageService],
    template: `
        <p-toast></p-toast>
        <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-screen overflow-hidden">
            <div class="flex flex-col items-center justify-center">
                <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                    <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
                        <div class="text-center mb-8">
                            <div class="mb-8 w-16 h-16 mx-auto bg-primary rounded-lg flex items-center justify-center text-white font-bold text-3xl">
                                LD
                            </div>
                            <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">LinkDev Management</div>
                            <span class="text-muted-color font-medium">Sign in with your Microsoft account</span>
                        </div>

                        <div *ngIf="loading" class="text-center py-8">
                            <p-progressSpinner styleClass="w-12 h-12"></p-progressSpinner>
                            <p class="text-muted-color mt-4">Connecting to Microsoft...</p>
                        </div>

                        <div *ngIf="!loading" class="space-y-4">
                            <p-button 
                                (onClick)="loginWithMicrosoft()"
                                label="Sign in with Microsoft" 
                                icon="pi pi-microsoft"
                                styleClass="w-full"
                                severity="primary">
                            </p-button>

                            <div class="text-center mt-6">
                                <p class="text-muted-color text-sm mb-2">
                                    <i class="pi pi-info-circle mr-2"></i>
                                    You'll be redirected to Microsoft login
                                </p>
                                <p class="text-muted-color text-sm">
                                    Use your LinkDev organization account
                                </p>
                            </div>
                        </div>

                        <div *ngIf="healthStatus" class="mt-8 p-4 bg-surface-100 dark:bg-surface-800 rounded-lg">
                            <p class="text-center text-sm text-muted-color">
                                <i class="pi" [ngClass]="healthStatus.healthy ? 'pi-check-circle text-green-500' : 'pi-times-circle text-red-500'"></i>
                                {{ healthStatus.message }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        :host ::ng-deep {
            .p-button.p-button-icon-only {
                padding: 0.75rem;
            }
        }
    `]
})
export class Login implements OnInit {
    loading: boolean = false;
    healthStatus: { healthy: boolean; message: string } | null = null;

    constructor(
        private authService: AuthService,
        private router: Router,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        // Check if already authenticated
        if (this.authService.isAuthenticated()) {
            this.router.navigate(['/dashboard']);
            return;
        }

        // Check auth service health
        this.checkAuthHealth();
    }

    checkAuthHealth(): void {
        this.authService.checkHealth().subscribe({
            next: (response) => {
                if (response.success && response.status === 'healthy') {
                    this.healthStatus = {
                        healthy: true,
                        message: 'Authentication service is ready'
                    };
                } else {
                    this.healthStatus = {
                        healthy: false,
                        message: 'Authentication service is not properly configured'
                    };
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Service Warning',
                        detail: 'Authentication service may not be fully configured',
                        life: 5000
                    });
                }
            },
            error: (error) => {
                console.error('Health check failed:', error);
                this.healthStatus = {
                    healthy: false,
                    message: 'Cannot connect to authentication service'
                };
            }
        });
    }

    loginWithMicrosoft(): void {
        this.loading = true;
        
        this.messageService.add({
            severity: 'info',
            summary: 'Redirecting',
            detail: 'Taking you to Microsoft login...',
            life: 2000
        });

        // Initiate Azure AD OAuth flow
        setTimeout(() => {
            this.authService.initiateLogin();
        }, 500);
    }
}
