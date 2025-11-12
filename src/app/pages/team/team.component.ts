import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TeamService } from '../../core/services/team.service';
import { TeamMember, TeamMemberWorkload } from '../../core/models';

@Component({
    selector: 'app-team',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        CardModule,
        ButtonModule,
        DialogModule,
        InputTextModule,
        SelectModule,
        CheckboxModule,
        TagModule,
        AvatarModule,
        ConfirmDialogModule,
        ToastModule
    ],
    providers: [ConfirmationService, MessageService],
    templateUrl: './team.component.html',
    styleUrls: ['./team.component.scss']
})
export class TeamComponent implements OnInit {
    teamMembers: TeamMember[] = [];
    filteredMembers: TeamMember[] = [];
    selectedMember: TeamMember | null = null;
    memberWorkload: TeamMemberWorkload[] = [];
    
    loading = false;
    showAddDialog = false;
    showDetailDialog = false;
    isEditMode = false;

    searchQuery = '';
    filterRole = 'All';
    filterStatus = 'All';

    roles = [
        { label: 'All Roles', value: 'All' },
        { label: 'Developer', value: 'Developer' },
        { label: 'Designer', value: 'Designer' },
        { label: 'QA', value: 'QA' },
        { label: 'DevOps', value: 'DevOps' },
        { label: 'Project Manager', value: 'Project Manager' },
        { label: 'Business Analyst', value: 'Business Analyst' },
        { label: 'Scrum Master', value: 'Scrum Master' }
    ];

    statusOptions = [
        { label: 'All Status', value: 'All' },
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' }
    ];
    
    newMember: Partial<TeamMember> = {
        fullName: '',
        email: '',
        title: '',
        isActive: true
    };

    constructor(
        private teamService: TeamService,
        private confirmationService: ConfirmationService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.loadTeamMembers();
    }

    loadTeamMembers(): void {
        this.loading = true;
        this.teamService.getAllTeamMembers().subscribe({
            next: (members) => {
                this.teamMembers = members;
                this.applyFilters();
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading team members:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load team members'
                });
                this.loading = false;
            }
        });
    }

    applyFilters(): void {
        this.filteredMembers = this.teamMembers.filter(member => {
            const matchesSearch = !this.searchQuery || 
                member.fullName?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                member.email?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                member.title?.toLowerCase().includes(this.searchQuery.toLowerCase());

            const matchesRole = this.filterRole === 'All' || 
                member.title?.toLowerCase().includes(this.filterRole.toLowerCase());

            const matchesStatus = this.filterStatus === 'All' ||
                (this.filterStatus === 'Active' && member.isActive) ||
                (this.filterStatus === 'Inactive' && !member.isActive);

            return matchesSearch && matchesRole && matchesStatus;
        });
    }

    onSearchChange(): void {
        this.applyFilters();
    }

    onFilterChange(): void {
        this.applyFilters();
    }

    openAddDialog(): void {
        this.isEditMode = false;
        this.resetForm();
        this.showAddDialog = true;
    }

    openEditDialog(member: TeamMember): void {
        this.isEditMode = true;
        this.newMember = { ...member };
        this.showAddDialog = true;
    }

    closeDialog(): void {
        this.showAddDialog = false;
        this.showDetailDialog = false;
        this.resetForm();
    }

    resetForm(): void {
        this.newMember = {
            fullName: '',
            email: '',
            title: '',
            isActive: true
        };
    }

    saveMember(): void {
        if (!this.newMember.fullName || !this.newMember.email) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation Error',
                detail: 'Please fill in required fields'
            });
            return;
        }

        const memberId = this.newMember.teamMemberId || this.newMember.id;
        if (this.isEditMode && memberId) {
            this.teamService.updateTeamMember(memberId, this.newMember).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Team member updated successfully'
                    });
                    this.closeDialog();
                    this.loadTeamMembers();
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to update team member'
                    });
                }
            });
        } else {
            this.teamService.createTeamMember(this.newMember).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Team member added successfully'
                    });
                    this.closeDialog();
                    this.loadTeamMembers();
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to add team member'
                    });
                }
            });
        }
    }

    viewMemberDetails(member: TeamMember): void {
        this.selectedMember = member;
        this.showDetailDialog = true;
        
        // Load workload data
        const memberId = member.teamMemberId || member.id;
        if (memberId) {
            this.teamService.getTeamMemberWorkloadById(memberId).subscribe({
                next: (workload) => {
                    this.memberWorkload = workload;
                },
                error: (err) => {
                    console.error('Error loading workload:', err);
                    this.memberWorkload = [];
                }
            });
        }
    }

    deleteMember(member: TeamMember): void {
        this.confirmationService.confirm({
            message: `Are you sure you want to delete ${member.fullName}?`,
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                const memberId = member.teamMemberId || member.id;
                if (memberId) {
                    this.teamService.deleteTeamMember(memberId).subscribe({
                        next: () => {
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Success',
                                detail: 'Team member deleted successfully'
                            });
                            this.loadTeamMembers();
                        },
                        error: () => {
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Error',
                                detail: 'Failed to delete team member'
                            });
                        }
                    });
                }
            }
        });
    }

    toggleMemberStatus(member: TeamMember): void {
        const memberId = member.teamMemberId || member.id;
        if (memberId) {
            const updatedMember = { ...member, isActive: !member.isActive };
            this.teamService.updateTeamMember(memberId, updatedMember).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: `Team member ${updatedMember.isActive ? 'activated' : 'deactivated'}`
                    });
                    this.loadTeamMembers();
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to update status'
                    });
                }
            });
        }
    }

    getInitials(name: string): string {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    getSeverity(isActive: boolean): string {
        return isActive ? 'success' : 'secondary';
    }

    getStatusLabel(isActive: boolean): string {
        return isActive ? 'Active' : 'Inactive';
    }

    getTotalTasks(workload: TeamMemberWorkload[]): number {
        return workload.reduce((sum, w) => sum + (w.totalTasks || 0), 0);
    }

    getCompletionRate(workload: TeamMemberWorkload[]): number {
        const total = this.getTotalTasks(workload);
        if (total === 0) return 0;
        const closed = workload.reduce((sum, w) => sum + (w.closedTasks || 0), 0);
        return Math.round((closed / total) * 100);
    }

    getActiveCount(): number {
        return this.teamMembers.filter(m => m.isActive).length;
    }

    getInactiveCount(): number {
        return this.teamMembers.filter(m => !m.isActive).length;
    }
}

