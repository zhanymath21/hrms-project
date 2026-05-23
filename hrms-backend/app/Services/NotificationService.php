<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\Notification;
use App\Models\Leave;
use App\Models\ReplacementLeave;

class NotificationService
{
    /**
     * Send leave request notification to manager
     */
    public static function leaveRequested(Leave $leave): void
    {
        try {
            $employee = $leave->employee;

            if (!$employee) {
                \Log::warning('NotificationService: Employee not found for leave ' . $leave->id);
                return;
            }

            $manager = $employee->manager ?? null;

            if (!$manager) {
                // Cari HR Manager sebagai fallback
                $manager = Employee::whereHas('position', function ($q) {
                    $q->where('title', 'like', '%HR%')
                        ->orWhere('title', 'like', '%Manager%');
                })->where('status', 'active')->first();
            }

            if (!$manager) {
                \Log::warning('NotificationService: No manager found for employee ' . $employee->id);
                return;
            }

            Notification::create([
                'from_user_id' => $employee->id,
                'to_user_id' => $manager->id,
                'type' => 'leave_request',
                'title' => 'New Leave Request',
                'message' => "{$employee->first_name} {$employee->last_name} requested {$leave->total_days} day(s) of {$leave->leaveType->name} from {$leave->start_date->format('d M Y')} to {$leave->end_date->format('d M Y')}.\n\nReason: {$leave->reason}",
                'reference_type' => 'leave',
                'reference_id' => $leave->id,
                'action_url' => "/leaves?employee_id={$employee->id}",
                'data' => json_encode([
                    'leave_id' => $leave->id,
                    'employee_name' => $employee->first_name . ' ' . $employee->last_name,
                    'leave_type' => $leave->leaveType->name,
                    'total_days' => $leave->total_days,
                    'start_date' => $leave->start_date->format('Y-m-d'),
                    'end_date' => $leave->end_date->format('Y-m-d'),
                ]),
            ]);
        } catch (\Exception $e) {
            \Log::error('NotificationService::leaveRequested error: ' . $e->getMessage());
        }
    }

    /**
     * Send leave approved notification to employee
     */
    public static function leaveApproved(Leave $leave): void
    {
        try {
            if (!$leave->employee_id || !$leave->approved_by) {
                \Log::warning('NotificationService: Missing data for leave approval notification');
                return;
            }

            Notification::create([
                'from_user_id' => $leave->approved_by,
                'to_user_id' => $leave->employee_id,
                'type' => 'leave_approved',
                'title' => 'Leave Approved ✅',
                'message' => "Your {$leave->leaveType->name} request for {$leave->total_days} day(s) ({$leave->start_date->format('d M Y')} - {$leave->end_date->format('d M Y')}) has been approved.",
                'reference_type' => 'leave',
                'reference_id' => $leave->id,
                'action_url' => '/leaves',
                'data' => json_encode([
                    'leave_id' => $leave->id,
                    'leave_type' => $leave->leaveType->name ?? 'Unknown',
                    'total_days' => $leave->total_days,
                ]),
            ]);
        } catch (\Exception $e) {
            \Log::error('NotificationService::leaveApproved error: ' . $e->getMessage());
        }
    }

    /**
     * Send leave rejected notification to employee
     */
    public static function leaveRejected(Leave $leave): void
    {
        try {
            if (!$leave->employee_id) {
                \Log::warning('NotificationService: Missing employee_id for leave rejection notification');
                return;
            }

            Notification::create([
                'from_user_id' => $leave->approved_by,
                'to_user_id' => $leave->employee_id,
                'type' => 'leave_rejected',
                'title' => 'Leave Rejected ❌',
                'message' => "Your {$leave->leaveType->name} request for {$leave->total_days} day(s) ({$leave->start_date->format('d M Y')} - {$leave->end_date->format('d M Y')}) has been rejected.\n\nReason: {$leave->rejection_reason}",
                'reference_type' => 'leave',
                'reference_id' => $leave->id,
                'action_url' => '/leaves',
                'data' => json_encode([
                    'leave_id' => $leave->id,
                    'rejection_reason' => $leave->rejection_reason,
                ]),
            ]);
        } catch (\Exception $e) {
            \Log::error('NotificationService::leaveRejected error: ' . $e->getMessage());
        }
    }

    /**
     * Send replacement request notification to manager
     */
    public static function replacementRequested(ReplacementLeave $replacement): void
    {
        try {
            $employee = $replacement->employee;

            if (!$employee) {
                \Log::warning('NotificationService: Employee not found for replacement ' . $replacement->id);
                return;
            }

            $manager = $employee->manager ?? null;

            if (!$manager) {
                $manager = Employee::whereHas('position', function ($q) {
                    $q->where('title', 'like', '%HR%')
                        ->orWhere('title', 'like', '%Manager%');
                })->where('status', 'active')->first();
            }

            if (!$manager) {
                \Log::warning('NotificationService: No manager found for employee ' . $employee->id);
                return;
            }

            Notification::create([
                'from_user_id' => $employee->id,
                'to_user_id' => $manager->id,
                'type' => 'replacement_request',
                'title' => 'New Replacement Leave Request',
                'message' => "{$employee->first_name} {$employee->last_name} requested replacement leave.\n\nWorked on: {$replacement->work_date->format('d M Y')} ({$replacement->work_day_type})\nHours: {$replacement->hours_worked}\nReplacement date: {$replacement->replacement_date->format('d M Y')}",
                'reference_type' => 'replacement_leave',
                'reference_id' => $replacement->id,
                'action_url' => "/leaves?tab=replacements",
                'data' => json_encode([
                    'replacement_id' => $replacement->id,
                    'employee_name' => $employee->first_name . ' ' . $employee->last_name,
                    'work_date' => $replacement->work_date->format('Y-m-d'),
                    'replacement_date' => $replacement->replacement_date->format('Y-m-d'),
                ]),
            ]);
        } catch (\Exception $e) {
            \Log::error('NotificationService::replacementRequested error: ' . $e->getMessage());
        }
    }

    /**
     * Send replacement approved notification to employee
     */
    public static function replacementApproved(ReplacementLeave $replacement): void
    {
        try {
            if (!$replacement->employee_id || !$replacement->approved_by) {
                \Log::warning('NotificationService: Missing data for replacement approval notification');
                return;
            }

            $daysEarned = $replacement->hours_worked >= 8 ? '1 day' : '0.5 day';

            Notification::create([
                'from_user_id' => $replacement->approved_by,
                'to_user_id' => $replacement->employee_id,
                'type' => 'replacement_approved',
                'title' => 'Replacement Leave Approved ✅',
                'message' => "Your replacement leave request has been approved. You earned {$daysEarned} replacement leave.",
                'reference_type' => 'replacement_leave',
                'reference_id' => $replacement->id,
                'action_url' => '/leaves',
                'data' => json_encode([
                    'replacement_id' => $replacement->id,
                    'days_earned' => $daysEarned,
                ]),
            ]);
        } catch (\Exception $e) {
            \Log::error('NotificationService::replacementApproved error: ' . $e->getMessage());
        }
    }

    /**
     * Get unread notifications count for user
     */
    public static function getUnreadCount($userId): int
    {
        try {
            return Notification::where('to_user_id', $userId)
                ->where('is_read', false)
                ->count();
        } catch (\Exception $e) {
            \Log::error('NotificationService::getUnreadCount error: ' . $e->getMessage());
            return 0;
        }
    }

    /**
     * Get notifications for user
     */
    public static function getNotifications($userId, $limit = 20)
    {
        try {
            return Notification::with('fromUser')
                ->where('to_user_id', $userId)
                ->orderBy('created_at', 'desc')
                ->take($limit)
                ->get();
        } catch (\Exception $e) {
            \Log::error('NotificationService::getNotifications error: ' . $e->getMessage());
            return collect([]);
        }
    }

    /**
     * Mark single notification as read
     */
    public static function markAsRead($notificationId, $userId): void
    {
        try {
            Notification::where('id', $notificationId)
                ->where('to_user_id', $userId)
                ->update([
                    'is_read' => true,
                    'read_at' => now(),
                ]);
        } catch (\Exception $e) {
            \Log::error('NotificationService::markAsRead error: ' . $e->getMessage());
        }
    }

    /**
     * Mark all notifications as read for user
     */
    public static function markAllAsRead($userId): void
    {
        try {
            Notification::where('to_user_id', $userId)
                ->where('is_read', false)
                ->update([
                    'is_read' => true,
                    'read_at' => now(),
                ]);
        } catch (\Exception $e) {
            \Log::error('NotificationService::markAllAsRead error: ' . $e->getMessage());
        }
    }
}
