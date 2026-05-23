// lib/screens/home_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/attendance_provider.dart';
import '../providers/leave_provider.dart';
import '../widgets/bottom_nav_bar.dart';
import 'attendance_screen.dart';
import 'leave_screen.dart';
import 'replacement_screen.dart';
import 'requests_screen.dart';
import 'profile_screen.dart';
import 'report_screen.dart';

class HomeScreen extends StatefulWidget {
  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final attendanceProvider =
          Provider.of<AttendanceProvider>(context, listen: false);
      final leaveProvider = Provider.of<LeaveProvider>(context, listen: false);
      attendanceProvider.loadTodayAttendance();
      leaveProvider.loadLeaveBalances();
      leaveProvider.loadLeaves();
    });
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final isManager = authProvider.isManager;

    final List<Widget> screens = [
      AttendanceScreen(),
      LeaveScreen(),
      ReplacementScreen(),
      if (isManager) ReportScreen(),
      if (isManager) RequestsScreen(),
      ProfileScreen(),
    ];

    return Scaffold(
      body: screens[_currentIndex],
      bottomNavigationBar: BottomNavBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        isManager: isManager,
      ),
    );
  }
}
