import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProjectService } from '../../core/services/project.service';
import { UserStoryService } from '../../core/services/user-story.service';
import { TeamService } from '../../core/services/team.service';
import { environment } from '../../../environments/environment';
import { Project, UserStory, TeamMember } from '../../core/models';

interface TaskTemplate {
  taskTemplateId: number;
  title: string;
  description?: string;
  activity: string;
  subActivity: string;
  originalEstimate: number;
  isActive: boolean;
  assignedTo?: string;
  isEditing?: boolean;
}

interface UserStoryWithTasks extends UserStory {
  draggedTasks: TaskTemplate[];
  importing?: boolean;
  expanded?: boolean;
}

interface SubActivity {
  subActivityId: number;
  subActivityName: string;
}

@Component({
  selector: 'app-task-import',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    SelectModule,
    InputTextModule,
    TextareaModule,
    TagModule,
    ToastModule,
    AutoCompleteModule,
    InputNumberModule
  ],
  providers: [MessageService],
  templateUrl: './task-import.component.html',
  styleUrls: ['./task-import.component.scss']
})
export class TaskImportComponent implements OnInit {
  projects: Project[] = [];
  selectedProjectId: number | undefined;
  selectedProject: Project | null = null;
  
  areaPaths: { label: string; value: string }[] = [];
  selectedAreaPath: string = '';
  
  allUserStories: UserStoryWithTasks[] = [];
  userStories: UserStoryWithTasks[] = [];
  taskTemplates: TaskTemplate[] = [];
  teamMembers: TeamMember[] = [];
  
  loading = false;
  syncing = false;
  
  draggedTask: TaskTemplate | null = null;
  
  // For autocomplete team member search
  filteredTeamMembers: { [taskKey: string]: TeamMember[] } = {};
  
  // For sub-activity dropdowns
  subActivities: { [activity: string]: SubActivity[] } = {};
  loadingSubActivities: { [activity: string]: boolean } = {};

  constructor(
    private projectService: ProjectService,
    private userStoryService: UserStoryService,
    private teamService: TeamService,
    private http: HttpClient,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadProjects();
    this.loadTaskTemplates();
    this.loadTeamMembers();
  }

  loadTeamMembers(): void {
    this.teamService.getAllTeamMembers().subscribe({
      next: (members) => {
        this.teamMembers = members;
      },
      error: (err) => {
        console.error('Error loading team members:', err);
      }
    });
  }

  searchTeamMembers(event: any, taskKey: string): void {
    const query = event.query?.toLowerCase() || '';
    this.filteredTeamMembers[taskKey] = this.teamMembers.filter(member =>
      member.fullName.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      member.title?.toLowerCase().includes(query)
    );
  }

  onTeamMemberSelect(event: any, task: TaskTemplate): void {
    // Extract email string from the selected member object
    if (event.value && event.value.email) {
      task.assignedTo = event.value.email;
    } else if (typeof event === 'string') {
      task.assignedTo = event;
    }
  }

  getTaskKey(storyId: number, taskIndex: number): string {
    return `${storyId}_${taskIndex}`;
  }

  loadProjects(): void {
    this.loading = true;
    this.projectService.getAllProjects({ isActive: true, hasDevOps: true }).subscribe({
      next: (projects) => {
        this.projects = projects;
        this.loading = false;
        
        if (projects.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'Info',
            detail: 'No active projects with DevOps integration found'
          });
        }
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

  onProjectChange(): void {
    if (!this.selectedProjectId) {
      this.selectedProject = null;
      this.areaPaths = [];
      this.selectedAreaPath = '';
      this.userStories = [];
      return;
    }

    this.selectedProject = this.projects.find(p => p.projectId === this.selectedProjectId) || null;
    this.areaPaths = [];
    this.selectedAreaPath = '';
    this.userStories = [];
  }

  syncUserStories(): void {
    if (!this.selectedProject) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please select a project first'
      });
      return;
    }

    this.syncing = true;

    this.userStoryService.getUserStoriesByProject(this.selectedProject.projectId!).subscribe({
      next: (stories) => {
        this.allUserStories = stories.map((story: UserStory) => ({
          ...story,
          draggedTasks: [],
          expanded: false
        }));

        const paths = stories
          .map((story: UserStory) => story.areaPath)
          .filter((path) => path && path.trim() !== '');
        
        const uniquePaths = [...new Set(paths)].sort() as string[];
        this.areaPaths = uniquePaths.map(path => ({ label: path, value: path }));

        this.syncing = false;
        
        if (stories.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'Info',
            detail: 'No user stories found for this project'
          });
        } else if (this.areaPaths.length === 0) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Warning',
            detail: `Loaded ${stories.length} user stories, but no area paths found`
          });
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Loaded ${stories.length} user stories with ${this.areaPaths.length} area paths`
          });
        }
      },
      error: (err) => {
        console.error('Error syncing user stories:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to sync user stories'
        });
        this.syncing = false;
      }
    });
  }

  onAreaPathChange(): void {
    if (!this.selectedAreaPath) {
      this.userStories = [];
      return;
    }

    this.userStories = this.allUserStories.filter(
      story => story.areaPath === this.selectedAreaPath
    );
    
    if (this.userStories.length === 0) {
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'No user stories found for this area path'
      });
    }
  }

  loadTaskTemplates(): void {
    this.http.get<any>(`${environment.apiUrl}/task-templates`).subscribe({
      next: (response) => {
        const templates = response.data || [];
        this.taskTemplates = templates.map((t: any) => ({
          taskTemplateId: t.TaskTemplateId || t.taskTemplateId,
          title: t.Title || t.title,
          description: t.Description || t.description,
          activity: t.Activity || t.activity,
          subActivity: t.SubActivity || t.subActivity,
          originalEstimate: t.OriginalEstimate || t.originalEstimate,
          isActive: t.IsActive !== undefined ? t.IsActive : t.isActive
        }));
      },
      error: (err) => {
        console.error('Error loading task templates:', err);
      }
    });
  }

  onDragStart(event: DragEvent, task: TaskTemplate): void {
    this.draggedTask = task;
    event.dataTransfer!.effectAllowed = 'copy';
    event.dataTransfer!.setData('text/plain', task.taskTemplateId.toString());
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
  }

  onDrop(event: DragEvent, userStory: UserStoryWithTasks): void {
    event.preventDefault();
    
    if (this.draggedTask) {
      userStory.draggedTasks.push({ ...this.draggedTask });
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Task added to "${userStory.title}"`
      });
      
      this.draggedTask = null;
    }
  }

  removeTask(userStory: UserStoryWithTasks, taskIndex: number): void {
    const taskKey = this.getTaskKey(userStory.userStoryId!, taskIndex);
    delete this.filteredTeamMembers[taskKey];
    userStory.draggedTasks.splice(taskIndex, 1);
  }

  importTasks(userStory: UserStoryWithTasks): void {
    if (userStory.draggedTasks.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'No tasks to import'
      });
      return;
    }

    if (!this.selectedProject) return;

    userStory.importing = true;

    const importPayload = {
      projectName: this.selectedProject.projectName,
      userStoryId: userStory.devOpsWorkItemId,
      tasks: userStory.draggedTasks.map(task => ({
        title: task.title,
        description: task.description || '',
        activity: task.activity,
        subActivity: task.subActivity,
        originalEstimate: task.originalEstimate,
        assignedTo: task.assignedTo,
        areaPath: userStory.areaPath,
        iterationPath: userStory.iterationPath
      }))
    };

    this.http.post<any>(`${environment.apiUrl}/devops/import-tasks`, importPayload).subscribe({
      next: (response) => {
        userStory.importing = false;
        
        if (response.data.errors && response.data.errors.length > 0) {
          if (response.data.successCount > 0) {
            this.messageService.add({
              severity: 'success',
              summary: 'Partial Success',
              detail: `Imported ${response.data.successCount} of ${response.data.successCount + response.data.failedCount} tasks`
            });
          }
          
          response.data.errors.forEach((error: any) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Import Error',
              detail: `${error.title}: ${error.error}`,
              life: 5000
            });
          });
          
          if (response.data.successCount > 0 && response.data.failedCount === 0) {
            userStory.draggedTasks = [];
          }
        } else {
          userStory.draggedTasks = [];
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Imported ${response.data.successCount} tasks successfully`
          });
        }
      },
      error: (err) => {
        console.error('Error importing tasks:', err);
        userStory.importing = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.error || 'Failed to import tasks'
        });
      }
    });
  }

  importSingleTask(userStory: UserStoryWithTasks, task: TaskTemplate, taskIndex: number): void {
    if (!this.selectedProject) return;

    const importPayload = {
      projectName: this.selectedProject.projectName,
      userStoryId: userStory.devOpsWorkItemId,
      tasks: [{
        title: task.title,
        description: task.description || '',
        activity: task.activity,
        subActivity: task.subActivity,
        originalEstimate: task.originalEstimate,
        assignedTo: task.assignedTo,
        areaPath: userStory.areaPath,
        iterationPath: userStory.iterationPath
      }]
    };

    this.http.post<any>(`${environment.apiUrl}/devops/import-tasks`, importPayload).subscribe({
      next: (response) => {
        if (response.data.errors && response.data.errors.length > 0) {
          const error = response.data.errors[0];
          this.messageService.add({
            severity: 'error',
            summary: 'Import Error',
            detail: `${error.title}: ${error.error}`
          });
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Task imported successfully'
          });
          userStory.draggedTasks.splice(taskIndex, 1);
        }
      },
      error: (err) => {
        console.error('Error importing task:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.error || 'Failed to import task'
        });
      }
    });
  }

  toggleStory(story: UserStoryWithTasks): void {
    story.expanded = !story.expanded;
  }

  loadSubActivitiesForActivity(activity: string): void {
    if (!activity || this.subActivities[activity] || this.loadingSubActivities[activity]) {
      return;
    }

    this.loadingSubActivities[activity] = true;
    this.http.get<any>(`${environment.apiUrl}/subactivities/activity/${encodeURIComponent(activity)}`).subscribe({
      next: (response) => {
        this.subActivities[activity] = response.data || [];
        this.loadingSubActivities[activity] = false;
      },
      error: (err) => {
        console.error(`Error loading sub-activities for ${activity}:`, err);
        this.loadingSubActivities[activity] = false;
        this.subActivities[activity] = [];
      }
    });
  }

  getSubActivitiesForActivity(activity: string): SubActivity[] {
    if (!activity) return [];
    
    if (!this.subActivities[activity] && !this.loadingSubActivities[activity]) {
      this.loadSubActivitiesForActivity(activity);
    }
    
    return this.subActivities[activity] || [];
  }

  isTaskValid(task: TaskTemplate): boolean {
    return !!(
      task.title && 
      task.title.trim() !== '' && 
      task.activity && 
      task.activity.trim() !== '' && 
      task.subActivity && 
      task.subActivity.trim() !== '' &&
      task.assignedTo &&
      typeof task.assignedTo === 'string' &&
      task.assignedTo.trim() !== '' &&
      task.originalEstimate !== undefined &&
      task.originalEstimate !== null &&
      task.originalEstimate > 0
    );
  }

  canImportUserStory(userStory: UserStoryWithTasks): boolean {
    return userStory.draggedTasks.length > 0 && 
           userStory.draggedTasks.every(task => this.isTaskValid(task));
  }

  getTaskValidationErrors(task: TaskTemplate): string[] {
    const errors: string[] = [];
    if (!task.title || task.title.trim() === '') errors.push('Title required');
    if (!task.activity || task.activity.trim() === '') errors.push('Activity required');
    if (!task.subActivity || task.subActivity.trim() === '') errors.push('Sub Activity required');
    if (!task.assignedTo || typeof task.assignedTo !== 'string' || task.assignedTo.trim() === '') errors.push('Assigned To required');
    if (!task.originalEstimate || task.originalEstimate <= 0) errors.push('Estimate required');
    return errors;
  }

  getStatusSeverity(status: string): string {
    switch (status?.toLowerCase()) {
      case 'new': return 'info';
      case 'active': return 'primary';
      case 'resolved': return 'success';
      case 'closed': return 'secondary';
      default: return 'contrast';
    }
  }

  getPrioritySeverity(priority: string | number | undefined): string {
    const normalized = this.normalizePriority(priority);
    switch (normalized) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'contrast';
    }
  }

  getPriorityLabel(priority: string | number | undefined): string {
    const normalized = this.normalizePriority(priority);
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  private normalizePriority(priority: string | number | undefined): string {
    if (priority === undefined || priority === null) return 'medium';
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
}
