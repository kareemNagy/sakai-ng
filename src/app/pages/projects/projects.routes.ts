import { Routes } from '@angular/router';

export const PROJECTS_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./projects-list.component').then(m => m.ProjectsListComponent)
    },
    {
        path: 'configuration/:id',
        loadComponent: () => import('./project-configuration/project-configuration.component').then(m => m.ProjectConfigurationComponent)
    }
];

