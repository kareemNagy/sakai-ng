import { Routes } from '@angular/router';

export const TASK_TEMPLATES_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./task-templates.component').then(m => m.TaskTemplatesComponent)
    }
];

