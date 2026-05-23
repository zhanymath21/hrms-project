// lib/services/storage_service.dart
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class StorageService {
  static late SharedPreferences _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  static Future<void> saveToken(String token) async {
    await _prefs.setString('token', token);
  }

  static String? getToken() {
    return _prefs.getString('token');
  }

  static Future<void> saveUser(Map<String, dynamic> user) async {
    await _prefs.setString('user', jsonEncode(user));
  }

  static Map<String, dynamic>? getUser() {
    String? userStr = _prefs.getString('user');
    if (userStr != null) {
      return jsonDecode(userStr);
    }
    return null;
  }

  static bool isManager() {
    final user = getUser();
    if (user == null) return false;
    final position = user['position']?['title'] ?? '';
    return position.contains('Manager') ||
        position.contains('HR') ||
        position.contains('Admin');
  }

  static Future<void> clearAll() async {
    await _prefs.remove('token');
    await _prefs.remove('user');
  }
}
