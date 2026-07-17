<?php
// app/Services/NotificationService.php

namespace App\Services;

use App\Models\Notification;
use App\Models\Employee;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Send notification to a user
     */
    public function send(
        int $userId,
        string $type,
        string $title,
        string $message,
        ?int $fromUserId = null,
        ?array $data = null
    ): Notification {
        try {
            $notification = Notification::create([
                'user_id' => $userId,
                'from_user_id' => $fromUserId,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'data' => $data,
                'is_read' => false,
            ]);

            Log::info("📨 Notification sent to user {$userId}: {$type}", [
                'notification_id' => $notification->id,
                'title' => $title,
            ]);

            return $notification;
        } catch (\Exception $e) {
            Log::error('❌ Failed to send notification: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Send notification to multiple users
     */
    public function sendBulk(
        array $userIds,
        string $type,
        string $title,
        string $message,
        ?int $fromUserId = null,
        ?array $data = null
    ): array {
        $notifications = [];
        foreach ($userIds as $userId) {
            $notifications[] = $this->send($userId, $type, $title, $message, $fromUserId, $data);
        }
        return $notifications;
    }

    /**
     * Get unread notifications for a user
     */
    public function getUnread(int $userId): \Illuminate\Database\Eloquent\Collection
    {
        return Notification::byUser($userId)->unread()->orderBy('created_at', 'desc')->get();
    }

    /**
     * Get all notifications for a user
     */
    public function getAll(int $userId, int $limit = 50): \Illuminate\Database\Eloquent\Collection
    {
        return Notification::byUser($userId)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(int $notificationId): bool
    {
        $notification = Notification::find($notificationId);
        if ($notification) {
            $notification->markAsRead();
            return true;
        }
        return false;
    }

    /**
     * Mark all notifications as read for a user
     */
    public function markAllAsRead(int $userId): int
    {
        return Notification::byUser($userId)->unread()->update([
            'is_read' => true,
            'read_at' => now(),
        ]);
    }

    /**
     * Get unread count for a user
     */
    public function getUnreadCount(int $userId): int
    {
        return Notification::byUser($userId)->unread()->count();
    }

    /**
     * Delete notification
     */
    public function delete(int $notificationId): bool
    {
        $notification = Notification::find($notificationId);
        if ($notification) {
            $notification->delete();
            return true;
        }
        return false;
    }

    /**
     * Delete all notifications for a user
     */
    public function deleteAll(int $userId): int
    {
        return Notification::byUser($userId)->delete();
    }

    /**
     * Send leave request notification to approvers
     */
    public function sendLeaveRequest(
        Employee $requester,
        array $approverIds,
        array $leaveData
    ): void {
        $title = "New Leave Request from {$requester->first_name} {$requester->last_name}";
        $message = "{$requester->first_name} has requested {$leaveData['total_days']} days of {$leaveData['leave_type']} from {$leaveData['start_date']} to {$leaveData['end_date']}.";

        $data = array_merge($leaveData, [
            'leave_id' => $leaveData['id'],
            'requester_id' => $requester->id,
            'requester_name' => $requester->first_name . ' ' . $requester->last_name,
        ]);

        $this->sendBulk(
            $approverIds,
            'leave_request',
            $title,
            $message,
            $requester->id,
            $data
        );
    }

    /**
     * Send leave approved notification
     */
    public function sendLeaveApproved(
        Employee $requester,
        Employee $approver,
        array $leaveData
    ): void {
        $title = "✅ Your Leave Request has been Approved";
        $message = "Your {$leaveData['leave_type']} request for {$leaveData['total_days']} days has been approved by {$approver->first_name} {$approver->last_name}.";

        $data = array_merge($leaveData, [
            'leave_id' => $leaveData['id'],
            'approver_id' => $approver->id,
            'approver_name' => $approver->first_name . ' ' . $approver->last_name,
        ]);

        $this->send(
            $requester->id,
            'leave_approved',
            $title,
            $message,
            $approver->id,
            $data
        );
    }

    /**
     * Send leave rejected notification
     */
    public function sendLeaveRejected(
        Employee $requester,
        Employee $rejecter,
        array $leaveData,
        string $reason
    ): void {
        $title = "❌ Your Leave Request has been Rejected";
        $message = "Your {$leaveData['leave_type']} request has been rejected by {$rejecter->first_name} {$rejecter->last_name}.";
        if ($reason) {
            $message .= " Reason: {$reason}";
        }

        $data = array_merge($leaveData, [
            'leave_id' => $leaveData['id'],
            'rejecter_id' => $rejecter->id,
            'rejecter_name' => $rejecter->first_name . ' ' . $rejecter->last_name,
            'reason' => $reason,
        ]);

        $this->send(
            $requester->id,
            'leave_rejected',
            $title,
            $message,
            $rejecter->id,
            $data
        );
    }

    /**
     * Send leave cancelled notification
     */
    public function sendLeaveCancelled(
        Employee $canceller,
        array $approverIds,
        array $leaveData
    ): void {
        $title = "🔄 Leave Request Cancelled";
        $message = "{$canceller->first_name} {$canceller->last_name} has cancelled their {$leaveData['leave_type']} request.";

        $data = array_merge($leaveData, [
            'leave_id' => $leaveData['id'],
            'canceller_id' => $canceller->id,
            'canceller_name' => $canceller->first_name . ' ' . $canceller->last_name,
        ]);

        $this->sendBulk(
            $approverIds,
            'leave_cancelled',
            $title,
            $message,
            $canceller->id,
            $data
        );
    }

    /**
     * Send reminder to pending approvers
     */
    public function sendReminder(
        Employee $requester,
        Employee $approver,
        array $leaveData
    ): void {
        $title = "⏰ Pending Leave Request Reminder";
        $message = "You have a pending approval for {$requester->first_name} {$requester->last_name}'s {$leaveData['leave_type']} request.";

        $data = array_merge($leaveData, [
            'leave_id' => $leaveData['id'],
            'requester_id' => $requester->id,
            'requester_name' => $requester->first_name . ' ' . $requester->last_name,
        ]);

        $this->send(
            $approver->id,
            'leave_reminder',
            $title,
            $message,
            $requester->id,
            $data
        );
    }
}