<?php
// app/Http/Controllers/Api/NotificationController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Services\NotificationService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    use ApiResponseTrait;

    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Get all notifications for current user
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $limit = $request->input('limit', 50);

            $notifications = $this->notificationService->getAll($user->id, $limit);

            return $this->success($notifications, 'Notifications fetched successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching notifications: ' . $e->getMessage());
            return $this->error('Failed to fetch notifications: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get unread notifications count
     */
    public function unreadCount(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $count = $this->notificationService->getUnreadCount($user->id);

            return $this->success(['count' => $count], 'Unread count fetched successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching unread count: ' . $e->getMessage());
            return $this->error('Failed to fetch unread count: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(Request $request, $id): JsonResponse
    {
        try {
            $user = $request->user();

            $notification = Notification::find($id);
            if (!$notification) {
                return $this->notFound('Notification not found');
            }

            // Check if notification belongs to user
            if ($notification->user_id !== $user->id) {
                return $this->unauthorized('You cannot access this notification');
            }

            $this->notificationService->markAsRead($id);

            return $this->success(null, 'Notification marked as read');
        } catch (\Exception $e) {
            Log::error('❌ Error marking notification as read: ' . $e->getMessage());
            return $this->error('Failed to mark notification as read: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $count = $this->notificationService->markAllAsRead($user->id);

            return $this->success(['count' => $count], 'All notifications marked as read');
        } catch (\Exception $e) {
            Log::error('❌ Error marking all notifications as read: ' . $e->getMessage());
            return $this->error('Failed to mark all notifications as read: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Delete notification
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        try {
            $user = $request->user();

            $notification = Notification::find($id);
            if (!$notification) {
                return $this->notFound('Notification not found');
            }

            // Check if notification belongs to user
            if ($notification->user_id !== $user->id) {
                return $this->unauthorized('You cannot delete this notification');
            }

            $this->notificationService->delete($id);

            return $this->success(null, 'Notification deleted successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error deleting notification: ' . $e->getMessage());
            return $this->error('Failed to delete notification: ' . $e->getMessage(), 500);
        }
    }
}