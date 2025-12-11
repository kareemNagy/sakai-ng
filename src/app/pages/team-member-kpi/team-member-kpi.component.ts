import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TeamService } from '../../core/services/team.service';
import { TeamMember } from '../../core/models';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

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
  projectName: string;
  ProjectId?: number;
  DatabaseProjectName?: string;
}

interface TeamMemberKpiData {
  teamMember: {
    teamMemberId: number;
    fullName: string;
    title: string;
    email: string;
    isActive: boolean;
  };
  metrics: {
    totalTasks: number;
    completedTasks: number;
    totalEstimate: number;
    totalActual: number;
    deviation: number;
    completionRate: number;
    activeProjects: number;
    totalCoding: number;
    totalBugFixing: number;
  };
  projectBreakdown: Array<{
    projectId: number;
    projectName: string;
    taskCount: number;
    totalEstimate: number;
    totalActual: number;
  }>;
  activityBreakdown: Array<{
    activity: string;
    subActivity: string;
    count: number;
    estimate: number;
    actual: number;
  }>;
  tasks: WorkItem[];
}

@Component({
  selector: 'app-team-member-kpi',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    ToastModule,
    TagModule,
    InputTextModule
  ],
  providers: [MessageService],
  templateUrl: './team-member-kpi.component.html',
  styleUrls: ['./team-member-kpi.component.scss']
})
export class TeamMemberKpiComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('estimateActualChart') estimateActualChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('codingBugFixingChart') codingBugFixingChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('projectDistributionChart') projectDistributionChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('activityBreakdownChart') activityBreakdownChartCanvas!: ElementRef<HTMLCanvasElement>;

  private estimateActualChart?: Chart<any>;
  private codingBugFixingChart?: Chart<any>;
  private projectDistributionChart?: Chart<any>;
  private activityBreakdownChart?: Chart<any>;

  // View state
  viewMode: 'list' | 'detail' = 'list';
  
  // List view data
  teamMembers: TeamMember[] = [];
  loading = false;
  
  // Detail view data
  selectedTeamMember: TeamMember | null = null;
  kpiData: TeamMemberKpiData | null = null;
  loadingKpi = false;
  
  // Filters
  searchTerm = '';
  filteredTasks: WorkItem[] = [];
  
  constructor(
    private teamService: TeamService,
    private messageService: MessageService
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.loadTeamMembers();
  }

  ngAfterViewInit(): void {
    // Charts will be created after KPI data is loaded
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  loadTeamMembers(): void {
    this.loading = true;
    this.teamService.getAllTeamMembers().subscribe({
      next: (members) => {
        this.teamMembers = members.filter(m => m.isActive);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading team members:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load team members'
        });
        this.loading = false;
      }
    });
  }

  viewTeamMemberKpi(member: TeamMember): void {
    this.selectedTeamMember = member;
    this.viewMode = 'detail';
    this.fetchTeamMemberKpi(member.teamMemberId);
  }

  backToList(): void {
    this.viewMode = 'list';
    this.selectedTeamMember = null;
    this.kpiData = null;
    this.destroyCharts();
  }

  fetchTeamMemberKpi(teamMemberId: number): void {
    this.loadingKpi = true;
    this.teamService.getTeamMemberKpi(teamMemberId).subscribe({
      next: (data: TeamMemberKpiData) => {
        this.kpiData = data;
        this.filteredTasks = data.tasks || [];
        this.loadingKpi = false;
        
        // Create charts after data is loaded
        setTimeout(() => {
          this.createCharts();
        }, 100);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'KPI data loaded successfully'
        });
      },
      error: (err) => {
        console.error('Error loading team member KPI:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load KPI data'
        });
        this.loadingKpi = false;
      }
    });
  }

  createCharts(): void {
    this.destroyCharts();
    
    if (!this.kpiData) return;

    this.createEstimateActualChart();
    this.createCodingBugFixingChart();
    this.createProjectDistributionChart();
    this.createActivityBreakdownChart();
  }

  createEstimateActualChart(): void {
    if (!this.estimateActualChartCanvas || !this.kpiData) return;

    const ctx = this.estimateActualChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.estimateActualChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Estimate', 'Actual'],
        datasets: [{
          label: 'Hours',
          data: [this.kpiData.metrics.totalEstimate, this.kpiData.metrics.totalActual],
          backgroundColor: ['#3B82F6', '#10B981'],
          borderColor: ['#2563EB', '#059669'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Estimate vs Actual Hours'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  createCodingBugFixingChart(): void {
    if (!this.codingBugFixingChartCanvas || !this.kpiData) return;

    const ctx = this.codingBugFixingChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.codingBugFixingChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Coding', 'Bug Fixing'],
        datasets: [{
          data: [this.kpiData.metrics.totalCoding, this.kpiData.metrics.totalBugFixing],
          backgroundColor: ['#8B5CF6', '#EF4444'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Coding vs Bug Fixing Hours'
          }
        }
      }
    });
  }

  createProjectDistributionChart(): void {
    if (!this.projectDistributionChartCanvas || !this.kpiData) return;

    const ctx = this.projectDistributionChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const projects = this.kpiData.projectBreakdown.slice(0, 10); // Top 10 projects

    this.projectDistributionChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: projects.map(p => p.projectName),
        datasets: [{
          data: projects.map(p => p.taskCount),
          backgroundColor: [
            '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
            '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          },
          title: {
            display: true,
            text: 'Task Distribution by Project'
          }
        }
      }
    });
  }

  createActivityBreakdownChart(): void {
    if (!this.activityBreakdownChartCanvas || !this.kpiData) return;

    const ctx = this.activityBreakdownChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const activities = this.kpiData.activityBreakdown.slice(0, 10); // Top 10 activities

    this.activityBreakdownChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: activities.map(a => `${a.activity} - ${a.subActivity}`),
        datasets: [{
          label: 'Actual Hours',
          data: activities.map(a => a.actual),
          backgroundColor: '#8B5CF6',
          borderColor: '#7C3AED',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Hours by Activity Type'
          }
        },
        scales: {
          x: {
            beginAtZero: true
          }
        }
      }
    });
  }

  destroyCharts(): void {
    if (this.estimateActualChart) {
      this.estimateActualChart.destroy();
      this.estimateActualChart = undefined;
    }
    if (this.codingBugFixingChart) {
      this.codingBugFixingChart.destroy();
      this.codingBugFixingChart = undefined;
    }
    if (this.projectDistributionChart) {
      this.projectDistributionChart.destroy();
      this.projectDistributionChart = undefined;
    }
    if (this.activityBreakdownChart) {
      this.activityBreakdownChart.destroy();
      this.activityBreakdownChart = undefined;
    }
  }

  applyTaskFilter(): void {
    if (!this.kpiData) return;
    
    const term = this.searchTerm.toLowerCase();
    this.filteredTasks = this.kpiData.tasks.filter(task =>
      task.title.toLowerCase().includes(term) ||
      task.projectName?.toLowerCase().includes(term) ||
      task.activity?.toLowerCase().includes(term) ||
      task.subActivity?.toLowerCase().includes(term)
    );
  }

  exportToCSV(): void {
    if (!this.kpiData) return;

    const csvData = this.filteredTasks.map(task => ({
      'Task ID': task.id,
      'Title': task.title,
      'Project': task.projectName || task.DatabaseProjectName || '',
      'Status': task.state,
      'Activity': task.activity,
      'Sub-Activity': task.subActivity,
      'Estimate (h)': task.originalEstimate || 0,
      'Actual (h)': task.completedWork || 0,
      'Area Path': task.areaPath
    }));

    const csv = this.convertToCSV(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${this.selectedTeamMember?.fullName}_KPI_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const escaped = ('' + row[header]).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  formatKpiValue(value: number): string {
    return value ? value.toFixed(2) : '0.00';
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status?.toLowerCase()) {
      case 'new': return 'info';
      case 'active': return 'info';
      case 'resolved': return 'success';
      case 'closed': return 'secondary';
      default: return 'contrast';
    }
  }
}
