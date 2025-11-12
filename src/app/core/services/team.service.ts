import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { TeamMember, TeamMemberWorkload, TeamMemberProject, ApiResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private readonly API_URL = `${environment.apiUrl}/team-members`;

  constructor(private http: HttpClient) {}

  // Helper to map backend response (PascalCase) to frontend model (camelCase)
  private mapTeamMember(item: any): TeamMember {
    return {
      teamMemberId: item.TeamMemberId || item.teamMemberId,
      id: item.TeamMemberId || item.teamMemberId || item.id,
      fullName: item.FullName || item.fullName,
      title: item.Title || item.title,
      email: item.Email || item.email,
      isActive: item.IsActive !== undefined ? item.IsActive : item.isActive,
      createdDate: item.CreatedDate || item.createdDate,
      modifiedDate: item.ModifiedDate || item.modifiedDate
    };
  }

  getAllTeamMembers(): Observable<TeamMember[]> {
    return this.http.get<ApiResponse<any[]>>(this.API_URL).pipe(
      map(response => (response.data || []).map(item => this.mapTeamMember(item)))
    );
  }

  getTeamMemberById(id: number): Observable<TeamMember> {
    return this.http.get<ApiResponse<any>>(`${this.API_URL}/${id}`).pipe(
      map(response => this.mapTeamMember(response.data!))
    );
  }

  createTeamMember(member: Partial<TeamMember>): Observable<TeamMember> {
    return this.http.post<ApiResponse<any>>(this.API_URL, member).pipe(
      map(response => this.mapTeamMember(response.data!))
    );
  }

  updateTeamMember(id: number, member: Partial<TeamMember>): Observable<TeamMember> {
    return this.http.put<ApiResponse<any>>(`${this.API_URL}/${id}`, member).pipe(
      map(response => this.mapTeamMember(response.data!))
    );
  }

  deleteTeamMember(id: number): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.API_URL}/${id}`).pipe(
      map(response => response.data)
    );
  }

  getTeamMemberWorkload(teamMemberId?: number, projectId?: number): Observable<TeamMemberWorkload[]> {
    let url = `${environment.apiUrl}/reports/team-workload`;
    const params: string[] = [];
    
    if (teamMemberId) {
      url += `/${teamMemberId}`;
    }
    
    if (projectId) params.push(`projectId=${projectId}`);
    if (params.length) url += '?' + params.join('&');
    
    return this.http.get<ApiResponse<TeamMemberWorkload[]>>(url).pipe(
      map(response => response.data || [])
    );
  }

  getTeamMemberWorkloadById(teamMemberId: number): Observable<TeamMemberWorkload[]> {
    return this.http.get<ApiResponse<TeamMemberWorkload[]>>(`${this.API_URL}/${teamMemberId}/workload`).pipe(
      map(response => response.data || [])
    );
  }

  getTeamMemberProjects(teamMemberId: number): Observable<TeamMemberProject[]> {
    console.warn('getTeamMemberProjects: Backend endpoint not implemented yet');
    return this.http.get<ApiResponse<TeamMemberProject[]>>(`${this.API_URL}/${teamMemberId}/projects`).pipe(
      map(response => response.data || [])
    );
  }
}

