// lib/utils/helpers.dart
import 'package:intl/intl.dart';
import 'dart:io';
import 'dart:convert';

class Helpers {
  static String formatDate(DateTime date) {
    return DateFormat('dd MMM yyyy').format(date);
  }

  static String formatDateWithDay(DateTime date) {
    return DateFormat('EEEE, dd MMM yyyy').format(date);
  }

  static String formatDateTime(DateTime date) {
    return DateFormat('dd MMM yyyy, HH:mm').format(date);
  }

  static String formatTime(DateTime date) {
    return DateFormat('HH:mm:ss').format(date);
  }

  static String getCurrentTime() {
    return DateFormat('HH:mm:ss').format(DateTime.now());
  }

  static String formatDateString(String? dateStr) {
    if (dateStr == null) return '-';
    try {
      final date = DateTime.parse(dateStr);
      return formatDate(date);
    } catch (e) {
      return dateStr;
    }
  }

  static String formatDateTimeString(String? dateTimeStr) {
    if (dateTimeStr == null) return '-';
    try {
      final date = DateTime.parse(dateTimeStr);
      return formatDateTime(date);
    } catch (e) {
      return dateTimeStr;
    }
  }

  /// Convert image file to base64 string
  /// Returns base64 string without data:image prefix
  static Future<String> imageToBase64(File image) async {
    try {
      // Check if file exists
      if (!await image.exists()) {
        throw Exception('Image file does not exist');
      }

      // Read image bytes
      List<int> imageBytes = await image.readAsBytes();

      // Convert to base64
      String base64String = base64Encode(imageBytes);

      return base64String;
    } catch (e) {
      print('Error converting image to base64: $e');
      rethrow;
    }
  }

  /// Convert image file to base64 with data:image prefix
  static Future<String> imageToBase64WithPrefix(File image) async {
    try {
      String base64String = await imageToBase64(image);

      // Get file extension
      String extension = image.path.split('.').last.toLowerCase();
      String mimeType = 'image/jpeg';

      if (extension == 'png') {
        mimeType = 'image/png';
      } else if (extension == 'jpg' || extension == 'jpeg') {
        mimeType = 'image/jpeg';
      }

      return 'data:$mimeType;base64,$base64String';
    } catch (e) {
      print('Error converting image to base64 with prefix: $e');
      rethrow;
    }
  }

  static int calculateWorkingDays(DateTime start, DateTime end) {
    int days = 0;
    DateTime current = start;

    while (current.isBefore(end) || current.isAtSameMomentAs(end)) {
      if (current.weekday != DateTime.saturday &&
          current.weekday != DateTime.sunday) {
        days++;
      }
      current = current.add(Duration(days: 1));
    }

    return days > 0 ? days : 1;
  }

  /// Validate email format
  static bool isValidEmail(String email) {
    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
    return emailRegex.hasMatch(email);
  }

  /// Get days between two dates
  static int daysBetween(DateTime from, DateTime to) {
    from = DateTime(from.year, from.month, from.day);
    to = DateTime(to.year, to.month, to.day);
    return (to.difference(from).inHours / 24).round();
  }
}
