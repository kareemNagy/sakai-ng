import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, CardModule, ButtonModule, ToastModule],
    providers: [MessageService],
    template: `
        <div style="padding: 1.5rem;">
            <p-toast></p-toast>
            <div style="margin-bottom: 2rem;">
                <h1 style="font-size: 2rem; font-weight: 700; margin: 0;">
                    <i class="pi pi-cog"></i> Settings
                </h1>
                <p style="color: var(--text-color-secondary); margin-top: 0.5rem;">
                    Configure application settings
                </p>
            </div>
            
            <p-card>
                <div style="text-align: center; padding: 3rem 1rem;">
                    <i class="pi pi-sliders-h" style="font-size: 3rem; color: var(--primary-color);"></i>
                    <h3 style="margin: 1rem 0;">Settings Module</h3>
                    <p style="color: var(--text-color-secondary); max-width: 600px; margin: 0 auto 1.5rem;">
                        Configure application preferences, user settings, and system parameters.
                    </p>
                    <p-button 
                        label="View in linkdev-frontend for reference"
                        icon="pi pi-external-link"
                        [text]="true"
                        severity="secondary">
                    </p-button>
                </div>
            </p-card>
        </div>
    `
})
export class SettingsComponent {}
