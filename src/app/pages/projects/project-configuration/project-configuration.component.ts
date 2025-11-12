import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { EditorModule } from 'primeng/editor';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ProjectService } from '../../../core/services/project.service';
import { Project } from '../../../core/models';
@Component({
  selector: 'app-project-configuration',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    SelectModule,
    EditorModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './project-configuration.component.html',
  styleUrls: ['./project-configuration.component.scss']
})
export class ProjectConfigurationComponent implements OnInit {
  selectedProjectId: number | undefined;
  projects: Project[] = [];
  projectName: string = '';
  environmentConfig: string = '';
  loading = false;
  saving = false;
  configLoaded = false;
  isEditMode = false;

  constructor(
    private projectService: ProjectService,
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadProjects();
    
    // Check if project ID is in route params (path param)
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.selectedProjectId = +params['id'];
        this.loadProjectConfiguration();
      }
    });
    
    // Also check query params for backward compatibility
    this.route.queryParams.subscribe(params => {
      if (params['projectId'] && !this.selectedProjectId) {
        this.selectedProjectId = +params['projectId'];
        this.loadProjectConfiguration();
      }
    });
  }

  loadProjects(): void {
    this.loading = true;
    this.projectService.getAllProjects({ isActive: true }).subscribe({
      next: (projects) => {
        this.projects = projects;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading projects:', error);
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
    if (this.selectedProjectId) {
      // Navigate to project-specific configuration route
      this.router.navigate(['/project-hub', this.selectedProjectId]);
      this.loadProjectConfiguration();
      this.isEditMode = false; // Reset to preview mode when changing project
    }
  }

  loadProjectConfiguration(): void {
    if (!this.selectedProjectId) {
      return;
    }

    this.loading = true;
    this.configLoaded = false;
    
    this.projectService.getProjectConfiguration(this.selectedProjectId).subscribe({
      next: (data) => {
        this.projectName = data.projectName || '';
        this.environmentConfig = data.projectHubConfig || data.ProjectHubConfig || '';
        this.configLoaded = true;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading configuration:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load project configuration'
        });
        this.loading = false;
      }
    });
  }

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
  }

  saveConfiguration(): void {
    if (!this.selectedProjectId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please select a project first'
      });
      return;
    }

    this.saving = true;
    
    this.projectService.updateProjectConfiguration(this.selectedProjectId, this.environmentConfig).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Configuration saved successfully'
        });
        this.saving = false;
        this.isEditMode = false;
      },
      error: (error) => {
        console.error('Error saving configuration:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save configuration'
        });
        this.saving = false;
      }
    });
  }

  clearConfiguration(): void {
    if (confirm('Are you sure you want to clear the configuration? This action cannot be undone.')) {
      this.environmentConfig = '';
    }
  }

  getSafeHtml(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.environmentConfig || '');
  }
}

