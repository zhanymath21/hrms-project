// lib/providers/auth_provider.dart
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

class AuthProvider extends ChangeNotifier {
  bool _isAuthenticated = false;
  bool _isLoading = false;
  Map<String, dynamic>? _user;
  String? _error;

  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;
  Map<String, dynamic>? get user => _user;
  String? get error => _error;

  bool get isManager {
    if (_user == null) return false;
    final position = _user!['position']?['title'] ?? '';
    return position.contains('Manager') ||
        position.contains('HR') ||
        position.contains('Admin');
  }

  AuthProvider() {
    _checkAuthStatus();
  }

  Future<void> _checkAuthStatus() async {
    final token = StorageService.getToken();
    if (token != null) {
      _isAuthenticated = true;
      _user = StorageService.getUser();
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await apiService.login(email, password);

      if (response.data['status'] == 'success') {
        final token = response.data['data']['token'];
        final user = response.data['data']['employee'];

        await StorageService.saveToken(token);
        await StorageService.saveUser(user);

        _isAuthenticated = true;
        _user = user;
        _isLoading = false;
        notifyListeners();

        return true;
      } else {
        _error = response.data['message'] ?? 'Login failed';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Connection error. Please check your connection.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await StorageService.clearAll();
    _isAuthenticated = false;
    _user = null;
    notifyListeners();
  }
}
