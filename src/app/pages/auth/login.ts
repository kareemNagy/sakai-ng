import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [ButtonModule, CheckboxModule, InputTextModule, PasswordModule, FormsModule, RouterModule, ToastModule],
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
                            <span class="text-muted-color font-medium">Sign in to your account</span>
                        </div>

                        <form (ngSubmit)="login()">
                            <label for="email1" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Email</label>
                            <input pInputText id="email1" type="email" placeholder="Email address" class="w-full md:w-120 mb-8" [(ngModel)]="email" name="email" required />

                            <label for="password1" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Password</label>
                            <p-password id="password1" [(ngModel)]="password" placeholder="Password" [toggleMask]="true" styleClass="mb-4" [fluid]="true" [feedback]="false" name="password"></p-password>

                            <div class="flex items-center justify-between mt-2 mb-8 gap-8">
                                <div class="flex items-center">
                                    <p-checkbox [(ngModel)]="checked" id="rememberme1" binary class="mr-2" name="remember"></p-checkbox>
                                    <label for="rememberme1">Remember me</label>
                                </div>
                                <span class="font-medium no-underline ml-2 text-right cursor-pointer text-primary">Forgot password?</span>
                            </div>
                            <p-button 
                                type="submit"
                                [label]="loading ? 'Signing in...' : 'Sign In'" 
                                [loading]="loading"
                                styleClass="w-full">
                            </p-button>
                        </form>

                        <p class="text-center text-muted-color mt-6">
                            Demo credentials: admin&#64;linkdev.com / admin123
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class Login {
    email: string = '';
    password: string = '';
    checked: boolean = false;
    loading: boolean = false;

    constructor(
        private authService: AuthService,
        private router: Router,
        private messageService: MessageService
    ) {}

    login(): void {
        if (!this.email || !this.password) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation Error',
                detail: 'Please enter email and password'
            });
            return;
        }

        this.loading = true;
        this.authService.login(this.email, this.password).subscribe({
            next: (response) => {
                if (response.success) {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Login successful'
                    });
                    this.router.navigate(['/dashboard']);
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: response.message || 'Login failed'
                    });
                }
                this.loading = false;
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Login failed'
                });
                this.loading = false;
            }
        });
    }
}
