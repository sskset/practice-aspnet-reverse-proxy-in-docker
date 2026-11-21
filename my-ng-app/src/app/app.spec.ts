import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { TaskItem, TaskService } from './task.service';

describe('App', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('loads and displays tasks from the API', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const getRequest = httpTesting.expectOne('/api/tasks');
    expect(getRequest.request.method).toBe('GET');
    getRequest.flush([{ id: 1, title: 'Example from API', isComplete: false }]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Example from API');
  });

  it('creates a task through the API service', () => {
    const taskService = TestBed.inject(TaskService);
    const createdTask: TaskItem = { id: 2, title: 'Add a test task', isComplete: false };
    let response: TaskItem | undefined;

    taskService.create(createdTask.title).subscribe((task) => (response = task));

    const postRequest = httpTesting.expectOne('/api/tasks');
    expect(postRequest.request.method).toBe('POST');
    expect(postRequest.request.body).toEqual({ title: createdTask.title });
    postRequest.flush(createdTask);

    expect(response).toEqual(createdTask);
  });
});
