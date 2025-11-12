import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Notfound } from './app/pages/notfound/notfound';

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        // canActivate: [authGuard],
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', component: Dashboard },
            { 
                path: 'projects', 
                loadChildren: () => import('./app/pages/projects/projects.routes').then(m => m.PROJECTS_ROUTES) 
            },
            { 
                path: 'user-stories', 
                loadComponent: () => import('./app/pages/user-stories/user-stories.component').then(m => m.UserStoriesComponent) 
            },
            { 
                path: 'project-kpi', 
                loadComponent: () => import('./app/pages/project-kpi/project-kpi.component').then(m => m.ProjectKpiComponent) 
            },
            { 
                path: 'project-status', 
                loadComponent: () => import('./app/pages/project-status/project-status.component').then(m => m.ProjectStatusComponent) 
            },
            { 
                path: 'task-import', 
                loadChildren: () => import('./app/pages/task-import/task-import.routes').then(m => m.TASK_IMPORT_ROUTES) 
            },
            { 
                path: 'task-templates', 
                loadChildren: () => import('./app/pages/task-templates/task-templates.routes').then(m => m.TASK_TEMPLATES_ROUTES) 
            },
            { 
                path: 'team', 
                loadChildren: () => import('./app/pages/team/team.routes').then(m => m.TEAM_ROUTES) 
            },
            { 
                path: 'technologies', 
                loadComponent: () => import('./app/pages/technologies/technologies.component').then(m => m.TechnologiesComponent) 
            },
            { 
                path: 'email-templates', 
                loadChildren: () => import('./app/pages/email-templates/email-templates.routes').then(m => m.EMAIL_TEMPLATES_ROUTES) 
            },
            { 
                path: 'activities', 
                loadComponent: () => import('./app/pages/activities/activities.component').then(m => m.ActivitiesComponent) 
            },
            { 
                path: 'reports', 
                loadComponent: () => import('./app/pages/reports/reports.component').then(m => m.ReportsComponent) 
            },
            { 
                path: 'settings', 
                loadComponent: () => import('./app/pages/settings/settings.component').then(m => m.SettingsComponent) 
            },
            { 
                path: 'project-hub', 
                loadComponent: () => import('./app/pages/projects/project-configuration/project-configuration.component').then(m => m.ProjectConfigurationComponent) 
            },
            { 
                path: 'project-hub/:id', 
                loadComponent: () => import('./app/pages/projects/project-configuration/project-configuration.component').then(m => m.ProjectConfigurationComponent) 
            },
           
        ]
    },
    { path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes') },
    { path: 'notfound', component: Notfound },
    { path: '**', redirectTo: '/notfound' }
];
