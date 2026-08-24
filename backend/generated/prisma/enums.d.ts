export declare const UserRole: {
    readonly PATIENT: 'PATIENT';
    readonly DOCTOR: 'DOCTOR';
    readonly ADMIN: 'ADMIN';
};
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export declare const UserStatus: {
    readonly ACTIVE: 'ACTIVE';
    readonly INACTIVE: 'INACTIVE';
    readonly SUSPENDED: 'SUSPENDED';
};
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
export declare const Gender: {
    readonly MALE: 'MALE';
    readonly FEMALE: 'FEMALE';
    readonly OTHER: 'OTHER';
    readonly PREFER_NOT_TO_SAY: 'PREFER_NOT_TO_SAY';
};
export type Gender = (typeof Gender)[keyof typeof Gender];
export declare const AppointmentStatus: {
    readonly SCHEDULED: 'SCHEDULED';
    readonly CONFIRMED: 'CONFIRMED';
    readonly COMPLETED: 'COMPLETED';
    readonly CANCELLED: 'CANCELLED';
    readonly NO_SHOW: 'NO_SHOW';
};
export type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];
export declare const AppointmentType: {
    readonly CONSULTATION: 'CONSULTATION';
    readonly FOLLOW_UP: 'FOLLOW_UP';
    readonly EMERGENCY: 'EMERGENCY';
};
export type AppointmentType = (typeof AppointmentType)[keyof typeof AppointmentType];
export declare const FollowUpStatus: {
    readonly PENDING: 'PENDING';
    readonly IN_PROGRESS: 'IN_PROGRESS';
    readonly COMPLETED: 'COMPLETED';
    readonly CANCELLED: 'CANCELLED';
};
export type FollowUpStatus = (typeof FollowUpStatus)[keyof typeof FollowUpStatus];
export declare const ReminderType: {
    readonly APPOINTMENT: 'APPOINTMENT';
    readonly FOLLOW_UP: 'FOLLOW_UP';
    readonly MEDICATION: 'MEDICATION';
    readonly CUSTOM: 'CUSTOM';
};
export type ReminderType = (typeof ReminderType)[keyof typeof ReminderType];
export declare const ReminderStatus: {
    readonly PENDING: 'PENDING';
    readonly SENT: 'SENT';
    readonly FAILED: 'FAILED';
    readonly CANCELLED: 'CANCELLED';
};
export type ReminderStatus = (typeof ReminderStatus)[keyof typeof ReminderStatus];
export declare const CalendarProvider: {
    readonly GOOGLE: 'GOOGLE';
};
export type CalendarProvider = (typeof CalendarProvider)[keyof typeof CalendarProvider];
