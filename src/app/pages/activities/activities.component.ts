import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { AccordionModule } from 'primeng/accordion';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ActivityService } from '../../core/services/activity.service';
import { Activity, SubActivity } from '../../core/models';

interface ActivityWithSubActivities extends Activity {
    subActivities?: SubActivity[];
    expanded?: boolean;
}

@Component({
    selector: 'app-activities',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        TextareaModule,
        DialogModule,
        CheckboxModule,
        TagModule,
        AccordionModule,
        ConfirmDialogModule,
        ToastModule
    ],
    providers: [ConfirmationService, MessageService],
    templateUrl: './activities.component.html',
    styleUrls: ['./activities.component.scss']
})
export class ActivitiesComponent implements OnInit {
    activities: ActivityWithSubActivities[] = [];
    filteredActivities: ActivityWithSubActivities[] = [];
    
    loading = false;
    showActivityDialog = false;
    showSubActivityDialog = false;
    isEditMode = false;

    searchQuery = '';
    filterStatus = 'Active';

    selectedActivity: ActivityWithSubActivities | null = null;
    
    newActivity: Partial<Activity> = {
        activityName: '',
        description: '',
        isActive: true
    };

    newSubActivity: Partial<SubActivity> = {
        activityId: 0,
        subActivityName: '',
        description: '',
        isActive: true
    };

    constructor(
        private activityService: ActivityService,
        private confirmationService: ConfirmationService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.loadActivities();
    }

    loadActivities(): void {
        this.loading = true;
        this.activityService.getAllActivities().subscribe({
            next: (activities) => {
                this.activities = activities.map(a => ({ ...a, expanded: false, subActivities: [] }));
                this.applyFilters();
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading activities:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load activities'
                });
                this.loading = false;
            }
        });
    }

    loadSubActivitiesForActivity(activity: ActivityWithSubActivities, forceReload = false): void {
        if (!activity.activityId) return;

        if (!forceReload && activity.subActivities && activity.subActivities.length > 0) return;

        this.activityService.getSubActivitiesByActivity(activity.activityId).subscribe({
            next: (subActivities) => {
                activity.subActivities = subActivities;
            },
            error: (err) => {
                console.error(`Error loading sub-activities:`, err);
                activity.subActivities = [];
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load sub-activities'
                });
            }
        });
    }

    refreshActivity(activityId: number): void {
        const activity = this.activities.find(a => a.activityId === activityId);
        if (activity) {
            this.activityService.getActivityById(activityId).subscribe({
                next: (updatedActivity) => {
                    activity.totalSubActivities = updatedActivity.totalSubActivities;
                    activity.activeSubActivities = updatedActivity.activeSubActivities;
                    
                    if (activity.expanded) {
                        this.loadSubActivitiesForActivity(activity, true);
                    }
                },
                error: (err) => {
                    console.error('Error refreshing activity:', err);
                }
            });
        }
    }

    applyFilters(): void {
        this.filteredActivities = this.activities.filter(activity => {
            const matchesSearch = !this.searchQuery || 
                activity.activityName?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                activity.description?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                activity.subActivities?.some(sub => 
                    sub.subActivityName?.toLowerCase().includes(this.searchQuery.toLowerCase())
                );

            const matchesStatus = this.filterStatus === 'All' ||
                (this.filterStatus === 'Active' && activity.isActive) ||
                (this.filterStatus === 'Inactive' && !activity.isActive);

            return matchesSearch && matchesStatus;
        });
    }

    onSearchChange(): void {
        this.applyFilters();
    }

    onFilterChange(): void {
        this.applyFilters();
    }

    toggleActivity(activity: ActivityWithSubActivities): void {
        activity.expanded = !activity.expanded;
        
        if (activity.expanded) {
            this.loadSubActivitiesForActivity(activity);
        }
    }

    // Activity CRUD
    openAddActivityDialog(): void {
        this.isEditMode = false;
        this.resetActivityForm();
        this.showActivityDialog = true;
    }

    openEditActivityDialog(activity: Activity): void {
        this.isEditMode = true;
        this.newActivity = { ...activity };
        this.showActivityDialog = true;
    }

    closeActivityDialog(): void {
        this.showActivityDialog = false;
        this.resetActivityForm();
    }

    resetActivityForm(): void {
        this.newActivity = {
            activityName: '',
            description: '',
            isActive: true
        };
    }

    saveActivity(): void {
        if (!this.newActivity.activityName) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation Error',
                detail: 'Please enter activity name'
            });
            return;
        }

        if (this.isEditMode && this.newActivity.activityId) {
            this.activityService.updateActivity(this.newActivity.activityId, this.newActivity).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Activity updated successfully'
                    });
                    this.closeActivityDialog();
                    this.loadActivities();
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to update activity'
                    });
                }
            });
        } else {
            this.activityService.createActivity(this.newActivity).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Activity created successfully'
                    });
                    this.closeActivityDialog();
                    this.loadActivities();
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to create activity'
                    });
                }
            });
        }
    }

    deleteActivity(activity: Activity): void {
        this.confirmationService.confirm({
            message: `Are you sure you want to delete "${activity.activityName}"? This will also delete all sub-activities.`,
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                if (activity.activityId) {
                    this.activityService.deleteActivity(activity.activityId).subscribe({
                        next: () => {
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Success',
                                detail: 'Activity deleted successfully'
                            });
                            this.loadActivities();
                        },
                        error: () => {
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Error',
                                detail: 'Failed to delete activity'
                            });
                        }
                    });
                }
            }
        });
    }

    toggleActivityStatus(activity: Activity): void {
        if (activity.activityId) {
            const updatedActivity = { ...activity, isActive: !activity.isActive };
            this.activityService.updateActivity(activity.activityId, updatedActivity).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: `Activity ${updatedActivity.isActive ? 'activated' : 'deactivated'}`
                    });
                    this.loadActivities();
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to update status'
                    });
                }
            });
        }
    }

    // SubActivity CRUD
    openAddSubActivityDialog(activity: ActivityWithSubActivities): void {
        this.isEditMode = false;
        this.selectedActivity = activity;
        this.resetSubActivityForm();
        this.newSubActivity.activityId = activity.activityId;
        this.showSubActivityDialog = true;
    }

    openEditSubActivityDialog(subActivity: SubActivity): void {
        this.isEditMode = true;
        this.newSubActivity = { ...subActivity };
        this.showSubActivityDialog = true;
    }

    closeSubActivityDialog(): void {
        this.showSubActivityDialog = false;
        this.resetSubActivityForm();
        this.selectedActivity = null;
    }

    resetSubActivityForm(): void {
        this.newSubActivity = {
            activityId: 0,
            subActivityName: '',
            description: '',
            isActive: true
        };
    }

    saveSubActivity(): void {
        if (!this.newSubActivity.subActivityName) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation Error',
                detail: 'Please enter sub-activity name'
            });
            return;
        }

        if (this.isEditMode && this.newSubActivity.subActivityId) {
            this.activityService.updateSubActivity(this.newSubActivity.subActivityId, this.newSubActivity).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Sub-activity updated successfully'
                    });
                    const activityId = this.newSubActivity.activityId;
                    this.closeSubActivityDialog();
                    if (activityId) {
                        this.refreshActivity(activityId);
                    }
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to update sub-activity'
                    });
                }
            });
        } else {
            this.activityService.createSubActivity(this.newSubActivity).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Sub-activity created successfully'
                    });
                    const activityId = this.newSubActivity.activityId;
                    this.closeSubActivityDialog();
                    if (activityId) {
                        this.refreshActivity(activityId);
                    }
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to create sub-activity'
                    });
                }
            });
        }
    }

    deleteSubActivity(subActivity: SubActivity): void {
        this.confirmationService.confirm({
            message: `Are you sure you want to delete "${subActivity.subActivityName}"?`,
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                if (subActivity.subActivityId) {
                    this.activityService.deleteSubActivity(subActivity.subActivityId).subscribe({
                        next: () => {
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Success',
                                detail: 'Sub-activity deleted successfully'
                            });
                            if (subActivity.activityId) {
                                this.refreshActivity(subActivity.activityId);
                            }
                        },
                        error: () => {
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Error',
                                detail: 'Failed to delete sub-activity'
                            });
                        }
                    });
                }
            }
        });
    }

    toggleSubActivityStatus(subActivity: SubActivity): void {
        if (subActivity.subActivityId) {
            const updated = { ...subActivity, isActive: !subActivity.isActive };
            this.activityService.updateSubActivity(subActivity.subActivityId, updated).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: `Sub-activity ${updated.isActive ? 'activated' : 'deactivated'}`
                    });
                    if (subActivity.activityId) {
                        this.refreshActivity(subActivity.activityId);
                    }
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to update status'
                    });
                }
            });
        }
    }

    getSeverity(isActive: boolean): string {
        return isActive ? 'success' : 'secondary';
    }

    getStatusLabel(isActive: boolean): string {
        return isActive ? 'Active' : 'Inactive';
    }

    getActiveSubActivitiesCount(activity: ActivityWithSubActivities): number {
        if (activity.subActivities && activity.subActivities.length > 0) {
            return activity.subActivities.filter(sub => sub.isActive).length;
        }
        return activity.activeSubActivities || 0;
    }

    getTotalSubActivitiesCount(activity: ActivityWithSubActivities): number {
        if (activity.subActivities && activity.subActivities.length > 0) {
            return activity.subActivities.length;
        }
        return activity.totalSubActivities || 0;
    }

    getAllSubActivitiesCount(): number {
        return this.activities.reduce((sum, a) => sum + (a.totalSubActivities || 0), 0);
    }

    getActiveActivitiesCount(): number {
        return this.activities.filter(a => a.isActive).length;
    }
}

