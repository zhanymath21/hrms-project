// lib/providers/report_provider.dart
import 'package:flutter/material.dart';
import '../services/api_service.dart';

class ReportProvider extends ChangeNotifier {
  Map<String, dynamic>? _attendanceReport;
  Map<String, dynamic>? _monthlyAttendanceReport;
  Map<String, dynamic>? _leaveReport;
  Map<String, dynamic>? _leaveBalanceReport;
  bool _isLoading = false;
  String? _error;

  Map<String, dynamic>? get attendanceReport => _attendanceReport;
  Map<String, dynamic>? get monthlyAttendanceReport => _monthlyAttendanceReport;
  Map<String, dynamic>? get leaveReport => _leaveReport;
  Map<String, dynamic>? get leaveBalanceReport => _leaveBalanceReport;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadAttendanceReport({DateTime? date}) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await apiService.getDailyAttendanceReport(date: date);

      if (response.data['status'] == 'success') {
        _attendanceReport = response.data['data'];
        _error = null;
      } else {
        _error = response.data['message'];
      }
    } catch (e) {
      _error = 'Failed to load attendance report';
      print('Error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadMonthlyAttendanceReport(
      {required int month, required int year}) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response =
          await apiService.getMonthlyAttendanceReport(month: month, year: year);

      if (response.data['status'] == 'success') {
        _monthlyAttendanceReport = response.data['data'];
        _error = null;
      } else {
        _error = response.data['message'];
      }
    } catch (e) {
      _error = 'Failed to load monthly report';
      print('Error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadLeaveReport({int? month, int? year}) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response =
          await apiService.getLeaveReport(month: month, year: year);

      if (response.data['status'] == 'success') {
        _leaveReport = response.data['data'];
        _error = null;
      } else {
        _error = response.data['message'];
      }
    } catch (e) {
      _error = 'Failed to load leave report';
      print('Error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadLeaveBalanceReport() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await apiService.getLeaveBalanceReport();

      if (response.data['status'] == 'success') {
        _leaveBalanceReport = response.data['data'];
        _error = null;
      } else {
        _error = response.data['message'];
      }
    } catch (e) {
      _error = 'Failed to load leave balance report';
      print('Error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
