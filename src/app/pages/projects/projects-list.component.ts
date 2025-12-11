import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ProjectService, DevOpsProject } from '../../core/services/project.service';
import { TechnologyService } from '../../core/services/technology.service';
import { TeamService } from '../../core/services/team.service';
import { Project, Technology, TeamMember } from '../../core/models';
import { FilterPipe } from '../../shared/pipes/filter.pipe';

@Component({
  selector: 'app-projects-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TableModule,
    CardModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    CheckboxModule,
    TagModule,
    ConfirmDialogModule,
    ToastModule,
    SkeletonModule,
    FilterPipe
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './projects-list.component.html',
  styleUrls: ['./projects-list.component.scss']
})
export class ProjectsListComponent implements OnInit {
  projects: Array<Project & { devOpsData?: DevOpsProject, source?: 'database' | 'devops' | 'both' }> = [];
  filteredProjects: Array<Project & { devOpsData?: DevOpsProject, source?: 'database' | 'devops' | 'both' }> = [];
  allTechnologies: Technology[] = [];
  allTeamMembers: TeamMember[] = [];
  
  loading = true;
  syncing = false;
  searchQuery = '';
  filterStatus: 'All' | 'Active' | 'Inactive' = 'Active';

  showAddEditModal = false;
  showDetailModal = false;
  isEditMode = false;

  selectedProject: (Project & { devOpsData?: DevOpsProject, source?: 'database' | 'devops' | 'both' }) | null = null;
  devOpsProjectsToImport: DevOpsProject[] = [];

  newProject: Partial<Project> = {
    projectName: '',
    projectManagerName: '',
    dashboardUrl: '',
    description: '',
    startDate: '',
    endDate: '',
    isActive: true
  };

  selectedTechnologyIds: number[] = [];
  selectedTeamMemberIds: number[] = [];
  
  // Team member management
  projectTeamMembers: any[] = [];
  teamMemberRoles: { [key: number]: string } = {};
  teamMemberAllocations: { [key: number]: number } = {};
  loadingProjectTeamMembers = false;
  
  // Technology management
  projectTechnologies: any[] = [];
  loadingProjectTechnologies = false;

  constructor(
    private projectService: ProjectService,
    private technologyService: TechnologyService,
    private teamService: TeamService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadProjects();
    this.loadTechnologies();
    this.loadTeamMembers();
  }

  loadProjects(): void {
    this.loading = true;
    this.projectService.getAllProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.applyFilters();
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

  loadTechnologies(): void {
    this.technologyService.getAllTechnologies().subscribe({
      next: (technologies) => {
        this.allTechnologies = technologies.filter(t => t.isActive);
      },
      error: (err) => {
        console.error('Error loading technologies:', err);
      }
    });
  }

  loadTeamMembers(): void {
    this.teamService.getAllTeamMembers().subscribe({
      next: (members) => {
        this.allTeamMembers = members.filter(m => m.isActive);
      },
      error: (err) => {
        console.error('Error loading team members:', err);
      }
    });
  }

  applyFilters(): void {
    this.filteredProjects = this.projects.filter(project => {
      const matchesSearch = !this.searchQuery ||
        project.projectName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        project.projectManagerName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesStatus = this.filterStatus === 'All' || 
        (this.filterStatus === 'Active' && project.isActive) ||
        (this.filterStatus === 'Inactive' && !project.isActive);

      return matchesSearch && matchesStatus;
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  // Modal Operations
  openAddModal(): void {
    this.isEditMode = false;
    this.resetForm();
    this.showAddEditModal = true;
  }

  openEditModal(project: Project): void {
    this.isEditMode = true;
    this.newProject = { ...project };
    this.selectedTechnologyIds = project.technologies?.map(t => t.technologyId) || [];
    this.selectedTeamMemberIds = project.teamMembers?.map(tm => tm.teamMemberId) || [];
    
    // Load current project team members and technologies
    if (project.projectId) {
      this.loadProjectTeamMembers(project.projectId);
      this.loadProjectTechnologies(project.projectId);
    }
    
    this.showAddEditModal = true;
  }

  closeModal(): void {
    this.showAddEditModal = false;
    this.showDetailModal = false;
    this.selectedProject = null;
    this.resetForm();
  }

  resetForm(): void {
    this.newProject = {
      projectName: '',
      projectManagerName: '',
      dashboardUrl: '',
      description: '',
      startDate: '',
      endDate: '',
      isActive: true
    };
    this.selectedTechnologyIds = [];
    this.selectedTeamMemberIds = [];
    this.projectTeamMembers = [];
    this.projectTechnologies = [];
  }

  saveProject(): void {
    if (!this.newProject.projectName || !this.newProject.projectManagerName) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please fill in required fields'
      });
      return;
    }

    if (this.isEditMode && this.newProject.projectId) {
      this.projectService.updateProject(this.newProject.projectId, this.newProject).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Project updated successfully'
          });
          this.closeModal();
          this.loadProjects();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update project'
          });
        }
      });
    } else {
      this.projectService.createProject(this.newProject).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Project created successfully'
          });
          this.closeModal();
          this.loadProjects();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create project'
          });
        }
      });
    }
  }

  viewProjectDetails(project: Project): void {
    this.selectedProject = project;
    this.showDetailModal = true;
  }

  toggleProjectStatus(project: Project): void {
    if (project.projectId) {
      this.confirmationService.confirm({
        message: `Are you sure you want to ${project.isActive ? 'deactivate' : 'activate'} this project?`,
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          const updatedProject = { ...project, isActive: !project.isActive };
          this.projectService.updateProject(project.projectId!, updatedProject).subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: `Project ${updatedProject.isActive ? 'activated' : 'deactivated'}`
              });
              this.loadProjects();
            },
            error: () => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to update project status'
              });
            }
          });
        }
      });
    }
  }

  // Utility Methods
  getDaysRemaining(endDate?: string): number | null {
    if (!endDate) return null;
    const end = new Date(endDate);
    const today = new Date();
    const diff = end.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  }

  getStatusSeverity(isActive: boolean): string {
    return isActive ? 'success' : 'secondary';
  }

  // =============================
  // DevOps Sync Methods
  // =============================

  syncWithDevOps(): void {
    this.syncing = true;
    this.projectService.syncProjectsFromDevOps().subscribe({
      next: ({ merged, devOpsProjects }) => {
        this.projects = merged;
        this.applyFilters();
        this.syncing = false;

        // Find DevOps projects that are not in database
        this.devOpsProjectsToImport = devOpsProjects.filter(dp => 
          !merged.some(p => p.source === 'both' && p.devOpsData?.id === dp.id)
        );

        const dbCount = merged.filter(p => p.source === 'database').length;
        const devOpsCount = merged.filter(p => p.source === 'devops').length;
        const bothCount = merged.filter(p => p.source === 'both').length;

        this.messageService.add({
          severity: 'success',
          summary: 'Sync Complete',
          detail: `DB: ${dbCount}, DevOps: ${devOpsCount}, Matched: ${bothCount}`,
          life: 5000
        });

        if (this.devOpsProjectsToImport.length > 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'New Projects',
            detail: `${this.devOpsProjectsToImport.length} new project(s) found in DevOps`,
            life: 5000
          });
        }
      },
      error: (err) => {
        console.error('Sync error:', err);
        this.syncing = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to sync with DevOps'
        });
      }
    });
  }

  importSingleDevOpsProject(project: Project & { devOpsData?: DevOpsProject }): void {
    if (!project.devOpsData) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'No DevOps data available for this project'
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Import "${project.projectName}" from DevOps?`,
      header: 'Import Project',
      icon: 'pi pi-download',
      accept: () => {
        this.loading = true;
        this.projectService.importDevOpsProject(project.devOpsData!, 'Unassigned').subscribe({
          next: (imported) => {
            this.loading = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: `Successfully imported "${imported.projectName}"`
            });
            this.loadProjects();
          },
          error: (err) => {
            console.error('Import error:', err);
            this.loading = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to import project'
            });
          }
        });
      }
    });
  }

  importAllDevOpsProjects(): void {
    if (this.devOpsProjectsToImport.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'No new DevOps projects to import'
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Import ${this.devOpsProjectsToImport.length} project(s) from DevOps?`,
      header: 'Confirmation',
      icon: 'pi pi-question-circle',
      accept: () => {
        const projectsToImport = this.devOpsProjectsToImport.map(p => ({
          devOpsProject: p,
          projectManagerName: 'Unassigned'
        }));

        this.syncing = true;
        this.projectService.bulkImportDevOpsProjects(projectsToImport).subscribe({
          next: (imported) => {
            this.syncing = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: `Successfully imported ${imported.length} project(s)`
            });
            this.syncWithDevOps();
          },
          error: (err) => {
            console.error('Import error:', err);
            this.syncing = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to import projects'
            });
          }
        });
      }
    });
  }

  updateFromDevOps(project: Project & { devOpsData?: DevOpsProject }): void {
    if (!project.projectId || !project.devOpsProjectId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'This project is not linked to DevOps'
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Update "${project.projectName}" with latest data from DevOps?`,
      header: 'Confirmation',
      icon: 'pi pi-question-circle',
      accept: () => {
        this.projectService.updateProjectFromDevOps(project.projectId!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Project updated from DevOps'
            });
            this.loadProjects();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to update project from DevOps'
            });
          }
        });
      }
    });
  }

  // =============================
  // Team Member Management
  // =============================
  
  loadProjectTeamMembers(projectId: number): void {
    this.loadingProjectTeamMembers = true;
    this.projectService.getProjectTeamMembers(projectId).subscribe({
      next: (members) => {
        this.projectTeamMembers = members;
        members.forEach(m => {
          this.teamMemberRoles[m.TeamMemberId] = m.Role || 'Developer';
          this.teamMemberAllocations[m.TeamMemberId] = m.AllocationPercentage || 100;
        });
        this.loadingProjectTeamMembers = false;
      },
      error: (error) => {
        console.error('Error loading project team members:', error);
        this.loadingProjectTeamMembers = false;
      }
    });
  }

  addTeamMember(memberId: number): void {
    if (!this.newProject.projectId) return;
    
    const role = this.teamMemberRoles[memberId] || 'Developer';
    const allocationPercentage = this.teamMemberAllocations[memberId] || 100;
    
    this.projectService.addTeamMember(this.newProject.projectId, memberId, role, allocationPercentage).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Team member added successfully'
        });
        this.loadProjectTeamMembers(this.newProject.projectId!);
      },
      error: (error) => {
        console.error('Error adding team member:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to add team member'
        });
      }
    });
  }

  updateTeamMemberAllocation(memberId: number, allocation: number): void {
    if (!this.newProject.projectId) return;
    
    this.teamMemberAllocations[memberId] = allocation;
    const role = this.teamMemberRoles[memberId];
    
    this.projectService.updateTeamMemberRole(this.newProject.projectId, memberId, role, allocation).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Allocation updated successfully'
        });
      },
      error: (error) => {
        console.error('Error updating allocation:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update allocation'
        });
      }
    });
  }

  removeTeamMember(memberId: number): void {
    if (!this.newProject.projectId) return;
    
    this.confirmationService.confirm({
      message: 'Remove this team member from the project?',
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.projectService.removeTeamMember(this.newProject.projectId!, memberId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Team member removed successfully'
            });
            this.loadProjectTeamMembers(this.newProject.projectId!);
          },
          error: (error) => {
            console.error('Error removing team member:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to remove team member'
            });
          }
        });
      }
    });
  }

  updateTeamMemberRole(memberId: number, role: string): void {
    if (!this.newProject.projectId) return;
    
    this.projectService.updateTeamMemberRole(this.newProject.projectId, memberId, role).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Role updated successfully'
        });
      },
      error: (error) => {
        console.error('Error updating role:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update role'
        });
      }
    });
  }
  
  getAvailableTeamMembers(): TeamMember[] {
    const assignedIds = this.projectTeamMembers.map(m => m.TeamMemberId);
    return this.allTeamMembers.filter(m => !assignedIds.includes(m.teamMemberId));
  }

  // =============================
  // Technology Management
  // =============================
  
  loadProjectTechnologies(projectId: number): void {
    this.loadingProjectTechnologies = true;
    this.projectService.getProjectTechnologies(projectId).subscribe({
      next: (technologies) => {
        this.projectTechnologies = technologies;
        this.loadingProjectTechnologies = false;
      },
      error: (error) => {
        console.error('Error loading project technologies:', error);
        this.loadingProjectTechnologies = false;
      }
    });
  }

  addTechnology(technologyId: number): void {
    if (!this.newProject.projectId) return;
    
    this.projectService.addTechnology(this.newProject.projectId, technologyId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Technology added successfully'
        });
        this.loadProjectTechnologies(this.newProject.projectId!);
      },
      error: (error) => {
        console.error('Error adding technology:', error);
        if (error.error?.error?.includes('already assigned')) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Warning',
            detail: 'Technology already assigned to this project'
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to add technology'
          });
        }
      }
    });
  }

  removeTechnology(technologyId: number): void {
    if (!this.newProject.projectId) return;
    
    this.confirmationService.confirm({
      message: 'Remove this technology from the project?',
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.projectService.removeTechnology(this.newProject.projectId!, technologyId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Technology removed successfully'
            });
            this.loadProjectTechnologies(this.newProject.projectId!);
          },
          error: (error) => {
            console.error('Error removing technology:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to remove technology'
            });
          }
        });
      }
    });
  }
  
  getAvailableTechnologies(): any[] {
    const assignedIds = this.projectTechnologies.map(t => t.TechnologyId);
    return this.allTechnologies.filter(t => !assignedIds.includes(t.technologyId));
  }
}
