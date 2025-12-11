import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
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
    showReworkChart?: boolean;
    loadingReworkChart?: boolean;
    reworkChartData?: any;
    chartInstance?: Chart | null;
    chartCached?: boolean;
    chartProcessingTime?: number;
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
    styleUrls: ['./project-status.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectStatusComponent implements OnInit, OnDestroy {
    projectStatuses: ProjectStatusData[] = [];
    loading = false;
    generatingReport = false;
    
    // Modal state
    showTasksModal = false;
    modalTasks: Task[] = [];
    modalProjectName = '';

    // General Notes
    generalNotes: string = '';
    isEditingGeneralNotes = false;
    savingGeneralNotes = false;

    // Debounce subjects for performance
    private areaPathChangeSubject = new Subject<{ project: ProjectStatusData, paths: string[] }>();

    constructor(
        private http: HttpClient,
        private projectService: ProjectService,
        private messageService: MessageService,
        private sanitizer: DomSanitizer,
        private cdr: ChangeDetectorRef
    ) {
        Chart.register(...registerables);
        
        // Setup debounced area path filtering (500ms delay)
        this.areaPathChangeSubject
            .pipe(
                debounceTime(500),
                distinctUntilChanged((prev, curr) => 
                    JSON.stringify(prev.paths) === JSON.stringify(curr.paths)
                )
            )
            .subscribe(({ project, paths }) => {
                this.applyAreaPathFilter(project, paths);
            });
    }

    ngOnInit(): void {
        this.loadActiveProjects();
    }

    loadActiveProjects(): void {
        this.loading = true;
        this.cdr.markForCheck();
        
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
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.error('Error loading projects:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load projects'
                });
                this.loading = false;
                this.cdr.markForCheck();
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
        this.cdr.markForCheck();
        
        const startTime = Date.now();
        this.messageService.add({
            severity: 'info',
            summary: 'Generating',
            detail: `Generating report for ${this.projectStatuses.length} projects...`
        });

        // Batch requests in groups of 5 for better performance
        const batchSize = 5;
        const batches: Promise<any>[][] = [];
        
        for (let i = 0; i < this.projectStatuses.length; i += batchSize) {
            const batch = this.projectStatuses.slice(i, i + batchSize).map(project => 
                this.http.get<any>(`${environment.apiUrl}/projects/${project.projectId}/status`).toPromise()
            );
            batches.push(batch);
        }

        // Process batches sequentially to avoid overwhelming the server
        const processBatches = async () => {
            let processedCount = 0;
            
            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                try {
                    const responses = await Promise.all(batches[batchIndex]);
                    
                    responses.forEach((response, index) => {
                        if (response && response.success) {
                            const data = response.data;
                            const projectIndex = batchIndex * batchSize + index;
                            
                            this.projectStatuses[projectIndex].userStoryStats = data.userStoryStats;
                            this.projectStatuses[projectIndex].taskStats = data.taskStats;
                            this.projectStatuses[projectIndex].bugStats = data.bugStats || { total: 0, new: 0, active: 0 };
                            this.projectStatuses[projectIndex].reworkPercentage = data.reworkPercentage;
                            this.projectStatuses[projectIndex].comment = data.comment || '';
                            this.projectStatuses[projectIndex].commentId = data.commentId;
                            this.projectStatuses[projectIndex].areaPaths = data.areaPaths || [];
                            this.projectStatuses[projectIndex].selectedAreaPaths = [...(data.areaPaths || [])];
                            this.projectStatuses[projectIndex].tasks = data.tasks || [];
                            this.projectStatuses[projectIndex].loadingAreaPathChange = false;
                            
                            // Lazy load team members only when needed (not on initial load)
                            this.projectStatuses[projectIndex].teamMembers = data.teamMembers || [];
                            
                            // Preserve chart state if already loaded, otherwise initialize as not shown
                            if (!this.projectStatuses[projectIndex].showReworkChart) {
                                this.projectStatuses[projectIndex].showReworkChart = false;
                                this.projectStatuses[projectIndex].reworkChartData = null;
                            }
                            // If chart is already displayed, keep it displayed and refresh it
                            else if (this.projectStatuses[projectIndex].showReworkChart && this.projectStatuses[projectIndex].reworkChartData) {
                                // Re-load chart data to reflect updated stats
                                this.loadReworkChartData(this.projectStatuses[projectIndex], true);
                            }
                            
                            processedCount++;
                        }
                    });
                    
                    // Update UI after each batch
                    this.cdr.markForCheck();
                    
                } catch (error) {
                    console.error(`Error processing batch ${batchIndex}:`, error);
                }
            }
            
            return processedCount;
        };

        processBatches()
            .then(count => {
                const duration = Date.now() - startTime;
                this.generatingReport = false;
                this.cdr.markForCheck();
                
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: `Report generated for ${count} projects (${(duration / 1000).toFixed(1)}s)`
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
                this.cdr.markForCheck();
            });
    }

    editComment(project: ProjectStatusData): void {
        project.isEditingComment = true;
        this.cdr.markForCheck();
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
                    this.cdr.markForCheck();
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Comment saved successfully',
                        life: 3000
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
                this.cdr.markForCheck();
            }
        });
    }

    cancelEditComment(project: ProjectStatusData): void {
        project.isEditingComment = false;
        this.cdr.markForCheck();
    }

    getStatusPercentage(count: number, total: number): number {
        return total > 0 ? Math.round((count / total) * 100) : 0;
    }

    toggleTasksView(project: ProjectStatusData): void {
        this.modalProjectName = project.projectName;
        this.modalTasks = project.tasks || [];
        this.showTasksModal = true;
        this.cdr.markForCheck();
    }

    closeTasksModal(): void {
        this.showTasksModal = false;
        this.modalTasks = [];
        this.modalProjectName = '';
        this.cdr.markForCheck();
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
        // Use debounced subject to avoid excessive API calls
        project.loadingAreaPathChange = true;
        this.cdr.markForCheck();
        this.areaPathChangeSubject.next({ 
            project, 
            paths: project.selectedAreaPaths || [] 
        });
    }

    private applyAreaPathFilter(project: ProjectStatusData, paths: string[]): void {
        let queryParams = '';
        if (paths.length > 0) {
            queryParams = '?' + paths.map(path => 
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
                    
                    const filterMsg = paths.length > 0 
                        ? `Statistics updated for ${paths.length} selected area path(s)`
                        : 'Statistics updated for all area paths';
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: filterMsg,
                        life: 2000
                    });
                    
                    // If chart is already displayed, refresh it with filtered data
                    if (project.showReworkChart && project.reworkChartData) {
                        console.log('[Area Filter] Refreshing chart with filtered data');
                        this.loadReworkChartData(project, true);
                    }
                }
                project.loadingAreaPathChange = false;
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.error('Error updating statistics:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to update statistics'
                });
                project.loadingAreaPathChange = false;
                this.cdr.markForCheck();
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
        this.cdr.markForCheck();
    }

    loadReworkChartData(project: ProjectStatusData, forceRefresh: boolean = false): void {
        console.log(`[Chart] Loading rework chart data for project: ${project.projectName}${forceRefresh ? ' (force refresh)' : ''}`);
        const startTime = Date.now();
        project.loadingReworkChart = true;
        project.showReworkChart = true; // Ensure the chart area is visible
        this.cdr.markForCheck();

        // Build query string with area paths filter if applicable
        let queryParams = '';
        if (project.selectedAreaPaths && project.selectedAreaPaths.length > 0) {
            queryParams = '?' + project.selectedAreaPaths.map(path => 
                `areaPaths=${encodeURIComponent(path)}`
            ).join('&');
        }

        // Add cache buster for force refresh
        if (forceRefresh) {
            queryParams += (queryParams ? '&' : '?') + `_t=${Date.now()}`;
            // Clear cache on backend first
            this.http.delete(`${environment.apiUrl}/projects/${project.projectId}/rework-chart/cache`).subscribe();
        }

        // Fetch chart data from backend
        this.http.get<any>(`${environment.apiUrl}/projects/${project.projectId}/rework-chart${queryParams}`).subscribe({
            next: (response) => {
                if (response.success) {
                    const chartData = response.data.chartData;
                    const clientTime = Date.now() - startTime;

                    // Store cache info
                    project.chartCached = response.cached || false;
                    project.chartProcessingTime = response.processingTime || clientTime;

                    console.log(`[Chart] Data loaded in ${clientTime}ms (${project.chartCached ? 'cached' : 'fresh'})`);

                    if (!chartData || chartData.length === 0) {
                        this.messageService.add({ 
                            severity: 'warn', 
                            summary: 'Warning', 
                            detail: 'No coding or bug fixing data available for chart' 
                        });
                        project.loadingReworkChart = false;
                        project.reworkChartData = null;
                        this.cdr.markForCheck();
                        return;
                    }

                    project.reworkChartData = {
                        projectName: response.data.projectName,
                        chartData
                    };
                    project.loadingReworkChart = false;
                    this.cdr.markForCheck();

                    // Show success message with performance info
                    if (!forceRefresh) {
                        const perfMsg = project.chartCached 
                            ? `Chart loaded from cache (${clientTime}ms)` 
                            : `Chart loaded (${project.chartProcessingTime}ms)`;
                        this.messageService.add({ 
                            severity: 'success', 
                            summary: 'Success', 
                            detail: perfMsg,
                            life: 2000
                        });
                    } else {
                        this.messageService.add({ 
                            severity: 'success', 
                            summary: 'Refreshed', 
                            detail: `Chart data refreshed (${project.chartProcessingTime}ms)`,
                            life: 2000
                        });
                    }

                    // Use requestAnimationFrame and setTimeout for better timing
                    setTimeout(() => {
                        requestAnimationFrame(() => {
                            this.createReworkChart(project);
                        });
                    }, 300);
                }
            },
            error: (err) => {
                const errorTime = Date.now() - startTime;
                console.error('[Chart] Error fetching rework chart data:', err);
                this.messageService.add({ 
                    severity: 'error', 
                    summary: 'Error', 
                    detail: `Failed to load rework chart data (${errorTime}ms)` 
                });
                project.loadingReworkChart = false;
                project.reworkChartData = null;
                this.cdr.markForCheck();
            }
        });
    }

    refreshReworkChart(project: ProjectStatusData): void {
        console.log(`[Chart] Refreshing chart data for: ${project.projectName}`);
        // Destroy existing chart before refreshing
        if (project.chartInstance) {
            project.chartInstance.destroy();
            project.chartInstance = null;
        }
        this.loadReworkChartData(project, true);
    }

    createReworkChart(project: ProjectStatusData): void {
        try {
            const canvasId = `reworkChart-${project.projectId}`;
            console.log('[Chart] Looking for canvas:', canvasId);
            
            const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
            if (!canvas) {
                console.warn('[Chart] Canvas element not found:', canvasId, '- retrying...');
                // Retry multiple times with increasing delays
                let retryCount = 0;
                const maxRetries = 5;
                const retryInterval = setInterval(() => {
                    retryCount++;
                    const retryCanvas = document.getElementById(canvasId) as HTMLCanvasElement;
                    if (retryCanvas) {
                        console.log('[Chart] Canvas found on retry', retryCount);
                        clearInterval(retryInterval);
                        this.createReworkChartInternal(project, retryCanvas);
                    } else if (retryCount >= maxRetries) {
                        console.error('[Chart] Canvas still not found after', maxRetries, 'retries');
                        clearInterval(retryInterval);
                        this.messageService.add({
                            severity: 'warn',
                            summary: 'Warning',
                            detail: 'Chart rendering delayed, try refreshing if not visible'
                        });
                    }
                }, 200);
                return;
            }
            
            console.log('[Chart] Canvas found immediately, creating chart');
            this.createReworkChartInternal(project, canvas);
        } catch (error) {
            console.error('[Chart] Error in createReworkChart:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to create chart'
            });
        }
    }

    private createReworkChartInternal(project: ProjectStatusData, canvas: HTMLCanvasElement): void {
        if (!project.reworkChartData || !project.reworkChartData.chartData) {
            console.warn('No chart data available');
            return;
        }

        // Destroy existing chart instance for this project
        if (project.chartInstance) {
            try {
                project.chartInstance.destroy();
                project.chartInstance = null;
            } catch (e) {
                console.warn('Error destroying previous chart:', e);
            }
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.warn('Could not get canvas context');
            return;
        }

        const data = project.reworkChartData.chartData;
        
        if (!data || data.length === 0) {
            console.warn('Chart data is empty');
            return;
        }

        // Prepare user stats with coding, bug fixing, and rework percentage
        const userStats = data.map((d: any) => ({
            userName: d.userName,
            coding: d.coding,
            bugFixing: d.bugFixing,
            total: d.coding + d.bugFixing,
            reworkPercentage: d.coding > 0 ? ((d.bugFixing / d.coding) * 100).toFixed(1) : '0.0'
        }))
        .filter((stat: any) => stat.total > 0)
        .sort((a: any, b: any) => b.total - a.total);

        console.log('[Chart] User stats with coding and bug fixing:', userStats);

        // Custom plugin to display rework percentage above bars
        const percentagePlugin = {
            id: 'percentageLabels',
            afterDatasetsDraw: (chart: any) => {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
                    const meta = chart.getDatasetMeta(datasetIndex);
                    if (!meta.hidden && datasetIndex === 1) { // Only for bug fixing bars (second dataset)
                        meta.data.forEach((bar: any, index: number) => {
                            const stat = userStats[index];
                            const percentage = `${stat.reworkPercentage}%`;
                            
                            ctx.save();
                            ctx.font = 'bold 12px Arial';
                            ctx.fillStyle = '#B71C1C';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'bottom';
                            
                            // Position text above the tallest bar for this user
                            const codingBar = chart.getDatasetMeta(0).data[index];
                            const bugFixingBar = bar;
                            const maxY = Math.min(codingBar.y, bugFixingBar.y);
                            
                            ctx.fillText(percentage, bar.x, maxY - 5);
                            ctx.restore();
                        });
                    }
                });
            }
        };

        try {
            project.chartInstance = new Chart(ctx, {
                type: 'bar',
                plugins: [percentagePlugin],
                data: {
                    labels: userStats.map((d: any) => d.userName),
                    datasets: [
                        {
                            label: 'Coding Hours',
                            data: userStats.map((d: any) => d.coding),
                            backgroundColor: 'rgba(34, 197, 94, 0.8)',
                            borderColor: 'rgb(34, 197, 94)',
                            borderWidth: 2,
                            borderRadius: 4
                        },
                        {
                            label: 'Bug Fixing Hours',
                            data: userStats.map((d: any) => d.bugFixing),
                            backgroundColor: 'rgba(239, 68, 68, 0.8)',
                            borderColor: 'rgb(239, 68, 68)',
                            borderWidth: 2,
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 500
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Coding vs Bug Fixing Hours with Rework %',
                            font: {
                                size: 15,
                                weight: 'bold'
                            }
                        },
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 15,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 12,
                            titleFont: {
                                size: 14,
                                weight: 'bold'
                            },
                            bodyFont: {
                                size: 13
                            },
                            callbacks: {
                                title: (context: any) => {
                                    const index = context[0].dataIndex;
                                    const stat = userStats[index];
                                    return `${stat.userName} - Rework: ${stat.reworkPercentage}%`;
                                },
                                label: (context: any) => {
                                    const label = context.dataset.label || '';
                                    const value = context.parsed.y.toFixed(1);
                                    return `${label}: ${value}h`;
                                },
                                footer: (context: any) => {
                                    const index = context[0].dataIndex;
                                    const stat = userStats[index];
                                    return [
                                        `Total Hours: ${stat.total.toFixed(1)}h`,
                                        `Rework %: ${stat.reworkPercentage}%`
                                    ];
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            stacked: false,
                            title: {
                                display: true,
                                text: 'Hours',
                                font: {
                                    size: 13,
                                    weight: 'bold'
                                }
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            },
                            ticks: {
                                font: {
                                    size: 11
                                }
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Team Members',
                                font: {
                                    size: 13,
                                    weight: 'bold'
                                }
                            },
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    size: 11
                                },
                                autoSkip: false,
                                maxRotation: 45,
                                minRotation: 45
                            }
                        }
                    }
                }
            });
            console.log('Chart created successfully for project:', project.projectId);
        } catch (error) {
            console.error('Error creating chart instance:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to create chart visualization'
            });
        }
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
        // Complete debounce subject
        this.areaPathChangeSubject.complete();
        
        // Destroy all chart instances
        this.projectStatuses.forEach(project => {
            if (project.chartInstance) {
                try {
                    project.chartInstance.destroy();
                } catch (e) {
                    console.warn('Error destroying chart on component destroy:', e);
                }
                project.chartInstance = null;
            }
        });
    }
}
