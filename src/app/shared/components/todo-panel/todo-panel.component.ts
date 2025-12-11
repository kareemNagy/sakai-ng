import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TodoService } from '../../../core/services/todo.service';
import { Todo, TeamMember } from '../../../core/models';
import { TeamService } from '../../../core/services/team.service';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
    selector: 'app-todo-panel',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DrawerModule,
        ButtonModule,
        TagModule,
        SelectModule,
        InputTextModule,
        TextareaModule,
        CheckboxModule,
        CardModule,
        DialogModule,
        ToastModule,
        TooltipModule,
        DatePickerModule
    ],
    providers: [MessageService],
    templateUrl: './todo-panel.component.html',
    styleUrls: ['./todo-panel.component.scss']
})
export class TodoPanelComponent implements OnDestroy {
    panelVisible = false;
    todos: Todo[] = [];
    filteredTodos: Todo[] = [];
    teamMembers: TeamMember[] = [];

    statusFilter: 'All' | 'Pending' | 'In Progress' | 'Completed' = 'All';
    priorityFilter: 'All' | 'Low' | 'Medium' | 'High' = 'All';
    showImportantOnly = false;
    searchTerm = '';

    displayAddDialog = false;
    saving = false;
    isEditMode = false;
    editingTodoId: number | null = null;

    newTodo: Partial<Todo> = {
        title: '',
        description: '',
        priority: 'Medium',
        status: 'Pending',
        isImportant: false
    };

    private readonly subscriptions = new Subscription();

    constructor(
        private readonly todoService: TodoService,
        private readonly teamService: TeamService,
        private readonly messageService: MessageService
    ) {
        this.subscriptions.add(
            this.todoService.todoPanelOpen$.subscribe((visible) => {
                this.panelVisible = visible;
            })
        );

        this.subscriptions.add(
            this.todoService.todos$.subscribe((todos) => {
                this.todos = todos;
                this.applyFilters();
            })
        );

        this.subscriptions.add(
            this.teamService.getAllTeamMembers().subscribe({
                next: (members) => {
                    this.teamMembers = members;
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to load team members'
                    });
                }
            })
        );
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    closePanel(): void {
        this.todoService.closeTodoPanel();
        this.panelVisible = false;
    }

    openAddDialog(): void {
        this.isEditMode = false;
        this.editingTodoId = null;
        this.newTodo = {
            title: '',
            description: '',
            priority: 'Medium',
            status: 'Pending',
            isImportant: false
        };
        this.displayAddDialog = true;
    }

    openEditDialog(todo: Todo): void {
        if (!todo.id) return;
        
        this.isEditMode = true;
        this.editingTodoId = todo.id;
        this.newTodo = {
            title: todo.title || '',
            description: todo.description || '',
            priority: todo.priority || 'Medium',
            status: todo.status || 'Pending',
            dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
            teamMemberId: todo.teamMemberId,
            isImportant: todo.isImportant ?? false
        };
        this.displayAddDialog = true;
    }

    saveTodo(): void {
        if (!this.newTodo.title || this.newTodo.title.trim() === '') {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Title is required'
            });
            return;
        }

        this.saving = true;

        const todoData = {
            title: this.newTodo.title?.trim(),
            description: this.newTodo.description?.trim(),
            priority: this.newTodo.priority,
            status: this.newTodo.status,
            dueDate: this.newTodo.dueDate instanceof (Date as any) 
                ? (this.newTodo.dueDate as unknown as Date).toISOString() 
                : (this.newTodo.dueDate as string),
            teamMemberId: this.newTodo.teamMemberId,
            isImportant: this.newTodo.isImportant ?? false
        };

        if (this.isEditMode && this.editingTodoId) {
            // Update existing todo
            this.subscriptions.add(
                this.todoService.updateTodo(this.editingTodoId, todoData).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Todo Updated',
                            detail: 'The todo item has been updated successfully'
                        });
                        this.displayAddDialog = false;
                        this.isEditMode = false;
                        this.editingTodoId = null;
                        this.saving = false;
                    },
                    error: () => {
                        this.saving = false;
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Failed to update todo'
                        });
                    }
                })
            );
        } else {
            // Create new todo
            this.subscriptions.add(
                this.todoService.createTodo(todoData).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Todo Created',
                            detail: 'The todo item has been created successfully'
                        });
                        this.displayAddDialog = false;
                        this.saving = false;
                    },
                    error: () => {
                        this.saving = false;
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Failed to create todo'
                        });
                    }
                })
            );
        }
    }

    applyFilters(): void {
        const normalizedSearch = this.searchTerm.toLowerCase();
        this.filteredTodos = this.todos.filter((todo) => {
            const matchesStatus = this.statusFilter === 'All' || todo.status === this.statusFilter;
            const matchesPriority = this.priorityFilter === 'All' || todo.priority === this.priorityFilter;
            const matchesImportant = !this.showImportantOnly || todo.isImportant;

            const matchesSearch =
                !normalizedSearch ||
                todo.title?.toLowerCase().includes(normalizedSearch) ||
                todo.description?.toLowerCase().includes(normalizedSearch);

            return matchesStatus && matchesPriority && matchesImportant && matchesSearch;
        });
    }

    resetFilters(): void {
        this.statusFilter = 'All';
        this.priorityFilter = 'All';
        this.showImportantOnly = false;
        this.searchTerm = '';
        this.applyFilters();
    }

    toggleImportant(todo: Todo): void {
        if (!todo.id) return;
        this.subscriptions.add(
            this.todoService.toggleImportant(todo.id).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: todo.isImportant ? 'info' : 'success',
                        summary: todo.isImportant ? 'Updated' : 'Starred',
                        detail: todo.isImportant ? 'Todo unstarred' : 'Todo marked as important'
                    });
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to update todo importance'
                    });
                }
            })
        );
    }

    markComplete(todo: Todo): void {
        if (!todo.id) return;
        this.subscriptions.add(
            this.todoService.completeTodo(todo.id).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Completed',
                        detail: 'Todo marked as completed'
                    });
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to mark todo as completed'
                    });
                }
            })
        );
    }

    deleteTodo(todo: Todo): void {
        if (!todo.id) return;
        this.subscriptions.add(
            this.todoService.deleteTodo(todo.id).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Deleted',
                        detail: 'Todo deleted'
                    });
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to delete todo'
                    });
                }
            })
        );
    }

    getPrioritySeverity(priority?: string): string {
        switch ((priority || 'Medium').toLowerCase()) {
            case 'low':
                return 'success';
            case 'high':
                return 'danger';
            default:
                return 'warning';
        }
    }

    getStatusSeverity(status?: string): string {
        switch ((status || '').toLowerCase()) {
            case 'completed':
                return 'success';
            case 'in progress':
                return 'info';
            default:
                return 'contrast';
        }
    }
}

