import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';

export interface UserWithEmail {
    name: string;
    email: string;
}

export interface UserStats {
    estimate: number;
    actual: number;
    coding: number;
    bugFixing: number;
    rework: number;
}

export interface EmailData {
    recipientNames: string[];
    subject: string;
    projectName?: string;
    templateId?: number;
    ccEmails?: string[];
    additionalMessage?: string;
    data: {
        estimateHours?: number;
        actualHours?: number;
        codingHours?: number;
        bugFixingHours?: number;
        reworkPercentage?: number;
    };
}

interface EmailTemplate {
    emailTemplateId: number;
    templateName: string;
    subject: string;
}

@Component({
    selector: 'app-email-modal',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        ButtonModule,
        MultiSelectModule,
        InputTextModule,
        TextareaModule,
        SelectModule,
        CheckboxModule,
        TagModule,
        CardModule
    ],
    templateUrl: './email-modal.component.html',
    styleUrls: ['./email-modal.component.scss']
})
export class EmailModalComponent implements OnInit, OnChanges {
    @Input() visible = false;
    @Input() emailData: EmailData | null = null;
    @Input() availableUsers: UserWithEmail[] = [];
    @Input() getUserStatsCallback?: (userName: string) => UserStats | null;

    @Output() close = new EventEmitter<void>();
    @Output() send = new EventEmitter<EmailData>();

    templates: EmailTemplate[] = [];
    loadingTemplates = false;

    selectedUsers: string[] = [];
    selectedTemplateId: number | null = null;
    ccValue = '';
    emailSubject = '';
    additionalMessage = '';

    constructor(private readonly http: HttpClient) {}

    ngOnInit(): void {
        this.loadTemplates();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible && this.emailData) {
            this.initializeFromEmailData();
        }

        if (changes['emailData'] && this.visible && this.emailData) {
            this.initializeFromEmailData();
        }
    }

    get selectedCount(): number {
        return this.selectedUsers.length;
    }

    get isFormValid(): boolean {
        if (!this.emailSubject.trim()) {
            return false;
        }

        if (this.selectedUsers.length === 0) {
            return false;
        }

        return !this.ccValue || this.validateEmails(this.ccValue);
    }

    get userStatsList(): Array<{ user: string; stats: UserStats | null }> {
        return this.selectedUsers.map((user) => ({
            user,
            stats: this.getUserStatsCallback ? this.getUserStatsCallback(user) : null
        }));
    }

    selectAllUsers(): void {
        this.selectedUsers = this.availableUsers.map((u) => u.name);
    }

    clearAllUsers(): void {
        this.selectedUsers = [];
    }

    onHide(): void {
        this.close.emit();
        this.resetForm();
    }

    onSend(): void {
        if (!this.emailData) {
            return;
        }

        const ccList = this.ccValue
            .split(',')
            .map((email) => email.trim())
            .filter((email) => email);

        const dataToSend: EmailData = {
            ...this.emailData,
            recipientNames: [...this.selectedUsers],
            subject: this.emailSubject,
            projectName: this.emailData.projectName,
            templateId: this.selectedTemplateId ?? undefined,
            ccEmails: ccList.length > 0 ? ccList : undefined,
            additionalMessage: this.additionalMessage || undefined
        };

        this.send.emit(dataToSend);
        this.resetForm();
    }

    validateEmails(emailString: string): boolean {
        if (!emailString.trim()) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailString
            .split(',')
            .map((email) => email.trim())
            .every((email) => emailRegex.test(email));
    }

    private loadTemplates(): void {
        this.loadingTemplates = true;
        this.http.get<any>(`${environment.apiUrl}/email-templates/active`).subscribe({
            next: (response) => {
                this.templates = (response.data || []).map((tpl: any) => ({
                    emailTemplateId: tpl.EmailTemplateId || tpl.emailTemplateId,
                    templateName: tpl.TemplateName || tpl.templateName || 'Template',
                    subject: tpl.Subject || tpl.subject || ''
                }));
                this.loadingTemplates = false;
            },
            error: (err) => {
                console.error('Failed to load email templates', err);
                this.loadingTemplates = false;
            }
        });
    }

    private initializeFromEmailData(): void {
        if (!this.emailData) {
            return;
        }

        this.selectedUsers = [...this.emailData.recipientNames];
        this.emailSubject = this.emailData.subject || '';
        this.selectedTemplateId = this.emailData.templateId ?? null;
        this.ccValue = this.emailData.ccEmails ? this.emailData.ccEmails.join(', ') : '';
        this.additionalMessage = this.emailData.additionalMessage || '';

        if (!this.emailSubject.trim()) {
            this.emailSubject = 'Effort Report';
        }
    }

    private resetForm(): void {
        this.selectedUsers = [];
        this.selectedTemplateId = null;
        this.ccValue = '';
        this.additionalMessage = '';
    }
}

