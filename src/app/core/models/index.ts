export interface Project {
  projectId: number;
  projectName: string;
  projectManagerName: string;
  dashboardUrl?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdDate: string;
  modifiedDate: string;
  
  // DevOps Integration
  devOpsProjectId?: string;  // Azure DevOps project ID (GUID)
  devOpsProjectUrl?: string;  // Direct URL to DevOps project
  
  // Configuration
  projectHubConfig?: string;  // Project Hub configuration (rich text HTML)
  
  technologies?: Technology[];
  teamMembers?: ProjectTeamMember[];
  userStories?: UserStory[];
}

export interface Technology {
  technologyId: number;
  technologyName: string;
  description?: string;
  isActive: boolean;
  createdDate: string;
  modifiedDate: string;
}

export interface ProjectTeamMember {
  projectTeamMemberId: number;
  projectId: number;
  teamMemberId: number;
  role?: string;
  assignedDate: string;
  isActive: boolean;
  teamMember?: TeamMember;
}

export interface TeamMember {
  teamMemberId: number;
  id?: number; // Alias for teamMemberId for convenience
  fullName: string;
  title: string;
  email: string;
  isActive: boolean;
  createdDate: string;
  modifiedDate: string;
}

export interface Activity {
  activityId: number;
  activityName: string;
  description?: string;
  isActive: boolean;
  createdDate: string;
  modifiedDate: string;
  subActivities?: SubActivity[];
  totalSubActivities?: number;
  activeSubActivities?: number;
}

export interface SubActivity {
  subActivityId: number;
  activityId: number;
  subActivityName: string;
  description?: string;
  isActive: boolean;
  createdDate: string;
  modifiedDate: string;
}

export interface UserStory {
  userStoryId: number;
  projectId: number;
  devOpsWorkItemId: number;
  title: string;
  description?: string;
  acceptanceCriteria?: string;
  storyPoints?: number;
  priority?: number | 'Low' | 'Medium' | 'High' | 'Critical'; // DevOps returns number (1-4)
  status: 'New' | 'Active' | 'Resolved' | 'Closed' | string; // DevOps can return various states
  assignedTo?: string;
  iterationPath?: string;
  areaPath?: string;
  devOpsUrl?: string;
  createdBy?: string;
  lastSyncDate?: string;
  createdDate: string;
  modifiedDate: string;
}

export interface Todo {
  id: number;
  title: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High'; // Must match DB constraint
  status?: 'Pending' | 'In Progress' | 'Completed'; // Must match DB constraint
  dueDate?: string;
  isCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  teamMemberId?: number;
  isImportant: boolean;
  isActive: boolean;
  teamMember?: TeamMember;
  comments?: TodoComment[];
  commentCount?: number;
}

export interface TodoComment {
  id: number;
  todoId: number;
  commentText: string;
  createdAt?: string;
  teamMemberId?: number;
  isActive: boolean;
  teamMember?: TeamMember;
}

export interface ProjectHealthDashboard {
  projectId: number;
  projectName: string;
  projectManagerName: string;
  projectStatus: string;
  startDate?: string;
  endDate?: string;
  projectDurationDays: number;
  teamSize: number;
  totalStories: number;
  closedStories: number;
  totalStoryPoints: number;
  totalTasks: number;
  closedTasks: number;
  overdueTasks: number;
  criticalOpenTasks: number;
  totalEstimatedHours: number;
  completedHours: number;
  remainingHours: number;
  healthStatus: '🟢 Healthy' | '🟡 Warning' | '🔴 Critical';
}

export interface TeamMemberWorkload {
  teamMemberId: number;
  fullName: string;
  title: string;
  projectId?: number;
  projectName?: string;
  totalTasks: number;
  openTasks: number;
  closedTasks: number;
  overdueTasks: number;
  totalEstimatedHours: number;
  completedHours: number;
  remainingHours: number;
  completionRate: number;
}

export interface ProjectDetails {
  projectId: number;
  projectName: string;
  projectManagerName: string;
  dashboardUrl?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  technologies: string;
  teamMemberCount: number;
  userStoryCount: number;
  createdDate: string;
  modifiedDate: string;
}

export interface TeamMemberProject {
  teamMemberId: number;
  fullName: string;
  title: string;
  email: string;
  projectId: number;
  projectName: string;
  projectRole: string;
  assignedDate: string;
  projectStatus: string;
}

export interface UserStorySummary {
  projectId: number;
  projectName: string;
  status: string;
  priority: string;
  storyCount: number;
  totalStoryPoints: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

