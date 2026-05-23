// lib/services/api_service.dart
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'storage_service.dart';

class ApiService {
  static const String baseUrl =
      'http://192.168.0.103:8000/api'; // Untuk emulator Android

  late Dio _dio;

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: Duration(seconds: 30),
      receiveTimeout: Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        String? token = await StorageService.getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        if (kDebugMode) {
          print('Request: ${options.method} ${options.path}');
        }
        return handler.next(options);
      },
      onResponse: (response, handler) {
        if (kDebugMode) {
          print('Response: ${response.statusCode}');
        }
        return handler.next(response);
      },
      onError: (error, handler) {
        if (kDebugMode) {
          print('Error: ${error.response?.statusCode} - ${error.message}');
        }
        if (error.response?.statusCode == 401) {
          StorageService.clearAll();
        }
        return handler.next(error);
      },
    ));
  }

  Dio get dio => _dio;

  // ============ AUTH ============
  Future<Response> login(String email, String password) async {
    return await _dio.post('/login', data: {
      'email': email,
      'password': password,
      'device_type': 'mobile',
    });
  }

  // ============ ATTENDANCE ============
  Future<Response> getTodayAttendance() async {
    return await _dio.get('/attendance/today');
  }

  Future<Response> checkIn({
    double? latitude,
    double? longitude,
    String? photoBase64,
  }) async {
    return await _dio.post('/attendance/check-in', data: {
      'method': 'mobile',
      'latitude': latitude,
      'longitude': longitude,
      'photo_base64': photoBase64,
    });
  }

  Future<Response> checkOut() async {
    return await _dio.post('/attendance/check-out', data: {
      'method': 'mobile',
    });
  }

  // ============ LEAVE ============
  Future<Response> getLeaveBalance() async {
    return await _dio.get('/leaves/balance');
  }

  Future<Response> getLeaves({int page = 1, String? status}) async {
    return await _dio.get('/leaves', queryParameters: {
      'page': page,
      'per_page': 15,
      if (status != null) 'status': status,
    });
  }

  Future<Response> createLeave({
    required int leaveTypeId,
    required String startDate,
    required String endDate,
    required String reason,
  }) async {
    return await _dio.post('/leaves', data: {
      'leave_type_id': leaveTypeId,
      'start_date': startDate,
      'end_date': endDate,
      'reason': reason,
    });
  }

  Future<Response> approveLeave(int id) async {
    return await _dio.put('/leaves/$id/approve');
  }

  Future<Response> rejectLeave(int id, String reason) async {
    return await _dio.put('/leaves/$id/reject', data: {'reason': reason});
  }

  Future<Response> cancelLeave(int id) async {
    return await _dio.put('/leaves/$id/cancel');
  }

  // ============ REPLACEMENT LEAVE ============
  Future<Response> getReplacementLeaves({int page = 1}) async {
    return await _dio.get('/replacement-leaves', queryParameters: {
      'page': page,
      'per_page': 15,
    });
  }

  Future<Response> createReplacementLeave({
    required String workDate,
    required String workDayType,
    required int hoursWorked,
    required String replacementDate,
    String? reason,
  }) async {
    return await _dio.post('/replacement-leaves', data: {
      'work_date': workDate,
      'work_day_type': workDayType,
      'hours_worked': hoursWorked,
      'replacement_date': replacementDate,
      'reason': reason,
    });
  }

  Future<Response> approveReplacement(int id) async {
    return await _dio.put('/replacement-leaves/$id/approve');
  }

  Future<Response> rejectReplacement(int id, String reason) async {
    return await _dio
        .put('/replacement-leaves/$id/reject', data: {'reason': reason});
  }

  Future<Response> cancelReplacement(int id) async {
    return await _dio.put('/replacement-leaves/$id/cancel');
  }

  // ============ PENDING REQUESTS (Manager) ============
  Future<Response> getPendingLeaveRequests() async {
    return await _dio.get('/leaves/pending');
  }

  Future<Response> getPendingReplacementRequests() async {
    return await _dio
        .get('/replacement-leaves', queryParameters: {'status': 'pending'});
  }

  // ============ NOTIFICATIONS ============
  Future<Response> getNotifications() async {
    return await _dio.get('/notifications');
  }

  Future<Response> getUnreadCount() async {
    return await _dio.get('/notifications/unread-count');
  }

  Future<Response> markNotificationRead(int id) async {
    return await _dio.put('/notifications/$id/read');
  }

  // ============ REPORTS ============
  Future<Response> getDailyAttendanceReport({DateTime? date}) async {
    return await _dio.get('/reports/attendance/daily', queryParameters: {
      if (date != null) 'date': date.toIso8601String().split('T').first,
    });
  }

  Future<Response> getMonthlyAttendanceReport(
      {required int month, required int year}) async {
    return await _dio.get('/reports/attendance/monthly', queryParameters: {
      'month': month,
      'year': year,
    });
  }

  Future<Response> getLeaveReport({int? month, int? year}) async {
    return await _dio.get('/reports/leaves', queryParameters: {
      if (month != null) 'month': month,
      if (year != null) 'year': year,
    });
  }

  Future<Response> getLeaveBalanceReport() async {
    return await _dio.get('/reports/leave-balance');
  }
}

final apiService = ApiService();
