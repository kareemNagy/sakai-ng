import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Activity, SubActivity, ApiResponse } from '../models/index';

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private API_URL = `${environment.apiUrl}/activities`;

  constructor(private http: HttpClient) {}

  // Helper to map Activity response (PascalCase to camelCase)
  private mapActivity(item: any): Activity {
    return {
      activityId: item.ActivityId || item.activityId,
      activityName: item.ActivityName || item.activityName,
      description: item.Description || item.description,
      isActive: item.IsActive !== undefined ? item.IsActive : item.isActive,
      createdDate: item.CreatedDate || item.createdDate,
      modifiedDate: item.ModifiedDate || item.modifiedDate,
      totalSubActivities: item.TotalSubActivities || item.totalSubActivities || 0,
      activeSubActivities: item.ActiveSubActivities || item.activeSubActivities || 0
    };
  }

  // Helper to map SubActivity response (PascalCase to camelCase)
  private mapSubActivity(item: any): SubActivity {
    return {
      subActivityId: item.SubActivityId || item.subActivityId,
      activityId: item.ActivityId || item.activityId,
      subActivityName: item.SubActivityName || item.subActivityName,
      description: item.Description || item.description,
      isActive: item.IsActive !== undefined ? item.IsActive : item.isActive,
      createdDate: item.CreatedDate || item.createdDate,
      modifiedDate: item.ModifiedDate || item.modifiedDate
    };
  }

  // Activities
  getAllActivities(): Observable<Activity[]> {
    return this.http.get<ApiResponse<any[]>>(this.API_URL).pipe(
      map(response => (response.data || []).map((item:any) => this.mapActivity(item)))
    );
  }

  getActivityById(id: number): Observable<Activity> {
    return this.http.get<ApiResponse<any>>(`${this.API_URL}/${id}`).pipe(
      map(response => this.mapActivity(response.data!))
    );
  }

  createActivity(activity: Partial<Activity>): Observable<Activity> {
    return this.http.post<ApiResponse<any>>(this.API_URL, activity).pipe(
      map(response => this.mapActivity(response.data!))
    );
  }

  updateActivity(id: number, activity: Partial<Activity>): Observable<Activity> {
    return this.http.put<ApiResponse<any>>(`${this.API_URL}/${id}`, activity).pipe(
      map(response => this.mapActivity(response.data!))
    );
  }

  deleteActivity(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/${id}`).pipe(
      map(response => response.data!)
    );
  }

  // SubActivities
  getSubActivitiesByActivity(activityId: number): Observable<SubActivity[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.API_URL}/${activityId}/subactivities`).pipe(
      map(response => (response.data || []).map((item:any) => this.mapSubActivity(item)))
    );
  }

  getAllSubActivities(): Observable<SubActivity[]> {
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/subactivities`).pipe(
      map(response => (response.data || []).map((item:any) => this.mapSubActivity(item)))
    );
  }

  getSubActivityById(id: number): Observable<SubActivity> {
    return this.http.get<ApiResponse<any>>(`${environment.apiUrl}/subactivities/${id}`).pipe(
      map(response => this.mapSubActivity(response.data!))
    );
  }

  createSubActivity(subActivity: Partial<SubActivity>): Observable<SubActivity> {
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/subactivities`, subActivity).pipe(
      map(response => this.mapSubActivity(response.data!))
    );
  }

  updateSubActivity(id: number, subActivity: Partial<SubActivity>): Observable<SubActivity> {
    return this.http.put<ApiResponse<any>>(`${environment.apiUrl}/subactivities/${id}`, subActivity).pipe(
      map(response => this.mapSubActivity(response.data!))
    );
  }

  deleteSubActivity(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${environment.apiUrl}/subactivities/${id}`).pipe(
      map(response => response.data!)
    );
  }
}

