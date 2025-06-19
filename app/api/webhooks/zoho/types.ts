export interface ThreadPayload {
    ticketId: string;
    id: string;
    content: string;
    author?: {
      id: string;
      name?: string;
      type?: string;
    };
    createdTime: string;
    channel?: string;
    direction: 'in' | 'out';
    attachments?: any[];
    isDescriptionThread?: boolean;
    canReply?: boolean;
    isContentTruncated?: boolean;
    bcc?: string[];
    departmentId?: string;
    source?: any;
    contentType?: string;
    summary?: string;
    cc?: string[];
    visibility?: string;
    fullContentURL?: string;
    isForward?: boolean;
    hasAttach?: boolean;
    responderId?: string;
    replyTo?: string;
    attachmentCount?: number;
    to?: string[];
    fromEmailAddress?: string;
    status?: string;
}

export interface TicketPayload {
    modifiedTime: string | null;
    subCategory: string | null;
    statusType: string | null;
    subject: string | null;
    departmentId: string | null;
    dueDate: string | null;
    channel: string | null;
    onholdTime: string | null;
    language: string | null;
    source: {
      appName: string | null;
      extId: string | null;
      permalink: string | null;
      type: string | null;
      appPhotoURL: string | null;
    } | null;
    resolution: string | null;
    sharedDepartments: any[];
    closedTime: string | null;
    approvalCount: string | null;
    isOverDue: boolean | null;
    isTrashed: boolean | null;
    contact: {
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
      mobile: string | null;
      id: string | null;
      isSpam: boolean | null;
      type: string | null;
      email: string | null;
      account: any | null;
    } | null;
    createdTime: string | null;
    id: string;
    isResponseOverdue: boolean | null;
    firstThread: any | null;
    customerResponseTime: string | null;
    productId: string | null;
    contactId: string | null;
    threadCount: string | null;
    secondaryContacts: any[];
    priority: string | null;
    classification: string | null;
    commentCount: string | null;
    accountId: string | null;
    taskCount: string | null;
    phone: string | null;
    webUrl: string | null;
    isSpam: boolean | null;
    assignee: {
      photoURL: string | null;
      firstName: string | null;
      lastName: string | null;
      id: string | null;
      email: string | null;
    } | null;
    lastActivityTime: string | null;
    status: string | null;
    entitySkills: any[];
    ticketNumber: string | null;
    sentiment: string | null;
    customFields: {
      severityPercentage: string | null;
      dateofPurchase: string | null;
      url: string | null;
    } | null;
    isArchived: boolean | null;
    description: string | null;
    timeEntryCount: string | null;
    channelRelatedInfo: any | null;
    responseDueDate: string | null;
    isDeleted: boolean | null;
    modifiedBy: string | null;
    followerCount: string | null;
    email: string | null;
    layoutDetails: {
      id: string | null;
      layoutName: string | null;
    } | null;
    channelCode: string | null;
    cf: {
      cf_url: string | null;
      cf_severityPercentage: string | null;
      cf_dateofPurchase: string | null;
    } | null;
    isFollowing: boolean | null;
    assigneeId: string | null;
    layoutId: string | null;
    createdBy: string | null;
    teamId: string | null;
    tagCount: string | null;
    isEscalated: boolean | null;
    attachmentCount: string | null;
    category: string | null;
    descAttachments: Array<{
      size: string | null;
      name: string | null;
      href: string | null;
      id: string | null;
    }>;
}