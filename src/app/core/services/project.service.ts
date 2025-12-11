import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Project, ApiResponse } from '../models';

// DevOps Project interface (moved from devops.service)
export interface DevOpsProject {
  id: string;
  name: string;
  description?: string;
  url: string;
  state: string;
  revision: number;
  visibility: string;
  lastUpdateTime: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private readonly API_URL = `${environment.apiUrl}/projects`;
  private readonly DEVOPS_API_URL = `${environment.apiUrl}/devops`;

  constructor(private http: HttpClient) {}

  /**
   * Construct DevOps project URL from project name
   */
  private buildDevOpsProjectUrl(projectName: string): string {
    return `https://dev.azure.com/kareemnagy2025/${encodeURIComponent(projectName)}`;
  }

  /**
   * Map backend PascalCase to frontend camelCase
   */
  private mapProject(data: any): Project {
    return {
      projectId: data.ProjectId || data.projectId,
      projectName: data.ProjectName || data.projectName,
      projectManagerName: data.ProjectManagerName || data.projectManagerName,
      dashboardUrl: data.DashboardUrl || data.dashboardUrl,
      description: data.Description || data.description,
      startDate: data.StartDate || data.startDate,
      endDate: data.EndDate || data.endDate,
      isActive: data.IsActive !== undefined ? data.IsActive : data.isActive,
      createdDate: data.CreatedDate || data.createdDate,
      modifiedDate: data.ModifiedDate || data.modifiedDate,
      devOpsProjectId: data.DevOpsProjectId || data.devOpsProjectId,
      devOpsProjectUrl: data.DevOpsProjectUrl || data.devOpsProjectUrl,
      projectHubConfig: data.ProjectHubConfig || data.projectHubConfig,
      technologies: data.technologies || data.Technologies,
      teamMembers: data.teamMembers || data.TeamMembers,
      userStories: data.userStories || data.UserStories
    } as Project;
  }

  getAllProjects(filters?: { status?: string; managerId?: number; isActive?: boolean; hasDevOps?: boolean }): Observable<Project[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.status) params = params.set('status', filters.status);
      if (filters.managerId) params = params.set('managerId', filters.managerId.toString());
      if (filters.isActive !== undefined) params = params.set('isActive', filters.isActive.toString());
      if (filters.hasDevOps !== undefined) params = params.set('hasDevOps', filters.hasDevOps.toString());
    }
    return this.http.get<ApiResponse<any[]>>(this.API_URL, { params }).pipe(
      map(response => (response.data || []).map(item => this.mapProject(item)))
    );
  }

  getProjectById(id: number): Observable<Project> {
    return this.http.get<ApiResponse<any>>(`${this.API_URL}/${id}`).pipe(
      map(response => this.mapProject(response.data!))
    );
  }

  getProjectCompleteInfo(id: number): Observable<Project> {
    return this.http.get<ApiResponse<any>>(`${this.API_URL}/${id}/complete`).pipe(
      map(response => this.mapProject(response.data!))
    );
  }

  createProject(project: Partial<Project>): Observable<Project> {
    return this.http.post<ApiResponse<any>>(this.API_URL, project).pipe(
      map(response => this.mapProject(response.data!))
    );
  }

  updateProject(id: number, project: Partial<Project>): Observable<Project> {
    return this.http.put<ApiResponse<any>>(`${this.API_URL}/${id}`, project).pipe(
      map(response => this.mapProject(response.data!))
    );
  }

  deleteProject(id: number): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.API_URL}/${id}`).pipe(
      map(response => response.data)
    );
  }

  // Team member management
  getProjectTeamMembers(projectId: number): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.API_URL}/${projectId}/team-members`).pipe(
      map(response => response.data || [])
    );
  }
  
  addTeamMember(projectId: number, teamMemberId: number, role: string, allocationPercentage?: number): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/${projectId}/team-members`, {
      teamMemberId,
      role,
      allocationPercentage: allocationPercentage || 100
    }).pipe(map(response => response.data));
  }

  removeTeamMember(projectId: number, teamMemberId: number): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.API_URL}/${projectId}/team-members/${teamMemberId}`).pipe(
      map(response => response.data)
    );
  }

  updateTeamMemberRole(projectId: number, teamMemberId: number, role: string, allocationPercentage?: number): Observable<any> {
    const body: any = { role };
    if (allocationPercentage !== undefined) {
      body.allocationPercentage = allocationPercentage;
    }
    return this.http.put<ApiResponse<any>>(`${this.API_URL}/${projectId}/team-members/${teamMemberId}`, body).pipe(map(response => response.data));
  }

  // Technology management
  getProjectTechnologies(projectId: number): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.API_URL}/${projectId}/technologies`).pipe(
      map(response => response.data || [])
    );
  }

  addTechnology(projectId: number, technologyId: number): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/${projectId}/technologies`, {
      technologyId
    }).pipe(map(response => response.data));
  }

  removeTechnology(projectId: number, technologyId: number): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.API_URL}/${projectId}/technologies/${technologyId}`).pipe(
      map(response => response.data)
    );
  }

  // =============================
  // DevOps Sync Methods
  // =============================

  /**
   * Sync projects from Azure DevOps and merge with database data
   * Now uses backend API for security and performance
   */
  syncProjectsFromDevOps(): Observable<{ 
    dbProjects: Project[], 
    devOpsProjects: DevOpsProject[],
    merged: Array<Project & { devOpsData?: DevOpsProject, source: 'database' | 'devops' | 'both' }>
  }> {
    // Use backend API to get all DevOps projects (with caching)
    return this.http.post<ApiResponse<any>>(`${this.DEVOPS_API_URL}/projects/sync`, {}).pipe(
      map(response => {
        const data = response.data!;
        const dbProjects = data.projects?.existing?.map((p: any) => this.mapProject(p)) || [];
        const devOpsProjects = [...(data.projects?.new || []), ...(data.projects?.existing || [])];
        const merged = this.mergeProjectData(dbProjects, devOpsProjects);
        return { dbProjects, devOpsProjects, merged };
      }),
      catchError(error => {
        console.error('Error syncing projects from DevOps:', error);
        // Fallback to getting database projects only
        return this.getAllProjects().pipe(
          map(dbProjects => ({
            dbProjects,
            devOpsProjects: [],
            merged: dbProjects.map(p => ({ ...p, source: 'database' as const }))
          }))
        );
      })
    );
  }

  /**
   * Merge database projects with DevOps projects
   * Matching is done by DevOpsProjectId (GUID)
   */
  private mergeProjectData(
    dbProjects: Project[], 
    devOpsProjects: DevOpsProject[]
  ): Array<Project & { devOpsData?: DevOpsProject, source: 'database' | 'devops' | 'both' }> {
    const merged: Array<Project & { devOpsData?: DevOpsProject, source: 'database' | 'devops' | 'both' }> = [];
    const processedDevOpsIds = new Set<string>();

    // First, process database projects and try to match with DevOps by ID
    dbProjects.forEach(dbProject => {
      let matchingDevOpsProject: DevOpsProject | undefined;
      
      // Try to match by DevOpsProjectId first (GUID)
      if (dbProject.devOpsProjectId) {
        matchingDevOpsProject = devOpsProjects.find(
          dp => dp.id === dbProject.devOpsProjectId
        );
      }
      
      // Fallback: Try to match by name if no DevOps ID exists and project name exists
      if (!matchingDevOpsProject && dbProject.projectName) {
        const dbProjectName = dbProject.projectName.toLowerCase().trim();
        matchingDevOpsProject = devOpsProjects.find(
          dp => dp.name && dp.name.toLowerCase().trim() === dbProjectName
        );
      }

      if (matchingDevOpsProject) {
        processedDevOpsIds.add(matchingDevOpsProject.id);
        merged.push({
          ...dbProject,
          devOpsData: matchingDevOpsProject,
          source: 'both'
        });
      } else {
        merged.push({
          ...dbProject,
          source: 'database'
        });
      }
    });

    // Then add DevOps projects that don't exist in database
    devOpsProjects.forEach(devOpsProject => {
      if (!processedDevOpsIds.has(devOpsProject.id)) {
        // Create a Project object from DevOps data
        const projectFromDevOps: Project & { devOpsData?: DevOpsProject, source: 'database' | 'devops' | 'both' } = {
          projectId: 0, // Not in database yet
          projectName: devOpsProject.name,
          projectManagerName: 'To Be Assigned', // Default value
          description: devOpsProject.description || '',
          dashboardUrl: '', // Dashboard URL will be added manually
          isActive: devOpsProject.state?.toLowerCase() !== 'deleted',
          startDate: '',
          endDate: '',
          createdDate: devOpsProject.lastUpdateTime,
          modifiedDate: devOpsProject.lastUpdateTime,
          devOpsProjectId: devOpsProject.id,  // Store DevOps GUID
          devOpsProjectUrl: this.buildDevOpsProjectUrl(devOpsProject.name),  // Construct URL
          devOpsData: devOpsProject,
          source: 'devops'
        } as any;
        merged.push(projectFromDevOps);
      }
    });

    return merged;
  }

  /**
   * Import a DevOps project into the database
   */
  importDevOpsProject(devOpsProject: DevOpsProject, projectManagerName: string): Observable<Project> {
    const newProject: Partial<Project> = {
      projectName: devOpsProject.name,
      projectManagerName: projectManagerName,
      description: devOpsProject.description || '',
      dashboardUrl: '', // Dashboard URL will be added manually
      isActive: devOpsProject.state?.toLowerCase() !== 'deleted',
      devOpsProjectId: devOpsProject.id,  // Store DevOps GUID
      devOpsProjectUrl: this.buildDevOpsProjectUrl(devOpsProject.name)  // Construct URL
    };

    return this.createProject(newProject);
  }

  /**
   * Bulk import multiple DevOps projects via backend API
   */
  bulkImportDevOpsProjects(
    projects: Array<{ devOpsProject: DevOpsProject, projectManagerName: string }>
  ): Observable<Project[]> {
    // Extract project IDs and use first project manager name as default
    const projectIds = projects.map(p => p.devOpsProject.id);
    const defaultProjectManager = projects[0]?.projectManagerName || 'Unassigned';

    return this.http.post<ApiResponse<any>>(`${this.DEVOPS_API_URL}/projects/import`, {
      projectIds,
      defaultProjectManager
    }).pipe(
      map(response => {
        const importedProjects = response.data?.projects || [];
        return importedProjects.map((p: any) => this.mapProject(p));
      }),
      catchError(error => {
        console.error('Failed to bulk import projects:', error);
        return of([]);
      })
    );
  }

  /**
   * Update database project with DevOps data via backend API
   * NOTE: Dashboard URL is NOT updated - it's managed separately
   */
  updateProjectFromDevOps(projectId: number, devOpsProject?: DevOpsProject): Observable<Project> {
    // Use backend API to fetch latest DevOps data and update project
    return this.http.put<ApiResponse<any>>(`${this.DEVOPS_API_URL}/projects/${projectId}/update`, {}).pipe(
      map(response => this.mapProject(response.data!)),
      catchError(error => {
        console.error('Failed to update project from DevOps:', error);
        throw error;
      })
    );
  }

  // =============================
  // Configuration Management
  // =============================

  getProjectConfiguration(projectId: number): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.API_URL}/${projectId}/configuration`).pipe(
      map(response => response.data)
    );
  }

  updateProjectConfiguration(projectId: number, projectHubConfig: string): Observable<any> {
    return this.http.put<ApiResponse<any>>(`${this.API_URL}/${projectId}/configuration`, {
      projectHubConfig
    }).pipe(map(response => response.data));
  }
}
