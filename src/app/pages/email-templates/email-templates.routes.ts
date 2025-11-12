import { Routes } from '@angular/router';

export const EMAIL_TEMPLATES_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./email-templates.component').then(m => m.EmailTemplatesComponent)
    }
];

