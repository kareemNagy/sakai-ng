import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TeamService } from '../../core/services/team.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, CardModule, ButtonModule, SkeletonModule],
    templateUrl: './dashboard.html',
    styleUrls: ['./dashboard.scss']
})
export class Dashboard implements OnInit {
    loading = true;
    currentDate = new Date();
    
    stats = {
        totalProjects: 0,
        totalTeamMembers: 0
    };

    constructor(
        private teamService: TeamService
    ) {}

    ngOnInit(): void {
        this.loadDashboardData();
    }

    loadDashboardData(): void {
        this.loading = true;

        // Note: Task-related features removed
        // Use Azure DevOps API for real-time task metrics

        // Load team members count
        this.teamService.getAllTeamMembers().subscribe({
            next: (members) => {
                this.stats.totalTeamMembers = Array.isArray(members) ? members.length : 0;
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading team members:', err);
                this.stats.totalTeamMembers = 0;
                this.loading = false;
            }
        });
    }
}
