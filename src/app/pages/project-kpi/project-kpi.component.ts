import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { CheckboxModule } from 'primeng/checkbox';
import { ProjectService } from '../../core/services/project.service';
import { Project } from '../../core/models';
import { environment } from '../../../environments/environment';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { EmailModalComponent, EmailData, UserWithEmail, UserStats } from '../../shared/components/email-modal/email-modal.component';
import { Observable, forkJoin } from 'rxjs';

interface WorkItem {
  id: number;
  title: string;
  state: string;
  assignedTo: string;
  assignedToEmail: string;
  activity: string;
  subActivity: string;
  originalEstimate: number;
  completedWork: number;
  areaPath: string;
  changedDate: string;
  createdDate: string;
}

@Component({
    selector: 'app-project-kpi',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        CardModule,
        ButtonModule,
        SelectModule,
        InputTextModule,
        ToastModule,
        TableModule,
        CheckboxModule,
        EmailModalComponent
    ],
    providers: [MessageService],
    templateUrl: './project-kpi.component.html',
    styleUrls: ['./project-kpi.component.scss']
})
export class ProjectKpiComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('estimateActualChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('codingBugFixingChart') codingBugFixingChartCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('reworkChart') reworkChartCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('subActivityChart') subActivityChartCanvas!: ElementRef<HTMLCanvasElement>;

    private chart?: Chart;
    private codingBugFixingChart?: Chart;
    private reworkChart?: Chart;
    private subActivityChart?: Chart;

    projects: Project[] = [];
    selectedProjectId: number | undefined;
    selectedProjectName: string = '';
    
    loading = false;
    workItemsDetails: WorkItem[] = [];
    filteredWorkItems: WorkItem[] = [];
    
    // KPI Metrics
    kpiMetrics = {
        totalBugFixing: 0,
        totalCoding: 0,
        reworkPercentage: 0,
        totalEstimate: 0,
        totalActual: 0,
        deviation: 0
    };
    
    // Filters
    filters = {
        id: '',
        areaPath: [] as string[],
        assignedTo: '',
        activity: [] as string[],
        subActivity: [] as string[]
    };
    
    // KPI Filters
    kpiFilters = {
        areaPath: [] as string[]
    };

    // Email modal state
    emailModalVisible = false;
    emailModalData: EmailData | null = null;
    emailModalUsers: UserWithEmail[] = [];

    // Pagination
    currentPage: number = 1;
    itemsPerPage: number = 10;

    constructor(
        private projectService: ProjectService,
        private messageService: MessageService,
        private http: HttpClient
    ) {
        Chart.register(...registerables);
    }

    ngOnInit(): void {
        this.loadProjects();
    }

    ngAfterViewInit(): void {
        // Charts will be created after data is loaded
    }

    loadProjects(): void {
        this.projectService.getAllProjects({ isActive: true, hasDevOps: true }).subscribe({
            next: (projects) => {
                this.projects = projects;
            },
            error: (err) => {
                console.error('Error loading projects:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load projects'
                });
            }
        });
    }

    onProjectChange(): void {
        if (!this.selectedProjectId) {
            this.clearData();
            return;
        }

        const project = this.projects.find(p => p.projectId === this.selectedProjectId);
        if (project) {
            this.selectedProjectName = project.projectName;
        }
    }

    clearData(): void {
        this.workItemsDetails = [];
        this.filteredWorkItems = [];
        this.selectedProjectName = '';
        this.kpiMetrics = {
            totalBugFixing: 0,
            totalCoding: 0,
            reworkPercentage: 0,
            totalEstimate: 0,
            totalActual: 0,
            deviation: 0
        };
        this.resetFilters();
        this.closeEmailModal();
    }
    
    resetFilters(): void {
        this.filters = {
            id: '',
            areaPath: [],
            assignedTo: '',
            activity: [],
            subActivity: []
        };
        this.kpiFilters = {
            areaPath: []
        };
        this.applyFilters();
    }

    fetchProjectKpi(): void {
        if (!this.selectedProjectName) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'Please select a project first'
            });
            return;
        }

        this.loading = true;
        
        this.http.post<any>(`${environment.apiUrl}/devops/work-items/query`, {
            projectName: this.selectedProjectName
        }).subscribe({
            next: (response) => {
                console.log('Backend Work Items Response:', response);
                const workItems = response.data || [];
                
                if (workItems.length > 0) {
                    this.workItemsDetails = workItems.map((wi: any) => ({
                        id: wi.id,
                        title: wi.fields['System.Title'] || '',
                        state: wi.fields['System.State'] || '',
                        assignedTo: wi.fields['System.AssignedTo']?.displayName || 'Unassigned',
                        assignedToEmail: wi.fields['System.AssignedTo']?.uniqueName || '',
                        activity: wi.fields['Microsoft.VSTS.Common.Activity'] || '',
                        subActivity: wi.fields['Custom.SubActivity'] || '',
                        originalEstimate: wi.fields['Microsoft.VSTS.Scheduling.OriginalEstimate'] || 0,
                        completedWork: wi.fields['Microsoft.VSTS.Scheduling.CompletedWork'] || 0,
                        areaPath: wi.fields['System.AreaPath'] || '',
                        changedDate: wi.fields['System.ChangedDate'],
                        createdDate: wi.fields['System.CreatedDate']
                    }));
                    
                    this.applyFilters();
                    this.calculateKPIMetrics();
                    
                    this.loading = false;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: `Loaded ${this.workItemsDetails.length} tasks`
                    });
                    
                    setTimeout(() => {
                        this.createOrUpdateChart();
                        this.createOrUpdateCodingBugFixingChart();
                        this.createOrUpdateReworkChart();
                        this.createOrUpdateSubActivityChart();
                    }, 100);
                } else {
                    this.loading = false;
                    this.messageService.add({
                        severity: 'info',
                        summary: 'Info',
                        detail: 'No tasks found for FETeam in this project'
                    });
                }
            },
            error: (err) => {
                console.error('Error fetching KPI data:', err);
                this.loading = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to fetch project KPI data'
                });
            }
        });
    }

    applyFilters(): void {
        let filtered = [...this.workItemsDetails];
        
        if (this.filters.id) {
            filtered = filtered.filter(item => 
                item.id.toString().includes(this.filters.id)
            );
        }
        if (this.filters.areaPath && this.filters.areaPath.length > 0) {
            filtered = filtered.filter(item => 
                this.filters.areaPath.includes(item.areaPath)
            );
        }
        if (this.filters.assignedTo) {
            filtered = filtered.filter(item => 
                item.assignedTo?.toLowerCase().includes(this.filters.assignedTo.toLowerCase())
            );
        }
        if (this.filters.activity && this.filters.activity.length > 0) {
            filtered = filtered.filter(item => 
                this.filters.activity.includes(item.activity)
            );
        }
        if (this.filters.subActivity && this.filters.subActivity.length > 0) {
            filtered = filtered.filter(item => 
                this.filters.subActivity.includes(item.subActivity)
            );
        }
        
        this.filteredWorkItems = filtered;
    }

    calculateKPIMetrics(): void {
        if (this.workItemsDetails.length === 0) {
            this.kpiMetrics = {
                totalBugFixing: 0,
                totalCoding: 0,
                reworkPercentage: 0,
                totalEstimate: 0,
                totalActual: 0,
                deviation: 0
            };
            return;
        }

        let bugFixingHours = 0;
        let codingHours = 0;
        let totalEstimate = 0;
        let totalActual = 0;

        const filteredItems = this.kpiFilters.areaPath.length > 0
            ? this.workItemsDetails.filter(item => this.kpiFilters.areaPath.includes(item.areaPath))
            : this.workItemsDetails;

        filteredItems.forEach(item => {
            const activity = (item.activity || '').toLowerCase();
            const subActivity = (item.subActivity || '').toLowerCase();
            const completedWork = item.completedWork || 0;
            const originalEstimate = item.originalEstimate || 0;

            if (subActivity.includes('bug fixing') || subActivity.includes('bug') || 
                subActivity.includes('fix') || activity.includes('bug')) {
                bugFixingHours += completedWork;
            }
            
            if (subActivity.includes('coding') || subActivity.includes('development') || 
                activity.includes('coding') || activity.includes('development')) {
                codingHours += completedWork;
            }

            totalEstimate += originalEstimate;
            totalActual += completedWork;
        });

        const reworkPercentage = codingHours > 0 ? (bugFixingHours / codingHours) * 100 : 0;
        const deviation = totalEstimate > 0 ? ((totalActual - totalEstimate) / totalEstimate) * 100 : 0;

        this.kpiMetrics = {
            totalBugFixing: bugFixingHours,
            totalCoding: codingHours,
            reworkPercentage: reworkPercentage,
            totalEstimate: totalEstimate,
            totalActual: totalActual,
            deviation: deviation
        };
    }

    createOrUpdateChart(): void {
        try {
            if (!this.chartCanvas || this.workItemsDetails.length === 0) {
                console.log('Estimate/Actual chart: Canvas or data not ready');
                return;
            }

            const userStats = this.aggregateDataByUser();
            const labels = userStats.map(stat => stat.userName);
            const estimateData = userStats.map(stat => stat.totalEstimate);
            const actualData = userStats.map(stat => stat.totalActual);

            if (this.chart) {
                try {
                    this.chart.destroy();
                } catch (e) {
                    console.warn('Error destroying estimate/actual chart:', e);
                }
                this.chart = undefined;
            }

            const ctx = this.chartCanvas.nativeElement.getContext('2d');
            if (!ctx) {
                console.warn('Could not get estimate/actual chart context');
                return;
            }

            this.chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Estimate',
                            data: estimateData,
                            backgroundColor: '#FFA726',
                            borderColor: '#FF9800',
                            borderWidth: 1
                        },
                        {
                            label: 'Actual',
                            data: actualData,
                            backgroundColor: '#AB47BC',
                            borderColor: '#9C27B0',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 500
                    },
                    onClick: (event, activeElements) => {
                        if (activeElements.length > 0) {
                            const index = activeElements[0].index;
                            const userName = labels[index];
                            if (userName) {
                                this.openEmailModal(userName, 'estimate-actual');
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Total - Estimate vs. Actual / User',
                            font: { size: 18, weight: 'bold' }
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Hours' }
                        }
                    }
                }
            });
            console.log('Estimate/Actual chart created successfully');
        } catch (error) {
            console.error('Error creating estimate/actual chart:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to create estimate/actual chart'
            });
        }
    }

    private aggregateDataByUser(): { userName: string; totalEstimate: number; totalActual: number }[] {
        const userMap = new Map<string, { totalEstimate: number; totalActual: number }>();

        const filteredItems = this.kpiFilters.areaPath.length > 0
            ? this.workItemsDetails.filter(item => this.kpiFilters.areaPath.includes(item.areaPath))
            : this.workItemsDetails;

        filteredItems.forEach(item => {
            const userName = item.assignedTo || 'Unassigned';
            const estimate = item.originalEstimate || 0;
            const actual = item.completedWork || 0;

            if (userMap.has(userName)) {
                const existing = userMap.get(userName)!;
                existing.totalEstimate += estimate;
                existing.totalActual += actual;
            } else {
                userMap.set(userName, { totalEstimate: estimate, totalActual: actual });
            }
        });

        return Array.from(userMap.entries())
            .map(([userName, stats]) => ({ userName, ...stats }))
            .sort((a, b) => b.totalActual - a.totalActual);
    }

    createOrUpdateCodingBugFixingChart(): void {
        try {
            if (!this.codingBugFixingChartCanvas || this.workItemsDetails.length === 0) {
                console.log('Coding/BugFixing chart: Canvas or data not ready');
                return;
            }

            const userStats = this.aggregateActivityByUser();
            const labels = userStats.map(stat => stat.userName);
            const codingData = userStats.map(stat => stat.coding);
            const bugFixingData = userStats.map(stat => stat.bugFixing);

            if (this.codingBugFixingChart) {
                try {
                    this.codingBugFixingChart.destroy();
                } catch (e) {
                    console.warn('Error destroying coding/bugfixing chart:', e);
                }
                this.codingBugFixingChart = undefined;
            }

            const ctx = this.codingBugFixingChartCanvas.nativeElement.getContext('2d');
            if (!ctx) {
                console.warn('Could not get coding/bugfixing chart context');
                return;
            }

            this.codingBugFixingChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Coding',
                            data: codingData,
                            backgroundColor: '#66BB6A',
                            borderColor: '#4CAF50',
                            borderWidth: 1
                        },
                        {
                            label: 'Bug Fixing',
                            data: bugFixingData,
                            backgroundColor: '#FFA726',
                            borderColor: '#FF9800',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 500
                    },
                    onClick: (event, activeElements) => {
                        if (activeElements.length > 0) {
                            const index = activeElements[0].index;
                            const userName = labels[index];
                            if (userName) {
                                this.openEmailModal(userName, 'coding-bugfixing');
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Coding vs Bug Fixing / User',
                            font: { size: 18, weight: 'bold' }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Hours' }
                        }
                    }
                }
            });
            console.log('Coding/BugFixing chart created successfully');
        } catch (error) {
            console.error('Error creating coding/bugfixing chart:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to create coding/bugfixing chart'
            });
        }
    }

    private aggregateActivityByUser(): { userName: string; coding: number; bugFixing: number }[] {
        const userMap = new Map<string, { coding: number; bugFixing: number }>();

        const filteredItems = this.kpiFilters.areaPath.length > 0
            ? this.workItemsDetails.filter(item => this.kpiFilters.areaPath.includes(item.areaPath))
            : this.workItemsDetails;

        filteredItems.forEach(item => {
            const userName = item.assignedTo || 'Unassigned';
            const activity = (item.activity || '').toLowerCase();
            const subActivity = (item.subActivity || '').toLowerCase();
            const hours = item.completedWork || 0;

            if (!userMap.has(userName)) {
                userMap.set(userName, { coding: 0, bugFixing: 0 });
            }

            const userStats = userMap.get(userName)!;
            
            if (subActivity.includes('bug fixing') || subActivity.includes('bug') || 
                activity.includes('bug') || activity.includes('fix')) {
                userStats.bugFixing += hours;
            } else if (subActivity.includes('coding') || subActivity.includes('development') || 
                       activity.includes('coding') || activity.includes('development')) {
                userStats.coding += hours;
            }
        });

        return Array.from(userMap.entries())
            .map(([userName, stats]) => ({ userName, ...stats }))
            .filter(stat => stat.coding > 0 || stat.bugFixing > 0)
            .sort((a, b) => (b.coding + b.bugFixing) - (a.coding + a.bugFixing));
    }

    createOrUpdateReworkChart(): void {
        try {
            if (!this.reworkChartCanvas || this.workItemsDetails.length === 0) {
                console.log('Rework chart: Canvas or data not ready');
                return;
            }

            const userStats = this.calculateReworkPercentageByUser();
            const labels = userStats.map(stat => stat.userName);
            const reworkPercentages = userStats.map(stat => stat.reworkPercentage);

            if (this.reworkChart) {
                try {
                    this.reworkChart.destroy();
                } catch (e) {
                    console.warn('Error destroying rework chart:', e);
                }
                this.reworkChart = undefined;
            }

            const ctx = this.reworkChartCanvas.nativeElement.getContext('2d');
            if (!ctx) {
                console.warn('Could not get rework chart context');
                return;
            }

            this.reworkChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Rework %',
                            data: reworkPercentages,
                            backgroundColor: '#B71C1C',
                            borderColor: '#8B0000',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 500
                    },
                    onClick: (event, activeElements) => {
                        if (activeElements.length > 0) {
                            const index = activeElements[0].index;
                            const userName = labels[index];
                            if (userName) {
                                this.openEmailModal(userName, 'rework');
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Rework % / User',
                            font: { size: 18, weight: 'bold' }
                        },
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });
            console.log('Rework chart created successfully');
        } catch (error) {
            console.error('Error creating rework chart:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to create rework chart'
            });
        }
    }

    private calculateReworkPercentageByUser(): { userName: string; reworkPercentage: number }[] {
        const userMap = new Map<string, { coding: number; bugFixing: number }>();

        const filteredItems = this.kpiFilters.areaPath.length > 0
            ? this.workItemsDetails.filter(item => this.kpiFilters.areaPath.includes(item.areaPath))
            : this.workItemsDetails;

        filteredItems.forEach(item => {
            const userName = item.assignedTo || 'Unassigned';
            const activity = (item.activity || '').toLowerCase();
            const subActivity = (item.subActivity || '').toLowerCase();
            const hours = item.completedWork || 0;

            if (!userMap.has(userName)) {
                userMap.set(userName, { coding: 0, bugFixing: 0 });
            }

            const userStats = userMap.get(userName)!;
            
            if (subActivity.includes('bug fixing') || activity.includes('bug')) {
                userStats.bugFixing += hours;
            } else if (subActivity.includes('coding') || activity.includes('development')) {
                userStats.coding += hours;
            }
        });

        return Array.from(userMap.entries())
            .map(([userName, stats]) => ({
                userName,
                reworkPercentage: stats.coding > 0 ? (stats.bugFixing / stats.coding) * 100 : 0
            }))
            .filter(stat => stat.reworkPercentage > 0)
            .sort((a, b) => b.reworkPercentage - a.reworkPercentage);
    }

    createOrUpdateSubActivityChart(): void {
        try {
            if (!this.subActivityChartCanvas || this.workItemsDetails.length === 0) {
                console.log('SubActivity chart: Canvas or data not ready');
                return;
            }

            const subActivityStats = this.aggregateBySubActivity();
            const labels = subActivityStats.map(stat => stat.subActivity);
            const estimateData = subActivityStats.map(stat => stat.totalEstimate);
            const actualData = subActivityStats.map(stat => stat.totalActual);

            if (this.subActivityChart) {
                try {
                    this.subActivityChart.destroy();
                } catch (e) {
                    console.warn('Error destroying subactivity chart:', e);
                }
                this.subActivityChart = undefined;
            }

            const ctx = this.subActivityChartCanvas.nativeElement.getContext('2d');
            if (!ctx) {
                console.warn('Could not get subactivity chart context');
                return;
            }

            this.subActivityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Estimate',
                        data: estimateData,
                        backgroundColor: '#EF5350',
                        borderColor: '#E53935',
                        borderWidth: 1
                    },
                    {
                        label: 'Actual',
                        data: actualData,
                        backgroundColor: '#FFAB91',
                        borderColor: '#FF8A65',
                        borderWidth: 1
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
                        text: 'Sub Activity - Estimate vs. Actual',
                        font: { size: 18, weight: 'bold' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Hours' }
                    }
                }
            }
        });
            console.log('SubActivity chart created successfully');
        } catch (error) {
            console.error('Error creating subactivity chart:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to create subactivity chart'
            });
        }
    }

    private aggregateBySubActivity(): { subActivity: string; totalEstimate: number; totalActual: number }[] {
        const subActivityMap = new Map<string, { totalEstimate: number; totalActual: number }>();

        const filteredItems = this.kpiFilters.areaPath.length > 0
            ? this.workItemsDetails.filter(item => this.kpiFilters.areaPath.includes(item.areaPath))
            : this.workItemsDetails;

        filteredItems.forEach(item => {
            const subActivity = item.subActivity || 'Unspecified';
            const estimate = item.originalEstimate || 0;
            const actual = item.completedWork || 0;

            if (subActivityMap.has(subActivity)) {
                const existing = subActivityMap.get(subActivity)!;
                existing.totalEstimate += estimate;
                existing.totalActual += actual;
            } else {
                subActivityMap.set(subActivity, { totalEstimate: estimate, totalActual: actual });
            }
        });

        return Array.from(subActivityMap.entries())
            .map(([subActivity, stats]) => ({ subActivity, ...stats }))
            .filter(stat => stat.totalEstimate > 0 || stat.totalActual > 0)
            .sort((a, b) => b.totalActual - a.totalActual);
    }

    getUniqueAreaPaths(): string[] {
        const areaPaths = this.workItemsDetails
            .map(item => item.areaPath)
            .filter(path => path && path.trim() !== '') as string[];
        return [...new Set(areaPaths)].sort();
    }

    toggleKpiFilterSelection(value: string): void {
        const index = this.kpiFilters.areaPath.indexOf(value);
        if (index === -1) {
            this.kpiFilters.areaPath.push(value);
        } else {
            this.kpiFilters.areaPath.splice(index, 1);
        }
        this.calculateKPIMetrics();
        this.createOrUpdateChart();
        this.createOrUpdateCodingBugFixingChart();
        this.createOrUpdateReworkChart();
        this.createOrUpdateSubActivityChart();
    }

    isKpiFilterSelected(value: string): boolean {
        return this.kpiFilters.areaPath.includes(value);
    }

    clearKpiFilters(): void {
        this.kpiFilters.areaPath = [];
        this.calculateKPIMetrics();
        this.createOrUpdateChart();
        this.createOrUpdateCodingBugFixingChart();
        this.createOrUpdateReworkChart();
        this.createOrUpdateSubActivityChart();
    }

    formatKpiValue(value: number): string {
        if (value >= 1000) {
            return (value / 1000).toFixed(2) + 'K';
        }
        return value.toFixed(2);
    }

    openEmailModal(userName: string, chartType: 'estimate-actual' | 'coding-bugfixing' | 'rework'): void {
        const users = this.getAvailableUsers();
        if (!users.length) {
            this.messageService.add({
                severity: 'warn',
                summary: 'No Recipients',
                detail: 'No team members with email addresses were found.'
            });
            return;
        }

        this.emailModalUsers = users;
        this.emailModalData = {
            recipientNames: userName ? [userName] : [],
            subject: this.getEmailSubject(chartType, !!userName),
            projectName: this.selectedProjectName,
            data: this.getEmailDataMarkers(chartType)
        };
        this.emailModalVisible = true;
    }

    openEmailModalWithoutUser(chartType: 'estimate-actual' | 'coding-bugfixing' | 'rework'): void {
        this.openEmailModal('', chartType);
    }

    closeEmailModal(): void {
        this.emailModalVisible = false;
        this.emailModalData = null;
        this.emailModalUsers = [];
    }

    handleEmailSend(emailData: EmailData): void {
        if (!emailData.recipientNames.length) {
            this.messageService.add({
                severity: 'warn',
                summary: 'No Recipients',
                detail: 'Please select at least one recipient.'
            });
            return;
        }

        const requests = emailData.recipientNames
            .map((recipient) => {
                const stats = this.getUserStats(recipient);
                const email = this.getUserEmail(recipient);

                if (!stats || !email) {
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Missing Data',
                        detail: `Skipping ${recipient}: missing stats or email address.`
                    });
                    return null;
                }

                const payload = {
                    to: [email],
                    cc: emailData.ccEmails ?? [],
                    subject: emailData.subject,
                    projectName: emailData.projectName ?? this.selectedProjectName,
                    recipientName: recipient,
                    templateId: emailData.templateId,
                    additionalMessage: emailData.additionalMessage,
                    data: this.buildEmailPayloadData(stats, emailData.data)
                };

                return this.http.post(`${environment.apiUrl}/reports/send-effort-email`, payload);
            })
            .filter((request): request is Observable<any> => request !== null);

        if (!requests.length) {
            return;
        }

        forkJoin(requests).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Emails Sent',
                    detail: `${requests.length} email(s) sent successfully.`
                });
                this.closeEmailModal();
            },
            error: (error) => {
                console.error('Error sending emails', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to send emails. Please try again.'
                });
            }
        });
    }

    private getEmailSubject(chartType: 'estimate-actual' | 'coding-bugfixing' | 'rework', personalized: boolean): string {
        switch (chartType) {
            case 'estimate-actual':
                return personalized ? 'Your Effort Report: Estimate vs Actual Hours' : 'Effort Report: Estimate vs Actual Hours';
            case 'coding-bugfixing':
                return personalized ? 'Your Effort Report: Coding vs Bug Fixing' : 'Effort Report: Coding vs Bug Fixing';
            case 'rework':
            default:
                return personalized ? 'Your Rework Report' : 'Rework Report';
        }
    }

    private getEmailDataMarkers(chartType: 'estimate-actual' | 'coding-bugfixing' | 'rework'): EmailData['data'] {
        switch (chartType) {
            case 'estimate-actual':
                return { estimateHours: 0, actualHours: 0 };
            case 'coding-bugfixing':
                return { codingHours: 0, bugFixingHours: 0 };
            case 'rework':
            default:
                return { codingHours: 0, bugFixingHours: 0, reworkPercentage: 0 };
        }
    }

    private getAvailableUsers(): UserWithEmail[] {
        const filteredItems = this.kpiFilters.areaPath.length > 0
            ? this.workItemsDetails.filter((item) => this.kpiFilters.areaPath.includes(item.areaPath))
            : this.workItemsDetails;

        const map = new Map<string, string>();
        filteredItems.forEach((item) => {
            if (item.assignedTo && item.assignedTo !== 'Unassigned' && item.assignedToEmail) {
                map.set(item.assignedTo, item.assignedToEmail);
            }
        });

        return Array.from(map.entries()).map(([name, email]) => ({ name, email })).sort((a, b) => a.name.localeCompare(b.name));
    }

    private getUserEmail(userName: string): string | null {
        const user = this.emailModalUsers.find((u) => u.name === userName);
        return user?.email ?? null;
    }

    getUserStats(userName: string): UserStats | null {
        const sourceItems = this.kpiFilters.areaPath.length > 0
            ? this.workItemsDetails.filter((item) => this.kpiFilters.areaPath.includes(item.areaPath))
            : this.workItemsDetails;

        const items = sourceItems.filter((item) => item.assignedTo === userName);
        if (!items.length) {
            return null;
        }

        let estimate = 0;
        let actual = 0;
        let coding = 0;
        let bugFixing = 0;

        items.forEach((item) => {
            const activity = (item.activity || '').toLowerCase();
            const subActivity = (item.subActivity || '').toLowerCase();
            const completedWork = item.completedWork || 0;

            estimate += item.originalEstimate || 0;
            actual += completedWork;

            if (subActivity.includes('bug') || subActivity.includes('fix') || activity.includes('bug')) {
                bugFixing += completedWork;
            }

            if (subActivity.includes('coding') || subActivity.includes('development') || activity.includes('coding') || activity.includes('development')) {
                coding += completedWork;
            }
        });

        const rework = coding > 0 ? (bugFixing / coding) * 100 : 0;

        return {
            estimate,
            actual,
            coding,
            bugFixing,
            rework
        };
    }

    private buildEmailPayloadData(stats: UserStats, markers: EmailData['data']): Record<string, number> {
        const payload: Record<string, number> = {};

        if (Object.prototype.hasOwnProperty.call(markers, 'estimateHours')) {
            payload['estimateHours'] = stats.estimate;
        }
        if (Object.prototype.hasOwnProperty.call(markers, 'actualHours')) {
            payload['actualHours'] = stats.actual;
        }
        if (Object.prototype.hasOwnProperty.call(markers, 'codingHours')) {
            payload['codingHours'] = stats.coding;
        }
        if (Object.prototype.hasOwnProperty.call(markers, 'bugFixingHours')) {
            payload['bugFixingHours'] = stats.bugFixing;
        }
        if (Object.prototype.hasOwnProperty.call(markers, 'reworkPercentage')) {
            payload['reworkPercentage'] = stats.rework;
        }

        return payload;
    }

    exportToCSV(): void {
        if (this.workItemsDetails.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'No data to export'
            });
            return;
        }

        const headers = [
            'ID', 'Title', 'State', 'Assigned To', 'Area Path',
            'Activity', 'Sub Activity', 'Original Estimate', 'Completed Work'
        ];
        const rows = this.filteredWorkItems.map(wi => [
            wi.id,
            `"${wi.title.replace(/"/g, '""')}"`,
            wi.state,
            wi.assignedTo,
            `"${wi.areaPath.replace(/"/g, '""')}"`,
            wi.activity || '',
            wi.subActivity || '',
            wi.originalEstimate || 0,
            wi.completedWork || 0
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `project-kpi-${this.selectedProjectName}-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'KPI data exported successfully'
        });
    }

    ngOnDestroy(): void {
        // Destroy all chart instances to prevent memory leaks
        if (this.chart) {
            try {
                this.chart.destroy();
            } catch (e) {
                console.warn('Error destroying estimate/actual chart on destroy:', e);
            }
        }
        if (this.codingBugFixingChart) {
            try {
                this.codingBugFixingChart.destroy();
            } catch (e) {
                console.warn('Error destroying coding/bugfixing chart on destroy:', e);
            }
        }
        if (this.reworkChart) {
            try {
                this.reworkChart.destroy();
            } catch (e) {
                console.warn('Error destroying rework chart on destroy:', e);
            }
        }
        if (this.subActivityChart) {
            try {
                this.subActivityChart.destroy();
            } catch (e) {
                console.warn('Error destroying subactivity chart on destroy:', e);
            }
        }
    }
}
