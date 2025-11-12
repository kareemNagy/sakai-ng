import { Routes } from '@angular/router';

export const TASK_IMPORT_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./task-import.component').then(m => m.TaskImportComponent)
    }
];

