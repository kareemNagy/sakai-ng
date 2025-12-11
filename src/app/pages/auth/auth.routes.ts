import { Routes } from '@angular/router';
import { Access } from './access';
import { Login } from './login';
import { Error } from './error';
import { AuthCallbackComponent } from './callback';

export default [
    { path: 'login', component: Login },
    { path: 'callback', component: AuthCallbackComponent },
    { path: 'access', component: Access },
    { path: 'error', component: Error }
] as Routes;
