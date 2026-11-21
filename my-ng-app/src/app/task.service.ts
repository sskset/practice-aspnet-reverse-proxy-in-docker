import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface TaskItem {
  id: number;
  title: string;
  isComplete: boolean;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/tasks';

  getAll(): Observable<TaskItem[]> {
    return this.http.get<TaskItem[]>(this.apiUrl);
  }

  create(title: string): Observable<TaskItem> {
    return this.http.post<TaskItem>(this.apiUrl, { title });
  }

  update(task: TaskItem): Observable<TaskItem> {
    return this.http.put<TaskItem>(`${this.apiUrl}/${task.id}`, task);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
