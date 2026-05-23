// lib/providers/notification_provider.dart
import 'package:flutter/material.dart';
import '../services/api_service.dart';

class NotificationProvider extends ChangeNotifier {
  List<dynamic> _notifications = [];
  int _unreadCount = 0;
  bool _isLoading = false;

  List<dynamic> get notifications => _notifications;
  int get unreadCount => _unreadCount;
  bool get isLoading => _isLoading;

  Future<void> loadNotifications() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await apiService.getNotifications();
      if (response.data['status'] == 'success') {
        _notifications = response.data['data']['data'] ?? [];
        _unreadCount = _notifications
            .where((n) => n['is_read'] == false)
            .length;
      }
    } catch (e) {
      print('Error loading notifications: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> markAsRead(int id) async {
    try {
      await apiService.markNotificationRead(id);
      await loadNotifications();
    } catch (e) {
      print('Error marking as read: $e');
    }
  }
}
