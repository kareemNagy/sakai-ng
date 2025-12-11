import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { Todo, TodoComment, ApiResponse } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private readonly API_URL = `${environment.apiUrl}/todos`;
  
  // Observable to track todo panel state
  private todoPanelOpenSubject = new BehaviorSubject<boolean>(false);
  public todoPanelOpen$ = this.todoPanelOpenSubject.asObservable();
  
  // Observable for todos list
  private todosSubject = new BehaviorSubject<Todo[]>([]);
  public todos$ = this.todosSubject.asObservable();

  constructor(private http: HttpClient) {
    // Load todos on init
    this.loadTodos();
  }

  // Helper to map backend response (PascalCase) to frontend model (camelCase)
  private mapTodo(item: any): Todo {
    return {
      id: item.Id || item.id,
      title: item.Title || item.title,
      description: item.Description || item.description,
      priority: item.Priority || item.priority,
      status: item.Status || item.status,
      dueDate: item.DueDate || item.dueDate,
      isCompleted: item.IsCompleted !== undefined ? item.IsCompleted : item.isCompleted,
      createdAt: item.CreatedAt || item.createdAt,
      updatedAt: item.UpdatedAt || item.updatedAt,
      teamMemberId: item.TeamMemberId || item.teamMemberId,
      isImportant: item.IsImportant !== undefined ? item.IsImportant : item.isImportant,
      isActive: item.IsActive !== undefined ? item.IsActive : item.isActive
    };
  }

  // Helper to map comment
  private mapComment(item: any): TodoComment {
    return {
      id: item.Id || item.id,
      todoId: item.TodoId || item.todoId,
      commentText: item.CommentText || item.commentText,
      createdAt: item.CreatedAt || item.createdAt,
      teamMemberId: item.TeamMemberId || item.teamMemberId,
      isActive: item.IsActive !== undefined ? item.IsActive : item.isActive
    };
  }

  toggleTodoPanel(): void {
    this.todoPanelOpenSubject.next(!this.todoPanelOpenSubject.value);
  }

  openTodoPanel(): void {
    this.todoPanelOpenSubject.next(true);
  }

  closeTodoPanel(): void {
    this.todoPanelOpenSubject.next(false);
  }

  loadTodos(): void {
    this.getAllTodos().subscribe(todos => {
      this.todosSubject.next(todos);
    });
  }

  getAllTodos(filters?: { status?: string; priority?: string; teamMemberId?: number }): Observable<Todo[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.status) params = params.set('status', filters.status);
      if (filters.priority) params = params.set('priority', filters.priority);
      if (filters.teamMemberId) params = params.set('teamMemberId', filters.teamMemberId.toString());
    }
    return this.http.get<ApiResponse<any[]>>(this.API_URL, { params }).pipe(
      map(response => (response.data || []).map(item => this.mapTodo(item)))
    );
  }

  getTodoById(id: number): Observable<Todo> {
    return this.http.get<ApiResponse<any>>(`${this.API_URL}/${id}`).pipe(
      map(response => response.data ? this.mapTodo(response.data) : {} as Todo)
    );
  }

  createTodo(todo: Partial<Todo>): Observable<Todo> {
    return this.http.post<ApiResponse<any>>(this.API_URL, todo).pipe(
      map(response => response.data ? this.mapTodo(response.data) : {} as Todo),
      tap(() => this.loadTodos())
    );
  }

  updateTodo(id: number, todo: Partial<Todo>): Observable<Todo> {
    return this.http.put<ApiResponse<any>>(`${this.API_URL}/${id}`, todo).pipe(
      map(response => response.data ? this.mapTodo(response.data) : {} as Todo),
      tap(() => this.loadTodos())
    );
  }

  deleteTodo(id: number): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.API_URL}/${id}`).pipe(
      map(response => response.data),
      tap(() => this.loadTodos())
    );
  }

  completeTodo(id: number): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/${id}/complete`, {}).pipe(
      map(response => response.data),
      tap(() => this.loadTodos())
    );
  }

  toggleImportant(id: number): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/${id}/toggle-star`, {}).pipe(
      map(response => response.data),
      tap(() => this.loadTodos())
    );
  }

  getComments(todoId: number): Observable<TodoComment[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.API_URL}/${todoId}/comments`).pipe(
      map(response => (response.data || []).map(item => this.mapComment(item)))
    );
  }

  addComment(todoId: number, commentText: string, teamMemberId?: number): Observable<TodoComment> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/${todoId}/comments`, {
      commentText,
      teamMemberId
    }).pipe(
      map(response => response.data ? this.mapComment(response.data) : {} as TodoComment)
    );
  }

  getMyTodos(teamMemberId: number): Observable<Todo[]> {
    const params = new HttpParams().set('teamMemberId', teamMemberId.toString());
    return this.http.get<ApiResponse<any[]>>(this.API_URL, { params }).pipe(
      map(response => (response.data || []).map(item => this.mapTodo(item)))
    );
  }
}

