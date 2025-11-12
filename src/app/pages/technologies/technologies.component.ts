import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { DataViewModule } from 'primeng/dataview';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Technology } from '../../core/models';
import { TechnologyService } from '../../core/services/technology.service';

@Component({
    selector: 'app-technologies',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        TextareaModule,
        DialogModule,
        CheckboxModule,
        TagModule,
        DataViewModule,
        ConfirmDialogModule,
        ToastModule
    ],
    providers: [ConfirmationService, MessageService],
    templateUrl: './technologies.component.html',
    styleUrls: ['./technologies.component.scss']
})
export class TechnologiesComponent implements OnInit {
    technologies: Technology[] = [];
    filteredTechnologies: Technology[] = [];
    loading = true;

    selectedTechnology: Technology | null = null;
    showAddDialog = false;
    showDetailDialog = false;
    isEditMode = false;

    searchQuery = '';
    filterStatus = 'All';

    newTechnology: Partial<Technology> = {
        technologyName: '',
        description: '',
        isActive: true
    };

    constructor(
        private technologyService: TechnologyService,
        private confirmationService: ConfirmationService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.loadTechnologies();
    }

    loadTechnologies(): void {
        this.loading = true;
        this.technologyService.getAllTechnologies().subscribe({
            next: (technologies) => {
                this.technologies = technologies;
                this.applyFilters();
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading technologies:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load technologies'
                });
                this.loading = false;
            }
        });
    }

    applyFilters(): void {
        let tempTechnologies = this.technologies;

        // Filter by search query
        if (this.searchQuery) {
            tempTechnologies = tempTechnologies.filter(tech =>
                tech.technologyName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                (tech.description && tech.description.toLowerCase().includes(this.searchQuery.toLowerCase()))
            );
        }

        // Filter by status
        if (this.filterStatus !== 'All') {
            const isActive = this.filterStatus === 'Active';
            tempTechnologies = tempTechnologies.filter(tech => tech.isActive === isActive);
        }

        this.filteredTechnologies = tempTechnologies;
    }

    onSearchChange(): void {
        this.applyFilters();
    }

    onStatusFilterChange(): void {
        this.applyFilters();
    }

    openAddDialog(): void {
        this.isEditMode = false;
        this.resetForm();
        this.showAddDialog = true;
    }

    openEditDialog(technology: Technology): void {
        this.isEditMode = true;
        this.newTechnology = { ...technology };
        this.showAddDialog = true;
    }

    closeDialog(): void {
        this.showAddDialog = false;
        this.showDetailDialog = false;
        this.resetForm();
    }

    resetForm(): void {
        this.newTechnology = {
            technologyName: '',
            description: '',
            isActive: true
        };
    }

    saveTechnology(): void {
        if (!this.newTechnology.technologyName) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation Error',
                detail: 'Please fill in required fields'
            });
            return;
        }

        if (this.isEditMode && this.newTechnology.technologyId) {
            this.technologyService.updateTechnology(this.newTechnology.technologyId, this.newTechnology).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Technology updated successfully'
                    });
                    this.closeDialog();
                    this.loadTechnologies();
                },
                error: (err) => {
                    console.error('Error updating technology:', err);
                }
            });
        } else {
            this.technologyService.createTechnology(this.newTechnology).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Technology created successfully'
                    });
                    this.closeDialog();
                    this.loadTechnologies();
                },
                error: (err) => {
                    console.error('Error creating technology:', err);
                }
            });
        }
    }

    viewTechnologyDetails(technology: Technology): void {
        this.selectedTechnology = technology;
        this.showDetailDialog = true;
    }

    deleteTechnology(technology: Technology): void {
        this.confirmationService.confirm({
            message: `Are you sure you want to delete ${technology.technologyName}?`,
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.technologyService.deleteTechnology(technology.technologyId).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Success',
                            detail: 'Technology deleted successfully'
                        });
                        this.loadTechnologies();
                    },
                    error: (err) => {
                        console.error('Error deleting technology:', err);
                    }
                });
            }
        });
    }

    toggleTechnologyStatus(technology: Technology): void {
        const updatedTechnology = { ...technology, isActive: !technology.isActive };
        this.technologyService.updateTechnology(technology.technologyId, updatedTechnology).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: `Technology ${updatedTechnology.isActive ? 'activated' : 'deactivated'}`
                });
                this.loadTechnologies();
            },
            error: (err) => {
                console.error('Error toggling status:', err);
            }
        });
    }

    getTechnologyIcon(name: string): string {
        const nameLower = name.toLowerCase();
        if (nameLower.includes('angular')) return 'pi-angle-double-right';
        if (nameLower.includes('react')) return 'pi-replay';
        if (nameLower.includes('vue')) return 'pi-verified';
        if (nameLower.includes('node')) return 'pi-circle-fill';
        if (nameLower.includes('java')) return 'pi-coffee';
        if (nameLower.includes('python')) return 'pi-slack';
        if (nameLower.includes('sql') || nameLower.includes('database')) return 'pi-database';
        if (nameLower.includes('docker')) return 'pi-box';
        if (nameLower.includes('git')) return 'pi-github';
        if (nameLower.includes('azure') || nameLower.includes('aws')) return 'pi-cloud';
        return 'pi-code';
    }

    getSeverity(isActive: boolean): string {
        return isActive ? 'success' : 'secondary';
    }

    getStatusLabel(isActive: boolean): string {
        return isActive ? 'Active' : 'Inactive';
    }

    getActiveCount(): number {
        return this.technologies.filter(t => t.isActive).length;
    }

    getInactiveCount(): number {
        return this.technologies.filter(t => !t.isActive).length;
    }
}

