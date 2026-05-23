// lib/providers/attendance_provider.dart
import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AttendanceProvider extends ChangeNotifier {
  Map<String, dynamic>? _todayAttendance;
  bool _isLoading = false;
  String? _error;

  Map<String, dynamic>? get todayAttendance => _todayAttendance;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get canCheckIn => _todayAttendance?['can_checkin'] ?? false;
  bool get canCheckOut => _todayAttendance?['can_checkout'] ?? false;

  Future<void> loadTodayAttendance() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await apiService.getTodayAttendance();
      if (response.data['status'] == 'success') {
        _todayAttendance = response.data['data'];
        _error = null;
      } else {
        _error = response.data['message'];
      }
    } catch (e) {
      _error = 'Failed to load attendance';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> checkIn({
    double? latitude,
    double? longitude,
    String? photoBase64,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await apiService.checkIn(
        latitude: latitude,
        longitude: longitude,
        photoBase64: photoBase64,
      );

      if (response.data['status'] == 'success') {
        await loadTodayAttendance();
        return true;
      } else {
        _error = response.data['message'];
        return false;
      }
    } catch (e) {
      _error = 'Check-in failed';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> checkOut() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await apiService.checkOut();
      if (response.data['status'] == 'success') {
        await loadTodayAttendance();
        return true;
      } else {
        _error = response.data['message'];
        return false;
      }
    } catch (e) {
      _error = 'Check-out failed';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
