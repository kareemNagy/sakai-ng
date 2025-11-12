import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Technology, ApiResponse } from '../models/index';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TechnologyService {
  private API_URL = `${environment.apiUrl}/technologies`;

  constructor(private http: HttpClient) {}

  // Helper to map Technology response (PascalCase to camelCase)
  private mapTechnology(item: any): Technology {
    return {
      technologyId: item.TechnologyId || item.technologyId,
      technologyName: item.TechnologyName || item.technologyName,
      description: item.Description || item.description,
      isActive: item.IsActive !== undefined ? item.IsActive : item.isActive,
      createdDate: item.CreatedDate || item.createdDate,
      modifiedDate: item.ModifiedDate || item.modifiedDate
    };
  }

  getAllTechnologies(): Observable<Technology[]> {
    return this.http.get<ApiResponse<any[]>>(this.API_URL).pipe(
      map(response => (response.data || []).map((item:any) => this.mapTechnology(item)))
    );
  }

  getTechnologyById(id: number): Observable<Technology> {
    return this.http.get<ApiResponse<any>>(`${this.API_URL}/${id}`).pipe(
      map(response => this.mapTechnology(response.data!))
    );
  }

  createTechnology(technology: Partial<Technology>): Observable<Technology> {
    return this.http.post<ApiResponse<any>>(this.API_URL, technology).pipe(
      map(response => this.mapTechnology(response.data!))
    );
  }

  updateTechnology(id: number, technology: Partial<Technology>): Observable<Technology> {
    return this.http.put<ApiResponse<any>>(`${this.API_URL}/${id}`, technology).pipe(
      map(response => this.mapTechnology(response.data!))
    );
  }

  deleteTechnology(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/${id}`).pipe(
      map(response => response.data!)
    );
  }
}

