// lib/providers/leave_provider.dart
import 'package:flutter/material.dart';
import '../services/api_service.dart';

class LeaveProvider extends ChangeNotifier {
  List<dynamic> _leaveBalances = [];
  List<dynamic> _leaves = [];
  List<dynamic> _replacementLeaves = [];
  List<dynamic> _pendingLeaves = [];
  List<dynamic> _pendingReplacements = [];
  bool _isLoading = false;
  String? _error;
  int _currentPage = 1;
  bool _hasMore = true;

  List<dynamic> get leaveBalances => _leaveBalances;
  List<dynamic> get leaves => _leaves;
  List<dynamic> get replacementLeaves => _replacementLeaves;
  List<dynamic> get pendingLeaves => _pendingLeaves;
  List<dynamic> get pendingReplacements => _pendingReplacements;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasMore => _hasMore;

  // Load leave balances
  Future<void> loadLeaveBalances() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await apiService.getLeaveBalance();
      if (response.data['status'] == 'success') {
        _leaveBalances = response.data['data']['balances'] ?? [];
        _error = null;
      }
    } catch (e) {
      _error = 'Failed to load balances';
      print('Error loading balances: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Load leaves history
  Future<void> loadLeaves({bool refresh = false}) async {
    if (refresh) {
      _currentPage = 1;
      _leaves = [];
      _hasMore = true;
    }

    if (!_hasMore) return;

    _isLoading = true;
    notifyListeners();

    try {
      final response = await apiService.getLeaves(page: _currentPage);
      if (response.data['status'] == 'success') {
        final newLeaves = response.data['data']['data'] as List;
        _leaves.addAll(newLeaves);
        _currentPage++;
        _hasMore = newLeaves.length == 15;
      }
    } catch (e) {
      _error = 'Failed to load leaves';
      print('Error loading leaves: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Create leave request
  Future<bool> createLeave({
    required int leaveTypeId,
    required String startDate,
    required String endDate,
    required String reason,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await apiService.createLeave(
        leaveTypeId: leaveTypeId,
        startDate: startDate,
        endDate: endDate,
        reason: reason,
      );

      if (response.data['status'] == 'success') {
        await loadLeaveBalances();
        await loadLeaves(refresh: true);
        return true;
      } else {
        _error = response.data['message'];
        return false;
      }
    } catch (e) {
      _error = 'Failed to submit leave';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Approve leave (Manager)
  Future<bool> approveLeave(int id) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await apiService.approveLeave(id);
      if (response.data['status'] == 'success') {
        await loadPendingLeaves();
        await loadLeaves(refresh: true);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Reject leave (Manager)
  Future<bool> rejectLeave(int id, String reason) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await apiService.rejectLeave(id, reason);
      if (response.data['status'] == 'success') {
        await loadPendingLeaves();
        await loadLeaves(refresh: true);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Cancel leave (Employee)
  Future<bool> cancelLeave(int id) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await apiService.cancelLeave(id);
      if (response.data['status'] == 'success') {
        await loadLeaveBalances();
        await loadLeaves(refresh: true);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Load replacement leaves
  Future<void> loadReplacementLeaves({bool refresh = false}) async {
    if (refresh) {
      _replacementLeaves = [];
    }

    _isLoading = true;
    notifyListeners();

    try {
      final response = await apiService.getReplacementLeaves();
      if (response.data['status'] == 'success') {
        _replacementLeaves = response.data['data']['data'] ?? [];
      }
    } catch (e) {
      _error = 'Failed to load replacement leaves';
      print('Error loading replacement: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Create replacement request
  Future<bool> createReplacementLeave({
    required String workDate,
    required String workDayType,
    required int hoursWorked,
    required String replacementDate,
    String? reason,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await apiService.createReplacementLeave(
        workDate: workDate,
        workDayType: workDayType,
        hoursWorked: hoursWorked,
        replacementDate: replacementDate,
        reason: reason,
      );

      if (response.data['status'] == 'success') {
        await loadReplacementLeaves(refresh: true);
        await loadLeaveBalances();
        return true;
      }
      return false;
    } catch (e) {
      _error = 'Failed to submit replacement';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Load pending leaves (Manager)
  Future<void> loadPendingLeaves() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await apiService.getPendingLeaveRequests();
      if (response.data['status'] == 'success') {
        _pendingLeaves = response.data['data']['data'] ?? [];
      }
    } catch (e) {
      print('Error loading pending leaves: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Load pending replacements (Manager)
  Future<void> loadPendingReplacements() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await apiService.getPendingReplacementRequests();
      if (response.data['status'] == 'success') {
        _pendingReplacements = response.data['data']['data'] ?? [];
      }
    } catch (e) {
      print('Error loading pending replacements: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  // lib/providers/leave_provider.dart
// Tambahkan method berikut di dalam class LeaveProvider

// Cancel replacement
  Future<bool> cancelReplacement(int id) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await apiService.cancelReplacement(id);
      if (response.data['status'] == 'success') {
        await loadReplacementLeaves(refresh: true);
        return true;
      }
      return false;
    } catch (e) {
      _error = 'Failed to cancel replacement';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

// Approve replacement (Manager)
  Future<bool> approveReplacement(int id) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await apiService.approveReplacement(id);
      if (response.data['status'] == 'success') {
        await loadPendingReplacements();
        await loadReplacementLeaves(refresh: true);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

// Reject replacement (Manager)
  Future<bool> rejectReplacement(int id, String reason) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await apiService.rejectReplacement(id, reason);
      if (response.data['status'] == 'success') {
        await loadPendingReplacements();
        await loadReplacementLeaves(refresh: true);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
