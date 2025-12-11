import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule, Table } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { MultiSelectModule } from 'primeng/multiselect';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/environment';

interface Project {
    ProjectId: number;
    ProjectName: string;
    DevOpsProjectId: string;
}

interface TeamMember {
    TeamMemberId: number;
    FullName: string;
    Email: string;
}

interface DailyTimeLog {
    userName: string;
    email: string;
    taskName: string;
    taskId: number;
    projectName: string;
    hours: number;
    workItemType: string;
    state: string;
    loggedAt: string;
    previousHours: number;
    newTotalHours: number;
}

interface DailyTimeSummary {
    totalHours: number;
    totalUsers: number;
    totalTasks: number;
    nonProjectHours?: number;
    nonProjectTasks?: number;
}

@Component({
    selector: 'app-daily-time-logs',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        CardModule,
        ButtonModule,
        TableModule,
        ToastModule,
        TagModule,
        InputTextModule,
        TooltipModule,
        MultiSelectModule
    ],
    providers: [MessageService],
    templateUrl: './daily-time-logs.component.html',
    styleUrls: ['./daily-time-logs.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DailyTimeLogsComponent implements OnInit {
    @ViewChild('dt') dt!: Table;
    @ViewChild('dtNonProject') dtNonProject!: Table;
    
    // Data
    timeLogs: DailyTimeLog[] = [];
    nonProjectLogs: DailyTimeLog[] = [];
    summary: DailyTimeSummary = {
        totalHours: 0,
        totalUsers: 0,
        totalTasks: 0
    };
    
    // Dropdown data
    availableProjects: Project[] = [];
    availableTeamMembers: TeamMember[] = [];
    
    // Selected filters
    selectedProjects: Project[] = [];
    selectedTeamMembers: TeamMember[] = [];
    
    // UI state
    loading = false;
    loadingDropdowns = false;
    lastRefreshTime: Date | null = null;
    processingTime = 0;
    showNonProjectSection = true;
    hasDataLoaded = false;

    constructor(
        private http: HttpClient,
        private messageService: MessageService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadDropdownData();
    }

    /**
     * Load dropdown data (projects and team members)
     */
    loadDropdownData(): void {
        this.loadingDropdowns = true;
        this.cdr.markForCheck();

        // Load projects
        this.http.get<any>(`${environment.apiUrl}/devops/hours/projects`).subscribe({
            next: (response) => {
                if (response.success) {
                    this.availableProjects = response.data;
                    console.log('[Daily Time Logs] Loaded projects:', this.availableProjects.length);
                }
                this.loadingDropdowns = false;
                this.cdr.markForCheck();
            },
            error: (error) => {
                console.error('[Daily Time Logs] Error loading projects:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load projects'
                });
                this.loadingDropdowns = false;
                this.cdr.markForCheck();
            }
        });

        // Load team members
        this.http.get<any>(`${environment.apiUrl}/devops/hours/team-members`).subscribe({
            next: (response) => {
                if (response.success) {
                    this.availableTeamMembers = response.data;
                    console.log('[Daily Time Logs] Loaded team members:', this.availableTeamMembers.length);
                }
                this.cdr.markForCheck();
            },
            error: (error) => {
                console.error('[Daily Time Logs] Error loading team members:', error);
                this.cdr.markForCheck();
            }
        });
    }

    /**
     * Sync/Load today's logged hours from Azure DevOps based on selected filters
     */
    syncData(): void {
        if (this.selectedProjects.length === 0 && this.selectedTeamMembers.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'No Selection',
                detail: 'Please select at least one project or team member'
            });
            return;
        }

        this.loading = true;
        this.hasDataLoaded = false;
        this.cdr.markForCheck();

        const startTime = Date.now();

        // Build query params
        let url = `${environment.apiUrl}/devops/today-hours`;
        const params: string[] = [];
        
        if (this.selectedProjects.length > 0) {
            const projectIds = this.selectedProjects.map(p => p.ProjectId).join(',');
            params.push(`projectIds=${projectIds}`);
        }
        
        if (this.selectedTeamMembers.length > 0) {
            const teamMemberIds = this.selectedTeamMembers.map(tm => tm.TeamMemberId).join(',');
            params.push(`teamMemberIds=${teamMemberIds}`);
        }
        
        if (params.length > 0) {
            url += '?' + params.join('&');
        }

        console.log('[Daily Time Logs] Syncing with URL:', url);

        this.http.get<any>(url).subscribe({
            next: (response) => {
                if (response.success) {
                    this.timeLogs = response.data || [];
                    this.nonProjectLogs = response.nonProjectData || [];
                    this.summary = response.summary || {
                        totalHours: 0,
                        totalUsers: 0,
                        totalTasks: 0
                    };
                    this.processingTime = response.processingTime || (Date.now() - startTime);
                    this.lastRefreshTime = new Date();
                    this.hasDataLoaded = true;

                    const totalEntries = this.timeLogs.length + this.nonProjectLogs.length;
                    let detailMsg = `Synced ${this.timeLogs.length} project entries`;
                    if (this.nonProjectLogs.length > 0) {
                        detailMsg += ` and ${this.nonProjectLogs.length} non-project entries`;
                    }
                    detailMsg += ` (${this.processingTime}ms)`;

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Sync Complete',
                        detail: detailMsg,
                        life: 3000
                    });

                    console.log('[Daily Time Logs] Synced:', {
                        projectEntries: this.timeLogs.length,
                        nonProjectEntries: this.nonProjectLogs.length,
                        summary: this.summary
                    });
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to sync time logs'
                    });
                }

                this.loading = false;
                this.cdr.markForCheck();
            },
            error: (error) => {
                console.error('[Daily Time Logs] Error syncing data:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Sync Error',
                    detail: error.error?.details || 'Failed to sync daily time logs'
                });
                this.loading = false;
                this.cdr.markForCheck();
            }
        });
    }

    /**
     * When projects selection changes, update team members list
     */
    onProjectsChange(): void {
        if (this.selectedProjects.length > 0) {
            const projectIds = this.selectedProjects.map(p => p.ProjectId).join(',');
            this.http.get<any>(`${environment.apiUrl}/devops/hours/team-members?projectIds=${projectIds}`).subscribe({
                next: (response) => {
                    if (response.success) {
                        this.availableTeamMembers = response.data;
                        // Remove team members that are no longer in the filtered list
                        this.selectedTeamMembers = this.selectedTeamMembers.filter(selected =>
                            this.availableTeamMembers.some(available => available.TeamMemberId === selected.TeamMemberId)
                        );
                        this.cdr.markForCheck();
                    }
                },
                error: (error) => {
                    console.error('[Daily Time Logs] Error loading filtered team members:', error);
                }
            });
        } else {
            // Load all team members if no projects selected
            this.http.get<any>(`${environment.apiUrl}/devops/hours/team-members`).subscribe({
                next: (response) => {
                    if (response.success) {
                        this.availableTeamMembers = response.data;
                        this.cdr.markForCheck();
                    }
                }
            });
        }
    }

    /**
     * Clear all filters
     */
    clearFilters(): void {
        this.selectedProjects = [];
        this.selectedTeamMembers = [];
        this.timeLogs = [];
        this.nonProjectLogs = [];
        this.hasDataLoaded = false;
        this.summary = {
            totalHours: 0,
            totalUsers: 0,
            totalTasks: 0
        };
        this.cdr.markForCheck();

        this.messageService.add({
            severity: 'info',
            summary: 'Filters Cleared',
            detail: 'All filters have been cleared'
        });
    }

    /**
     * Toggle non-project section visibility
     */
    toggleNonProjectSection(): void {
        this.showNonProjectSection = !this.showNonProjectSection;
    }

    /**
     * Get severity for work item type tag
     */
    getWorkItemTypeSeverity(type: string): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" {
        switch (type?.toLowerCase()) {
            case 'task':
                return 'info';
            case 'bug':
                return 'danger';
            case 'user story':
                return 'success';
            case 'feature':
                return 'warn';
            default:
                return 'secondary';
        }
    }

    /**
     * Get severity for work item state tag
     */
    getStateSeverity(state: string): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" {
        switch (state?.toLowerCase()) {
            case 'active':
                return 'warn';
            case 'closed':
            case 'done':
                return 'success';
            case 'new':
                return 'info';
            default:
                return 'secondary';
        }
    }

    /**
     * Format logged time
     */
    formatLoggedAt(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    /**
     * Export data to CSV
     */
    exportToCSV(): void {
        if (this.timeLogs.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'No Data',
                detail: 'No data available to export'
            });
            return;
        }

        const headers = ['User Name', 'Email', 'Task Name', 'Task ID', 'Project Name', 
                        'Hours Logged', 'Work Item Type', 'State', 'Logged At'];
        
        const csvData = this.timeLogs.map(log => [
            log.userName,
            log.email,
            log.taskName,
            log.taskId,
            log.projectName,
            log.hours,
            log.workItemType,
            log.state,
            new Date(log.loggedAt).toLocaleString()
        ]);

        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `daily-time-logs-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.messageService.add({
            severity: 'success',
            summary: 'Exported',
            detail: 'Time logs exported successfully'
        });
    }

    /**
     * Group logs by user
     */
    getLogsByUser(): Map<string, DailyTimeLog[]> {
        const grouped = new Map<string, DailyTimeLog[]>();
        this.timeLogs.forEach(log => {
            if (!grouped.has(log.userName)) {
                grouped.set(log.userName, []);
            }
            grouped.get(log.userName)!.push(log);
        });
        return grouped;
    }

    /**
     * Get total hours for a user
     */
    getUserTotalHours(userName: string): number {
        return this.timeLogs
            .filter(log => log.userName === userName)
            .reduce((sum, log) => sum + log.hours, 0);
    }
}

