import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { ApiResponse } from '../models';

export interface GeneralTopic {
  topicId: number;
  title: string;
  content: string;
  isActive: boolean;
  createdDate: string;
  modifiedDate: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeneralTopicService {
  private readonly API_URL = `${environment.apiUrl}/general-topics`;

  constructor(private http: HttpClient) {}

  private mapTopic(data: any): GeneralTopic {
    return {
      topicId: data.TopicId || data.topicId,
      title: data.Title || data.title,
      content: data.Content || data.content,
      isActive: data.IsActive !== undefined ? data.IsActive : data.isActive,
      createdDate: data.CreatedDate || data.createdDate,
      modifiedDate: data.ModifiedDate || data.modifiedDate
    };
  }

  getActiveTopic(): Observable<GeneralTopic> {
    return this.http.get<ApiResponse<any>>(`${this.API_URL}/active`).pipe(
      map(response => this.mapTopic(response.data!))
    );
  }

  updateTopic(topicId: number, content: string, title?: string): Observable<GeneralTopic> {
    return this.http.put<ApiResponse<any>>(`${this.API_URL}/${topicId}`, {
      content,
      title
    }).pipe(map(response => this.mapTopic(response.data!)));
  }
}

