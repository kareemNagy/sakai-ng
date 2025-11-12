import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UserStory, ApiResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class UserStoryService {
  private API_URL = `${environment.apiUrl}/user-stories`;

  constructor(private http: HttpClient) {}

  /**
   * Map backend data to frontend UserStory model
   */
  private mapUserStory(data: any): UserStory {
    const fields = data.fields || {};
    
    const stripHtml = (html: string | undefined): string => {
      if (!html) return '';
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || '';
    };
    
    const getUserName = (userObj: any): string | undefined => {
      if (!userObj) return undefined;
      return userObj.displayName || userObj.uniqueName;
    };

    return {
      userStoryId: data.id,
      projectId: data.projectId,
      devOpsWorkItemId: data.id,
      title: fields['System.Title'] || '',
      description: stripHtml(fields['System.Description']),
      acceptanceCriteria: stripHtml(fields['Microsoft.VSTS.Common.AcceptanceCriteria']),
      storyPoints: fields['Microsoft.VSTS.Scheduling.StoryPoints'],
      priority: fields['Microsoft.VSTS.Common.Priority'],
      status: fields['System.State'] || '',
      assignedTo: getUserName(fields['System.AssignedTo']),
      iterationPath: fields['System.IterationPath'],
      areaPath: fields['System.AreaPath'],
      devOpsUrl: data.url,
      createdBy: getUserName(fields['System.CreatedBy']),
      lastSyncDate: new Date().toISOString(),
      createdDate: fields['System.CreatedDate'],
      modifiedDate: fields['System.ChangedDate']
    };
  }

  getAllUserStories(): Observable<UserStory[]> {
    return this.http.get<ApiResponse<any[]>>(this.API_URL).pipe(
      map(response => (response.data || []).map(item => this.mapUserStory(item)))
    );
  }

  getUserStoriesByProject(projectId: number): Observable<UserStory[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.API_URL}/project/${projectId}`).pipe(
      map(response => (response.data || []).map(item => this.mapUserStory(item)))
    );
  }

  getUserStoriesByDevOpsProject(devOpsProjectId: string): Observable<UserStory[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.API_URL}/devops/${devOpsProjectId}`).pipe(
      map(response => (response.data || []).map(item => this.mapUserStory(item)))
    );
  }

  getUserStoryByWorkItemId(workItemId: number, projectId: number): Observable<UserStory> {
    const params = new HttpParams().set('projectId', projectId.toString());
    return this.http.get<ApiResponse<any>>(`${this.API_URL}/work-item/${workItemId}`, { params }).pipe(
      map(response => this.mapUserStory(response.data!))
    );
  }
}
