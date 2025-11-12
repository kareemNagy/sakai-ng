import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { EditorModule } from 'primeng/editor';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { AccordionModule } from 'primeng/accordion';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ProjectService } from '../../core/services/project.service';
import { environment } from '../../../environments/environment';
import { Chart, registerables } from 'chart.js';
interface TeamMember {
    id: number;
    fullName: string;
    email: string;
    title: string;
    role: string;
    allocationPercentage?: number;
    AllocationPercentage?: number;
}

interface Task {
    id: number;
    title: string;
    state: string;
    activity: string;
    subActivity: string;
    assignedTo: string;
    changedDate: string;
    areaPath?: string;
    completedWork?: number;
    originalEstimate?: number;
}

interface ProjectStatusData {
    projectId: number;
    projectName: string;
    userStoryStats: {
        total: number;
        new: number;
        active: number;
        closed: number;
    };
    taskStats: {
        total: number;
        new: number;
        active: number;
        closed: number;
    };
    bugStats: {
        total: number;
        new: number;
        active: number;
    };
    reworkPercentage: number;
    comment: string;
    commentId?: number;
    isEditingComment: boolean;
    tasks?: Task[];
    showTasks?: boolean;
    loadingTasks?: boolean;
    areaPaths?: string[];
    selectedAreaPaths?: string[];
    teamMembers?: TeamMember[];
    showTeamMembers?: boolean;
    loadingAreaPathChange?: boolean;
}

@Component({
    selector: 'app-project-status',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        CardModule,
        ButtonModule,
        ToastModule,
        TableModule,
        DialogModule,
        EditorModule,
        CheckboxModule,
        TagModule,
        AccordionModule
    ],
    providers: [MessageService],
    templateUrl: './project-status.component.html',
    styleUrls: ['./project-status.component.scss']
})
export class ProjectStatusComponent implements OnInit {
    projectStatuses: ProjectStatusData[] = [];
    loading = false;
    generatingReport = false;
    
    // Modal state
    showTasksModal = false;
    modalTasks: Task[] = [];
    modalProjectName = '';
    
    // Rework chart modal
    showReworkChartModal = false;
    reworkChartData: any = null;
    chartInstance: Chart | null = null;

    // General Notes
    generalNotes: string = '';
    isEditingGeneralNotes = false;
    savingGeneralNotes = false;

    constructor(
        private http: HttpClient,
        private projectService: ProjectService,
        private messageService: MessageService,
        private sanitizer: DomSanitizer
    ) {
        Chart.register(...registerables);
    }

    ngOnInit(): void {
        this.loadActiveProjects();
    }

    loadActiveProjects(): void {
        this.loading = true;
        this.projectService.getAllProjects({ isActive: true }).subscribe({
            next: (projects) => {
                this.projectStatuses = projects.map(project => ({
                    projectId: project.projectId!,
                    projectName: project.projectName,
                    userStoryStats: { total: 0, new: 0, active: 0, closed: 0 },
                    taskStats: { total: 0, new: 0, active: 0, closed: 0 },
                    bugStats: { total: 0, new: 0, active: 0 },
                    reworkPercentage: 0,
                    comment: '',
                    isEditingComment: false
                }));
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading projects:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load projects'
                });
                this.loading = false;
            }
        });
    }

    generateReport(): void {
        if (this.projectStatuses.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'No active projects found'
            });
            return;
        }

        this.generatingReport = true;
        this.messageService.add({
            severity: 'info',
            summary: 'Generating',
            detail: 'Generating report for all projects...'
        });

        const requests = this.projectStatuses.map(project => 
            this.http.get<any>(`${environment.apiUrl}/projects/${project.projectId}/status`).toPromise()
        );

        Promise.all(requests)
            .then(responses => {
                responses.forEach((response, index) => {
                    if (response && response.success) {
                        const data = response.data;
                        
                        this.projectStatuses[index].userStoryStats = data.userStoryStats;
                        this.projectStatuses[index].taskStats = data.taskStats;
                        this.projectStatuses[index].bugStats = data.bugStats || { total: 0, new: 0, active: 0 };
                        this.projectStatuses[index].reworkPercentage = data.reworkPercentage;
                        this.projectStatuses[index].comment = data.comment || '';
                        this.projectStatuses[index].commentId = data.commentId;
                        this.projectStatuses[index].areaPaths = data.areaPaths || [];
                        this.projectStatuses[index].selectedAreaPaths = [...(data.areaPaths || [])];
                        this.projectStatuses[index].teamMembers = data.teamMembers || [];
                        this.projectStatuses[index].tasks = data.tasks || [];
                        this.projectStatuses[index].loadingAreaPathChange = false;
                    }
                });
                this.generatingReport = false;
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Report generated successfully'
                });
            })
            .catch(err => {
                console.error('Error generating report:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to generate report'
                });
                this.generatingReport = false;
            });
    }

    editComment(project: ProjectStatusData): void {
        project.isEditingComment = true;
    }

    saveComment(project: ProjectStatusData): void {
        const payload = {
            projectId: project.projectId,
            comment: project.comment
        };

        const request = project.commentId
            ? this.http.put(`${environment.apiUrl}/project-comments/${project.commentId}`, payload)
            : this.http.post(`${environment.apiUrl}/project-comments`, payload);

        request.subscribe({
            next: (response: any) => {
                if (response.success) {
                    project.commentId = response.data.commentId || project.commentId;
                    project.isEditingComment = false;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Comment saved successfully'
                    });
                }
            },
            error: (err) => {
                console.error('Error saving comment:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to save comment'
                });
            }
        });
    }

    cancelEditComment(project: ProjectStatusData): void {
        project.isEditingComment = false;
    }

    getStatusPercentage(count: number, total: number): number {
        return total > 0 ? Math.round((count / total) * 100) : 0;
    }

    toggleTasksView(project: ProjectStatusData): void {
        this.modalProjectName = project.projectName;
        this.modalTasks = project.tasks || [];
        this.showTasksModal = true;
    }

    closeTasksModal(): void {
        this.showTasksModal = false;
        this.modalTasks = [];
        this.modalProjectName = '';
    }

    getTaskStateClass(state: string): string {
        switch (state?.toLowerCase()) {
            case 'new': return 'task-new';
            case 'active': return 'task-active';
            case 'closed': return 'task-closed';
            default: return 'task-default';
        }
    }

    getTaskStateSeverity(state: string): string {
        switch (state?.toLowerCase()) {
            case 'new': return 'info';
            case 'active': return 'warning';
            case 'closed': return 'success';
            default: return 'secondary';
        }
    }

    onAreaPathChange(project: ProjectStatusData): void {
        project.loadingAreaPathChange = true;
        
        let queryParams = '';
        if (project.selectedAreaPaths && project.selectedAreaPaths.length > 0) {
            queryParams = '?' + project.selectedAreaPaths.map(path => 
                `areaPaths=${encodeURIComponent(path)}`
            ).join('&');
        }
        
        this.http.get<any>(`${environment.apiUrl}/projects/${project.projectId}/status${queryParams}`).subscribe({
            next: (response) => {
                if (response.success) {
                    project.userStoryStats = response.data.userStoryStats;
                    project.taskStats = response.data.taskStats;
                    project.bugStats = response.data.bugStats || { total: 0, new: 0, active: 0 };
                    project.reworkPercentage = response.data.reworkPercentage;
                    project.tasks = response.data.tasks || [];
                    
                    const filterMsg = project.selectedAreaPaths && project.selectedAreaPaths.length > 0 
                        ? `Statistics updated for ${project.selectedAreaPaths.length} selected area path(s)`
                        : 'Statistics updated for all area paths';
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: filterMsg
                    });
                }
                project.loadingAreaPathChange = false;
            },
            error: (err) => {
                console.error('Error updating statistics:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to update statistics'
                });
                project.loadingAreaPathChange = false;
            }
        });
    }

    toggleAreaPath(project: ProjectStatusData, areaPath: string): void {
        if (!project.selectedAreaPaths) {
            project.selectedAreaPaths = [];
        }

        const index = project.selectedAreaPaths.indexOf(areaPath);
        if (index > -1) {
            project.selectedAreaPaths.splice(index, 1);
        } else {
            project.selectedAreaPaths.push(areaPath);
        }

        this.onAreaPathChange(project);
    }

    isAreaPathSelected(project: ProjectStatusData, areaPath: string): boolean {
        return project.selectedAreaPaths ? project.selectedAreaPaths.includes(areaPath) : false;
    }

    clearAreaPathFilter(project: ProjectStatusData): void {
        project.selectedAreaPaths = [];
        this.onAreaPathChange(project);
    }

    toggleTeamMembers(project: ProjectStatusData): void {
        project.showTeamMembers = !project.showTeamMembers;
    }

    showReworkChart(project: ProjectStatusData): void {
        if (!project.tasks || project.tasks.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'No tasks available to display chart'
            });
            return;
        }

        const userMap = new Map<string, { coding: number; bugFixing: number }>();

        project.tasks.forEach(task => {
            const userName = task.assignedTo || 'Unassigned';
            const subActivity = (task.subActivity || '').toLowerCase();
            const hours = task.completedWork || 0;

            if (hours > 0) {
                if (!userMap.has(userName)) {
                    userMap.set(userName, { coding: 0, bugFixing: 0 });
                }

                const userStats = userMap.get(userName)!;

                if (subActivity.includes('bug fixing') || subActivity.includes('bugfixing')) {
                    userStats.bugFixing += hours;
                } else if (subActivity.includes('coding')) {
                    userStats.coding += hours;
                }
            }
        });

        const chartData = Array.from(userMap.entries())
            .map(([userName, stats]) => ({
                userName,
                coding: stats.coding,
                bugFixing: stats.bugFixing
            }))
            .filter(stat => stat.coding > 0 || stat.bugFixing > 0)
            .sort((a, b) => (b.coding + b.bugFixing) - (a.coding + a.bugFixing));

        if (chartData.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'No coding or bug fixing data available'
            });
            return;
        }

        this.reworkChartData = {
            projectName: project.projectName,
            chartData
        };
        this.showReworkChartModal = true;

        setTimeout(() => this.createReworkChart(), 100);
    }

    createReworkChart(): void {
        const canvas = document.getElementById('reworkChartCanvas') as HTMLCanvasElement;
        if (!canvas || !this.reworkChartData) {
            return;
        }

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const data = this.reworkChartData.chartData;

        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map((d: any) => d.userName),
                datasets: [
                    {
                        label: 'Coding Hours',
                        data: data.map((d: any) => d.coding),
                        backgroundColor: 'rgba(34, 197, 94, 0.7)',
                        borderColor: 'rgb(34, 197, 94)',
                        borderWidth: 1
                    },
                    {
                        label: 'Bug Fixing Hours',
                        data: data.map((d: any) => d.bugFixing),
                        backgroundColor: 'rgba(239, 68, 68, 0.7)',
                        borderColor: 'rgb(239, 68, 68)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Coding vs Bug Fixing Hours by Team Member',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            footer: (tooltipItems: any) => {
                                const index = tooltipItems[0].dataIndex;
                                const coding = data[index].coding;
                                const bugFixing = data[index].bugFixing;
                                const rework = coding > 0 ? ((bugFixing / coding) * 100).toFixed(1) : '0.0';
                                return `Rework: ${rework}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Hours'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Team Members'
                        }
                    }
                }
            }
        });
    }

    closeReworkChartModal(): void {
        this.showReworkChartModal = false;
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
        this.reworkChartData = null;
    }

    toggleEditGeneralNotes(): void {
        this.isEditingGeneralNotes = !this.isEditingGeneralNotes;
    }

    saveGeneralNotes(): void {
        this.savingGeneralNotes = true;
        // Save to localStorage or API
        localStorage.setItem('project-status-general-notes', this.generalNotes);
        
        setTimeout(() => {
            this.isEditingGeneralNotes = false;
            this.savingGeneralNotes = false;
            this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'General notes saved successfully'
            });
        }, 500);
    }

    cancelEditGeneralNotes(): void {
        this.generalNotes = localStorage.getItem('project-status-general-notes') || '';
        this.isEditingGeneralNotes = false;
    }

    getSafeGeneralNotes(): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(this.generalNotes || '');
    }

    getSafeProjectComment(comment: string): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(comment || '');
    }

    ngOnDestroy(): void {
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }
    }
}
