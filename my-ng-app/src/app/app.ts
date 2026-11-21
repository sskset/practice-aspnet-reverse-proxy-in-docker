import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TaskItem, TaskService } from './task.service';

@Component({
  imports: [FormsModule],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly taskService = inject(TaskService);

  protected readonly tasks = signal<TaskItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected newTaskTitle = '';

  ngOnInit(): void {
    this.taskService.getAll().subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load tasks from the API.');
        this.loading.set(false);
      },
    });
  }

  protected addTask(): void {
    const title = this.newTaskTitle.trim();
    if (!title) {
      return;
    }

    this.error.set(null);
    this.taskService.create(title).subscribe({
      next: (task) => {
        this.tasks.update((tasks) => [...tasks, task]);
        this.newTaskTitle = '';
      },
      error: () => this.error.set('Could not add the task.'),
    });
  }

  protected toggleTask(task: TaskItem): void {
    this.error.set(null);
    this.taskService.update({ ...task, isComplete: !task.isComplete }).subscribe({
      next: (updatedTask) => {
        this.tasks.update((tasks) =>
          tasks.map((current) => current.id === updatedTask.id ? updatedTask : current)
        );
      },
      error: () => this.error.set('Could not update the task.'),
    });
  }

  protected deleteTask(task: TaskItem): void {
    this.error.set(null);
    this.taskService.delete(task.id).subscribe({
      next: () => this.tasks.update((tasks) => tasks.filter((current) => current.id !== task.id)),
      error: () => this.error.set('Could not delete the task.'),
    });
  }
}
