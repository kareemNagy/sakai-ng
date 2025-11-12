import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { UserStoryService } from '../../core/services/user-story.service';
import { ProjectService } from '../../core/services/project.service';
import { UserStory, Project } from '../../core/models';

@Component({
  selector: 'app-user-stories',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TableModule,
    CardModule,
    ButtonModule,
    SelectModule,
    InputTextModule,
    TagModule,
    DialogModule,
    ToastModule,
    SkeletonModule
  ],
  providers: [MessageService],
  templateUrl: './user-stories.component.html',
  styleUrls: ['./user-stories.component.scss']
})
export class UserStoriesComponent implements OnInit {
  userStories: UserStory[] = [];
  filteredUserStories: UserStory[] = [];
  projects: Project[] = [];
  
  loading = false;
  selectedProjectId: number | undefined = undefined;
  searchQuery = '';
  filterStatus = 'All';
  filterPriority = 'All';
  
  showDetailModal = false;
  selectedUserStory: UserStory | null = null;

  statusOptions = [
    { label: 'All Statuses', value: 'All' },
    { label: 'New', value: 'New' },
    { label: 'Active', value: 'Active' },
    { label: 'Resolved', value: 'Resolved' },
    { label: 'Closed', value: 'Closed' }
  ];

  priorityOptions = [
    { label: 'All Priorities', value: 'All' },
    { label: 'Critical', value: 'Critical' },
    { label: 'High', value: 'High' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Low', value: 'Low' }
  ];

  constructor(
    private userStoryService: UserStoryService,
    private projectService: ProjectService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.projectService.getAllProjects().subscribe({
      next: (projects) => {
        this.projects = projects.filter(p => p.isActive).map(p => ({
          ...p,
          label: p.projectName,
          value: p.projectId
        }));
      },
      error: (err) => {
        console.error('Error loading projects:', err);
      }
    });
  }

  loadUserStories(): void {
    if (!this.selectedProjectId) {
      this.userStories = [];
      this.filteredUserStories = [];
      this.loading = false;
      return;
    }

    this.loading = true;
    
    this.userStoryService.getUserStoriesByProject(this.selectedProjectId).subscribe({
      next: (stories) => {
        this.userStories = stories;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading user stories:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load user stories'
        });
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredUserStories = this.userStories.filter(story => {
      const matchesSearch = !this.searchQuery ||
        story.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        story.description?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        story.assignedTo?.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesStatus = this.filterStatus === 'All' || story.status === this.filterStatus;
      
      const normalizedPriority = this.normalizePriority(story.priority);
      const matchesPriority = this.filterPriority === 'All' || 
        normalizedPriority === this.filterPriority.toLowerCase();

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onProjectChange(): void {
    this.loadUserStories();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  viewDetails(story: UserStory): void {
    this.selectedUserStory = story;
    this.showDetailModal = true;
  }

  closeModal(): void {
    this.showDetailModal = false;
    this.selectedUserStory = null;
  }

  getProjectName(projectId: number): string {
    const project = this.projects.find(p => p.projectId === projectId);
    return project ? project.projectName : 'Unknown Project';
  }

  getStatusSeverity(status: string): string {
    switch (status?.toLowerCase()) {
      case 'new': return 'info';
      case 'active': return 'primary';
      case 'resolved': return 'success';
      case 'closed': return 'secondary';
      default: return 'secondary';
    }
  }

  private normalizePriority(priority: string | number | undefined): string {
    if (priority === undefined || priority === null) {
      return 'medium';
    }
    
    if (typeof priority === 'number') {
      switch (priority) {
        case 1: return 'critical';
        case 2: return 'high';
        case 3: return 'medium';
        case 4: return 'low';
        default: return 'medium';
      }
    }
    
    return priority.toLowerCase();
  }

  getPrioritySeverity(priority: string | number | undefined): string {
    const normalizedPriority = this.normalizePriority(priority);
    switch (normalizedPriority) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'secondary';
    }
  }

  getPriorityLabel(priority: string | number | undefined): string {
    const normalizedPriority = this.normalizePriority(priority);
    return normalizedPriority.charAt(0).toUpperCase() + normalizedPriority.slice(1);
  }

  getTotalStoryPoints(): number {
    return this.filteredUserStories.reduce((sum, s) => sum + (s.storyPoints || 0), 0);
  }

  getStoriesCountByStatus(status: string): number {
    return this.filteredUserStories.filter(s => s.status?.toLowerCase() === status.toLowerCase()).length;
  }

  openDevOpsLink(url: string | undefined): void {
    if (url) {
      window.open(url, '_blank');
    }
  }
}
