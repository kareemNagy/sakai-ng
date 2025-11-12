import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageService, ConfirmationService } from 'primeng/api';
import { environment } from '../../../environments/environment';

interface TaskTemplate {
    taskTemplateId?: number;
    title: string;
    description?: string;
    activity: string;
    subActivity: string;
    originalEstimate: number;
    isActive: boolean;
    createdDate?: string;
    modifiedDate?: string;
}

interface Activity {
    activityId: number;
    activityName: string;
    isActive: boolean;
}

interface SubActivity {
    subActivityId: number;
    subActivityName: string;
    isActive: boolean;
}

@Component({
    selector: 'app-task-templates',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        TextareaModule,
        SelectModule,
        CheckboxModule,
        DialogModule,
        ToastModule,
        ConfirmDialogModule,
        TagModule,
        InputNumberModule
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './task-templates.component.html',
    styleUrls: ['./task-templates.component.scss']
})
export class TaskTemplatesComponent implements OnInit {
    taskTemplates: TaskTemplate[] = [];
    filteredTemplates: TaskTemplate[] = [];
    activities: Activity[] = [];
    subActivities: SubActivity[] = [];

    searchQuery: string = '';
    filterStatus: string = 'All';

    showModal: boolean = false;
    isEditMode: boolean = false;
    loading: boolean = false;

    currentTemplate: TaskTemplate = this.getEmptyTemplate();

    statusOptions = [
        { label: 'All', value: 'All' },
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' }
    ];

    constructor(
        private http: HttpClient,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.loadTaskTemplates();
        this.loadActivities();
    }

    getEmptyTemplate(): TaskTemplate {
        return {
            title: '',
            description: '',
            activity: '',
            subActivity: '',
            originalEstimate: 0,
            isActive: true
        };
    }

    mapFromBackend(data: any): TaskTemplate {
        return {
            taskTemplateId: data.TaskTemplateId || data.taskTemplateId,
            title: data.Title || data.title,
            description: data.Description || data.description,
            activity: data.Activity || data.activity,
            subActivity: data.SubActivity || data.subActivity,
            originalEstimate: data.OriginalEstimate || data.originalEstimate,
            isActive: data.IsActive !== undefined ? data.IsActive : data.isActive,
            createdDate: data.CreatedDate || data.createdDate,
            modifiedDate: data.ModifiedDate || data.modifiedDate
        };
    }

    mapToBackend(template: TaskTemplate): any {
        return {
            Title: template.title,
            Description: template.description,
            Activity: template.activity,
            SubActivity: template.subActivity,
            OriginalEstimate: template.originalEstimate,
            IsActive: template.isActive
        };
    }

    loadTaskTemplates(): void {
        this.loading = true;
        this.http.get<any>(`${environment.apiUrl}/task-templates`).subscribe({
            next: (response) => {
                this.taskTemplates = (response.data || []).map((t: any) => this.mapFromBackend(t));
                this.applyFilters();
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading task templates:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load task templates'
                });
                this.loading = false;
            }
        });
    }

    loadActivities(): void {
        this.http.get<any>(`${environment.apiUrl}/activities`).subscribe({
            next: (response) => {
                this.activities = (response.data || []).map((a: any) => ({
                    activityId: a.ActivityId || a.activityId,
                    activityName: a.ActivityName || a.activityName,
                    isActive: a.IsActive !== undefined ? a.IsActive : a.isActive
                })).filter((a: Activity) => a.isActive);
            },
            error: (err) => {
                console.error('Error loading activities:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load activities'
                });
            }
        });
    }

    onActivityChange(): void {
        if (!this.currentTemplate.activity) {
            this.subActivities = [];
            this.currentTemplate.subActivity = '';
            return;
        }

        this.http.get<any>(`${environment.apiUrl}/subactivities/activity/${encodeURIComponent(this.currentTemplate.activity)}`).subscribe({
            next: (response) => {
                this.subActivities = (response.data || []).map((s: any) => ({
                    subActivityId: s.SubActivityId || s.subActivityId,
                    subActivityName: s.SubActivityName || s.subActivityName,
                    isActive: s.IsActive !== undefined ? s.IsActive : s.isActive
                })).filter((s: SubActivity) => s.isActive);
            },
            error: (err) => {
                console.error('Error loading sub-activities:', err);
                this.subActivities = [];
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load sub-activities'
                });
            }
        });
    }

    applyFilters(): void {
        this.filteredTemplates = this.taskTemplates.filter(template => {
            const matchesSearch = !this.searchQuery ||
                template.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                template.activity?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                template.subActivity?.toLowerCase().includes(this.searchQuery.toLowerCase());

            const matchesStatus = this.filterStatus === 'All' ||
                (this.filterStatus === 'Active' && template.isActive) ||
                (this.filterStatus === 'Inactive' && !template.isActive);

            return matchesSearch && matchesStatus;
        });
    }

    openCreateModal(): void {
        this.isEditMode = false;
        this.currentTemplate = this.getEmptyTemplate();
        this.subActivities = [];
        this.showModal = true;
    }

    openEditModal(template: TaskTemplate): void {
        this.isEditMode = true;
        this.currentTemplate = { ...template };

        // Load sub-activities for the selected activity
        if (this.currentTemplate.activity) {
            this.onActivityChange();
        }

        this.showModal = true;
    }

    closeModal(): void {
        this.showModal = false;
        this.currentTemplate = this.getEmptyTemplate();
        this.subActivities = [];
    }

    saveTemplate(): void {
        if (!this.isFormValid()) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation Error',
                detail: 'Please fill in all required fields'
            });
            return;
        }

        if (this.isEditMode) {
            this.updateTemplate();
        } else {
            this.createTemplate();
        }
    }

    createTemplate(): void {
        const payload = this.mapToBackend(this.currentTemplate);
        
        this.http.post<any>(`${environment.apiUrl}/task-templates`, payload).subscribe({
            next: (response) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Task template created successfully'
                });
                this.loadTaskTemplates();
                this.closeModal();
            },
            error: (err) => {
                console.error('Error creating task template:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: err.error?.error || 'Failed to create task template'
                });
            }
        });
    }

    updateTemplate(): void {
        const payload = this.mapToBackend(this.currentTemplate);
        
        this.http.put<any>(
            `${environment.apiUrl}/task-templates/${this.currentTemplate.taskTemplateId}`,
            payload
        ).subscribe({
            next: (response) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Task template updated successfully'
                });
                this.loadTaskTemplates();
                this.closeModal();
            },
            error: (err) => {
                console.error('Error updating task template:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: err.error?.error || 'Failed to update task template'
                });
            }
        });
    }

    toggleStatus(template: TaskTemplate): void {
        this.http.put<any>(
            `${environment.apiUrl}/task-templates/${template.taskTemplateId}/toggle-status`,
            {}
        ).subscribe({
            next: (response) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: `Template ${template.isActive ? 'deactivated' : 'activated'} successfully`
                });
                this.loadTaskTemplates();
            },
            error: (err) => {
                console.error('Error toggling status:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to update template status'
                });
            }
        });
    }

    deleteTemplate(template: TaskTemplate): void {
        this.confirmationService.confirm({
            message: `Are you sure you want to delete "${template.title}"?`,
            header: 'Delete Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.http.delete<any>(`${environment.apiUrl}/task-templates/${template.taskTemplateId}`).subscribe({
                    next: (response) => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Success',
                            detail: 'Task template deleted successfully'
                        });
                        this.loadTaskTemplates();
                    },
                    error: (err) => {
                        console.error('Error deleting task template:', err);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Failed to delete task template'
                        });
                    }
                });
            }
        });
    }

    isFormValid(): boolean {
        return !!(
            this.currentTemplate.title &&
            this.currentTemplate.activity &&
            this.currentTemplate.subActivity
        );
    }

    onSearchChange(): void {
        this.applyFilters();
    }

    onFilterChange(): void {
        this.applyFilters();
    }
}
