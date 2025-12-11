import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        <ng-container *ngFor="let item of model; let i = index">
            <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
            <li *ngIf="item.separator" class="menu-separator"></li>
        </ng-container>
    </ul> `
})
export class AppMenu {
    model: MenuItem[] = [];

    ngOnInit() {
        this.model = [
            {
                label: 'Overview',
                items: [
                    { label: 'Dashboard', icon: 'pi pi-fw pi-chart-line', routerLink: ['/dashboard'] }
                ]
            },
            {
                label: 'Project Management',
                items: [
                    { label: 'Projects', icon: 'pi pi-fw pi-folder-open', routerLink: ['/projects'] },
                    { label: 'User Stories', icon: 'pi pi-fw pi-book', routerLink: ['/user-stories'] },
                    { label: 'Project KPI', icon: 'pi pi-fw pi-chart-line', routerLink: ['/project-kpi'] },
                    { label: 'Project Status', icon: 'pi pi-fw pi-list', routerLink: ['/project-status'] },
                    { label: 'Task Import', icon: 'pi pi-fw pi-file-import', routerLink: ['/task-import'] },
                    { label: 'Project Hub', icon: 'pi pi-fw pi-cog', routerLink: ['/project-hub'] }
                ]
            },
            {
                label: 'Resources',
                items: [
                    { label: 'Team Members', icon: 'pi pi-fw pi-users', routerLink: ['/team'] },
                    { label: 'Team Member KPI', icon: 'pi pi-fw pi-chart-bar', routerLink: ['/team-member-kpi'] },
                    { label: 'Technologies', icon: 'pi pi-fw pi-desktop', routerLink: ['/technologies'] },
                    { label: 'Activities', icon: 'pi pi-fw pi-check-square', routerLink: ['/activities'] },
                    { label: 'Task Templates', icon: 'pi pi-fw pi-list-check', routerLink: ['/task-templates'] },
                    { label: 'Email Templates', icon: 'pi pi-fw pi-envelope', routerLink: ['/email-templates'] }
                ]
            },
            {
                label: 'System',
                items: [
                    { label: 'Reports', icon: 'pi pi-fw pi-chart-bar', routerLink: ['/reports'] },
                    { label: 'Daily Time Logs', icon: 'pi pi-fw pi-clock', routerLink: ['/daily-time-logs'] },
                    { label: 'Settings', icon: 'pi pi-fw pi-cog', routerLink: ['/settings'] }
                ]
            },
            {
                separator: true
            },
            {
                label: 'Demo Components',
                items: [
                    { label: 'UI Kit', icon: 'pi pi-fw pi-prime', routerLink: ['/uikit'] }
                ]
            }
        ];
    }
}
