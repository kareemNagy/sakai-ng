import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { EditorModule } from 'primeng/editor';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

interface EmailTemplate {
    emailTemplateId?: number;
    templateName: string;
    subject: string;
    htmlContent: string;
    textContent: string;
    description: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

@Component({
    selector: 'app-email-templates',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        TextareaModule,
        EditorModule,
        SelectModule,
        DialogModule,
        ToastModule,
        ConfirmDialogModule,
        TagModule,
        TooltipModule
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './email-templates.component.html',
    styleUrls: ['./email-templates.component.scss']
})
export class EmailTemplatesComponent implements OnInit {
    templates: EmailTemplate[] = [];
    filteredTemplates: EmailTemplate[] = [];
    loading = true;

    selectedTemplate: EmailTemplate | null = null;
    showAddModal = false;
    showDetailModal = false;
    isEditMode = false;

    searchQuery = '';
    filterStatus = 'All';

    newTemplate: Partial<EmailTemplate> = {
        templateName: '',
        subject: '',
        htmlContent: '',
        textContent: '',
        description: '',
        isActive: true
    };

    // Available variables for templates
    availableVariables = [
        { name: '{{recipientName}}', description: 'Recipient name' },
        { name: '{{projectName}}', description: 'Project name' },
        { name: '{{estimateHours}}', description: 'Estimated hours' },
        { name: '{{actualHours}}', description: 'Actual hours' },
        { name: '{{codingHours}}', description: 'Coding hours' },
        { name: '{{bugFixingHours}}', description: 'Bug fixing hours' },
        { name: '{{reworkPercentage}}', description: 'Rework percentage' },
        { name: '{{additionalMessage}}', description: 'Additional message from sender' }
    ];

    statusOptions = [
        { label: 'All', value: 'All' },
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' }
    ];

    subjectPlaceholder = 'e.g., Weekly Effort Report for {{projectName}}';

    constructor(
        private http: HttpClient,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private sanitizer: DomSanitizer
    ) {}

    ngOnInit(): void {
        this.loadTemplates();
    }

    mapFromBackend(data: any): EmailTemplate {
        return {
            emailTemplateId: data.EmailTemplateId || data.emailTemplateId,
            templateName: data.TemplateName || data.templateName,
            subject: data.Subject || data.subject,
            htmlContent: data.HtmlContent || data.htmlContent || '',
            textContent: data.TextContent || data.textContent || '',
            description: data.Description || data.description || '',
            isActive: data.IsActive !== undefined ? data.IsActive : data.isActive,
            createdAt: data.CreatedAt || data.createdAt,
            updatedAt: data.UpdatedAt || data.updatedAt
        };
    }

    mapToBackend(template: Partial<EmailTemplate>): any {
        return {
            TemplateName: template.templateName,
            Subject: template.subject,
            HtmlContent: template.htmlContent,
            TextContent: template.textContent,
            Description: template.description,
            IsActive: template.isActive
        };
    }

    loadTemplates(): void {
        this.loading = true;
        this.http.get<any>(`${environment.apiUrl}/email-templates`).subscribe({
            next: (response) => {
                this.templates = (response.data || []).map((t: any) => this.mapFromBackend(t));
                this.applyFilters();
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading templates:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load email templates'
                });
                this.loading = false;
            }
        });
    }

    applyFilters(): void {
        let filtered = [...this.templates];

        // Search filter
        if (this.searchQuery.trim()) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                t.templateName.toLowerCase().includes(query) ||
                t.subject.toLowerCase().includes(query) ||
                t.description?.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (this.filterStatus !== 'All') {
            const isActive = this.filterStatus === 'Active';
            filtered = filtered.filter(t => t.isActive === isActive);
        }

        this.filteredTemplates = filtered;
    }

    openAddModal(): void {
        this.isEditMode = false;
        this.newTemplate = {
            templateName: '',
            subject: '',
            htmlContent: '',
            textContent: '',
            description: '',
            isActive: true
        };
        this.showAddModal = true;
    }

    openEditModal(template: EmailTemplate): void {
        this.isEditMode = true;
        this.newTemplate = { ...template };
        this.showAddModal = true;
    }

    closeAddModal(): void {
        this.showAddModal = false;
        this.newTemplate = {
            templateName: '',
            subject: '',
            htmlContent: '',
            textContent: '',
            description: '',
            isActive: true
        };
    }

    saveTemplate(): void {
        if (!this.newTemplate.templateName || !this.newTemplate.subject) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation Error',
                detail: 'Please fill in all required fields'
            });
            return;
        }

        const url = this.isEditMode
            ? `${environment.apiUrl}/email-templates/${this.newTemplate.emailTemplateId}`
            : `${environment.apiUrl}/email-templates`;

        const payload = this.mapToBackend(this.newTemplate);

        const request = this.isEditMode
            ? this.http.put<any>(url, payload)
            : this.http.post<any>(url, payload);

        request.subscribe({
            next: (response) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: this.isEditMode ? 'Template updated successfully' : 'Template created successfully'
                });
                this.closeAddModal();
                this.loadTemplates();
            },
            error: (err) => {
                console.error('Error saving template:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to save template'
                });
            }
        });
    }

    viewTemplate(template: EmailTemplate): void {
        this.selectedTemplate = template;
        this.showDetailModal = true;
    }

    closeDetailModal(): void {
        this.showDetailModal = false;
        this.selectedTemplate = null;
    }

    deleteTemplate(template: EmailTemplate): void {
        this.confirmationService.confirm({
            message: `Are you sure you want to delete "${template.templateName}"?`,
            header: 'Delete Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.http.delete<any>(`${environment.apiUrl}/email-templates/${template.emailTemplateId}`).subscribe({
                    next: (response) => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Success',
                            detail: 'Template deleted successfully'
                        });
                        this.loadTemplates();
                    },
                    error: (err) => {
                        console.error('Error deleting template:', err);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Failed to delete template'
                        });
                    }
                });
            }
        });
    }

    toggleStatus(template: EmailTemplate): void {
        const updatedTemplate: EmailTemplate = {
            ...template,
            isActive: !template.isActive
        };

        const payload = this.mapToBackend(updatedTemplate);

        this.http.put<any>(`${environment.apiUrl}/email-templates/${template.emailTemplateId}`, payload).subscribe({
            next: (response) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Template status updated'
                });
                this.loadTemplates();
            },
            error: (err) => {
                console.error('Error updating template status:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to update template status'
                });
            }
        });
    }

    insertVariable(variable: string): void {
        // Append variable to HTML content (Editor component handles insertion)
        if (this.newTemplate.htmlContent === undefined) {
            this.newTemplate.htmlContent = '';
        }
        this.newTemplate.htmlContent += variable;
    }

    getSafeHtml(html: string): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(html || '');
    }

    onSearchChange(): void {
        this.applyFilters();
    }

    onFilterChange(): void {
        this.applyFilters();
    }
}
